"use strict";

const cv = require('opencv4nodejs');
const GIFEncoder = require('gifencoder');


module.exports.Capture = class Capture {
    constructor(devicePort = 0) {
        this.cap = new cv.VideoCapture(devicePort);
        this.photoArray = [];
    }

    capture() {
        return new Promise(resolve => {
            const image = this.cap.read();
            resolve(image);
        })
    };

    setIntervalCapture(ms = 10 * 1000, limit = 6) {
        setInterval(() => {
            if (this.photoArray.length >= limit) {
                this.photoArray.shift();
            }
            this.capture()
                .then(photo => this.photoArray.push(photo));
        }, ms);
    }

    static encode(image, ext) {
        return cv.imencode(ext, image);
    };

    generateGif() {
        if (this.photoArray.length === 0) {
            throw new Error("");
        }
        const [height, width] = this.photoArray[0].sizes;

        const encoder = new GIFEncoder(width, height);
        encoder.start();
        encoder.setRepeat(0);
        encoder.setDelay(200);
        encoder.setQuality(10);
        for (let img of this.photoArray) {
            encoder.addFrame(img.cvtColor(cv.COLOR_BGR2RGBA).getData());
        }
        encoder.finish();
        return encoder.out.getData();
    }

};