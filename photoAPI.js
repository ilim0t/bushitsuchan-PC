"use strict";

const fs = require("fs");
const {google} = require("googleapis");
const readline = require("readline");
const path = require("path");
const rp = require("request-promise");
// const assert = require("assert");


const rpap = rp.defaults({
    "transform": (body, response) => {
        const constentType = response.headers["content-type"].split("")[0];
        if (constentType === "application/json") {
            return JSON.parse(body)
        } else if (constentType === "text/plain") {
            return body
        } else {
            return body
        }
    }
});

/**
 * @typedef {Object} oAuth2Client
 * @property {function: string} getAccessToken
 */

/**
 * 認証鍵を取得します
 * @param {string} client_id - GCPで取得したクライアントID
 * @param {string} client_secret - GCPで取得したクライアントシークレット
 * @returns {Promise<oAuth2Client>}
 */
module.exports.getOAuthToken = (client_id, client_secret) => {
    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        "urn:ietf:wg:oauth:2.0:oob"
    );
    const scopes = [
        "https://www.googleapis.com/auth/photoslibrary",
        "https://www.googleapis.com/auth/photoslibrary.sharing"
    ];

    const tokenPath = path.join(__dirname, "token.json");
    if (fs.existsSync(tokenPath)) {
        oAuth2Client.setCredentials(require(tokenPath));
        return oAuth2Client
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
            if (authorizationCode === "") {
                console.error("入力が無効です 再実行してください");
                process.exit(1)
            }
            const {tokens} = await oAuth2Client.getToken(authorizationCode);
            oAuth2Client.setCredentials(tokens);
            fs.writeFileSync(tokenPath, JSON.stringify(tokens));
            resolve(oAuth2Client)
        })
    })
};


/**
 * アルバム一覧の取得
 * @param {oAuth2Client} oAuth2Client - getOAuthToken関数で取得します
 * @returns {Promise<Array<Object>>}
 */
module.exports.getAlbumList = async oAuth2Client => {
    const accessToken = await oAuth2Client.getAccessToken();
    const url = "https://photoslibrary.googleapis.com/v1/albums";
    const headers = {
        "Content-type": "application/json",
        Authorization: `Bearer ${accessToken.token}`
    };
    return rpap(url, {
        method: "GET",
        headers: headers
    })
        .then(response => response["albums"])
};


/**
 *  画像のバイナリデータを送信します
 * @param {oAuth2Client} oAuth2Client - getOAuthToken関数で取得します
 * @param photo
 * @param {string} filename
 * @returns {Promise<string>} uploadToken
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
    return rpap(url, {
        method: "POST",
        headers: headers,
        body: photo
    })
};


/**
 * アップロードした画像を単なる写真として保存します
 * @param {oAuth2Client} oAuth2Client - getOAuthToken関数で取得します
 * @param {string} uploadToken - uploadPhoto関数で取得します
 * @param {string} description
 * @returns {Promise<Array<Object>>}
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
    return rpap(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    })
        .then(response => response["newMediaItemResults"])
};


/**
 * アップロードした画像をアルバムに追加します
 * @param {oAuth2Client} oAuth2Client - getOAuthToken関数で取得します
 * @param {string} albumID
 * @param {string} uploadToken - uploadPhoto関数で取得します
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
    return rpap(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    })
        .then(response => response["newMediaItemResults"][0])
};


/**
 * アルバムを作成します
 * @param {oAuth2Client} oAuth2Client - getOAuthToken関数で取得します
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
    return rpap(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    })
};

/**
 * アルバムを共有します
 * @param {oAuth2Client} oAuth2Client - getOAuthToken関数で取得します
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
    return rpap(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    })
};


/**
 * アップロード済みの写真に関する情報を取得します
 * @param {oAuth2Client} oAuth2Client - getOAuthToken関数で取得します
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
    return rpap(url, {
        method: "GET",
        headers: headers,
    })
};

/**
 * 与えられたURLの短縮URLを取得します
 * @param {string} url
 * @returns {Promise<string>} 短縮URL
 */
module.exports.getShortURL = url => {
    return rpap.get(`http://is.gd/create.php?format=simple&format=json&url=${url}`)
        .then(result => JSON.parse(result)["shorturl"])
};

async function main() {
    const {client_id, client_secret} = process.env;
    if (!client_id || !client_secret) {
        console.log("READMEに従ってGoogle Photos APIsの認証鍵を設定してください");
        process.exit(1)
    }
    const oAuth2Client = await module.exports.getOAuthToken(client_id, client_secret);

    const albumTitle = "bushitsuchan_test_album";
    const albums = await module.exports.getAlbumList(oAuth2Client);
    let album = albums.filter((album) => album.title === albumTitle)[0];
    if (album === undefined) {
        album = await module.exports.createAlbum(oAuth2Client, albumTitle);
        await module.exports.shareAlbum(oAuth2Client, album.id)
    }

    const filename = "example.png";
    if (!fs.existsSync(filename)) {
        console.error(`${filename}が存在しないのでアップロードできません`);
        process.exit(1)
    }
    const uploadToken = await module.exports.uploadPhoto(oAuth2Client, fs.createReadStream(filename), filename);
    const {mediaItem} = await module.exports.createAlbumMediaItem(oAuth2Client, album.id, uploadToken, "");
    const {baseUrl} = await module.exports.getMediaItem(oAuth2Client, mediaItem.id);
    console.log(`共有リンク: ${baseUrl}`)
}


if (require.main === module) {
    main().catch(console.error)
}