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
(async () => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    try {
      // eslint-disable-next-line no-await-in-loop
      await exec(
        'ffmpeg -i /dev/video0 -vcodec libx264 -preset veryfast -f flv rtmp://localhost/live/stream',
      );
    } catch (e) {
      console.error(e);
      break;
    }
  }
})();

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
