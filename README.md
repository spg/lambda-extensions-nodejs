# About

Sample CDK project that demonstrates the usage of a NodeJS Lambda Extension that sends logs to an HTTP endpoint.

# Installation

`npm i`

# Deployment

1. `npx esbuild lib/layer/nodejs-example-extension/index.ts --bundle --platform=node --outfile=lib/layer/nodejs-example-extension/index.js`
1. `npx cdk deploy --all --profile {your AWS profile}`
