"use strict";

const photoapi = require("./libs/photoAPI");
const capture = require("./libs/caputure");
const slack = require("./slack");
const utils = require("./libs/utils");

const main = async () => {
    //写真撮影
    const cap = new capture.Capture(0);
    cap.setIntervalCapture(5 * 1000, 12);

    //環境設定
    const {client_id, client_secret, slack_token} = process.env;
    const oAuth2Client = await photoapi.getOAuthToken(client_id, client_secret);
    const slackBot = new slack.Slack(slack_token);

    //アルバム, 共有の設定
    const albumTitle = "bushitsuchan_album";
    const albums = await photoapi.getAlbumList(oAuth2Client);
    let album = albums.filter(album => album.title === albumTitle)[0];
    if (!album) {
        album = await photoapi.createAlbum(oAuth2Client, albumTitle);
        await photoapi.shareAlbum(oAuth2Client, album.id)
    }

    //slackbotの返信メッセージの設定
    slackBot.getReplyText = async () => {
        const buf = cap.generateGif();
        const uploadToken = await photoapi.uploadPhoto(oAuth2Client, buf, Date().toLocaleString());
        const {mediaItem} = await photoapi.createAlbumMediaItem(oAuth2Client, album.id, uploadToken, "");
        const {baseUrl} = await photoapi.getMediaItem(oAuth2Client, mediaItem.id);
        return await utils.getShortURL(baseUrl);
    };

    //slackbotの開始
    slackBot.start();
};


if (require.main === module) {
    main().catch(console.error)
}