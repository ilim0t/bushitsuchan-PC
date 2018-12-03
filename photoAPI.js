'use strict';

const fs = require('fs');
const {google} = require("googleapis");
const readline = require("readline");
const path = require("path");
const rp = require('request-promise');

const rpap = rp.defaults({
    transform: (body, response, resolveWithFullResponse) => {
        const constentType = response.headers['content-type'].split(';')[0];
        if (constentType === 'application/json') {
            return JSON.parse(body);
        } else if (constentType === 'text/plain') {
            return body;
        } else {
            return body;
        }
    }
});

async function getOAuthToken() {
    const keyPath = path.join(__dirname, 'oauth2.keys.json');
    let keys = {};
    if (fs.existsSync(keyPath)) {
        keys = require(keyPath).web;
    }

    const oAuth2Client = new google.auth.OAuth2(
        keys["client_id"],
        keys["client_secret"],
        'urn:ietf:wg:oauth:2.0:oob'
    );

    const scopes = [
        'https://www.googleapis.com/auth/photoslibrary'
    ];
    const authURL = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });

    console.log(`以下のファイルを開き，認証したあと表示される文字列をここに貼り付けてください\n${authURL}`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => rl.question('入力: ', resolve))
        .then((authorizationCode) => {
            rl.close();
            return oAuth2Client.getToken(authorizationCode);
        })
        .then(value => {
            const token = value.tokens;
            oAuth2Client.setCredentials(token);
            return oAuth2Client.getAccessToken();
        });
}

async function getAlbumList(oAuthToken) {
    const url = "https://photoslibrary.googleapis.com/v1/albums";
    const headers = {
        "Content-type": "application/json",
        Authorization: `Bearer ${oAuthToken}`
    };
    const response = await rpap(url,
        {
            method: "GET",
            headers: headers
        });
    return response["albums"]
}

async function uploadPhoto(oAuthToken, photo, filename) {
    const url = "https://photoslibrary.googleapis.com/v1/uploads";
    const headers = {
        Authorization: `Bearer ${oAuthToken}`,
        "Content-type": "application/octet-stream",
        "X-Goog-Upload-File-Name": filename,
        "X-Goog-Upload-Protocol": "raw"
    };
    return await rpap(url, {
        method: "POST",
        headers: headers,
        body: photo
    });
}

async function createMediaItem(oAuthToken, uploadToken, description) {
    const url = "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate";
    const headers = {
        "Content-type": "application/json",
        Authorization: `Bearer ${oAuthToken}`
    };
    const body = {
        "newMediaItems": [
            {
                "description": description,
                "simpleMediaItem": {
                    "uploadToken": uploadToken
                }
            }
        ]
    };
    const response = await rpap(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    });
    return response["newMediaItemResults"];
}

async function main() {
    const {token} = await getOAuthToken();
    // const token = '';
    console.log(token);
    const photo = fs.createReadStream('sample.png');
    const uploadToken = await uploadPhoto(token, photo, "sample.png");
    const response = await createMediaItem(token, uploadToken, "discription_example");
    console.log(response);
}

if (require.main === module) {
    main().catch(console.error);
}