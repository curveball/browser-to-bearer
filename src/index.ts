import { Context, Middleware } from '@curveball/core';
import '@curveball/session';
import { Unauthorized } from '@curveball/http-errors';
import {
  OAuth2Client,
  OAuth2Token,
  generateCodeVerifier,
} from 'fetch-mw-oauth2';

type OAuth2Options = {
  client: OAuth2Client;
  scope?: string[];
};

type OAuth2CodeData = {
  state: string;
  redirectUri: string;
  codeVerifier: string;
  continueUrl: string;
}


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

    const oauth2Client = options.client;

    if (ctx.request.headers.has('Authorization')) {
      // If there already was an Authorization header, use that.
      return next();
    }
    if (!('session' in ctx)) {
      throw new Error('A session middleware must run before the browser-to-bearer middleware');
    }

    if (ctx.path === '/_browser-auth') {
      // We got redirected back after authorization
      return handleOAuth2Code(ctx, oauth2Client);
    }

    const oauth2Tokens = await getOAuth2Tokens(ctx, options);
    if (!oauth2Tokens) {
      // No OAUth2 tokens found
      return handleInnerRequest(ctx, next, oauth2Client);
    }

    if (!['GET', 'HEAD', 'OPTIONS', 'SEARCH'].includes(ctx.method)) {
      // This is an unsafe method. We will check if there's a CSRF token.
      ctx.validateCsrf();
      delete (ctx.request.body as any)['csrf-token'];
    }

    ctx.request.headers.set('Authorization', 'Bearer ' + oauth2Tokens.accessToken);
    return handleInnerRequest(ctx, next, oauth2Client);

  };

}

async function handleInnerRequest(ctx: Context, next: () => void | Promise<void>, oauth2Client: OAuth2Client) {

  try {
    await next();
  } catch (e) {
    if (e instanceof Unauthorized) {

      const codeData: OAuth2CodeData = {
        // Re-using the code-verifier function. It's really just a random string
        state: generateCodeVerifier(),
        codeVerifier: generateCodeVerifier(),
        redirectUri: ctx.request.origin + '/_browser-auth',
        // This property is not a fetch-mw-oauth2 property, but we use it to
        // know where to send the user after a successful auth. All of this is
        // kept in the session.
        continueUrl: ctx.request.requestTarget,
      };

      ctx.session.oauth2CodeData = codeData;

      const authUrl = await oauth2Client.authorizationCode.getAuthorizeUri(codeData);
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
async function handleOAuth2Code(ctx: Context, oauth2Client: OAuth2Client) {

  const codeData: OAuth2CodeData = ctx.session.oauth2CodeData;

  const token = await oauth2Client.authorizationCode.getTokenFromCodeRedirect(
    ctx.request.absoluteUrl,
    codeData
  );

  ctx.response.status = 303;
  ctx.session.oauth2tokens = token;
  delete ctx.session.oauth2CodeData;

  ctx.response.headers.set('Location', codeData.continueUrl);
}

async function getOAuth2Tokens(ctx: Context, options: OAuth2Options): Promise<OAuth2Token | null> {

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
