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
 * 写真を撮影しGooglePhotoへとアップロード，その共有リンクを取得します
 * @param {oAuth2Client} oAuth2Client - photoapi.getOAuthToken関数で取得します
 * @param {Object} album
 * @returns {Promise<void>}
 */
module.exports.capture = async (oAuth2Client, album) => {
    const photo = await new Promise((resolve, reject) => {
        Webcam.capture("capture", (err, photo) => {
            if (err) {
                reject(err)
            }
            resolve(photo)
        })
    }).catch(e => {
        console.error(e);
        console.error(
            "READMEに従ってカメラを使えるようにしてください\n" +
            "また，OSやセキュリティソフトでカメラへのアクセスをブロックしている可能性もあります 解除してください\n");
        process.exit(1)
    });
    const uploadToken = await photoapi.uploadPhoto(oAuth2Client, photo, Date().toLocaleString());
    const {mediaItem} = await photoapi.createAlbumMediaItem(oAuth2Client, album.id, uploadToken, "");
    const {baseUrl} = await photoapi.getMediaItem(oAuth2Client, mediaItem.id);
    return baseUrl
};