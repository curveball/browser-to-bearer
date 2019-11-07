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

    npm install @curveball/browser-to-bearer


Getting started
---------------

This middleware needs to be loaded *before* your normal authorization
middelware to work correctly. In theory this middleware can work with any
OAuth2 middleware, but the below example is using the `@curveball/oauth2`
middleware.

```typescript
import { Application } from '@curveball/core';
import oauth2 from '@curveball/oauth2';
import browserToBearer from '@curveball/browser-to-bearer';


const app = new Application();

app.use(browserToBearer({
  authorizeEndpoint: 'https://auth.example.org/authorize',
  tokenEndpoint: 'https://auth.example.org/token',
  clientId: 'some_client_id',
  clientSecret: 'some_client_secret',
  publicUri: 'https://resource-server.example.org/', // where to redirect back to
  scope: [], // List of OAuth2 scopes
});

app.use(oauth2({
  introspectionEndpoint: 'https://auth.example.org/introspect'
});
```


[1]: https://github.com/curveball/
