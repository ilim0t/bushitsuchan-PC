"use strict";

const photoapi = require("./photoAPI");
const {capture} = require("./caputure");
const slack = require("./slack");
const utils = require("./utils");

const main = async () => {
    //環境設定
    const {client_id, client_secret, slack_token} = process.env;
    const oAuth2Client = await photoapi.getOAuthToken(client_id, client_secret);
    const slackBot = new slack.Slack(slack_token);

    //アルバム, 共有のの設定
    const albumTitle = "bushitsuchan_album";
    const albums = await photoapi.getAlbumList(oAuth2Client);
    let album = albums.filter(album => album.title === albumTitle)[0];
    if (!album) {
        album = await photoapi.createAlbum(oAuth2Client, albumTitle);
        await photoapi.shareAlbum(oAuth2Client, album.id)
    }

    slackBot.getReplyText = async () => {
        const photo = await capture(0, ".png");
        const uploadToken = await photoapi.uploadPhoto(oAuth2Client, photo, Date().toLocaleString());
        const {mediaItem} = await photoapi.createAlbumMediaItem(oAuth2Client, album.id, uploadToken, "");
        const {baseUrl} = await photoapi.getMediaItem(oAuth2Client, mediaItem.id);
        const shortUrl = await utils.getShortURL(baseUrl);
        return shortUrl;
    };

    //slackbotの開始
    slackBot.start();
};


if (require.main === module) {
    main().catch(console.error)
}