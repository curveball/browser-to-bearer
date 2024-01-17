Changelog
=========

1.0.0 (2024-01-17)
------------------

* Finally! Curveball v1. Only took 6 years.
* CommonJS support has been dropped. The previous version of this library
  supported both CommonJS and ESM. The effort of this no longer feels worth it.
  ESM is the future, so we're dropping CommonJS.
* Now requires Node 18.
* Upgraded to Typescript 5.3.


0.5.0 (2023-02-15)
------------------

* This package now supports ESM and CommonJS modules.
* No longer supports Node 14. Please use Node 16 or higher.


0.4.3 (2022-10-11)
------------------

* Throw a better error when session data is missing.


0.4.2 (2022-10-01)
------------------

* Actually honor the 'scope' option.


0.4.1 (2022-09-28)
------------------

* Re-release with dependencies corrected.


0.4.0 (2022-09-03)
------------------

* Upgraded from `@curveball/core` to `@curveball/kernel`.


0.3.5 (2022-07-14)
------------------

* Allow installation with `@curveball/session` 0.7 peerDependency.
* Switch from `fetch-mw-oauth2` to `@badgateway/oauth2-client`.


0.3.4 (2022-04-26)
------------------

* Alpha release.
* Require `fetch-mw-oauth2` 2.0.9, which has a critical bug fix.


0.3.3 (2022-04-26)
------------------

* Alpha release.
* Updates to support most recent fetch-mw-oauth2 changes.


0.3.2 (2022-04-24)
------------------

* Alpha release.
* Fix response validation to use absolute url.


0.3.1 (2022-04-25)
------------------

* Alpha release.
* Ensure we polyfill Web Crypto with Node Crypto.


0.3.0 (2022-04-25)
------------------

* Alpha release.
* Now uses `fetch-mw-oauth2` for all the OAuth2 interactions.
* PKCE support.
* The setup of the middleware changed. Refer to the documentation to see how
  it's done.
* The `publicUri` setting is gone, set `CURVEBALL_ORIGIN` instead, or leave it
  default for `http://localhost`.


0.2.2 (2021-02-04)
------------------

* Delete CSRF token from the body after validating.


0.2.1 (2021-02-02)
------------------

* Storing oauth2 tokens was completely broken.


0.2.0 (2021-02-02)
------------------

* Now supports submitting HTML form. This was blocked due to CSRF problems, but
  we now validate CSRF tokens.
* This is considered a BC break, as this package requires curveball/session
  0.6, which itself has introduced a BC breka.


0.1.4 (2020-10-27)
------------------

* When redirecting to the OAuth2 authorize endpoint, this library will now use
  the full path to allow a user to be redirected back to the original page.
  Before this change the query parameters were stripped.
* Typescript target is now es2019 instead of esnext to ensure that Node v10 is
  supported.
* Switch from tslint to eslint.


0.1.3 (2020-01-05)
------------------

* Allow installation on Curveball 0.10.


0.1.2 (2019-11-11)
------------------

* Fix 'redirect_uri' when validating the OAuth2 code


0.1.1 (2019-11-11)
------------------

* Emit better error messages when something goes wrong while communicating to
  OAuth2 server.


0.1.0 (2019-11-11)
------------------

* Fix a bug in generating redirect uri.


0.0.3 (2019-11-11)
------------------

* Throw a better error when no session middleware is available


0.0.2 (2019-11-11)
------------------

* Re-release with correct files.


0.0.1 (2019-11-07)
------------------

* First version
