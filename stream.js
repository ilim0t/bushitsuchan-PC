const fs = require('fs');
// const childProcess = require('child_process');
// const util = require('util');

// const exec = util.promisify(childProcess.exec);

// const deamon = async (command) => {
//   console.log(`start command ${command.slice(0, 20)}...`);
//   // eslint-disable-next-line no-constant-condition
//   while (true) {
//     try {
//       // eslint-disable-next-line no-await-in-loop
//       await exec(command);
//     } catch (e) {
//       console.error(e);
//     }
//   }
// };

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
    return fs.rmdir(`${this.mountPath}/${this.folder}`);
  }
};
