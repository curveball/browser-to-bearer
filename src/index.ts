import { Context, Middleware } from '@curveball/core';
import '@curveball/session';
import { Unauthorized } from '@curveball/http-errors';
import { resolve } from 'url';
import {
  OAuth2Client,
  OAuth2Token,
  OAuth2AuthorizationCodeClient,
  generateCodeVerifier,
} from 'fetch-mw-oauth2';

type OAuth2Options = {
  client: OAuth2Client;
  scope?: string[];
};

// If there's no global 'crypto', load Node's.
if (!global.crypto) global.crypto = require('crypto');


/**
 * This middleware allows OAuth2 bearer tokens to be specified as cookies.
 *
 * If authentication fails, and we detect a browser, this middleware will
 * automatically attempt to do OAuth2 authentication.
 */
export default function(options: OAuth2Options): Middleware {

  return async (ctx, next) => {

    if (!ctx.session.oauth2CodeVerifier) {
      ctx.session.oauth2CodeVerifier = generateCodeVerifier();
    }

    const authCodeClient = options.client.authorizationCode({
      redirectUri: resolve(ctx.request.origin, '/_browser-auth'),
      state: ctx.state.requestTarget
    });


    if (ctx.request.headers.has('Authorization')) {
      // If there already was an Authorization header, use that.
      return next();
    }

    if (ctx.path === '/_browser-auth') {
      return handleOAuth2Code(ctx, authCodeClient);
    }

    const oauth2Tokens = await getOAuth2Tokens(ctx, options);
    if (!oauth2Tokens) {
      // No active tokens
      return handleInnerRequest(ctx, next, authCodeClient);
    }

    if (!['GET', 'HEAD', 'OPTIONS', 'SEARCH'].includes(ctx.method)) {
      // This is an unsafe method. We will check if there's a CSRF token.
      ctx.validateCsrf();
      delete (ctx.request.body as any)['csrf-token'];
    }

    ctx.request.headers.set('Authorization', 'Bearer ' + oauth2Tokens.accessToken);
    return handleInnerRequest(ctx, next, authCodeClient);

  };

}

async function handleInnerRequest(ctx: Context, next: () => void | Promise<void>, authCodeClient: OAuth2AuthorizationCodeClient) {

  try {
    await next();
  } catch (e) {
    if (e instanceof Unauthorized) {
      const authUrl = await authCodeClient.getAuthorizeUri();
      ctx.response.headers.append('Link', '<' + authUrl + '>; rel="authenticate"');
    }
    throw e;

  }

}

/**
 * This route gets called for the /_browser-auth endpoint.
 *
 * This endpoint is what a user gets redirected to by the OAuth2 server, after
 * a successful or failed login.
 *
 * https://tools.ietf.org/html/rfc6749#section-4.1.2
 */
async function handleOAuth2Code(ctx: Context, authCodeClient: OAuth2AuthorizationCodeClient) {

  const result = await authCodeClient.validateResponse(ctx.request.absoluteUrl);
  const token = authCodeClient.getToken(result);

  ctx.response.status = 303;
  ctx.session.oauth2tokens = token;
  const state = ctx.query.state || '/';
  if (!state.startsWith('/') || state.startsWith('//')) {
    throw new Error('Sandbox violation');
  }
  ctx.response.headers.set('Location', state);
}

async function getOAuth2Tokens(ctx: Context, options: OAuth2Options): Promise<OAuth2Token | null> {

  if (!('session' in ctx)) {
    throw new Error('A session middleware must run before the browser-to-bearer middleware');
  }

  if (!ctx.session.oauth2tokens) {
    return null;
  }

  const token: OAuth2Token = ctx.session.oauth2tokens;

  if (!token.expiresAt || token.expiresAt * 1000 > Date.now()) {
    return token;
  }

  const newToken = await options.client.refreshToken(token);

  ctx.session.oauth2tokens = newToken;
  return newToken;

}
