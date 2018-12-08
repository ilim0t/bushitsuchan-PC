"use strict";

const photoapi = require("./photoAPI");
const {capture} = require("./caputure");
const slack = require("./slack");

const main = async () => {
    const oAuth2Client = await photoapi.getOAuthToken();

    const albumTitle = "bushitsuchan_album";
    const albums = await photoapi.getAlbumList(oAuth2Client);
    let album = albums.filter((album) => album.title === albumTitle);
    if (!album.length) {
        album = await photoapi.createAlbum(oAuth2Client, albumTitle);
        await photoapi.shareAlbum(oAuth2Client, album.id);
    }
    setInterval(async () => {
        const url = await capture(oAuth2Client, album);
        slack.send(url); // ここをカスタマイズしてください
    }, 5000);
};


if (require.main === module) {
    main().catch(console.error);
}