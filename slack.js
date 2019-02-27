"use strict";
const {RTMClient, WebClient} = require('@slack/client');
const rp = require("request-promise");


const rpap = rp.defaults({
    transform: (body, response) => {
        const constentType = response.headers["content-type"].split(";")[0];
        if (constentType === "application/json") {
            return JSON.parse(body);
        } else if (constentType === "text/plain") {
            return body;
        } else {
            return body;
        }
    }
});

const wait = time => new Promise(resolve => setTimeout(resolve, time));

module.exports.Slack = class Slack {
    constructor() {
        const {slack_token} = process.env;
        this.rtm = new RTMClient(slack_token);
        this.web = new WebClient(slack_token);
        this.url = "not yet";
    }

    start() {
        this.rtm.start();
        this.rtm.on("message", message => this.reply(message));
    }

    async reply(message) {
        // console.debug(`message: ${JSON.stringify(message)}\n`);
        const {user, text, channel, subtype, ts} = message;
        if (user === this.rtm.activeUserId) {
            return
        } else if (!text || text === "/") {
            return
        }

        const replyText = this.url;

        const response = await this.web.chat.postMessage({
            channel: channel,
            text: replyText,
            as_user: true,
            thread_ts: message.thread_ts || message.event_ts
        });
        console.info(`Message sent: ${response.message.text}`);
    }
};


module.exports.send = value => {
    console.log(`未実装ですが以下を投稿したことになりました ${value}`)
};