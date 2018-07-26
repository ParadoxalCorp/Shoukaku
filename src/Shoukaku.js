'use strict';

const Collection = require('./Collection');
const RequestHandler = require('./RequestHandler');
const Hapi = require('hapi');
const { inspect } = require('util');
const axios = require('axios');

class Shoukaku {
    constructor(config) {
        this.requestHandlers = new Collection();
        this.server = Hapi.server({
            address: config.address,
            port: config.port
        });
        this.server.route({
            method: 'POST',
            path: '/request',
            config: {
                handler: this.onRequest.bind(this)
            }
        });
        this.config = config;
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
        return h.response(`{"queued":true, estimatedTime: ${this.estimateRequestTime(requestHandler)}}`).code(200).header('Content-Type', 'application/json');
    }

    processRequest(requestHandler, request) {
        request = {
            ...request,
            processedAt: Date.now()
        };
        requestHandler.queueRequest(request)
            .then(res => console.log(res)/*this.processResponse.bind(this, requestHandler)*/)
            .catch(err => {
                console.log(err);
                //Identify error
                //Retry logic
            });
    }

    processResponse(requestHandler, response) {
        switch (requestHandler.host) {
            case 'whatanime.ga':
                axios.post(`${this.config.discordBaseURL}/channels/235118465071972352/messages`, {
                    headers: {
                        'Authorization': `Bot ${this.config.token}`,
                        'Content-Type': `application/json`
                    },
                    data: {
                        content: '```js\n' + inspect(response) + '```'
                    }
                })
                .catch(err => {
                    console.log(err);
                    //Identify error
                    //Retry logic
                });
                break;
        }
    }
}

module.exports = Shoukaku;