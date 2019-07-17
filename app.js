const ngrok = require('./ngrok');
const Server = require('./server');
const MediaServer = require('./mediaServer');
const aws = require('./aws');

const config = {
  restApiId: process.env.AWS_REST_API_ID,
  viewerResourceId: process.env.VIEWER_RESOURCE_ID,
  oauthResourceId: process.env.OAUTH_RESOURCE_ID,
  httpMethod: 'GET',
};

new MediaServer(process.env.LIVE_PRIVATE_KEY).run();
ngrok.run(process.env.NGROK_TOKEN).then((urls) => {
  const { siteUrl, liveUrl } = urls;
  const s = new Server(
    siteUrl,
    liveUrl,
    process.env.SLACK_CLIENT_ID,
    process.env.SLACK_CLIENT_SECRET,
    process.env.WORKSTATION_ID,
    process.env.LIVE_PRIVATE_KEY,
  );
  const url = aws.run(config, siteUrl);
  console.log(`Remote URL: ${url}`);
  s.run().then(port => console.log(`Express app listening on port ${port}`));
});
