const ramdisk = require('node-ramdisk');
const childProcess = require('child_process');
const util = require('util');
const fs = require('fs');

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
  constructor(volume, folder = 'bushitsuchan', isMac = false) {
    this.disk = ramdisk(volume);
    this.mountPath = null;
    this.folder = folder;
    this.isMac = isMac;
  }

  async run(size = 50) {
    if (!this.isMac) {
      this.mountPath = '/dev/shm';
      fs.rmdirSync(`${this.mountPath}/${this.folder}`);
      fs.mkdirSync(`${this.mountPath}/${this.folder}`, { recursive: true });
      // deamon('');
      return `${this.mountPath}/${this.folder}`;
    }
    this.mountPath = await new Promise((resolve, reject) => this.disk.create(size, (err, mount) => {
      if (err) {
        reject(err);
      } else {
        resolve(mount);
      }
    }));
    console.log(`create ramdisk on ${this.mountPath}.`);
    // deamon('');
    return `${this.mountPath}/${this.folder}`;
  }

  async close() {
    if (!this.isMac) {
      return Promise.resolve();
    }
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
