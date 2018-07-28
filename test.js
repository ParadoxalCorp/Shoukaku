const axios = require('axios');
const fs = require('fs');
const querystring = require('querystring');

fs.readFile(require.resolve('./testimage.jpg'), {encoding: 'base64'}, async(err, data) => {
    if (err) {
        return console.log(err);
    }
    let formData = querystring.stringify({image: `${data}`}); 
    const response = await axios.post('http://localhost:9850/request', {
        service: 'whatanime.ga',
        route: '/search',
        data: formData,
        headers: {
            'Content-Length': formData.length
        },
        method: 'post',
        channelID: '235118465071972352',
        userID: '140149699486154753'
    });
    console.log(response.data);
});
