const express = require('express');
const { WebClient } = require('@slack/web-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const crypto = require('crypto');
const fs = require('fs');
const object = require('json-templater/object');
const base64url = require('base64-url');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');
const http = require('http');
const io = require('./object_detection')();


const app = express();
const server = http.createServer(app);
io.attach(server);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());

app.use(/^(?!\/actions).*/, express.urlencoded({ extended: true }));
app.use(/^(?!\/actions).*/, express.json());
app.use('/actions', express.urlencoded({
  extended: true,
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf;
  },
}));
app.use('/actions', (req, res, next) => {
  const { payload } = req.body;
  if (payload !== undefined) {
    req.body.payload = JSON.parse(payload);
  }
  next();
});

const web = new WebClient(process.env.SLACK_BOT_ACCESS_TOKEN);
const slackInteractions = createMessageAdapter(
  process.env.SLACK_SIGNING_SECRET,
);


app.use(morgan('<@:user> [:date[clf]] :method :url :status :res[content-length] - :response-time ms', {
  skip: (req, res) => ['/hls/', '/photo/', '/detected-photo/'].some((element) => req.path.startsWith(element)),
}));
morgan.token('user', (req, res) => {
  if (req.body.payload !== undefined) {
    return req.body.payload.user.username;
  }
  return req.body.user_name || 'anonymous';
});


// slackInteractions
app.use('/actions', slackInteractions.expressMiddleware());
slackInteractions.action({ type: 'button' }, (payload, respond) => {
  const { actions, message, channel } = payload;
  const { ts } = message;

  if (actions[0].value === 'delete') {
    web.chat
      .delete({ channel: channel.id, ts })
      .catch((err) => console.error('Failed to delete message:\n', err));
  }
});


// Slash command
app.post('/bushitsu-photo', async (req, res) => {
  const { filename } = await axios.get('http://image-storage/permament', { params: { directory: 'slack' } }).then((result) => result.data);
  res.status(200).end();
  const key = crypto
    .createHash('md5')
    .update(`${filename}-${process.env.SESSION_SECRET}`, 'utf8')
    .digest('Base64');

  const { awsUrl } = await axios.get('http://tunnel').then((result) => result.data);
  const blocks = object(
    JSON.parse(fs.readFileSync('./block_template.json', 'utf8')),
    {
      image_url: `${awsUrl}/${req.hostname}/photo/${filename}?key=${base64url.escape(key)}`,
      viewer_url: `${awsUrl}/viewer`,
      photo_viewer_url: `${awsUrl}/photo-viewer`,
      contact_channel: process.env.CONTACT_CHANNEL,
    },
  );

  web.chat.postMessage({
    channel: req.body.channel_id,
    text: '部室の様子',
    icon_emoji: ':slack:',
    blocks,
  });
});


// Others
app.get(['/photo/:filename', '/detected-photo/:filename'], async (req, res, next) => {
  const { key } = req.query;

  if (!key) {
    res.sendStatus(401);
    return;
  }
  const correctKey = crypto
    .createHash('md5')
    .update(`${req.params.filename}-${process.env.SESSION_SECRET}`, 'utf8')
    .digest('Base64');
  if (correctKey !== base64url.unescape(key)) {
    res.sendStatus(403);
    return;
  }
  next();
});

app.get('/photo/:filename', async (req, res) => {
  const img = await axios.get(`http://image-storage/permament/slack/${req.params.filename}`, {
    responseType: 'arraybuffer',
    headers: { 'Content-Type': 'image/jpg' },
  });
  res.type('image/jpg').send(img.data).end();
});
app.get('/detected-photo/:filename', async (req, res) => {
  const img = await axios.get(`http://image-storage/temporary/${req.params.filename}`, {
    responseType: 'arraybuffer',
    headers: { 'Content-Type': 'image/jpg' },
  });
  res.type('image/jpg').send(img.data).end();
});


server.listen(80, () => console.log('Express app listening on port 80.'));
