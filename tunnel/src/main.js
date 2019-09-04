const AWS = require('aws-sdk');
const { promisify } = require('util');
const ngrok = require('ngrok');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const setApiGateway = async (ngrokUrl) => {
  const apig = new AWS.APIGateway({
    apiVersion: '2015/07/09',
  });

  let restApi;
  if (process.env.AWS_REST_API_ID) {
    restApi = await promisify(apig.getRestApi)
      .bind(apig)({ restApiId: process.env.AWS_REST_API_ID })
      .catch((err) => console.error('Failed to fetch API on AWS:\n', err));
  } else {
    restApi = await promisify(apig.createRestApi)
      .bind(apig)({
        name: process.env.AWS_API_NAME,
        endpointConfiguration: {
          types: ['REGIONAL'],
        },
      })
      .catch((err) => console.error('Failed to create API on AWS:\n', err));
  }

  const rootResource = await promisify(apig.getResources)
    .bind(apig)({
      restApiId: restApi.id,
    })
    .then((data) => data.items.find((item) => item.path === '/'))
    .catch((err) => console.error('Failed to fetch root resource on AWS:\n', err));

  const rootPromise = promisify(apig.putMethod)
    .bind(apig)({
      restApiId: restApi.id,
      resourceId: rootResource.id,
      httpMethod: 'ANY',
      authorizationType: 'NONE',
    })
    .catch((err) => console.error("Failed to setup 'ANY /' method:\n", err))
    .then(() => promisify(apig.putIntegration).bind(apig)({
      restApiId: restApi.id,
      resourceId: rootResource.id,
      httpMethod: 'ANY',
      type: 'HTTP_PROXY',
      integrationHttpMethod: 'ANY',
      uri: `${ngrokUrl}`,
    }))
    .catch((err) => console.error("Failed to setup 'ANY /' integration:\n", err));

  const pathPromise = promisify(apig.createResource)
    .bind(apig)({
      restApiId: restApi.id,
      parentId: rootResource.id,
      pathPart: '{path+}',
    })
    .catch((err) => {
      console.error("Failed to setup '/{path+} resource:\n", err);
      return promisify(apig.getResources)
        .bind(apig)({ restApiId: restApi.id })
        .then((data) => data.items.find((item) => item.path === '/{path+}'));
    })
    .then(async (resource) => {
      await promisify(apig.putMethod)
        .bind(apig)({
          restApiId: restApi.id,
          resourceId: resource.id,
          httpMethod: 'ANY',
          authorizationType: 'NONE',
          requestParameters: {
            'method.request.path.path': true,
          },
        })
        .catch((err) => console.error("Failed to setup 'ANY /{path+}' method:\n", err));

      await promisify(apig.putIntegration)
        .bind(apig)({
          restApiId: restApi.id,
          resourceId: resource.id,
          httpMethod: 'ANY',
          type: 'HTTP_PROXY',
          integrationHttpMethod: 'ANY',
          uri: `${ngrokUrl}/{path}`,
          requestParameters: {
            'integration.request.path.path': 'method.request.path.path',
          },
        })
        .catch((err) => console.error(
          "The 'ANY /{path+}' method integration setup failed:\n",
          err,
        ));
    });

  await Promise.all([rootPromise, pathPromise]);
  const data = await promisify(apig.createDeployment)
    .bind(apig)({
      restApiId: restApi.id,
      stageName: 'prod',
    })
    .catch((err) => console.error('Failed to deploy API:\n', err));

  console.log('Deploying API succeeded\n', data);
  return `https://${restApi.id}.execute-api.${
    AWS.config.region
  }.amazonaws.com/${'prod'}`;
};

ngrok
  .authtoken(process.env.NGROK_AUTH)
  .then(() => ngrok.connect({
    host: process.env.NGROK_HOST,
    region: process.env.NGROK_REGION,
  }))
  .then((ngrokUrl) => {
    console.log(`Forwarding ${ngrokUrl} -> ${process.env.NGROK_HOST}`);
    setApiGateway(ngrokUrl).then((awsUrl) => {
      console.log(`Forwarding  ${awsUrl} -> ${ngrokUrl}`);
      const app = express();

      app.use(helmet());
      app.use(morgan('short'));
      app.get('/', (req, res) => res.json({
        awsUrl,
        ngrokUrl,
      }));
      app.listen(80, () => console.log('Express app listening on port 80.'));
    });
  }).catch((err) => console.error('Failed to connet ngrok:\n', err));
