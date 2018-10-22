'use strict';

const axios = require('axios').default;
const config = require('../config');
const FormData = require('form-data');

class WhatAnimeHandler {
    /**
     * 
     * @param {object} request - The request sent by the bot 
     * @param {*} response - The response from whatanime.ga's servers
     * @param {*} Shoukaku - Shoukaku
     * @returns {Promise<void>} Nothing here but us chickens
     */
    static async handleResponse(request, response, Shoukaku) {
        const mention = (Date.now() - 7500) > request.processedAt && !request.dm ? `<@!${request.userID}> ` : '';
        if (!response.data.RawDocsCount) {
            return {
                content: `${mention}Your image did not returned any results`
            };
        }
        const firstResult = response.data.docs[0];
        let res = `${mention}\n`;
        res += `**Similarity**: ${(firstResult.similarity * 100).toFixed(2)}%\n`;
        res += `**Anime**: ${firstResult.title_romaji}\n`;
        if (firstResult.episode) {
            res += `**Episode**: ${firstResult.episode}\n`;
        }
        res += `**Anilist page**: <https://anilist.co/anime/${firstResult.anilist_id}>\n`;
        if (firstResult.mal_id) {
            res += `**MyAnimeList page**: <https://myanimelist.net/anime/${firstResult.mal_id}>\n`;
        }
        if (!firstResult.is_adult || request.nsfw) {
            let preview = await this.downloadPreview(firstResult);
            if (preview) {
                res += `**Preview**: `;
                res = this.buildMultipartForm(preview, {content: res});
                return axios.post(`${config.discordBaseURL}/channels/${request.channelID}/messages`, res, {
                    headers: {
                        'Authorization': `Bot ${request.botToken}`,
                        'Content-Type': `multipart/form-data; boundary=${res._boundary}`,
                    }
                }).catch(this.identifyAndHandleError.bind(this, Shoukaku));
            }
        }
        return axios.post(`${config.discordBaseURL}/channels/${request.channelID}/messages`, {content: res}, {
            headers: {
                'Authorization': `Bot ${request.botToken}`,
                'Content-Type': `application/json`,
            }
        }).catch(this.identifyAndHandleError.bind(this, Shoukaku));
    }

    static parsePosition(position) {
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
    }

    static downloadPreview(firstResult) {
        return axios.get(`https://trace.moe/thumbnail.php?anilist_id=${firstResult.anilist_id}&file=${encodeURIComponent(firstResult.filename)}&t=${firstResult.at}&token=${firstResult.tokenthumb}`, {
            responseType: 'arraybuffer'
        })
        .then(res => res.data)
        .catch(err => {
            console.log(err);
            return false;
        });
    }

    static buildMultipartForm(buffer, body) {
        let data = new FormData();
        data.append('file', buffer, {filename: 'preview.jpg'});
        if(body) {
            data.append("payload_json", JSON.stringify(body));
        }
        return data;
    }

    static identifyAndHandleError(Shoukaku, err) {
        if (err.response.data && err.response.data.code) {
            const knownError = Shoukaku.discordErrorCodes[err.response.data.code];
            if (knownError && knownError.abort) {
                return;
            }
        }
        Shoukaku.Sentry.captureException(err);
    }
}

module.exports = WhatAnimeHandler;