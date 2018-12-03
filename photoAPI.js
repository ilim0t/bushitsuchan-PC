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

/**
 @typedef {Object} OAuth2Client
 @property {Function} getAccessToken
 */

/**
 * @returns {Promise<OAuth2Client>}
 */
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

    const tokenPath = path.join(__dirname, 'token.json');
    if (fs.existsSync(tokenPath)) {
        oAuth2Client.setCredentials(require(tokenPath));
        return oAuth2Client;
    }
    const authURL = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });

    console.log(`以下のサイトを開き，認証したあと表示される文字列をここに貼り付けてください\n${authURL}`);
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
            fs.writeFileSync(tokenPath, JSON.stringify(token));
        }).then(() => {
            return oAuth2Client;
        });
}

/**
 * @param {OAuth2Client} oAuth2Client
 * @returns {Promise<Array.<Object>>}
 */
async function getAlbumList(oAuth2Client) {
    const accessToken = await oAuth2Client.getAccessToken();
    const url = "https://photoslibrary.googleapis.com/v1/albums";
    const headers = {
        "Content-type": "application/json",
        Authorization: `Bearer ${accessToken.token}`
    };
    const response = await rpap(url, {
        method: "GET",
        headers: headers
    });
    return response["albums"]
}

/**
 * @param {OAuth2Client} oAuth2Client
 * @param {fs.ReadStream} photo
 * @param {string} filename
 * @returns {Promise<string>}
 */
async function uploadPhoto(oAuth2Client, photo, filename) {
    const accessToken = await oAuth2Client.getAccessToken();
    const url = "https://photoslibrary.googleapis.com/v1/uploads";
    const headers = {
        Authorization: `Bearer ${accessToken.token}`,
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

/**
 * @param {OAuth2Client} oAuth2Client
 * @param {string} uploadToken
 * @param {string} description
 * @returns {Promise<Array.<Object>>}
 */
async function createMediaItem(oAuth2Client, uploadToken, description) {
    const accessToken = await oAuth2Client.getAccessToken();
    const url = "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate";
    const headers = {
        "Content-type": "application/json",
        Authorization: `Bearer ${accessToken.token}`
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
    const oAuth2Client = await getOAuthToken();
    const uploadToken = await uploadPhoto(oAuth2Client, fs.createReadStream('sample.jpeg'), "sample.jpeg");
    const response = await createMediaItem(oAuth2Client, uploadToken, "discription_example");
    console.log(response[0]["mediaItem"].productUrl);
}

if (require.main === module) {
    main().catch(console.error);
}