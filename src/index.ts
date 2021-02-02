import { Context, Middleware } from '@curveball/core';
import '@curveball/session';
import { BadRequest, Unauthorized } from '@curveball/http-errors';
import { default as fetch, Response } from 'node-fetch';
import * as querystring from 'querystring';
import { resolve } from 'url';

type OAuth2Options = {
  authorizeEndpoint: string,
  clientId: string,
  clientSecret: string,
  publicUri: string,
  scope: string[],
  tokenEndpoint: string,
};

/**
 * This middleware allows OAuth2 bearer tokens to be specified as cookies.
 *
 * If authentication fails, and we detect a browser, this middleware will
 * automatically attempt to do OAuth2 authentication.
 */
export default function(options: OAuth2Options): Middleware {

  return async (ctx, next) => {

    if (ctx.request.headers.has('Authorization')) {
      // If there already was an Authorization header, use that.
      return next();
    }

    if (ctx.path === '/_browser-auth') {
      return handleOAuth2Code(ctx, options);
    }

    const oauth2Tokens = await getOAuth2Tokens(ctx, options);
    if (!oauth2Tokens) {
      // No active tokens
      return handleInnerRequest(ctx, next, options);
    }

    if (!['GET', 'HEAD', 'OPTIONS', 'SEARCH'].includes(ctx.method)) {
      // This is an unsafe method. We will check if there's a CSRF token.
      ctx.validateCsrf();
    }

    ctx.request.headers.set('Authorization', 'Bearer ' + oauth2Tokens.accessToken);
    return handleInnerRequest(ctx, next, options);

  };

}

async function handleInnerRequest(ctx: Context, next: () => void | Promise<void> , options: OAuth2Options) {

  try {
    await next();
  } catch (e) {
    if (e instanceof Unauthorized) {
      const state = ctx.request.requestTarget;
      const authUrl = getAuthUrl(options, state);
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
async function handleOAuth2Code(ctx: Context, options: OAuth2Options) {

  if (ctx.query.error) {
    throw new Error('Error from OAuth2 server: ' + ctx.query.error);
  }

  if (!ctx.query.code) {
    throw new BadRequest('A "code" query parameter was expected');
  }
  const code = ctx.query.code;
  const params = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: resolve(options.publicUri, '/_browser-auth'),
    client_id: options.clientId
  };

  const response = await fetch(options.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(options.clientId + ':' + options.clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: querystring.stringify(params),
  });
  if (!response.ok) {
    throw new Error(await responseToErrorMessage(response, 'validating authentication code'));
  }
  const rBody = await response.json();

  ctx.response.status = 303;
  ctx.state.session.oauth2tokens = {
    accessToken: rBody.access_token,
    expires: Date.now() + (rBody.expires_in * 1000),
    refreshToken: rBody.refresh_token,
  };
  const state = ctx.query.state || '/';
  if (!state.startsWith('/') || state.startsWith('//')) {
    throw new Error('Sandbox violation');
  }
  ctx.response.headers.set('Location', state);

}
type OAuth2Token = {
  accessToken: string,
  expires: number,
  refreshToken: string,
};

async function getOAuth2Tokens(ctx: Context, options: OAuth2Options): Promise<OAuth2Token | null> {

  if (!('session' in ctx.state)) {
    throw new Error('A session middleware must run before the browser-to-bearer middleware');
  }

  if (!ctx.state.session.oauth2tokens) {
    return null;
  }

  const token: OAuth2Token = ctx.state.session.oauth2tokens;

  if (token.expires > Date.now()) {
    return token;
  }

  // Attempt to refresh token
  const params = {
    grant_type: 'refresh_token',
    refresh_token: token.refreshToken,
    client_id: options.clientId
  };

  const response = await fetch(options.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(options.clientId + ':' + options.clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: querystring.stringify(params),
  });
  if (!response.ok) {
    throw new Error(await responseToErrorMessage(response, 'refreshing tokens on OAuth2 server'));
  }
  const rBody = await response.json();

  ctx.state.session.oauth2tokens = {
    accessToken: rBody.access_token,
    expires: Date.now() + (rBody.expires_in * 1000),
    refreshToken: rBody.refresh_token,
  };

  return ctx.state.session.oauth2tokens;

}

function getAuthUrl(options: OAuth2Options, state: string): string {
  return options.authorizeEndpoint + '?' + querystring.stringify({
    response_type: 'code',
    client_id: options.clientId,
    redirect_uri: resolve(options.publicUri, '/_browser-auth'),
    scope: options.scope.join(' '),
    state
  });

}


async function responseToErrorMessage(response: Response, op?: string): Promise<string> {

  let message = '';
  if (response.headers.has('Content-Type') && response.headers.get('Content-Type')!.startsWith('application/json')) {
    const jsonBody = await response.json();
    if (jsonBody.error) {
      message += 'Received oauth2 error';
      if (op) { message += ' while ' + op; }
      message += ': '  + jsonBody.error + '.';
      if (jsonBody.error_description) {
        message += ' ' + jsonBody.error_description;
      }
      message += '(HTTP: ' + response.status + ')';
      return message;
    }
  }
  message += 'Received HTTP error';
  if (op) { message += ' while ' + op; }
  message += ': '  + response.status;
  return message;

}
