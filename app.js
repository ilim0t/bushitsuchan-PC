const RtmpServer = require('./rtmp-server');
const ngrok = require('./ngrok');
const Server = require('./server');
const aws = require('./aws');
const Stream = require('./stream');

const config = {
  restApiId: process.env.AWS_REST_API_ID,
  viewerResourceId: process.env.VIEWER_RESOURCE_ID,
  oauthResourceId: process.env.OAUTH_RESOURCE_ID,
  httpMethod: 'GET',
  ngrokToken: process.env.NGROK_TOKEN,
  slackClientId: process.env.SLACK_CLIENT_ID,
  slackClientSecret: process.env.SLACK_CLIENT_SECRET,
  wsId: process.env.WORKSTATION_ID,
  privateKey: process.env.PRIVATE_KEY,
  debug: Boolean(process.env.DEBUG),
  isMac: Boolean(process.env.IS_MAC),
};

const liveServer = new RtmpServer(1935);
liveServer.run();

const disk = new Stream(
  config.isMac ? `${__dirname}/hls` : '/dev/shm',
  'bushitsuchan',
  config.isMac,
);
console.log(`Regarding directory ${disk.mountPath} as RAM DISK`);

disk
  .run(config.isMac)
  .then(async (mountPath) => {
    console.log(`Please put HLS files in ${mountPath}`);
    let ngrokUrl;
    let awsUrl;

    if (config.debug) {
      ngrokUrl = null;
      awsUrl = null;
    } else {
      ngrokUrl = await ngrok.run(config.ngrokToken, 3000);
      console.log(`Forwarding ${ngrokUrl} -> localhost:${3000}`);

      awsUrl = await aws.run(config, ngrokUrl);
      console.log(`Remote URL: ${awsUrl}`);
    }

    const server = new Server(
      ngrokUrl,
      awsUrl,
      mountPath,
      config,
      `rtmp://localhost:1935/live/${'bushitsuchan'}`,
    );
    server.run(3000).then(() => console.log(`Express app listening on port ${3000}`));
  })
  .catch((e) => {
    console.error(e);
    disk.close();
  });
