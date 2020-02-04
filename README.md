![Travis CI](https://travis-ci.org/nake89/serverless-jwt-boilerplate.svg?branch=master)

# serverless_jwt_boilerplate

A Typescript jwt boilerplate using the Serverless framework

## Development

- `npm i -g serverless`
- `npm i -D`
- `cp .env.local.template .env.local`. Then modify .env.local with your details.
- `sls offline start --env local`
- Start modifying your ts files. Hot reload AKA Every save will automatically restart the server :)

### .env variables

In local and maybe even in dev you might want to have email addresses to be auto verified.
In that case, have this in your .env.local: `AUTO_VERIFY_MAIL=true`
To reset passwords in dev without email sending capability. You can put this in .env.local: `AUTO_SEND_PASSWORD_RESET_ID=true`. Then the reset endpoint will return the password reset ID immediately. DO NOT USE THIS IN ANYTHING BUT LOCAL OR DEV MODE! Otherwise anyone can reset your password through this endpoint. This is for testing purposes only.

### Email

If you want the email sending functionality to work, e.g. sending mail verification link, password reset link. Make sure your .env has `VER_SENDER` and `VER_RECIPIENT` set. Also set up AWS SES here: https://aws.amazon.com/ses/getting-started/
Adding general SMTP support is in the to-do list.

## Deployment

- Setup [AWS credentials](https://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/setup-credentials.html)
- Run `cp .env.development.template .env.development`. Then modify .env.development with your the correct DB credentials and AWS region. Do the same to the other env template files.
- Then depending on where you want to deploy. Run

* `sls deploy --env development`
* `sls deploy --env staging`
* `sls deploy --env production`

## What works

- Register endpoint
- Email verification endpoint
- Login endpoint (returns token)
- Hidden endpoint (endpoint to test that token verification works)
- Password reset
- Local dev uses sqlite for DB. (no config needed)
- Deployment works. Connects to the DB. Put your DB settings in the .env._stage_

## Status

This is still a working progress so the master branch is continually being updated.
