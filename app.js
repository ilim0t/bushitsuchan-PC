const childProcess = require('child_process');
const util = require('util');
const ngrok = require('./ngrok');
const Server = require('./server');
const MediaServer = require('./mediaServer');
const aws = require('./aws');

const exec = util.promisify(childProcess.exec);

const config = {
  restApiId: process.env.AWS_REST_API_ID,
  viewerResourceId: process.env.VIEWER_RESOURCE_ID,
  oauthResourceId: process.env.OAUTH_RESOURCE_ID,
  httpMethod: 'GET',
};

new MediaServer(process.env.LIVE_PRIVATE_KEY).run();

const deamon = async (command) => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await exec(command);
    } catch (e) {
      console.error(e);
    }
  }
};

deamon(
  'ffmpeg -framerate 5 -video_size 960x720 -i /dev/video0 -vcodec libx264 -preset veryfast -b 8M -vf "drawtext=fontfile=/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf: text="%{localtime:%T}": fontcolor=white@0.8: x=7: y=700" -f flv rtmp://localhost/live/stream',
);
deamon('ffmpeg -y -i rtmp://localhost/live/stream -r 0.1 -f image2 -updatefirst 1 capture.jpg');

ngrok
  .run(process.env.NGROK_TOKEN)
  .then((urls) => {
    const { siteUrl, liveUrl } = urls;
    aws
      .run(config, siteUrl)
      .then((url) => {
        console.log(`Remote URL: ${url}`);
      })
      .catch(e => console.error(e));

    return new Server(
      siteUrl,
      liveUrl,
      process.env.SLACK_CLIENT_ID,
      process.env.SLACK_CLIENT_SECRET,
      process.env.WORKSTATION_ID,
      process.env.LIVE_PRIVATE_KEY,
    );
  })
  .then((server) => {
    server.run().then(port => console.log(`Express app listening on port ${port}`));
  })
  .catch(e => console.error(e));
