const NodeMediaServer = require('node-media-server');
const ngrok = require('ngrok');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { execSync } = require('child_process');
const crypto = require('crypto');
const url = require('url');
const axios = require('axios');

// basic auth

const config = {
  restApiId: process.env.AWS_REST_API_ID,
  viewerResourceId: process.env.VIEWER_RESOURCE_ID,
  oauthResourceId: process.env.OAUTH_RESOURCE_ID,
  httpMethod: 'GET',
  region: 'us-east-2',
};

const nms = new NodeMediaServer({
  logType: 2,
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000,
    allow_origin: '*',
  },
  auth: {
    // api: false,
    // api_user: process.env.API_USER,
    // api_pass: process.env.API_PASS,
    play: true,
    publish: true,
    secret: process.env.LIVE_PRIVATE_KEY,
  },
});
nms.run();
// nms.on('preConnect', (id, args) => {
//   console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
//   if (JSON.stringify(args).auth) {
//     const session = nms.getSession(id);
//     session.reject();
//   }
// });

// nms.on('prePlay', (id, StreamPath, args) => {
//   console.log(
//     '[NodeEvent on prePlay]',
//     `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`,
//   );
//   if (JSON.stringify(args).auth) {
//     const session = nms.getSession(id);
//     session.reject();
//   }
// });

const app = express();
app.use(morgan('short'));
app.use(cors());

const main = async () => {
  await ngrok.authtoken(process.env.NGROK_TOKEN);
  const siteUrl = await ngrok.connect(3000);
  const liveUrl = await ngrok.connect(8000);

  console.log(`Forwarding ${liveUrl} -> localhost:8000`);

  app.get('/', (req, res) => res.send('Hello World by bushitsuchan!'));
  app.get('/live', async (req, res) => {
    const { code } = req.query;
    if (code === undefined) {
      res.status(401).end();
      console.error(req.query);
      return;
    }
    const tokenResponse = await axios({
      method: 'post',
      url: url.format({
        pathname: 'https://github.com/login/oauth/access_token',
        query: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
      }),
      headers: {
        accept: 'application/json',
      },
    });

    if (tokenResponse.data.error !== undefined) {
      res.status(401).end();
      return;
    }
    const accessToken = tokenResponse.data.access_token;
    if (accessToken === undefined) {
      console.error(tokenResponse.data);
    }
    const orgResponse = await axios({
      method: 'get',
      url: url.format({
        pathname: 'https://api.github.com/user/orgs',
        query: {
          access_token: accessToken,
        },
      }),
      headers: {
        accept: 'application/json',
      },
    }).catch((e) => {
      res.status(400);
      console.error(e);
    });

    if (
      orgResponse.data === undefined
      || !Array.isArray(orgResponse.data)
      || !orgResponse.data.map(x => x.login).includes(process.env.ORGANIZATION)
    ) {
      res.status(403).end();
      console.error(orgResponse);
      return;
      // res.render('error', { error: err });
    }

    const md5 = crypto.createHash('md5');
    const exp = Math.floor(Date.now() / 1000) + 60;
    const streamId = '/live/stream';
    const key = process.env.LIVE_PRIVATE_KEY;
    res.json({
      address: `${liveUrl}/live/stream.flv`,
      hashValue: `${exp}-${md5.update(`${streamId}-${exp}-${key}`).digest('hex')}`,
    });
  });
  app.get('/viewer', (req, res) => {
    const { code } = req.query;
    res.render('flv.ejs', {
      url: url.format({
        pathname: `${siteUrl}/live`,
        query: { code },
      }),
      reloadUrl: `https://${config.restApiId}.execute-api.${config.region}.amazonaws.com/prod`,
    });
  });
  app.get('/oauth-redirect', (req, res) => {
    const { code } = req.query;
    res.redirect(
      url.format({
        pathname: `${siteUrl}/viewer`,
        query: { code },
      }),
    );
  });
  app.get('/auth', (req, res) => {
    const scopes = ['read:org'];
    res.redirect(
      encodeURI(
        `https://github.com/login/oauth/authorize?client_id=${
          process.env.GITHUB_CLIENT_ID
        }&scope=${scopes.join(' ')}`,
      ),
    );
  });

  app.listen(3000, () => console.log(`Forwarding ${siteUrl} -> localhost:3000`));

  execSync(
    `aws apigateway put-integration --rest-api-id ${config.restApiId} --resource-id ${
      config.viewerResourceId
    } --http-method ${config.httpMethod} --type HTTP_PROXY --integration-http-method ${
      config.httpMethod
    } --uri ${siteUrl}/auth`,
  );
  execSync(
    `aws apigateway put-integration --rest-api-id ${config.restApiId} --resource-id ${
      config.oauthResourceId
    } --http-method ${config.httpMethod} --type HTTP_PROXY --integration-http-method ${
      config.httpMethod
    } --uri ${siteUrl}/oauth-redirect`,
  );
  execSync(`aws apigateway create-deployment --rest-api-id ${config.restApiId} --stage-name prod`);
  console.log(
    `Remote URL: https://${config.restApiId}.execute-api.${config.region}.amazonaws.com/prod`,
  );
};

main().catch((e) => {
  console.error(e);
});
