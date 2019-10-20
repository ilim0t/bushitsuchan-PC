const { RTMClient } = require('@slack/rtm-api');
const axios = require('axios');
const crypto = require('crypto');
const object = require('json-templater/object');
const fs = require('fs');
const base64url = require('base64-url');
const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis',
  keyPrefix: 'slack:',
});
const hostname = 'slack';

const rtm = new RTMClient(process.env.SLACK_BOT_ACCESS_TOKEN);
rtm.start()
  .then('start rtmp client')
  .catch(console.error);

rtm.on('message', (event) => {
  if (event.subtype == undefined) {
    redis.set('age', true);
  }
});


module.exports.objectsNotification = async (web, retention) => {
  const { photoId } = await axios.post('http://media/photo').then((result) => result.data);

  const [awsUrl, objects] = await Promise.all([
    axios.get('http://tunnel').then((result) => result.data.awsUrl),
    axios.get('http://object-detection/faster_rcnn_resnet101_coco', { params: { photo_id: photoId, retention } }).then((result) => result.data),
  ]);

  const text = objects.label_name.map((value, index) => `- \`${value}\`: ${objects.confidence[index].toFixed(3)}`).join('\n') || '何も検出されませんでした';
  const key = crypto
    .createHash('md5')
    .update(`${photoId}-${process.env.SESSION_SECRET}`, 'utf8')
    .digest('Base64');

  const blocks = object(
    JSON.parse(fs.readFileSync('./block_template_detection.json', 'utf8')),
    {
      image_url: `${awsUrl}/${hostname}/detected-photo/${photoId}?key=${base64url.escape(key)}`,
      text,
      time: new Date().toLocaleString(),
      viewer_url: `${awsUrl}/viewer`,
      photo_viewer_url: `${awsUrl}/photo-viewer`,
      contact_channel: process.env.CONTACT_CHANNEL,
    },
  );

  const ts = await redis.get('previous_ts');

  if (ts) {
    if (!await redis.get('age')) {
      web.chat.update({
        channel: process.env.NOTIFICATION_CHANNEL,
        text: '[定期]部室スキャン',
        ts,
        icon_emoji: ':slack:',
        blocks,
      });
      return;
    }
    web.chat.delete({
      channel: process.env.NOTIFICATION_CHANNEL,
      ts,
    }).catch((e) => {
      console.error(e);
      redis.del('previous_ts');
    });
    redis.del('age');
  }
  const result = await web.chat.postMessage({
    channel: process.env.NOTIFICATION_CHANNEL,
    text: '[定期]部室スキャン',
    icon_emoji: ':slack:',
    blocks,
  });
  redis.set('previous_ts', result.ts);
};
