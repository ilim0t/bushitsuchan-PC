"use strict";
const os = require("os");
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

module.exports.wait = ms => new Promise(resolve => setTimeout(() => resolve(), ms));