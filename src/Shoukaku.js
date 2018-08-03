'use strict';

const Collection = require('./Collection');
const RequestHandler = require('./RequestHandler');
const Hapi = require('hapi');
const { inspect } = require('util');
const axios = require('axios');
const WhatAnimeHandler = require('./WhatAnimeHandler');

class Shoukaku {
    constructor(config, Sentry) {
        this.requestHandlers = new Collection();
        this.server = Hapi.server({
            address: config.address,
            port: config.port
        });
        this.server.route({
            method: 'POST',
            path: '/request',
            config: {
                handler: this.onRequest.bind(this),
                payload: {
                    maxBytes: 5242880
                }
            },
        });
        this.Sentry = Sentry;
        this.config = config;
        this.discordErrorCodes = {
            50013: {
                abort: true
            },
            50007: {
                abort: true
            },
            50001: {
                abort: true
            }
        };
        for (const service of config.services) {
            this.requestHandlers.set(service.host, new RequestHandler(service));
        }
        this.startServer(config.port);
    }

    startServer(port) {
        this.server.start()
            .then(() => {
                console.log(`Server listening on port ${port}`);
            })
            .catch(err => {
                console.error(`Failed to start the server: ${inspect(err)}`);
            });
    }
    
    estimateRequestTime(requestHandler) {
        if (requestHandler.burst) {
            if ((requestHandler.requestsDone + 1) < requestHandler.requestsPerMinute) {
                return 0;
            } 
            return 60000 * Math.ceil(requestHandler.queue.length / requestHandler.requestsPerMinute + 1);
        }
        else if (requestHandler.sequential) {
            return requestHandler.interval * requestHandler.queue.length;
        }
    }

    onRequest(request, h) {
        const requestHandler = this.requestHandlers.get(request.payload.service);
        this.processRequest(requestHandler, request.payload);
        return h.response(JSON.stringify({queued:true, estimatedTime: this.estimateRequestTime(requestHandler)})).code(200).header('Content-Type', 'application/json');
    }

    processRequest(requestHandler, request) {
        request = {
            ...request,
            processedAt: Date.now()
        };
        requestHandler.queueRequest(request)
            .then(this.processResponse.bind(this, requestHandler, request))
            .catch(err => {
                const error = this.identifyError(requestHandler, err);
                const mention = (Date.now() - 7500) > request.processedAt ? `<@!${request.userID}> ` : '';
                axios.post(`${this.config.discordBaseURL}/channels/${request.channelID}/messages`, { content: mention + error }, {
                    headers: {
                        'Authorization': `Bot ${request.botToken}`,
                        'Content-Type': `application/json`
                    },
                });
            });
    }

    identifyError(requestHandler, err) {
        if (err.response.status >= 500) {
            return `:x: whatanime.ga's servers seems to be down at the moment, maybe try again later?`;
        } else if (requestHandler.errorCodes[err.response.status]) {
            return `:x: ${requestHandler.errorCodes[err.response.status]}`;
        }
        this.Sentry.captureException(err);
        return `:x: An error occurred`;
    }

    async processResponse(requestHandler, request, response) {
        switch (requestHandler.host) {
            case 'whatanime.ga':
                WhatAnimeHandler.handleResponse(request, response, this).catch(this.Sentry.captureException);
                break;
        }
    }
}

module.exports = Shoukaku;