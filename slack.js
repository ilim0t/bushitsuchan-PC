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
        this.rtm.on("message", message => this.reply(message));
    }

    /**
     * @return {Promise<string>}
     */
    async getReplyText() {
    }

    reply(receiveMessage) {
        const {user, text, channel, subtype, ts} = receiveMessage;
        if (subtype) {
            // console.log(subtype);
            return;
        } else if (user === this.rtm.activeUserId) {
            return;
        } else if (!text) {
            return;
        } else if (!text.match(new RegExp(`<@${this.rtm.activeUserId}>`))) {
            return;
        }
        if (text.match(/ip$/)) {
            const ips = utils.getLocalIps();
            return this.web.chat.postMessage({
                channel: channel,
                text: ips.map(ip => `address: ${ip}`).join("\n"),
                as_user: true,
                thread_ts: ts
            });
        }

        this.getReplyText()
            .then(replyText =>
                this.web.chat.postMessage({
                    channel: channel,
                    text: replyText,
                    as_user: true,
                    thread_ts: ts
                })
            )
        // console.info(`Message sent: ${response.message.text}`
    }
};