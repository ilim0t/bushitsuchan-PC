const RtmpServer = require('rtmp-server');

module.exports = class {
  constructor() {
    this.rtmpServer = new RtmpServer();
  }

  on() {
    this.rtmpServer.on('error', (err) => {
      throw err;
    });

    this.rtmpServer.on('client', (client) => {
      // client.on('command', command => {
      //  console.log(command.cmd, command);
      // });

      client.on('connect', () => {
        console.log('connect', client.app);
      });

      client.on('play', ({ streamName }) => {
        console.log('PLAY', streamName);
      });

      client.on('publish', ({ streamName }) => {
        console.log('PUBLISH', streamName);
      });

      client.on('stop', () => {
        console.log('client disconnected');
      });
    });
  }

  run(port = 1935) {
    this.rtmpServer.listen(port);
  }
};
