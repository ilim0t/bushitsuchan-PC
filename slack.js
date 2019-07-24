const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const store = require('store');
const crypto = require('crypto');
const expirePlugin = require('store/plugins/expire');
const updatePlugin = require('store/plugins/update');
const childProcess = require('child_process');
const fs = require('fs');
const commentJSON = require('comment-json');
const { base64Encode, base64Decode } = require('./utils');

store.addPlugin(expirePlugin);
store.addPlugin(updatePlugin);

module.exports = (awsUrl, contactChannel, rtmpAddress, slackBotAccessToken, slackSigningSecret) => {
  const router = express.Router();
  const web = new WebClient(slackBotAccessToken);
  const slackInteractions = createMessageAdapter(slackSigningSecret);

  router.use('/actions', slackInteractions.expressMiddleware());
  slackInteractions.action({ type: 'button' }, (payload, respond) => {
    const { actions, message, channel } = payload;
    const { ts } = message;

    if (actions[0].value === 'delete') {
      web.chat.delete({ channel: channel.id, ts }).catch(e => console.error(e));
    }
  });

  router.use(bodyParser.urlencoded({ extended: false }));
  router.use(bodyParser.json());

  router.post('/photo', (req, res) => {
    const expired = new Date();
    expired.setHours(expired.getHours() + 5);

    const key = crypto
      .createHash('md5')
      .update(`${req.body.user_id}-${expired.getTime()}`)
      .digest('Base64');

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

    const chunks = [];
    ffmpeg.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });
    ffmpeg.stdout.on('end', () => {
      store.set(key, Buffer.concat(chunks), expired.getTime());
      let template = fs.readFileSync('./block_template.json', 'utf8');
      template = template.replace(
        /\${photo_image}/g,
        `${awsUrl}${req.baseUrl}/thumb.jpg?key=${base64Encode(key)}`,
      );
      template = template.replace(/\${viewer-url}/g, `${awsUrl}/viewer`);
      template = template.replace(/\${photo-viewer-url}/g, `${awsUrl}/photo-viewer`);
      template = template.replace(/\${contact-channel}/g, contactChannel);
      template = template.replace(
        /\${expired-time}/g,
        `写真は<!date^${Math.floor(
          expired.getTime() / 1000,
        )}^{date_short_pretty}{time}まで有効です|${expired.toLocaleString()}まで有効です>`,
      );
      web.chat.postMessage({
        channel: req.body.channel_id,
        text: '部室の様子',
        icon_emoji: ':slack:',
        blocks: commentJSON.parse(template),
      });
    });

    res.status(200).send('待ってね');
  });

  router.get('/thumb.jpg', (req, res) => {
    const { key } = req.query;
    if (!key) {
      res.sendStatus(404).end();
      return;
    }
    const chunks = store.get(base64Decode(key));
    if (!chunks) {
      res.sendStatus(404).end();
      return;
    }
    res.contentType('image/jpg');
    res.send(Buffer.from(chunks.data));
  });

  return router;
};
