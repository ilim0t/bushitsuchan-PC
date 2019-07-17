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
exec(
  'ffmpeg -i /dev/video0 -framerate 1 -video_size 1080x720 -vcodec libx264 -maxrate 768k -bufsize 8080k -vf "format=yuv420p" -g 60 -f flv rtmp://localhost/live/stream',
);
ngrok
  .run(process.env.NGROK_TOKEN)
  .then((urls) => {
    const { siteUrl, liveUrl } = urls;
    const s = new Server(
      siteUrl,
      liveUrl,
      process.env.SLACK_CLIENT_ID,
      process.env.SLACK_CLIENT_SECRET,
      process.env.WORKSTATION_ID,
      process.env.LIVE_PRIVATE_KEY,
    );
    aws.run(config, siteUrl).then((url) => {
      console.log(`Remote URL: ${url}`);
    });
    s.run().then(port => console.log(`Express app listening on port ${port}`));
  })
  .catch(console.error);
