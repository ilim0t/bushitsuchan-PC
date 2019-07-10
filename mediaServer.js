const NodeMediaServer = require('node-media-server');

module.exports = class {
  constructor() {
    this.nms = new NodeMediaServer({
      logType: 2,
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        port: 8000,
        allow_origin: '*',
      },
      auth: {
        // api: false,
        // api_user: process.env.API_USER,
        // api_pass: process.env.API_PASS,
        play: true,
        publish: true,
        secret: process.env.LIVE_PRIVATE_KEY,
      },
    });
  }

  run() {
    this.nms.run();
  }
};
