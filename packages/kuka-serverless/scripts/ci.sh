#!/usr/bin/env bash
set -e
npm config set @kuka-js:registry http://registry.npmjs.org
npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN
npm whoami
npm ci --also=dev
serverless offline start --env test > /tmp/sls-offline.log 2>&1 &
node start-tests.js
#curl --verbose -X POST -H 'Content-Type: application/json' -d '{"username":"nake89+debug1@gmail.com","email":"nake89+debug1@gmail.com","password":"nake89@gmail.COM"}' http://localhost:4000/test/register
# Disabled currently because this script now runs start-tests.js. We'll see how this goes.
#npm test
# Gotta disable semantic release because I'm trying to fix CICD currently
#npm run semantic-release
