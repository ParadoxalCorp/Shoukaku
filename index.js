'use strict';

const config = require('./config');
const Shoukaku = require('./src/Shoukaku');
const Sentry = require('@sentry/node');
Sentry.init({
    dsn: config.sentryDSN,
    release: require('./package.json').version,
    environment: config.environment
});

new Shoukaku(config, Sentry);

process.on('unhandledRejection', Sentry.captureException);
process.on('uncaughtException', Sentry.captureException);


