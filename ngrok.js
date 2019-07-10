const ngrok = require('ngrok');

module.exports.run = async (token, sitePort = 3000, livePort = 8000) => {
  await ngrok.authtoken(token);
  const siteUrl = await ngrok.connect(sitePort);
  const liveUrl = await ngrok.connect(livePort);

  console.log(`Forwarding ${siteUrl} -> localhost:${sitePort}`);
  console.log(`Forwarding ${liveUrl} -> localhost:${livePort}`);
  return { siteUrl, liveUrl };
};
