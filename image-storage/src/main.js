const express = require('express');
const helmet = require('helmet');
const ffmpeg = require('fluent-ffmpeg');
const Redis = require('ioredis');
const fs = require('fs');
const morgan = require('morgan');


const app = express();
app.use(helmet());
app.use(morgan('short'));

const redis = new Redis({
  host: 'redis',
  keyPrefix: 'media:',
});

app.get('/temporary', async (req, res) => {
  const ffstream = ffmpeg(`${process.env.RTMP_SERVER_URL}/${process.env.STREAM_NAME}`)
    .addOption('-vframes', 1)
    .on('error', (err) => {
      console.error('ffmpeg command to convert to image failed:\n', err);
    })
    .format('image2')
    .pipe();

  const image = await new Promise((resolve, reject) => {
    const buffers = [];
    ffstream.on('data', (chunk) => {
      buffers.push(chunk);
    });
    ffstream.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    ffstream.on('error', (e) => {
      reject(e);
    });
  });
  res.contentType('image/jpg');
  res.status(200).send(image);
});

app.post('/photo', (req, res) => {
  const time = Date.now();
  redis.set(`${time}-pending`, true, 'EX', 5);
  ffmpeg(`${process.env.RTMP_SERVER_URL}/${process.env.STREAM_NAME}`)
    .addOption('-ss', 0.7)
    .addOption('-vframes', 1)
    .on('end', () => {
      redis.del(`${time}-pending`);
    })
    .on('error', (err) => {
      redis.del(`${time}-pending`);
      console.error('ffmpeg command to convert to image failed:\n', err);
    })
    .save(`/photo/${time}.jpg`);
  res.json({ path: `/photo/${time}`, photoId: time });
});

app.get('/photo/:time', async (req, res) => {
  const { time } = req.params;
  const wait = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
  while (await redis.get(`${time}-pending`)) {
    await wait(100);
  }

  if (fs.existsSync(`/photo/${time}.jpg`)) { // 非推奨
    res.sendFile(`/photo/${time}.jpg`);
  } else {
    res.sendStatus(404);
  }
});

app.listen(80, () => console.log('Express app listening on port 80.'));
