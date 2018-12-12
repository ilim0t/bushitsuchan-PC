"use strict";

const photoapi = require("./photoAPI");
const {capture} = require("./caputure");
const slack = require("./slack");

const main = async () => {
    const {client_id, client_secret} = process.env;
    if (client_id === undefined || client_secret === undefined) {
        console.log("READMEに従ってGoogle Photos APIsの認証鍵を設定してください");
        process.exit(1);
    }
    const oAuth2Client = await photoapi.getOAuthToken(client_id, client_secret);

    const albumTitle = "bushitsuchan_album";
    const albums = await photoapi.getAlbumList(oAuth2Client);
    let album = albums.filter((album) => album.title === albumTitle)[0];

    if (album === undefined) {
        album = await photoapi.createAlbum(oAuth2Client, albumTitle);
        await photoapi.shareAlbum(oAuth2Client, album.id);
    }
    //https://developers.google.com/photos/library/guides/api-limits-quotas に抵触しないように!!
    const interval = 10 * 1000;
    if (60 * 60 * 24 * 1000 / 10000 * 3 > interval) {
        console.log(`注意: 1日あたり${(60 * 60 * 24 * 3 / interval * 1000).toLocaleString()}回PhotoAPIを叩く設定で，1日の上限10,000回を越してしまいます`);
    }
    setInterval(async () => {
        const url = await capture(oAuth2Client, album).catch(e => {
            console.error(e.name);
            if (e.name === "StatusCodeError") {
                console.error(JSON.parse(e.error).error.message);
                return;
            }
            console.error(e.message);
            // console.error(e);
        });

        if (!url) {
            return;
        }
        const shortURL = await photoapi.getShortURL(url);
        slack.send(shortURL); // ここをカスタマイズしてください
    }, interval);
};


if (require.main === module) {
    main().catch(console.error);
}