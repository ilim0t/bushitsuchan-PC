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

  async run(size = 50, isMac = false) {
    this.mountPath = await new Promise((resolve, reject) => this.disk.create(size, (err, mount) => {
      if (err) {
        reject(err);
      } else {
        resolve(mount);
      }
    }));
    console.log(`create ramdisk on ${this.mountPath}.`);
    if (isMac) {
      // Mac
      // deamon('');
    } else {
      // Ubuntu
      // deamon('');
    }
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
