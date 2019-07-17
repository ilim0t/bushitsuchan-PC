const crypto = require('crypto');
const url = require('url');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const helmet = require('helmet');

const hashValue = (expSec, streamId, key) => {
  const md5 = crypto.createHash('md5');
  const exp = Math.floor(Date.now() / 1000) + expSec;
  return `${exp}-${md5.update(`${streamId}-${exp}-${key}`).digest('hex')}`;
};

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
  constructor(siteUrl, liveUrl, clientId, clientSecret, workstationId, pricateKey) {
    this.siteUrl = siteUrl;
    this.liveUrl = liveUrl;

    this.app = express();

    this.app.set('trust proxy', 1);
    this.app.use(helmet());
    this.app.use(morgan('short'));
    this.app.use(cors());

    this.app.use(
      cookieSession({
        secret: 'my-special-secret',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        name: 'session',
        keys: ['key1', 'key2'],
        cookie: {
          secure: true,
          maxAge: 1000 * 60 * 60 * 24 * 15, // 有効期限15日
        },
      }),
    );

    this.app.get('/', (req, res) => res.send('Hello World by bushitsuchan!'));

    this.app.get('/login', (req, res) => {
      const scopes = ['identity.basic'];
      res.redirect(
        url.format({
          protocol: 'https',
          hostname: 'slack.com',
          pathname: '/oauth/authorize',
          query: {
            client_id: clientId,
            scope: scopes.join(' '),
          },
        }),
      );
    });

    this.app.get('/oauth-redirect', (req, res) => {
      const { query } = req;
      getToken(query.code, clientId, clientSecret)
        .then((token) => {
          req.session.token = token;
          res.redirect('viewer');
        })
        .catch(e => console.error(e));
    });

    this.app.use('/viewer', (req, res, next) => {
      const { token } = req.session;
      if (token) {
        next();
        return;
      }
      res.redirect('login');
    });

    this.app.get('/viewer', (req, res) => {
      res.render('flv.ejs', {
        url: 'live',
      });
    });

    this.app.get('/auth', (req, res) => {
      const { token } = req.session;
      authorize(token, workstationId)
        .then(() => {
          res.json({
            address: `${liveUrl}/live/stream.flv`,
            hashValue: hashValue(60, '/live/stream', pricateKey),
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
  }

  run(port = 3000) {
    return new Promise(resolve => this.app.listen(port, () => resolve(port)));
  }
};
