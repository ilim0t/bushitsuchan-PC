const NodeMediaServer = require('node-media-server');

const nms = new NodeMediaServer({
  logType: 1,

  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
});

nms.run();
console.log('Streaming server listening on port 1935.');
