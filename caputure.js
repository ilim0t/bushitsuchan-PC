"use strict";

const photoapi = require("./photoAPI");
const NodeWebcam = require('node-webcam');
const slack = require("./slack");


const Webcam = NodeWebcam.create({
    width: 1280,
    height: 720,
    quality: 100,

    delay: 0,
    saveShots: true,
    device: false,
    callbackReturn: "buffer",
    verbose: false
});

/**
 @typedef {Object} OAuth2Client
 @property {Function} getAccessToken
 */

/**
 * @param {OAuth2Client}oAuth2Client
 * @param {Object} album
 */
module.exports.capture = async (oAuth2Client, album) => {
    const photo = await new Promise((resolve, reject) => {
        Webcam.capture("capture", (err, photo) => {
            if (err) {
                reject(err);
            }
            resolve(photo);
        })
    }).catch(e => {
        console.error(e);
        console.error(
            "READMEに従ってカメラを使えるようにしてください\n" +
            "また，OSやセキュリティソフトでカメラへのアクセスをブロックしている可能性もあります 解除してください\n");
        process.exit(1);
    });
    const uploadToken = await photoapi.uploadPhoto(oAuth2Client, photo, Date().toLocaleString());
    const mediaItem = await photoapi.createAlbumMediaItem(oAuth2Client, album.id, uploadToken, "");
    if (mediaItem === undefined) {
        console.error()
    }
    const {baseUrl} = await photoapi.getMediaItem(oAuth2Client, mediaItem.mediaItem.id);
    if (baseUrl === undefined || baseUrl === "") {
        console.error()
    }
    return baseUrl;
};

async function main() {
    const oAuth2Client = await photoapi.getOAuthToken();

    const albumTitle = "bushitsuchan_test_album";
    const albums = await photoapi.getAlbumList(oAuth2Client);
    let album = albums.filter((album) => album.title === albumTitle)[0];
    if (!album.length) {
        album = await photoapi.createAlbum(oAuth2Client, albumTitle);
        await photoapi.shareAlbum(oAuth2Client, album.id);
    }
    setInterval(() => module.exports.capture(oAuth2Client, album).then(slack.send), 5000);
}

if (require.main === module) {
    main().catch(console.error);
}