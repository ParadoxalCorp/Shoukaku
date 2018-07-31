module.exports = {
    address: 'localhost',
    port: 9850,
    discordBaseURL: 'https://discordapp.com/api',
    sentryDSN: '',
    environment: 'production',
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
        },
        errorCodes: {
            413: 'Your image was over 1MB, and whatanime.ga can\'t process images over 1MB'
        },
    }]
};