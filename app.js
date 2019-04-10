"use strict";

const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const {WebClient} = require('@slack/web-api');
const {RTMClient, LogLevel} = require('@slack/rtm-api');
const localtunnel = require('localtunnel');
const {createMessageAdapter} = require('@slack/interactive-messages');
const utils = require("./utils");
const cv = require('opencv4nodejs');


// 環境設定
const {PORT, SUBDOMAIN, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET} = process.env;
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

// const slackSlashCommand = () => {
// };
// app.post('/slack/commands', bodyParser.urlencoded({extended: false}), slackSlashCommand);

app.get("/", (req, res) => {
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end("Hello, world!");
});


// サーバ, tunnnelingの起動
const port = PORT || 3000;

http.createServer(app).listen(port, () => {
    console.log(`server listening on port ${port}`);
});
const tunnel = localtunnel(port, {subdomain: subdomain}, (err, tunnel) => {
    if (err) {
        throw new Error(err);
    }
    console.log(`public url ${tunnel.url} is assigned for your tunnel`);
});
// tunnel.on("request", info => {
//     console.info("tunnnel request", info)
// });
// tunnel.on("error", err => {
//     console.info("tunnel error", err)
// });
// tunnel.on("close", () => {
//     console.info("tunnel close")
// });

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
                    "text": "最新の様子を取得"
                },
                "value": "recycle"
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
rtm.on("message", event => async event => {
    const {user, text, channel, subtype, ts, thread_ts} = event;

    if (subtype) {
        return;
    } else if (user === rtm.activeUserId) {
        return;
        // } else if (!text) {
        //     return;
    } else if (!text.match(new RegExp(`<@${rtm.activeUserId}>`))) {
        return;
    }

    if (text.match(/ip$/)) {
        const ips = utils.getLocalIps();
        await this.web.chat.postMessage({
            channel: channel,
            text: ips.map(ip => `address: ${ip}`).join("\n"),
            icon_emoji: ":slack:",
        });
        return;
    }
    const raondom_num = String(Date.now()) + String(Math.random()).slice(1);
    const image = cv.imencode(`.${ext}`, cap.read());
    app.get(`/photo/${raondom_num}`, (req, res) => {
        res.contentType(`image/${ext}`);
        res.end(image);
    });
    utils.wait(2 * 60 * 1000).then(() => app.get(`/photo/${raondom_num}`));  // imageはgcしてくれるはずだよね
    web.chat.postMessage({
        channel: channel,
        text: "部室の様子",
        blocks: getBlock(`${new Date().toLocaleString("ja")}の写真です.`, `${tunnel.url}/photo/${raondom_num}`),
        icon_emoji: ":slack:",
    });
});

slackInteractions.action({type: 'button'}, (payload, respond) => {
    const {actions, message, user, channel, trigger_id, response_url} = payload;
    const {ts} = message;
    this.web.chat.delete({
            channel: channel.id,
            ts: ts,
        }
    ).catch(console.error);

    if (actions[0].value !== "recycle") {
        return;
    }

    this.web.chat.postEphemeral({
        channel: channel.id,
        user: user.id,
        text: "再送準備中…",
        as_user: true,
    }).catch(console.error);

    const raondom_num = String(Date.now()) + String(Math.random()).slice(1);
    const image = cv.imencode(`.${ext}`, cap.read());
    app.get(`/photo/${raondom_num}`, (req, res) => {
        res.contentType(`image/${ext}`);
        res.end(image);
    });
    utils.wait(2 * 60 * 1000).then(() => app.get(`/photo/${raondom_num}`));  // imageはgcしてくれるはずだよね

    respond({
        channel: channel.id,
        text: "再送|部室の様子",
        blocks: Slack.getBlock(`ボタンが押されたため再送します\nnew Date().toLocaleString("ja")}の写真です.`, `${tunnel.url}/photo/${raondom_num}`),
        icon_emoji: ":slack:",
    })
});

