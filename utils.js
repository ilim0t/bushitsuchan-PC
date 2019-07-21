const childProcess = require('child_process');
const util = require('util');

const exec = util.promisify(childProcess.exec);

const wait = ms => new Promise(reolve => setTimeout(() => reolve(), ms));

module.exports.daemon = async (command, ms = 1000 * 10, maxCount = 100) => {
  console.log(`start daemon ${command.slice(0, 40)}...`);
  for (let i = 0; i < maxCount; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await exec(command);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line no-await-in-loop
      await wait(ms);
    }
  }
};
