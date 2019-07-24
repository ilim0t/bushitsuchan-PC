const childProcess = require('child_process');
const util = require('util');
const fs = require('fs');

module.exports.exec = util.promisify(childProcess.exec);

const wait = ms => new Promise(reolve => setTimeout(() => reolve(), ms));

module.exports.daemon = async (command, ms = 1000 * 10, maxCount = 100) => {
  const logger = new console.Console(
    fs.createWriteStream(`${__dirname}/log/daemon-out.log`),
    fs.createWriteStream(`${__dirname}/log/daemon-err.log`),
  );
  console.log(`start daemon ${command}`);
  for (let i = 0; i < maxCount; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await module.exports.exec(command);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line no-await-in-loop
      await wait(ms);
    }
  }
};

module.exports.base64Encode = str => str
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

module.exports.base64Decode = (str) => {
  const replaces = str.replace(/-/g, '+').replace(/_/g, '/');
  return replaces + '='.repeat(4 - ((replaces.length % 4) % 4));
};
