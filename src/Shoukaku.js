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
                handler: this.onRequest.bind(this),
                payload: {
                    maxBytes: 5242880
                }
            },
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
            .then(this.processResponse.bind(this, requestHandler, request))
            .catch(err => {
                const error = this.identifyError(requestHandler, err);
                const mention = (Date.now() - 7500) > request.processedAt ? `<@!${request.userID}> ` : '';
                axios.post(`${this.config.discordBaseURL}/channels/${request.channelID}/messages`, { content: mention + error }, {
                    headers: {
                        'Authorization': `Bot ${this.config.token}`,
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
        console.log(err);
        return `:x: An error occurred`;
    }

    async processResponse(requestHandler, request, response) {
        switch (requestHandler.host) {
            case 'whatanime.ga':
                let data = this.formatWhatAnimeResponse(request, response);
                axios.post(`${this.config.discordBaseURL}/channels/${request.channelID}/messages`, data, {
                    headers: {
                        'Authorization': `Bot ${this.config.token}`,
                        'Content-Type': `application/json`
                    },
                })
                .catch(err => {
                    console.log(err);
                    //Identify error
                    //Retry logic
                });
                break;
        }
    }

    formatWhatAnimeResponse(request, response) {
        const mention = (Date.now() - 7500) > request.processedAt ? `<@!${request.userID}> ` : '';
        if (!response.data.RawDocsCount) {
            return {
                content: `${mention}Your image did not returned any results`
            };
        }
        //eslint-disable-next-line no-unused-vars
        const parsePosition = (position) => {
            position = Math.round(position);
            let hours = `${Math.round(Math.floor(position) / 60 / 60)}`;
            let minutes = `${Math.round(Math.floor(position) / 60 - (60 * parseInt(hours)))}`;
            let seconds = `${Math.round(Math.floor(position) - (60 * (Math.floor(position / 60))))}`;
            if (hours === '0') {
                hours = '';
            }
            if (hours.length === 1) {
                hours = '0' + hours;
            }
            if (minutes === '0') {
                minutes = '00';
            }
            if (minutes.length === 1) {
                minutes = '0' + minutes;
            }
            if (seconds === '0') {
                seconds = '00';
            }
            if (seconds.length === 1) {
                seconds = '0' + seconds;
            }
            return `${hours ? (hours + ':') : hours}${minutes}:${seconds}`;
        };
        const firstResult = response.data.docs[0];
        const similarity = firstResult.similarity.toString();
        let res = `${mention}\n`;
        res += `**Similarity**: ${similarity.charAt(2) + similarity.charAt(3)}.${similarity.charAt(4) + similarity.charAt(5)}%\n`;
        res += `**Anime**: ${firstResult.title_romaji}\n`;
        res += `**Episode**: ${firstResult.episode}\n`;
        res += `**Anilist page**: <https://anilist.co/anime/${firstResult.anilist_id}>\n`;
        if (firstResult.mal_id) {
            res += `**MyAnimeList page**: <https://myanimelist.net/anime/${firstResult.mal_id}>\n`;
        }
        res += `**Preview**: https://whatanime.ga/thumbnail.php?anilist_id=${firstResult.anilist_id}&file=${encodeURIComponent(firstResult.filename)}&t=${firstResult.at}&token=${firstResult.tokenthumb}`;
        return {
            content: res
        };
    }
}

module.exports = Shoukaku;