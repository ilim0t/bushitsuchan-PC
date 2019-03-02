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
        this.rtm.on("reaction_added", async event => {
            const {reaction, item, item_user, user} = event;
            if (!item_user || item_user !== this.rtm.activeUserId) {
                return;
            }
            const {type, channel, ts} = item;

            if (!["yarinaoshi", "wasureyou"].some(element => reaction === element)) {
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
            if (reaction === "wasureyou") {
                return;
            }

            const replyText = await this.getReplyText();
            await this.web.chat.postMessage({
                channel: channel,
                text: replyText,
                as_user: true,
                // username: "部室ちゃん"
            })
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
            text: replyText,
            // thread_ts: thread_ts || ts,
            // reply_broadcast: true,
            as_user: true,
            // username: "部室ちゃん"
        })
        // console.info(`Message sent: ${response.message.text}`
    }
};