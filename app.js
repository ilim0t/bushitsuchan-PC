'use strict';

const {google} = require('googleapis');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const request = require('request');

async function example_upload(token, image, callback) {
    const headers = {
        'Content-Type': 'application/octet-stream',
        'X-Goog-Upload-File-Name': 'FILENAME',
        'X-Goog-Upload-Protocol': 'raw',
    };

    const options = {
        url: 'https://photoslibrary.googleapis.com/v1/uploads',
        method: 'POST',
        headers: headers,
        json: true,
        auth: {
            bearer: token.token
        },
        body: {
            MEDIA_BINARY_DATA: image
        }
    };

    await request(options, (error, response, body) => {
        callback(body);
    });
}

async function getToken(callback) {
    const keyPath = path.join(__dirname, 'oauth2.keys.json');
    const TOKEN_PATH = path.join(__dirname, 'token.json');
    let keys = {};
    if (fs.existsSync(keyPath)) {
        keys = require(keyPath).web;
    }

    const oAuth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        'urn:ietf:wg:oauth:2.0:oob'
    );

    const scopes = [
        'https://www.googleapis.com/auth/photoslibrary'
    ];
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });

    console.log(`以下のファイルを開き，認証したあと表示される文字列をここに貼り付けてください\n${authUrl}`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    await rl.question('入力: ', (authorizationCode) => {
        rl.close();
        oAuth2Client.getToken(authorizationCode).then(value => {
            const token = value.tokens;
            oAuth2Client.setCredentials(token);
            // fs.writeFile(TOKEN_PATH, JSON.stringify(token), console.error);
            oAuth2Client.getAccessToken().then(callback);
        }).catch(console.error);
    });
}


async function main() {
    await getToken((token) => {
        const image = fs.readFileSync('sample.png');
        const base64_data = "data:image/jpeg;base64," + image.toString('base64');
        const uploadToken = example_upload(token, base64_data, (uploadToken) => {
            console.log('uploadToken: ', uploadToken)
        });
    });
}

main().catch(console.error);