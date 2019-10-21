const url = require('url');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const assert = require('assert');
const querystring = require('querystring');
const proxy = require('proxy-middleware');

const session = require('express-session');
const Redis = require('ioredis');
const RedisStore = require('connect-redis')(session);


const getToken = async (code, clientId, clientSecret) => {
  assert(code !== undefined);
  const tokenResponse = await axios.post(
    `https://slack.com//api/oauth.access?${querystring.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    })}`,
  ).catch((err) => {
    console.error('Failed to send post requesting token:\n', err);
  });
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
  ).catch((err) => console.err('Failed to send request to fetch user identity:\n', err));

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


const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.set('view engine', 'ejs');

app.use(
  session({
    store: new RedisStore({
      client: new Redis({ host: 'redis' }),
      prefix: 'web:',
    }),
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: { secure: true },
  }),
);

app.use(
  morgan('<@:user> [:date[clf]] :method :url :status :res[content-length] - :response-time ms', {
    skip: (req, res) => req.path.startsWith('/data/'),
  }),
);
morgan.token('user', (req, res) => (req.session && req.session.name) || 'anonymous');

app.get('/', (req, res) => {
  res.send('Hello Bushitsuchan!');
});

app.get('/login', (req, res) => {
  const redirectPath = req.query.redirect_path;

  const querys = {
    client_id: process.env.SLACK_CLIENT_ID,
    scope: ['identity.basic'].join(' '),
    team: process.env.WORKSTATION_ID, // うまく機能しない
  };
  if (redirectPath !== undefined) {
    querys.state = redirectPath;
  }
  res.redirect(
    `https://slack.com/oauth/authorize?${querystring.stringify(querys)}`,
  );
});

app.get('/oauth-redirect', (req, res) => {
  const { code, state } = req.query;
  if (code === undefined) {
    res.sendStatus(401).end();
    return;
  }

  getToken(code, process.env.SLACK_CLIENT_ID, process.env.SLACK_CLIENT_SECRET)
    .then((token) => {
      req.session.token = token;
      req.session.lastAuthedTime = Date.now();
      authorize(token, process.env.WORKSTATION_ID).then((name) => {
        req.session.isAuth = true;
        req.session.name = name;
        res.redirect(state || 'viewer');
      }).catch((err) => {
        console.error('Certification failed:\n', err);
        res.sendStatus(403);
      });
    })
    .catch((err) => {
      console.error('Failed to fetch token:\n', err);
      res.sendStatus(400);
    });
});

app.get('/logout', (req, res) => {
  if (req.session.token === undefined) {
    res.send('You are not logged in');
    return;
  }
  req.session.destroy();
  res.send('You have successfully logged out');
});

app.use(['/viewer', '/photo-viewer', '/data'], (req, res, next) => {
  if (req.session.lastAuthedTime < Date.now() - 1000 * 60 * 60 * 24) {
    req.session.isAuth = false;
  }
  next();
});

app.use(['/viewer', '/photo-viewer', '/data'], (req, res, next) => {
  const { token } = req.session;
  if (token === undefined) {
    res.redirect(`/prod/login?redirect_path=${req.path.slice(1)}`);
    return;
  }
  if (req.session.isAuth) {
    next();
    return;
  }
  if (req.session.lastAuthedTime > Date.now() - 1000 * 10) {
    res.send(429).end();
    return;
  }
  req.session.lastAuthedTime = Date.now();
  authorize(token, process.env.WORKSTATION_ID).then((name) => {
    req.session.isAuth = true;
    req.session.name = name;
    req.session.authPendding = false;
    next();
  }).catch((err) => {
    console.error('Certification failed:\n', err);
    res.sendStatus(403);
  });
});

app.get('/viewer', (req, res) => {
  res.sendFile(`./views/${req.path.slice(1)}.html`, { root: __dirname });
});

app.get('/photo-viewer', async (req, res) => {
  res.render('photo-viewer.ejs', { photoPath: `data/temporary?time=${Date.now()}` });
});

app.use('/data', proxy(url.parse('http://media/')));

app.listen(80, () => console.log('Express app listening on port 80.'));
