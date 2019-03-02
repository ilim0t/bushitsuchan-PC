"use strict";

const {RTMClient, WebClient} = require('@slack/client');
const utils = require("./libs/utils");

module.exports.Slack = class Slack {
    /**
     * @param {string} slack_token
     */
    constructor(slack_token) {
        if (!slack_token) {
            throw new TypeError("Slcak botの認証キーがロードできていません。" +
                "READMEに従ってdirenvの設定をしてください。");
        }
        this.rtm = new RTMClient(slack_token);
        this.web = new WebClient(slack_token);
        this.url = "not yet";
    }

    start() {
        this.rtm.start().catch(console.error);
        this.rtm.on("ready", () => console.log("ready"));
        this.rtm.on("message", event => this.reply(event));
        this.rtm.on("reaction_added", async event => this.reactionReply(event))
    }

    static getBolck(text, url) {
        return [
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
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": "リアクションを付けることでアクションを起こせられます. \n:yarinaoshi:で再送, :wasureyou:で削除されます.",
                        "emoji": true
                    }
                ]
            }
        ];
    }

    async reactionReply(event) {
        const {reaction, item, item_user, user} = event;
        if (item_user && item_user !== this.rtm.activeUserId) {
            return;
        }
        const {type, channel, ts} = item;

        if (!["yarinaoshi", "wasureyou", "wastebasket", "recycle"].some(element => reaction === element)) {
            return;
        }
        if (type !== "message") {
            return;
        }
        await this.web.chat.delete({
                channel: channel,
                ts: ts,
                as_user: true
            }
        );
        if (!["wasureyou", "recycle"].some(element => reaction === element)) {
            return;
        }

        const replyText = await this.getReplyText();
        await this.web.chat.postMessage({
            channel: channel,
            text: "再送|部室の様子",
            blocks: Slack.getBolck(`:recycle:が付けられたため再送します\n${new Date().toLocaleString()}から直近一定時間の様子をgifアニメーションにしました.`, replyText),
            icon_emoji: ":slack:",
            // thread_ts: thread_ts || ts,
            // reply_broadcast: true,
            // as_user: true,
            username: "部室ちゃん"
        })
    }

    /**
     * @return {Promise<string>}
     */
    async getReplyText() {
    }


    async reply(event) {
        const {user, text, channel, subtype, ts, thread_ts} = event;
        if (subtype) {
            // console.log(subtype);
            return;
        } else if (user === this.rtm.activeUserId) {
            return;
        } else if (!text) {
            return;
        } else if (!text.match(new RegExp(`<@${this.rtm.activeUserId}>`))) {
            const response = await this.web.im.open({
                user: user,
                include_locale: true
            });
            const dmChannnel = response.channel.id;
            if (dmChannnel !== channel) {
                return;
            }
        }
        if (text.match(/ip$/)) {
            const ips = utils.getLocalIps();
            await this.web.chat.postMessage({
                channel: channel,
                text: ips.map(ip => `address: ${ip}`).join("\n"),
                // thread_ts: thread_ts || ts,
                // reply_broadcast: true,
                as_user: true,
                // username: "部室ちゃん"
            });
            return;
        }

        const replyText = await this.getReplyText();
        await this.web.chat.postMessage({
            channel: channel,
            text: "部室の様子",
            blocks: Slack.getBolck(`${new Date().toLocaleString()}から直近一定時間の様子をgifアニメーションにしました.`, replyText),
            icon_emoji: ":slack:",
            // thread_ts: thread_ts || ts,
            // reply_broadcast: true,
            // as_user: true,
            username: "部室ちゃん"
        })
    }
};