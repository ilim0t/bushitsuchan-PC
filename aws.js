const childProcess = require('child_process');
const util = require('util');

const exec = util.promisify(childProcess.exec);

module.exports.run = async (config, siteUrl) => {
  exec(`aws apigateway get-resources --rest-api-id ${config.restApiId}`)
    .then((result) => {
      const { stderr, stdout } = result;
      return JSON.parse(stdout);
    })
    .then(resources => Promise.all(
      resources.items.map(item => exec(
        `aws apigateway put-integration --rest-api-id ${config.restApiId} --resource-id ${item.id} --http-method ${config.httpMethod} --type HTTP_PROXY --integration-http-method ${config.httpMethod} --uri ${siteUrl}${item.path}`,
      )),
    ))
    .then(() => {
      exec(`aws apigateway create-deployment --rest-api-id ${config.restApiId} --stage-name prod`);
    })
    .catch((e) => {
      console.error(e);
    });

  const region = await exec('aws configure get region').then((result) => {
    const { stderr, stdout } = result;
    return stdout.slice(0, -1);
  });
  return `https://${config.restApiId}.execute-api.${region}.amazonaws.com/prod`;
};
