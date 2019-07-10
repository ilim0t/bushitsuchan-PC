const { execSync } = require('child_process');

module.exports.run = async (config, siteUrl) => {
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

  return `https://${config.restApiId}.execute-api.${config.region}.amazonaws.com/prod`;
};
