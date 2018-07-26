module.exports = {
    address: 'localhost',
    port: 9850,
    token: '',
    discordBaseURL: 'https://discordapp.com/api',
    services: [{
        host: 'whatanime.ga',
        baseURL: 'https://whatanime.ga/api',
        burst: true,
        requestsPerMinute: 10,
        defaultParams: {
            token: ''
        },
        defaultHeaders: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }]
};