const RtmpServer = require('./rtmp-server');
const ngrok = require('./ngrok');
const Server = require('./server');
const aws = require('./aws');
const Stream = require('./stream');
const { daemon } = require('./utils');
const slack = require('./slack');

const config = {
  restApiId: process.env.AWS_REST_API_ID,
  viewerResourceId: process.env.VIEWER_RESOURCE_ID,
  oauthResourceId: process.env.OAUTH_RESOURCE_ID,
  httpMethod: 'GET',
  ngrokToken: process.env.NGROK_TOKEN,
  slackClientId: process.env.SLACK_CLIENT_ID,
  slackClientSecret: process.env.SLACK_CLIENT_SECRET,
  slackBotAccessToken: process.env.SLACK_BOT_ACCESS_TOKEN,
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  contactChannel: process.env.CONTACT_CHANNEL,
  wsId: process.env.WORKSTATION_ID,
  privateKey: process.env.PRIVATE_KEY,
  debug: process.env.DEBUG && Boolean(JSON.parse(process.env.DEBUG)),
  isMac: process.env.IS_MAC && Boolean(JSON.parse(process.env.IS_MAC)),
};

const liveServer = new RtmpServer(1935);
liveServer.run();
console.log(`RTMP server listening on port ${1935}`);

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
    let input;
    if (config.isMac) {
      input = 'ffmpeg -f avfoundation -re -i 0 -r 10';
    } else {
      input = 'ffmpeg -s 1280x960 -i /dev/video0';
    }
    daemon(
      `${input} -vcodec libx264 -pix_fmt yuv420p -preset veryfast -tune zerolatency,stillimage,film -vb 2500k -vf "drawtext=text='%{localtime}':fontcolor=blue@1:x=0:y=h-lh*1.2:fontsize=24" -f flv rtmp://localhost:${1935}/live/bushitsuchan -loglevel warning`,
    );
    daemon(
      `ffmpeg -i rtmp://localhost:1935/live/bushitsuchan -hls_flags delete_segments -g 40 -f hls ${mountPath}/output.m3u8 -loglevel warning`,
    );

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
    server.app.use(
      '/slack',
      slack(
        awsUrl,
        config.contactChannel,
        `rtmp://localhost:${1935}/live/bushitsuchan`,
        config.slackBotAccessToken,
        config.slackSigningSecret,
      ),
    );
    server.run(3000).then(() => console.log(`Express app listening on port ${3000}`));
  })
  .catch((e) => {
    console.error(e);
    disk.close();
  });
