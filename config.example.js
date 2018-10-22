module.exports = {
    address: 'localhost',
    port: 9850,
    discordBaseURL: 'https://discordapp.com/api',
    sentryDSN: '',
    environment: 'production',
    services: [{
        host: 'trace.moe',
        baseURL: 'https://trace.moe/api',
        burst: true,
        requestsPerMinute: 10,
        defaultParams: {
            token: ''
        },
        defaultHeaders: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        errorCodes: {
            413: 'Your image was over 1MB, and trace.moe can\'t process images over 1MB'
        },
    }]
};