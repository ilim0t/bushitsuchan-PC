const fs = require('fs');


module.exports = class {
  constructor(mountPath, folder = 'bushitsuchan') {
    this.mountPath = mountPath;
    this.folder = folder;
  }

  async run() {
    await new Promise((resolve, reject) => {
      fs.mkdir(`${this.mountPath}/${this.folder}`, (err) => {
        if (err && err.code !== 'EEXIST') {
          reject(err);
          return;
        }
        resolve();
      });
    });
    // deamon('');
    return `${this.mountPath}/${this.folder}`;
  }

  async close() {
    return fs.rmdirSync(`${this.mountPath}/${this.folder}`);
  }
};
