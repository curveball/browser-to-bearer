Curveball browser-to-bearer
===========================

This package contains a [Curveball][1] middleware that allows a user with a
regular browser to log into an API that's an OAuth2 resource server.

It will do so by intercepting HTTP `401 Unauthorized` errors, seeing if the
user wanted `Accept: text/html` and redirect the user to an OAuth2
authorization endpoint.

After the user comes back, the access token gets validated and placed into a
cookie. This cookie is then converted to an `Authorization` header, which
will make it seem to the resource server that the user has normal OAuth2
authorization information.

What this enables in a nutshell is allowing developers to browse OAuth2 APIs
with a browser, which otherwise is pretty hard to do.


Installation
------------

    npm install @curveball/browser-to-bearer fetch-mw-oauth2@2


Getting started
---------------

This middleware needs to be loaded *before* your normal authorization
middelware to work correctly. In theory this middleware can work with any
OAuth2 middleware, but the below example is using the `@curveball/oauth2`
middleware.

In addition to a working OAuth2 middleware, it also requires a `session`
middleware.

```typescript
import { Application } from '@curveball/core';
import oauth2 from '@curveball/oauth2';
import browserToBearer from '@curveball/browser-to-bearer';
import session from '@curveball/session';

const app = new Application();

const client = OAuth2Client({

  server: 'https://auth.example/',
  clientId: 'My-app',
  clientSecret: 'some_client_secret',

  /**
   * Only specify these if your OAuth2 server _doesn't_ support auto
   * discovery of these endpoints.
   *
   * If your server does support auto-discovery (through the OAuth2
   * Authorization Metadata document), it's better to omit these as
   * it will future-proof your code.
   */
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  introspectionEndpoint: '/introspect',

});


app.use(session({
  store: 'memory',
  cookieOptions: {
    httpOnly: true,
    // It might be important to set sameSite to false to allow this to work.
    // Without this, cookies will not be sent along after the first redirect
    // from the OAuth2 server.
    sameSite: false,
  }
}));

app.use(browserToBearer({
  // The public URL of this server.
  //
  // this is the url that the user will redirect back to after authentication.
  // only the base URL is required, the middleware handles the rest.
  publicUri: 'https://resource-server.example.org/',
  client,
  scope: [], // List of OAuth2 scopes
});

app.use(oauth2({
  whitelist: [],
  client,
}));
```

[1]: https://github.com/curveball/
