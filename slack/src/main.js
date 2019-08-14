const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const crypto = require('crypto');
const fs = require('fs');
const object = require('json-templater/object');
const Redis = require('ioredis');
const base64url = require('base64-url');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());

const web = new WebClient(process.env.SLACK_BOT_ACCESS_TOKEN);
const slackInteractions = createMessageAdapter(
  process.env.SLACK_SIGNING_SECRET,
);

const redis = new Redis({
  host: 'redis',
});

// app.use(
//   morgan('<@:user> [:date[clf]] :method :url :status :res[content-length] - :response-time ms', {
//     skip: (req, res) => req.path.startWith("/photo"), // TODO check
//   }),
// );

// morgan.token('user', (req, res) => req.session.name || 'anonymous'); // TODO check


// slackInteractions
app.use('/actions', slackInteractions.expressMiddleware());
slackInteractions.action({ type: 'button' }, (payload, respond) => {
  const { actions, message, channel } = payload;
  const { ts } = message;

  if (actions[0].value === 'delete') {
    web.chat
      .delete({ channel: channel.id, ts })
      .catch((err) => console.error('Delete message failed:\n', err));
  }
});


// Slash command
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/bushitsu-photo', (req, res) => {
  const key = crypto
    .createHash('md5')
    .update(`${Date.now()}-${process.env.SESSION_SECRET}`, 'utf8')
    .digest('Base64');

  const blocks = object(
    JSON.parse(fs.readFileSync('./block_template.json', 'utf8')),
    {
      image_url: `${awsUrl}${req.baseUrl}/photo/?key=${base64url.escape(key)}`,
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
app.get('/photo/:photoId', (req, res) => {
  const { key } = req.query;
  const { photoId } = req.params;

  if (!key) {
    return;
  }
  const correctKey = crypto
    .createHash('md5')
    .update(`${Date.now()}-${process.env.SESSION_SECRET}`, 'utf8')
    .digest('Base64');

  if (correctKey !== base64url.unescape(key)) {
    return;
  }

  const img = null;

  res.contentType('image/jpg');
  res.send(Buffer.from(img));
});
