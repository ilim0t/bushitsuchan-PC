"use strict";

const fs = require("fs");
const {google} = require("googleapis");
const readline = require("readline");
const path = require("path");
const rp = require("request-promise");
// const assert = require("assert");


const rpap = rp.defaults({
    transform: (body, response, resolveWithFullResponse) => {
        const constentType = response.headers["content-type"].split(";")[0];
        if (constentType === "application/json") {
            return JSON.parse(body);
        } else if (constentType === "text/plain") {
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
module.exports.getOAuthToken = async () => {
    const keyPath = path.join(__dirname, "oauth2.keys.json");
    let keys = {};
    if (fs.existsSync(keyPath)) {
        keys = require(keyPath).web;
    }
    const oAuth2Client = new google.auth.OAuth2(
        keys["client_id"],
        keys["client_secret"],
        "urn:ietf:wg:oauth:2.0:oob"
    );
    const scopes = [
        "https://www.googleapis.com/auth/photoslibrary",
        "https://www.googleapis.com/auth/photoslibrary.sharing"
    ];

    const tokenPath = path.join(__dirname, "token.json");
    if (fs.existsSync(tokenPath)) {
        oAuth2Client.setCredentials(require(tokenPath));
        return oAuth2Client;
    }
    const authURL = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes
    });

    console.log(`以下のサイトを開き，認証したあと表示される文字列をここに貼り付けてください\n${authURL}`);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => {
        rl.question("入力: ", async authorizationCode => {
            rl.close();
            const value = await oAuth2Client.getToken(authorizationCode);
            const token = value.tokens;
            oAuth2Client.setCredentials(token);
            fs.writeFileSync(tokenPath, JSON.stringify(token));
            resolve(oAuth2Client);
        })
    });
};

/**
 * @param {OAuth2Client} oAuth2Client
 * @returns {Promise<Array.<Object>>}
 */
module.exports.getAlbumList = async (oAuth2Client) => {
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
};

/**
 * @param {OAuth2Client} oAuth2Client
 * @param {ReadStream} photo
 * @param {string} filename
 * @returns {Promise<string>}
 */
module.exports.uploadPhoto = async (oAuth2Client, photo, filename) => {
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
};

/**
 * @param {OAuth2Client} oAuth2Client
 * @param {string} uploadToken
 * @param {string} description
 * @returns {Promise<Array.<Object>>}
 */
module.exports.createMediaItem = async (oAuth2Client, uploadToken, description) => {
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
};

/**
 * @param {OAuth2Client} oAuth2Client
 * @param {string} albumID
 * @param {string} uploadToken
 * @param {string} description
 * @returns {Promise<Object>}
 */
module.exports.createAlbumMediaItem = async (oAuth2Client, albumID, uploadToken, description) => {
    const accessToken = await oAuth2Client.getAccessToken();
    const url = "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate";
    const headers = {
        "Content-type": "application/json",
        Authorization: `Bearer ${accessToken.token}`
    };
    const body = {
        "albumId": albumID,
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
    return response["newMediaItemResults"][0];
};

/**
 * @param {OAuth2Client} oAuth2Client
 * @param {string} title
 * @returns {Promise<Object>}
 */
module.exports.createAlbum = async (oAuth2Client, title) => {
    const accessToken = await oAuth2Client.getAccessToken();
    const url = "https://photoslibrary.googleapis.com/v1/albums";
    const headers = {
        "Constent-type": "application/json",
        Authorization: `Bearer ${accessToken.token}`
    };
    const body = {
        album: {
            title: title
        }
    };
    return await rpap(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    });
};

/**
 * @param {OAuth2Client} oAuth2Client
 * @param {string} albumID
 * @returns {Promise<Object>}
 */
module.exports.shareAlbum = async (oAuth2Client, albumID) => {
    const accessToken = await oAuth2Client.getAccessToken();
    const url = `https://photoslibrary.googleapis.com/v1/albums/${albumID}:share`;
    const headers = {
        "Constent-type": "application/json",
        Authorization: `Bearer ${accessToken.token}`
    };
    const body = {
        "sharedAlbumOptions": {
            "isCollaborative": "true",
            "isCommentable": "true"
        }
    };
    return await rpap(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    });
};

/**
 * @param {OAuth2Client} oAuth2Client
 * @param {string} mediaItemID
 * @returns {Promise<Object>}
 */
module.exports.getMediaItem = async (oAuth2Client, mediaItemID) => {
    const accessToken = await oAuth2Client.getAccessToken();
    const url = `https://photoslibrary.googleapis.com/v1/mediaItems/${mediaItemID}`;
    const headers = {
        "Constent-type": "application/json",
        Authorization: `Bearer ${accessToken.token}`
    };
    return await rpap(url, {
        method: "GET",
        headers: headers,
    });
};

async function main() {
    const oAuth2Client = await module.exports.getOAuthToken();

    const albumTitle = "bushitsuchan_test_album";
    const albums = await module.exports.getAlbumList(oAuth2Client);
    let album = albums.filter((album) => album.title === albumTitle);
    if (!album.length) {
        album = await module.exports.createAlbum(oAuth2Client, albumTitle);
        await module.exports.shareAlbum(oAuth2Client, album.id);
    }

    const filename = "figure_personal_space.png";
    const uploadToken = await module.exports.uploadPhoto(oAuth2Client, fs.createReadStream(filename), filename);
    const {mediaItem} = await module.exports.createAlbumMediaItem(oAuth2Client, album.id, uploadToken, "");
    const {baseUrl} = await module.exports.getMediaItem(oAuth2Client, mediaItem.id);
    console.log(`共有リンク: ${baseUrl}`);
}


if (require.main === module) {
    main().catch(console.error);
}