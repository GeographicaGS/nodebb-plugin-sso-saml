# NodeBB SAML SSO

NodeBB Plugin that allows users to login/register via SAML IDP

## Installation

    1) npm install nodebb-plugin-sso-saml.

    2) Activate plugin at nodebb admin panel.

    3) Once you activated it you can configure all the params at SAML section.

        - IdP entry point: it's the saml IdP entry point. E.g https://<sever>/simplesaml/saml2/idp/SSOService.php.
        - Callback path: path to callback. Eg: /auth/saml/callback.
        - Issuer: issuer string to supply IdP. Eg: 'nodebb-saml'
        - Metadata url: url where metadata will be served at. Optional.
        - Server CRT file: Server crt path. Mandatory if used metadata url.
        

## Support

If you need more info or if you need some help, please report an issue at https://github.com/GeographicaGS/nodebb-plugin-sso-saml/issues


## About
This plugin has been built on top of passport.saml, for more info visit https://github.com/bergie/passport-saml.
