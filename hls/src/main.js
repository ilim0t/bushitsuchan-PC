const express = require('express');
const helmet = require('helmet');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const morgan = require('morgan');


const app = express();
app.use(helmet());
app.use(morgan('short'));
const hlsDir = '/dev/shm/hls';


if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir);
}

ffmpeg(`${process.env.RTMP_SERVER_URL}/${process.env.STREAM_NAME}`)
  .inputOptions('-stream_loop -1')
  .addOption('-hls_flags', '+delete_segments')
  .addOption('-g', 40)
  .on('error', (err) => {
    console.error('ffmpeg command to convert to HLS failed or aborted:\n', err);
  })
  .save(`${hlsDir}/output.m3u8`);

app.use(express.static(hlsDir));

app.listen(80, () => console.log('Express app listening on port 80.'));
