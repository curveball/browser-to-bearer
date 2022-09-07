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

    npm install @curveball/browser-to-bearer @curveball/oauth2@0.3 @badgateway/oauth2-client

The [`@curveball/oauth2`][2] curveball middleware is not required. If you have a
custom middleware that listens for a `Authorization: Bearer` HTTP header, this
should also work.

The examples below assume you use the `@curveball/oauth2` middleware though.

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
import { OAuth2Client } from '@badgateway/oauth2-client';

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
  authorizationEndpoint: '/authorize',
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
  client,
});

app.use(oauth2({
  client,
}));
```


Setting the right origin
------------------------

By default Curveball will assume you are running this package on
`http://localhost`, which breaks the redirect back from the authentication
server to your app.

To fix this, either:

1. Set the `CURVEBALL_ORIGIN` environment variable. This is recommended in
   most modern deployments. It should have a value such as
   `https://domain.example` without any slashes in the end.
2. Set `app.origin = 'https://domain.example`. This is done on the main
   Curveball application object.

[1]: https://github.com/curveball/core
[2]: https://github.com/curveball/oauth2
