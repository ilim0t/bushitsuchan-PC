'use strict';

const {google} = require('googleapis');
const path = require('path');
const fs = require('fs');
const readlineSync = require('readline-sync');
const request = require('request');

async function example_get(oauth2Client) {
    const accessToken = await oauth2Client.getAccessToken();

    const headers = {
        'Content-Type': 'application/application/json'
    };

    const options = {
        url: 'https://photoslibrary.googleapis.com/v1/albums',
        method: 'GET',
        headers: headers,
        json: true,
        auth: {
            bearer: accessToken.token
        }
    };

    request(options, (error, response, body) => {
        console.log(body);
    })
}

async function main() {
    const keyPath = path.join(__dirname, 'oauth2.keys.json');
    let keys = {};
    if (fs.existsSync(keyPath)) {
        keys = require(keyPath).web;
    }

    const oauth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        'urn:ietf:wg:oauth:2.0:oob'
    );

    const scopes = [
        'https://www.googleapis.com/auth/photoslibrary'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    console.log(`以下のファイルを開き，認証したあと表示される文字列をここに貼り付けてください\n${url}`);
    const authorizationCode = readlineSync.question('入力: ');

    const {tokens} = await oauth2Client.getToken(authorizationCode);
    oauth2Client.setCredentials(tokens);

    example_get(oauth2Client);
}

main().catch(console.error);