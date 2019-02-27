"use strict";

const photoapi = require("./photoAPI");
const {capture} = require("./caputure");
const slack = require("./slack");

const main = async () => {
    //認証鍵の設定
    const {client_id, client_secret} = process.env;
    if (!client_id || !client_secret) {
        console.log("READMEに従ってGoogle Photos APIsの認証鍵を設定してください");
        process.exit(1)
    }
    const oAuth2Client = await photoapi.getOAuthToken(client_id, client_secret);
    const bot = new slack.Slack();

    //共有するためアルバムを指定
    const albumTitle = "bushitsuchan_album";
    const albums = await photoapi.getAlbumList(oAuth2Client);
    let album = albums.filter((album) => album.title === albumTitle)[0];

    if (album === undefined) {
        album = await photoapi.createAlbum(oAuth2Client, albumTitle);
        await photoapi.shareAlbum(oAuth2Client, album.id)
    }

    bot.start();

    //定期的に撮影した写真の共有リンクをslackbotで送信
    //https://developers.google.com/photos/library/guides/api-limits-quotas に抵触しないように!!
    /**
     * 何msに一回実行するか あまり小さくしすぎるとエラーが発生します
     * @type {number}
     */
    const interval = 10 * 1000;
    if (60 * 60 * 24 * 1000 / 10000 * 3 > interval) {
        console.log(`注意: 1日あたり${(60 * 60 * 24 * 3 / interval * 1000).toLocaleString()}回PhotoAPIを叩く設定で，1日の上限10,000回を越してしまいます`)
    }
    setInterval(async () => {
        const url = await capture(oAuth2Client, album).catch(e => {
            console.error(e.name);
            if (e.name === "StatusCodeError") {
                console.error(JSON.parse(e.error).error.message);
                return
            }
            console.error(e.message)
            // console.error(e)
        });
        if (!url) {
            return
        }
        const shortURL = await photoapi.getShortURL(url);

        // ここをカスタマイズしてください
        bot.url = shortURL;
        // slack.send(shortURL);
    }, interval)
};


if (require.main === module) {
    main().catch(console.error)
}