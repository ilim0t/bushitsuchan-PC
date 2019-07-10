const crypto = require('crypto');
const url = require('url');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

module.exports = class {
  constructor(siteUrl, liveUrl) {
    this.siteUrl = siteUrl;
    this.liveUrl = liveUrl;

    this.app = express();
    this.app.use(morgan('short'));
    this.app.use(cors());

    this.app.get('/', (req, res) => res.send('Hello World by bushitsuchan!'));
    this.app.get('/live', async (req, res) => {
      const { code } = req.query;
      if (code === undefined) {
        res.status(401).end();
        console.error(req.query);
        return;
      }
      const tokenResponse = await axios({
        method: 'post',
        url: url.format({
          pathname: 'https://github.com/login/oauth/access_token',
          query: {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
          },
        }),
        headers: {
          accept: 'application/json',
        },
      });

      if (tokenResponse.data.error !== undefined) {
        res.status(401).end();
        return;
      }
      const accessToken = tokenResponse.data.access_token;
      if (accessToken === undefined) {
        console.error(tokenResponse.data);
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
        res.status(400);
        console.error(e);
      });

      if (orgResponse.data === undefined) {
        res.status(403).end();
        console.error(orgResponse);
        return;
      }
      if (
        !Array.isArray(orgResponse.data)
        || !orgResponse.data.map(x => x.login).includes(process.env.ORGANIZATION)
      ) {
        res.status(403).end();
        return;
        // res.render('error', { error: err });
      }

      const md5 = crypto.createHash('md5');
      const exp = Math.floor(Date.now() / 1000) + 60;
      const streamId = '/live/stream';
      const key = process.env.LIVE_PRIVATE_KEY;
      res.json({
        address: `${liveUrl}/live/stream.flv`,
        hashValue: `${exp}-${md5.update(`${streamId}-${exp}-${key}`).digest('hex')}`,
      });
    });
    this.app.get('/viewer', (req, res) => {
      const { code } = req.query;
      res.render('flv.ejs', {
        url: url.format({
          pathname: `${siteUrl}/live`,
          query: { code },
        }),
        reloadUrl: siteUrl,
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
          `https://github.com/login/oauth/authorize?client_id=${
            process.env.GITHUB_CLIENT_ID
          }&scope=${scopes.join(' ')}`,
        ),
      );
    });
  }

  run(port = 3000) {
    this.app.listen(port, () => console.log(`Express app listening on port ${port}`));
  }
};
