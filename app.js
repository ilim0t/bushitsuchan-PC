const ngrok = require('./ngrok');
const Server = require('./server');
const MediaServer = require('./mediaServer');
const aws = require('./aws');

const config = {
  restApiId: process.env.AWS_REST_API_ID,
  viewerResourceId: process.env.VIEWER_RESOURCE_ID,
  oauthResourceId: process.env.OAUTH_RESOURCE_ID,
  httpMethod: 'GET',
  region: 'us-east-2',
};

new MediaServer(process.env.LIVE_PRIVATE_KEY).run();
ngrok.run(process.env.NGROK_TOKEN).then((urls) => {
  const { siteUrl, liveUrl } = urls;
  const s = new Server(
    siteUrl,
    liveUrl,
    process.env.GITHUB_CLIENT_ID,
    process.env.GITHUB_CLIENT_SECRET,
    process.env.ORGANIZATION,
    process.env.LIVE_PRIVATE_KEY,
  );
  aws.run(config, siteUrl).then(url => console.log(`Remote URL: ${url}`));
  s.run().then(port => console.log(`Express app listening on port ${port}`));
});
