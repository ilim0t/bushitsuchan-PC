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

    if (!actions[0].value) {
      return;
    }
    if (actions[0].value === 'delete') {
      web.chat.delete({ channel: channel.id, ts }).catch(e => console.error(e));
    }
  });

  slackInteractions.action({ type: 'overflow' }, (payload, respond) => {
    const { actions, message, channel } = payload;
    const { ts } = message;

    const actionValue = actions[0].selected_option.value;
    if (!actionValue) {
      return;
    }
    const f = {};
    f.extension = () => {
      const photoUrl = new URL(message.blocks[0].image_url);
      const key = base64Decode(photoUrl.searchParams.get('key'));

      const expired = new Date(
        Number(message.blocks[2].elements[0].text.match(/\^(\d+)\^/)[1]) * 1000,
      ); // TODO もし無期限延長されてたら
      expired.setDate(expired.getDate() + 1);
      store.set(`__storejs_expire_mixin_${key}`, expired.getTime()); // TODO これで伸びるかどうか確認

      let template = fs.readFileSync('./block_template.json', 'utf8');
      template = template.replace(/\${photo_image}/g, message.blocks[0].image_url);
      template = template.replace(/\${viewer-url}/g, `${awsUrl}/viewer`);
      template = template.replace(/\${photo-viewer-url}/g, `${awsUrl}/photo-viewer`);
      template = template.replace(/\${contact-channel}/g, contactChannel);
      template = template.replace(
        /\${expired-time}/g,
        `写真は<!date^${Math.floor(
          expired.getTime() / 1000,
        )}^{date_short_pretty}{time}まで有効です|${expired.toLocaleString()}まで有効です>`,
      );
      respond({
        text: message.text,
        blocks: commentJSON.parse(template),
        replace_original: true,
      });
    };
    f.save = () => {
      const photoUrl = new URL(message.blocks[0].image_url);
      const key = base64Decode(photoUrl.searchParams.get('key'));
      store.remove(`__storejs_expire_mixin_${key}`); // TODO 再起動してないとき

      const chunks = store.get(key);
      if (!chunks) {
        return;
      }
      fs.mkdirSync(`${__dirname}/photos`, { recursive: true });
      fs.writeFileSync(`${__dirname}/photos/${base64Encode(key)}.jpg`, chunks.data);

      message.blocks[2].elements[0].text = '写真はずっと表示されます';
      let template = fs.readFileSync('./block_template.json', 'utf8');
      template = template.replace(/\${photo_image}/g, message.blocks[0].image_url);
      template = template.replace(/\${viewer-url}/g, `${awsUrl}/viewer`);
      template = template.replace(/\${photo-viewer-url}/g, `${awsUrl}/photo-viewer`);
      template = template.replace(/\${contact-channel}/g, contactChannel);
      template = template.replace(/\${expired-time}/g, '写真はずっと表示されます');
      respond({
        text: message.text,
        blocks: commentJSON.parse(template),
        replace_original: true,
      });
    };

    f[actionValue]();
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

  router.get('/thumb.jpg', (req, res, next) => {
    const { key } = req.query;
    if (!key) {
      next();
      return;
    }
    const chunks = store.get(base64Decode(key));
    if (!chunks) {
      next();
      return;
    }
    res.contentType('image/jpg');
    res.send(Buffer.from(chunks.data));
  });

  router.get('/thumb.jpg', (req, res) => {
    const { key } = req.query;
    if (fs.existsSync(`${__dirname}/photos/${base64Encode(key)}.jpg`)) {
      // 非推奨
      res.sendFile(`${__dirname}/photos/${base64Encode(key)}.jpg`);
      return;
    }
    res.sendStatus(404).end();
  });

  return router;
};
