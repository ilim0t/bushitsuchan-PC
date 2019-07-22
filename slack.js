const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const store = require('store');
const crypto = require('crypto');
const expirePlugin = require('store/plugins/expire');
const updatePlugin = require('store/plugins/update');
const childProcess = require('child_process');
const axios = require('axios');
const { base64Encode, base64Decode } = require('./utils');

store.addPlugin(expirePlugin);
store.addPlugin(updatePlugin);

module.exports = (awsUrl, rtmpAddress, slackBotAccessToken, slackSigningSecret) => {
  const router = express.Router();
  const web = new WebClient(slackBotAccessToken);
  const slackInteractions = createMessageAdapter(slackSigningSecret);

  router.use(bodyParser.urlencoded({ extended: false }));
  router.use(bodyParser.json());
  router.use('/actions', slackInteractions.expressMiddleware());

  slackInteractions.action({ type: 'button' }, (payload, respond) => {
    const { actions, message, channel } = payload;
    const { ts } = message;

    if (actions[0].value === 'delete') {
      web.chat.delete({ channel: channel.id, ts }).catch(e => console.error(e));
    }
  });

  router.post('/photo', (req, res) => {
    const now = Date.now();
    const key = crypto
      .createHash('md5')
      .update(`${req.body.user_id}-${now}`)
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
      store.set(key, Buffer.concat(chunks), now + 1000 * 60 * 60 * 3);
      axios({
        method: 'post',
        url: req.body.response_url,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          response_type: 'in_channel',
          text: '部室の様子',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '写真です',
              },
            },
            {
              type: 'image',
              title: {
                type: 'plain_text',
                text: '部室の様子',
                emoji: true,
              },
              image_url: `${awsUrl}${req.baseUrl}/thumb.jpg?key=${base64Encode(key)}`,
              alt_text: '部室の様子',
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    emoji: true,
                    text: '投稿削除',
                  },
                  value: 'delete',
                },
              ],
            },
          ],
        },
      }).catch((e) => {
        console.error(e);
      });
    });

    console.log(`${awsUrl}${req.baseUrl}/thumb.jpg?key=${base64Encode(key)}`);
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
      res.sendStatus(204).end();
      return;
    }
    res.contentType('image/jpg');
    res.send(Buffer.from(chunks.data));
  });

  return router;
};
