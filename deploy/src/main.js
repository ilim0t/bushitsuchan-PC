const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const morgan = require('morgan');
const childProcess = require('child_process');
const util = require('util');

const execFile = util.promisify(childProcess.execFile);

const { DEPLOY_SECRET, HOOK_BRANCH, DEPLOYMENT_ENV } = process.env;

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('short'));

app.post('/', (req, res) => {
  const signature = req.headers['x-hub-signature'];

  const shasum = crypto.createHmac('sha1', DEPLOY_SECRET);
  shasum.update(JSON.stringify(req.body));
  const hash = `sha1=${shasum.digest('hex')}`;

  if (signature === undefined) {
    res.sendStatus(401);
    return;
  }
  if (signature !== hash) {
    res.sendStatus(403);
    return;
  }
  if (req.body.ref !== `refs/heads/${HOOK_BRANCH}`) {
    req.sendStatus(202);
  }

  execFile('docker-compose', ['-f', 'utils/docker-compose.deploy.yml', 'up', '-d', '--force-recreate', DEPLOYMENT_ENV], { cwd: '/bushitsuchan-PC' });
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  execFile('docker-compose', ['-f', 'utils/docker-compose.deploy.yml', 'up', '-d', '--force-recreate', DEPLOYMENT_ENV], { cwd: '/bushitsuchan-PC' });
  res.sendStatus(200);
});

app.listen(80, () => console.log('Example app listening on port 80.'));
