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
const RedisStore = require('connect-redis')(session);

// const sessionSecret = process.env.SESSION_SECRET;
// const slackClientId = process.env.SLACK_CLIENT_ID;
// const slackClientSecret = process.env.SLACK_CLIENT_SECRET;

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


const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.set('view engine', 'ejs');

app.use(
  session({
    store: new RedisStore({
      host: 'redis',
      prefix: 'web:',
    }),
    secret: process.env.SESSION_SECRET,
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
      authorize(token, process.env.WORKSTATION_ID).then((name) => {
        req.session.isAuth = true;
        req.session.name = name;
        req.session.lastAuthedTime = Date.now();
        res.redirect(state || 'viewer');
      }); // TODO catch & response
    })
    .catch((err) => console.error(err));
});

app.get('/logout', (req, res) => {
  if (req.session.token === undefined) {
    res.send('You are not logged in');
    return;
  }
  req.session.destroy();
  res.send('You have successfully logged out');
});

app.get(['/viewer', '/photo-viewer'], (req, res, next) => {
  if (req.session.isAuth) {
    next();
    return;
  }
  res.redirect(`login?redirect_path=${req.path.slice(1)}`);
});

app.get('/viewer', (req, res) => {
  res.sendFile(`./views/${req.path.slice(1)}.html`, { root: __dirname });
});

app.get('/photo-viewer', async (req, res) => {
  const { photoId } = await axios.post('http://media/photo').then((result) => result.data);
  res.render('photo-viewer.ejs', { photoId });
});

app.get('/data', (req, res, next) => {
  const { isAuth } = req.session;
  if (!isAuth) {
    res.status(404).end();
    return;
  }
  next();
});

app.use('/data', proxy(url.parse('http://media/')));

app.listen(80, () => console.log('Express app listening on port 80.'));
