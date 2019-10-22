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
  res.type('image/jpg').send(image).end();
});

app.get('/permament', async (req, res) => {
  const { directory } = req.query;
  if (directory === undefined) {
    res.sendStatus(400);
    return;
  }

  const filename = `${Date.now()}.jpg`;
  const path = `${directory}/${filename}`;
  await redis.set(`${path}-pending`, true, 'EX', 5);

  if (!fs.existsSync(`/photo/${directory}`)) {
    fs.mkdirSync(`/photo/${directory}`);
  }

  ffmpeg(`${process.env.RTMP_SERVER_URL}/${process.env.STREAM_NAME}`)
    .addOption('-vframes', 1)
    .on('end', () => {
      redis.del(`${path}-pending`);
    })
    .on('error', (err) => {
      redis.del(`${path}-pending`);
      console.error('ffmpeg command to convert to image failed:\n', err);
    })
    .save(`/photo/${path}`);
  res.json({ filename });
});

const wait = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));

app.get('/permament/:directory(\\w+)/:file', async (req, res) => {
  const { directory, file } = req.params;
  const path = `${directory}/${file}`;

  while (await redis.get(`${path}-pending`)) {
    await wait(100);
  }
  res.sendFile(`/photo/${path}`);
});

app.listen(80, () => console.log('Express app listening on port 80.'));
