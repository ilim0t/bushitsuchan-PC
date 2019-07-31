const NodeMediaServer = require('node-media-server');

module.exports = class {
  constructor(port = 1935) {
    this.nms = new NodeMediaServer({
      logType: 1,

      rtmp: {
        port,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
    });
  }

  run() {
    this.nms.run();
  }
};
