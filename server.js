const crypto = require('crypto');
const url = require('url');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const hashValue = (expSec, streamId, key) => {
  const md5 = crypto.createHash('md5');
  const exp = Math.floor(Date.now() / 1000) + expSec;
  return `${exp}-${md5.update(`${streamId}-${exp}-${key}`).digest('hex')}`;
};

const authorize = async (code, clientId, clientSecret, organizationName) => {
  if (code === undefined) {
    throw TypeError(`codeが${code}です`);
  }
  const tokenResponse = await axios({
    method: 'post',
    url: url.format({
      pathname: 'https://github.com/login/oauth/access_token',
      query: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
    }),
    headers: {
      accept: 'application/json',
    },
  }).catch((e) => {
    throw Error(e);
  });

  // The code passed is incorrect or expired
  if (tokenResponse.data.error !== undefined) {
    throw TypeError(`codeが無効値${code}で${tokenResponse.data.error}`);
  }

  const accessToken = tokenResponse.data.access_token;
  // console.assert(accessToken !== undefined);
  if (accessToken === undefined) {
    throw Error();
  }

  const orgResponse = await axios({
    method: 'get',
    url: url.format({
      pathname: 'https://api.github.com/user/orgs',
      query: {
        access_token: accessToken,
      },
    }),
    headers: {
      accept: 'application/json',
    },
  }).catch((e) => {
    throw Error(e);
  });

  // console.assert(orgResponse.data !== undefined);
  if (orgResponse.data === undefined) {
    throw Error();
  }
  if (!orgResponse.data.map(x => x.login).includes(organizationName)) {
    throw Error();
    // 403
  }
};

module.exports = class {
  constructor(siteUrl, liveUrl, clientId, clientSecret, organizationName, pricateKey) {
    this.siteUrl = siteUrl;
    this.liveUrl = liveUrl;

    this.app = express();
    this.app.use(morgan('short'));
    this.app.use(cors());

    this.app.get('/', (req, res) => res.send('Hello World by bushitsuchan!'));

    this.app.get('/live', async (req, res) => {
      const { code } = req.query;
      // if (code === undefined) {
      //   res.status(401).end();
      //   return;
      // }
      authorize(code, clientId, clientSecret, organizationName)
        .then(() => {
          res.json({
            address: `${liveUrl}/live/stream.flv`,
            hashValue: hashValue(60, '/live/stream', pricateKey),
          });
        })
        .catch((e) => {
          if (e instanceof TypeError) {
            res.status(401).end();
          } else {
            res.status(403).end();
          }
        });
    });

    this.app.get('/viewer', (req, res) => {
      const { code } = req.query;
      res.render('flv.ejs', {
        url: url.format({
          pathname: `${siteUrl}/live`,
          query: { code },
        }),
        reloadUrl: `${siteUrl}/auth`,
      });
    });

    this.app.get('/oauth-redirect', (req, res) => {
      const { code } = req.query;
      res.redirect(
        url.format({
          pathname: `${siteUrl}/viewer`,
          query: { code },
        }),
      );
    });

    this.app.get('/auth', (req, res) => {
      const scopes = ['read:org'];
      res.redirect(
        encodeURI(
          `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scopes.join(
            ' ',
          )}`,
        ),
      );
    });
  }

  run(port = 3000) {
    return new Promise(resolve => this.app.listen(port, () => resolve(port)));
  }
};
