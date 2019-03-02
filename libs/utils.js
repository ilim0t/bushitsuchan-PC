"use strict";

const rp = require("request-promise");
const os = require("os");


const rpap = rp.defaults({
    "transform": (body, response) => {
        const constentType = response.headers["content-type"];
        if (constentType.match(/application\/json/)) {
            return JSON.parse(body)
        } else if (constentType.match(/"text\/plain/)) {
            return body
        } else {
            return body
        }
    }
});
module.exports.rpap = rpap;

/**
 * 与えられたURLの短縮URLを取得します
 * @param {string} url
 * @returns {Promise<string>} 短縮URL
 */
module.exports.getShortURL = async url => {
    const response = await rpap.get(`http://is.gd/create.php?format=simple&format=json&url=${url}`);
    return JSON.parse(response)["shorturl"];
};

/**
 * @return {Array}
 */
module.exports.getLocalIps = () => {
    const interfaces = os.networkInterfaces();
    const ipList = [];
    for (const i in interfaces) {
        for (const iface of interfaces[i]) {
            if (iface.family !== 'IPv4' || iface.internal) {
                continue;
            }
            ipList.push(iface.address);
        }
    }
    if (ipList.length === 0) {
        throw new Error("IP Adressが見つかりません");
    }
    return ipList;
};