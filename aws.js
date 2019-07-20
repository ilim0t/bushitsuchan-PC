const childProcess = require('child_process');
const util = require('util');

const exec = util.promisify(childProcess.exec);

module.exports.run = async (config, url) => {
  exec(`aws apigateway get-resources --rest-api-id ${config.restApiId}`)
    .then((result) => {
      const { stdout } = result;
      return JSON.parse(stdout);
    })
    .then(resources => Promise.all(
      resources.items.map((item) => {
        let command = `aws apigateway put-integration --rest-api-id ${config.restApiId} --resource-id ${item.id} --http-method GET --type HTTP_PROXY --integration-http-method GET`;
        command += ` --uri ${url}${item.path.replace(/{([^}+]+)\+}/, '{$1}')}`;
        const isMatch = item.path.match(/{([^}+]+)\+}/);
        if (isMatch) {
          command += ` --request-parameters integration.request.path.${
            isMatch[1]
          }=method.request.path.${isMatch[1]}`;
        }
        return exec(command);
      }),
    ))
    .then(() => {
      exec(`aws apigateway create-deployment --rest-api-id ${config.restApiId} --stage-name prod`);
    })
    .catch((e) => {
      console.error(e);
    });

  const region = await exec('aws configure get region').then((result) => {
    const { stdout } = result;
    return stdout.slice(0, -1);
  });
  return `https://${config.restApiId}.execute-api.${region}.amazonaws.com/prod`;
};
