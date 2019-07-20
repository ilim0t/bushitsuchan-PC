const url = require('url');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const helmet = require('helmet');

const getToken = async (code, clientId, clientSecret) => {
  if (code === undefined) {
    throw TypeError(`codeが${code}です`);
  }
  const tokenResponse = await axios({
    method: 'post',
    url: url.format({
      protocol: 'https',
      hostname: 'slack.com',
      pathname: '/api/oauth.access',
      query: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
    }),
    headers: {
      accept: 'application/json',
    },
  }).catch(e => console.error(e));

  // The code passed is incorrect or expired
  if (!tokenResponse.data.ok) {
    throw TypeError(`codeが無効値${code}で${tokenResponse.data.error}`);
  }
  return tokenResponse.data.access_token;
};

const authorize = async (token, workstationId) => {
  const result = await axios({
    method: 'get',
    url: url.format({
      protocol: 'https',
      hostname: 'slack.com',
      pathname: '/api/users.identity',
      query: { token },
    }),
    headers: {
      accept: 'application/json',
    },
  }).catch(e => console.error(e));

  if (!result.data.ok) {
    throw new TypeError();
  }
  if (result.data.team.id !== workstationId) {
    throw new Error();
  }
};

module.exports = class {
  constructor(ngrokUrl, awsUrl, mountPath, config) {
    this.ngrokUrl = ngrokUrl;
    this.awsUrl = awsUrl;
    this.mountPath = mountPath;
    this.config = config;

    this.app = express();
    this.app.set('trust proxy', 1);
    this.app.use(helmet());
    this.app.use(morgan('short'));
    this.app.use(cors());
    this.routing();
  }

  routing() {
    this.app.use(
      cookieSession({
        secret: this.config.privateKey,
        maxAge: 1000 * 60 * 60 * 24 * 15, // 有効期限15日
        secure: true,
        httpOnly: true,
      }),
    );

    this.app.get('/', (req, res) => res.send('Hello Bushitsuchan!'));

    this.app.get('/login', (req, res) => {
      const scopes = ['identity.basic'];
      res.redirect(
        url.format({
          protocol: 'https',
          hostname: 'slack.com',
          pathname: '/oauth/authorize',
          query: {
            client_id: this.config.slackClientId,
            scope: scopes.join(' '),
          },
        }),
      );
    });

    this.app.get('/oauth-redirect', (req, res) => {
      const { query } = req;
      getToken(query.code, this.config.slackClientId, this.config.slackClientSecret)
        .then((token) => {
          req.session.token = token;
          res.redirect('viewer');
        })
        .catch(e => console.error(e));
    });

    this.app.get('/logout', (req, res) => {
      req.session = null;
      res.send('You have successfully logged out');
    });

    this.app.use(['/auth', '/viewer', '/stream'], (req, res, next) => {
      const { token } = req.session;
      if (token) {
        next();
        return;
      }
      res.redirect('login');
    });

    this.app.get('/auth', (req, res) => {
      const { token } = req.session;
      authorize(token, this.config.wsId)
        .then(() => {
          req.session.lastAutedTime = Date.now();
          res.json({
            address: 'stream/output.m3u8',
          });
        })
        .catch((e) => {
          if (e instanceof TypeError) {
            res.status(401).end(); // 再login
          } else {
            res.status(403).end(); // 権限をもっていない
          }
        });
    });

    this.app.get('/viewer', (req, res) => {
      res.sendFile('./views/viewer.html', { root: __dirname });
    });

    const expireTime = 60 * 1000;

    this.app.use('/stream', (req, res, next) => {
      const { lastAutedTime, token } = req.session;

      if (lastAutedTime === undefined || lastAutedTime + expireTime < Date.now()) {
        authorize(token, this.config.wsId)
          .then(() => {
            req.session.lastAutedTime = Date.now();
            next();
          })
          .catch(() => res.send(403).end());
      } else {
        next();
      }
    });

    this.app.use('/stream', (req, res, next) => {
      const { lastAutedTime } = req.session;
      if (lastAutedTime > Date.now()) {
        req.session = null;
        res.status(403).end();
      }
      next();
    });

    this.app.use('/stream', express.static(this.mountPath));
  }

  run(port = 3000) {
    return new Promise(resolve => this.app.listen(port, () => resolve(port)));
  }
};
