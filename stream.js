const ramdisk = require('node-ramdisk');
const childProcess = require('child_process');
const util = require('util');

const exec = util.promisify(childProcess.exec);

const deamon = async (command) => {
  console.log(`start command ${command.slice(0, 20)}...`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await exec(command);
    } catch (e) {
      console.error(e);
    }
  }
};

module.exports = class {
  constructor(volume) {
    this.disk = ramdisk(volume);
    this.mountPath = null;
  }

  async run(size = 50) {
    this.mountPath = await new Promise((resolve, reject) => this.disk.create(size, (err, mount) => {
      if (err) {
        reject(err);
      } else {
        resolve(mount);
      }
    }));
    console.log(`create ramdisk on ${this.mountPath}.`);
    deamon(
      `ffmpeg -framerate 5 -video_size 960x720 -i /dev/video0 -vcodec libx264 -preset veryfast -tune zerolatency -b 8M -vf "drawtext=fontfile=/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf: text="%{localtime:%T}": fontcolor=white@0.8: x=7: y=700" -hls_flags delete_segments -g 20 -f hls ${this.mountPath}/output.m3u8`,
    );
    return this.mountPath;
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.disk.delete(this.mountPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};
