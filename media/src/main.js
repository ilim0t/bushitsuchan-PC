const express = require('express');
const helmet = require('helmet');
const ffmpeg = require('fluent-ffmpeg');
const Redis = require('ioredis');
const fs = require('fs');
const morgan = require('morgan');


const app = express();
app.use(helmet());
app.use(morgan('short'));
const hlsDir = '/dev/shm';

const redis = new Redis({
  host: 'redis',
  keyPrefix: 'media:',
});

ffmpeg(`${process.env.RTMP_SERVER_URL}/${process.env.STREAM_NAME}`)
  .inputOptions('-stream_loop -1')
  .addOption('-hls_flags', '+delete_segments')
  .addOption('-g', 40)
  .on('error', (err) => {
    console.error('ffmpeg command about hls failed:\n', err);
  })
  .save(`${hlsDir}/output.m3u8`);

app.post('/photo', (req, res) => {
  const time = Date.now();
  redis.set(`${time}-pending`, true, 'EX', 20);
  ffmpeg(`${process.env.RTMP_SERVER_URL}/${process.env.STREAM_NAME}`)
    .addOption('-ss', 0.7)
    .addOption('-vframes', 1)
    .on('end', () => {
      redis.del(`${time}-pending`);
    })
    .on('error', (err) => {
      redis.del(`${time}-pending`);
      console.error('ffmpeg command about image2 failed:\n', err);
    })
    .save(`/photo/${time}.jpg`);
  res.json({ path: `/photo/${time}`, photoId: time });
});

app.get('/photo/:time', async (req, res) => {
  const { time } = req.params;
  while (true) {
    if (await redis.get(`${time}-pending`)) {
      const wait = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
      await wait(100);
      continue;
    }
    break;
  }

  if (fs.existsSync(`/photo/${time}.jpg`)) {
    // 非推奨
    res.sendFile(`/photo/${time}.jpg`);
  }
});
app.use('/hls', express.static(hlsDir));

app.listen(80, () => console.log('Express app listening on port 80.'));
