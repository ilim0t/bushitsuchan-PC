const childProcess = require('child_process');
const util = require('util');
const fs = require('fs');

const exec = util.promisify(childProcess.exec);

const wait = ms => new Promise(reolve => setTimeout(() => reolve(), ms));

module.exports.daemon = async (command, ms = 1000 * 10, maxCount = 100) => {
  const logger = new console.Console(
    fs.createWriteStream('out.log'),
    fs.createWriteStream('err.log'),
  );
  console.log(`start daemon ${command.slice(0, 40)}...`);
  for (let i = 0; i < maxCount; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await exec(command);
    } catch (e) {
      logger.error(e);
      // eslint-disable-next-line no-await-in-loop
      await wait(ms);
    }
  }
};
