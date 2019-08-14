const url = require('url');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const fs = require('fs');
const assert = require('assert');
const querystring = require('querystring');
const proxy = require('proxy-middleware');

const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const sessionSecret = process.env.SESSION_SECRET;
const slackClientId = process.env.SLACK_CLIENT_ID;
const slackClientSecret = process.env.SLACK_CLIENT_SECRET;
const wsId = process.env.WORKSTATION_ID;

const getToken = async (code, clientId, clientSecret) => {
  assert(code !== undefined);
  const tokenResponse = await axios.post(
    `https://slack.com//api/oauth.access?${querystring.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    })}`, // TODO header: application/json
  ); // TODO cactch
  const { data } = tokenResponse;
  assert(data !== undefined);

  // The code passed is incorrect or expired
  if (!data.ok) {
    throw TypeError(`codeが無効値${code}で${tokenResponse.data.error}`);
  }
  return data.access_token;
};

const authorize = async (token, workstationId) => {
  assert(token !== undefined);

  const response = await axios.get(
    `https://slack.com/api/users.identity?${querystring.stringify({ token })}`,
  ); // TODO header: application/json, catch

  const { data } = response;
  assert(data !== undefined);

  if (!data.ok) {
    throw new TypeError();
  }
  if (data.team.id !== workstationId) {
    throw new Error();
  }
  return data.user.name;
};

// const resPhoto = (rtmpAddress, ext = "jpg") => (req, res) => {
//   const ffmpeg = childProcess.spawn("ffmpeg", [
//     "-i",
//     `${rtmpAddress}`,
//     "-ss",
//     "0.7",
//     "-vframes",
//     "1",
//     "-f",
//     "image2",
//     "pipe:1"
//   ]);

//   res.contentType(`image/${ext}`);
//   ffmpeg.stdout.pipe(res);
// };

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
// app.use(
//   cookieSession({
//     secret: this.config.privateKey,
//     maxAge: 1000 * 60 * 60 * 24 * 15, // 有効期限15日
//     secure: true,
//     httpOnly: true
//   })
// );

app.use(
  session({
    store: new RedisStore({
      host: 'redis',
      prefix: 'web:',
    }),
    secret: sessionSecret,
    resave: false,
    cookie: { secure: true },
  }),
);

app.use(
  morgan('<@:user> [:date[clf]] :method :url :status :res[content-length] - :response-time ms', {
    skip: (req, res) => ['.ts', '.m3u8', '.jpg'].some((element) => req.path.endsWith(element)),
  }),
);

morgan.token('user', (req, res) => req.session && (req.session.name || 'anonymous'));
// morgan.token("date", () => new Date().toLocaleString());

// app.use(
//   morgan(
//     ':remote-addr - :remote-user <@:user> [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
//     {
//       stream: fs.createWriteStream(`${__dirname}/log/access.log`, {
//         flags: "a"
//       })
//     }
//   )
// );

app.get('/', (req, res) => {
  if (req.session.count === undefined) {
    req.session.count = 0;
  }
  req.session.count += 1;
  res.send(`Hello Bushitsuchan!${req.session.count}`);
});

app.get('/login', (req, res) => {
  const scopes = ['identity.basic'];
  res.redirect(
    `https://slack.com/oauth/authorize?${querystring.stringify({
      client_id: slackClientId,
      scope: scopes.join(' '),
      team: wsId, // うまく機能しない
    })}`,
  );
});

app.get('/oauth-redirect', (req, res) => {
  const { code } = req.query;
  if (code === undefined) {
    // TODO
    return;
  }
  getToken(code, slackClientId, slackClientSecret)
    .then((token) => {
      req.session.token = token;
      res.redirect('viewer');
    })
    .catch((e) => console.error(e));
});

app.get('/logout', (req, res) => {
  // TODO When not logged in
  req.session.destroy();
  res.send('You have successfully logged out');
});

app.use(['/viewer', '/photo-viewer'], (req, res, next) => {
  const { token } = req.session;
  if (token === undefined) {
    // TODO debug mode
    res.redirect('login');
    return;
  }
  next();
});

app.use(['/auth', '/data'], (req, res, next) => {
  const { token } = req.session;
  if (token === undefined) {
    // TODO debug mode
    res.sendStatus(401).end();
    return;
  }
  next();
});

app.get('/auth', (req, res) => {
  // TODO debug mode
  authorize(req.session.token, wsId)
    .then((name) => {
      req.session.name = name;
      req.session.lastAuthedTime = Date.now();
      res.json({
        hlsAddress: ' data/output.m3u8',
        photoAddress: 'data/photo.jpg',
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

app.get(['/viewer', '/photo-viewer'], (req, res) => {
  res.sendFile(`./views/${req.url}.html`, { root: __dirname });
});

const expireTime = 60 * 1000;

app.use('/data', (req, res, next) => {
  const { token, lastAuthedTime } = req.session;
  assert(lastAuthedTime !== undefined);

  if (lastAuthedTime + expireTime > Date.now()) {
    next();
    return;
  }
  authorize(token, wsId)
    .then((name) => {
      req.session.name = name;
      req.session.lastAuthedTime = Date.now();
      next();
    })
    .catch(() => res.send(403).end());
});

// this.app.use("/data", (req, res, next) => {
//   const { lastAuthedTime } = req.session;
//   if (lastAuthedTime > Date.now()) {
//     req.session = null;
//     res.sendStatus(403).end();
//   }
//   next();
// });

app.use('/data', proxy(url.parse('http://data-server/')));

app.listen(80, () => console.log('Express app listening on port 80.'));
