"use strict";

const cv = require('opencv4nodejs');

module.exports.capture = async (devicePort = 0, ext = ".png") => {
    const cap = new cv.VideoCapture(devicePort);
    const frame = cap.read();
    return cv.imencode(ext, frame);
};
