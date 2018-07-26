'use strict';

const config = require('./config');
const Shoukaku = require('./src/Shoukaku');
const { inspect } = require('util');

new Shoukaku(config);

process.on('unhandledRejection', err => console.error(inspect(err)));
process.on('uncaughtException', console.error);


