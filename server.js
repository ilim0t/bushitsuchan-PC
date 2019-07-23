const url = require('url');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
const childProcess = require('child_process');
const fs = require('fs');

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
  return result.data.user.name;
};

const resPhoto = (rtmpAddress, ext = 'jpg') => (req, res) => {
  const ffmpeg = childProcess.spawn('ffmpeg', [
    '-i',
    `${rtmpAddress}`,
    '-ss',
    '0.7',
    '-vframes',
    '1',
    '-f',
    'image2',
    'pipe:1',
  ]);

  res.contentType(`image/${ext}`);
  ffmpeg.stdout.pipe(res);
};

module.exports = class {
  constructor(ngrokUrl, awsUrl, mountPath, config, rtmpAddress) {
    this.ngrokUrl = ngrokUrl;
    this.awsUrl = awsUrl;
    this.mountPath = mountPath;
    this.config = config;
    this.rtmpAddress = rtmpAddress;

    this.app = express();
    this.app.set('trust proxy', 1);
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(
      cookieSession({
        secret: this.config.privateKey,
        maxAge: 1000 * 60 * 60 * 24 * 15, // 有効期限15日
        secure: true,
        httpOnly: true,
      }),
    );

    morgan.token('user', (req, res) => req.session && (req.session.name || 'anonymous'));
    this.app.use(
      morgan(
        '<@:user> [:date[clf]] :method :url :status :res[content-length] - :response-time ms',
        {
          skip: (req, res) => ['.ts', '.m3u8', '.jpg'].some(element => req.path.endsWith(element)),
        },
      ),
    );
    this.app.use(
      morgan(
        ':remote-addr - :remote-user <@:user> [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
        {
          stream: fs.createWriteStream(`${__dirname}/log/access.log`, { flags: 'a' }),
        },
      ),
    );
    this.routing();
  }

  routing() {
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
            team: this.config.wsId, // うまく機能しない
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

    if (!this.config.debug) {
      this.app.use(
        ['/auth', '/viewer', '/photo-viewer', '/stream', '/photo.jpg'],
        (req, res, next) => {
          const { token } = req.session;
          if (token) {
            next();
            return;
          }
          res.redirect('login');
        },
      );
    }
    this.app.get('/auth', (req, res) => {
      const { token } = req.session;
      if (this.config.debug) {
        res.json({
          hlsAddress: 'stream/output.m3u8',
          photoAddress: 'photo.jpg',
        });
        return;
      }
      authorize(token, this.config.wsId)
        .then((name) => {
          req.session.name = name;
          req.session.lastAutedTime = Date.now();
          res.json({
            hlsAddress: 'stream/output.m3u8',
            photoAddress: 'photo.jpg',
          });
        })
        .catch((e) => {
          if (e instanceof TypeError) {
            res.sendStatus(401).end(); // 再login
          } else {
            res.sendStatus(403).end(); // 権限をもっていない
          }
        });
    });

    this.app.get(['/viewer', '/photo-viewer'], (req, res) => {
      res.sendFile(`./views/${req.url}.html`, { root: __dirname });
    });

    const expireTime = 60 * 1000;

    if (!this.config.debug) {
      this.app.use(['/stream', '/photo.jpg'], (req, res, next) => {
        const { lastAutedTime, token } = req.session;
        if (!token) {
          res.sendStatus(401).end();
        }
        if (!lastAutedTime || lastAutedTime + expireTime < Date.now()) {
          authorize(token, this.config.wsId)
            .then((name) => {
              req.session.name = name;
              req.session.lastAutedTime = Date.now();
              next();
            })
            .catch(() => res.send(403).end());
        } else {
          next();
        }
      });

      this.app.use(['/stream', '/photo.jpg'], (req, res, next) => {
        const { lastAutedTime } = req.session;
        if (lastAutedTime > Date.now()) {
          req.session = null;
          res.sendStatus(403).end();
        }
        next();
      });
    }

    this.app.use('/stream', express.static(this.mountPath));

    this.app.get('/photo.jpg', resPhoto(this.rtmpAddress));
  }

  async run(port = 3000) {
    await new Promise(resolve => this.app.listen(port, () => resolve()));
  }
};
