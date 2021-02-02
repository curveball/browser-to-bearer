Changelog
=========

0.2.0 (2020-02-02)
------------------

* Now supports submitting HTML form. This was blocked due to CSRF problems,
  but we now validate CSRF tokens.
* This is considered a BC break, as this package requires curveball/session
  0.6, which itself has introduced a BC breka.


0.1.4 (2020-10-27)
------------------

* When redirecting to the OAuth2 authorize endpoint, this library will now
  use the full path to allow a user to be redirected back to the original
  page. Before this change the query parameters were stripped.
* Typescript target is now es2019 instead of esnext to ensure that Node v10
  is supported.
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
