'use strict';

const axios = require('axios');
const querystring = require('querystring');

class RequestHandler {
    constructor(config) {
        Object.assign(this, config);
        this.queue = [];
        this.requestsDone = 0;
        this.resume;
        this.sweepInterval = this.burst ? setInterval(this.sweep.bind(this), 60e3) : false;
        this.interval = this.requestsPerMinute / 60e3;
        this.cooldownLift;
    } 

    queueRequest(request, options = {}) {
        return new Promise(async(resolve, reject) => {
            let needExecution = this.queue.length === 0 ? true : false;
            this.queue.push({
                request: this.formatRequest(request),
                resolve: resolve,
                reject: reject,
                beforeNextRequest: options.beforeNextRequest || this.interval
            });

            if (needExecution) {
                this.execute();
            }
        });
    }

    async execute() {
        const toExecute = this.queue[0];
        if (!this.burst) {
            toExecute.request()
                .then(res => toExecute.resolve(res))
                .catch(err => toExecute.reject(err));
            setTimeout(() => {
                this.queue.shift();
                if (this.queue.length > 0) {
                    this.execute();
                }
            }, toExecute.beforeNextRequest);
        } else {
            if ((this.requestsDone >= this.requestsPerMinute) && (this.requestsPerMinute !== 0)) {
                this.cooldownLift = new Promise((resolve) => {
                    this.resume = resolve;
                });
                await this.cooldownLift;
                this.cooldownLift = null;
            }
            toExecute.request()
                .then(res => toExecute.resolve(res))
                .catch(err => toExecute.reject(err));
            this.requestsDone++;
            this.queue.shift();
            if (this.queue.length > 0) {
                this.execute();
            }
        }
    }

    sleep(ms) {
        return new Promise((resolve) => { setTimeout(resolve, ms); });
    }

    sweep() {
        this.requestsDone = 0;
        if (this.resume) {
            this.resume();
        }
    }

    formatRequest(request) {
        return () => {
            const params = querystring.stringify(this.defaultParams && request.params ? Object.assign({...this.defaultParams}, request.params) : (request.params || this.defaultParams));
            return axios({
                method: request.method,
                url: `${this.baseURL}${request.route}?${params}`,
                data: request.data,
                headers: this.defaultHeaders && request.headers ? Object.assign({...this.defaultHeaders}, request.headers) : (request.headers || this.defaultHeaders)
            });
        };
    }
}

module.exports = RequestHandler;