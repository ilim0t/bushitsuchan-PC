const ngrok = require('ngrok');

module.exports.run = async (token, port = 3000) => {
  await ngrok.authtoken(token);
  const url = await ngrok.connect(port);

  console.log(`Forwarding ${url} -> localhost:${port}`);
  return url;
};
