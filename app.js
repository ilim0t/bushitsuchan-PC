"use strict";

const express = require('express');
const http = require('http');
// const bodyParser = require('body-parser');
const morgan = require('morgan');
const { WebClient } = require('@slack/web-api');
const { RTMClient, LogLevel } = require('@slack/rtm-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const utils = require("./utils");
const cv = require('opencv4nodejs');


// 環境設定
const { PORT, SUBDOMAIN, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;
const subdomain = SUBDOMAIN || "bushitsuchan";
const slackBotToken = SLACK_BOT_TOKEN;
const slackSigningSecret = SLACK_SIGNING_SECRET;
const ext = "jpg";
const devicePort = 0;

// SlackBotの初期化
const rtm = new RTMClient(slackBotToken, {
    logLevel: LogLevel.INFO,
});
const web = new WebClient(SLACK_BOT_TOKEN);
const slackInteractions = createMessageAdapter(slackSigningSecret);

// サーバーの初期化
const app = express();
app.use(morgan("short"));
app.use("/slack/actions", slackInteractions.expressMiddleware());
const cap = new cv.VideoCapture(devicePort);
const images = new Map();

// const slackSlashCommand = () => {
// };
// app.post('/slack/commands', bodyParser.urlencoded({extended: false}), slackSlashCommand);

app.get("/", (req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello, world!");
});

app.get(`/photo/:imageKey`, (req, res) => {
    if (!images.has(req.params.imageKey)) {
        res.sendStatus(404);
        return;
    }
    res.contentType(`image/${ext}`);
    res.send(images.get(req.params.imageKey));
});


// サーバ, tunnnelingの起動
const port = PORT || 3000;

http.createServer(app).listen(port, () => {
    console.log(`server listening on port ${port}`);
    console.log(`while :; do ssh -R ${subdomain}:80:localhost:3000 serveo.net; done と実行してtunnelingしましょう.`)
});
const serverUrl = `https://${subdomain}.serveo.net`;

const getBlock = (text, url) => [
    {
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": text
        }
    },
    {
        "type": "image",
        "title": {
            "type": "plain_text",
            "text": "部室の様子",
            "emoji": true
        },
        "image_url": `${url}`,
        "alt_text": "部室の様子"
    },
    {
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "emoji": true,
                    "text": "更新"
                },
                "value": "reload"
            },
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "emoji": true,
                    "text": "この投稿を削除"
                },
                "value": "delete"
            }
        ]
    }
];

// const { self, team } = await rtm.start();
rtm.start()
    .catch(console.error);
rtm.on("ready", () => console.log("slack RTM Client is ready"));
rtm.on("message", async event => {
    const { user, text, channel, subtype, ts, thread_ts } = event;

    if (subtype) {
        return;
    } else if (user === rtm.activeUserId) {
        return;
        // } else if (!text) {
        //     return;
    } else if (!text.match(new RegExp(`<@${rtm.activeUserId}>`))) {
        return;
    }
    const channelInfo = await web.conversations.info({
        channel: channel
    }).catch(console.error);
    const { is_channel, is_private } = channelInfo.channel;
    if (!is_channel || is_private) {
        web.chat.postEphemeral({
            channel: channel,
            user: user,
            text: "publicなチャンネルでのみ機能するよう仕様を変更しました。",
            as_user: true,
        }).catch(console.error);
        return;
    }
    if (text.match(/ip$/)) {
        const ips = utils.getLocalIps();
        web.chat.postMessage({
            channel: channel,
            text: ips.map(ip => `address: ${ip}`).join("\n"),
            icon_emoji: ":slack:",
        }).catch(console.error);
        return;
    }
    const raondom_num = String(Date.now()) + String(Math.random()).slice(1);
    const time = new Date().toLocaleString("ja");
    const img = cap.read();
    img.putText(time, new cv.Point2(
        40, img.sizes[0] - 20), cv.FONT_HERSHEY_PLAIN, 2.5, new cv.Vec3(255, 255, 255));
    const encodedImg = cv.imencode(`.${ext}`, img);
    images.set(raondom_num, encodedImg);
    utils.wait(24 * 60 * 60 * 1000)
        .then(() => images.delete(raondom_num));
    web.chat.postMessage({
        channel: channel,
        text: "部室の様子",
        blocks: getBlock(`${time}の写真です.`, `${serverUrl}/photo/${raondom_num}`),
        icon_emoji: ":slack:",
    }).catch(console.error);
});

slackInteractions.action({ type: 'button' }, (payload, respond) => {
    const { actions, message, user, channel, trigger_id, response_url } = payload;
    const { ts } = message;
    images.delete(message.blocks[1].image_url.match(new RegExp(`${serverUrl}/photo/(\\d+.\\d+)`))[1]);
    if (actions[0].value !== "reload") {
        web.chat.delete({
            "channel": channel.id,
            "ts": ts,
        }).catch(console.error);
        return;
    }
    const raondom_num = String(Date.now()) + String(Math.random()).slice(1);
    new Promise(resolve => resolve(cap.read()))
        .then(img => {
            const time = new Date().toLocaleString("ja");
            img.putText(time, new cv.Point2(
                40, img.sizes[0] - 20), cv.FONT_HERSHEY_PLAIN, 2.5, new cv.Vec3(255, 255, 255));
            const encodedImg = cv.imencode(`.${ext}`, img);
            images.set(raondom_num, encodedImg);
            utils.wait(24 * 60 * 60 * 1000)
                .then(() => images.delete(raondom_num));
            return time;
        })
        .then(time => {
            const reply = payload.message;
            reply.text = "再送|部室の様子";
            reply.blocks = getBlock(
                `<@${user.id}>によりボタンが押されたため再送します\n${time}の写真です.`, `${serverUrl}/photo/${raondom_num}`);
            respond(reply);
        })
        .then(() => web.chat.postEphemeral({
            channel: channel.id,
            user: user.id,
            text: "写真が更新されました",
            as_user: true,
        }))
        .catch(console.error);

    const reply = message;
    reply.blocks.pop();
    return reply;
});

