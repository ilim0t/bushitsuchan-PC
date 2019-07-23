const childProcess = require('child_process');
const util = require('util');

const exec = util.promisify(childProcess.exec);

module.exports.run = async (config, url) => {
  const resources = await exec(
    `aws apigateway get-resources --rest-api-id ${config.restApiId}`,
  ).then((result) => {
    const { stdout } = result;
    return JSON.parse(stdout);
  });
  const commands = [];

  resources.items.forEach((resource) => {
    if (!resource.resourceMethods) {
      return;
    }
    Array.prototype.push.apply(
      commands,
      Object.keys(resource.resourceMethods).map((method) => {
        let command = `aws apigateway put-integration --rest-api-id ${config.restApiId} --resource-id ${resource.id} --http-method ${method} --type HTTP_PROXY --integration-http-method ${method}`;
        command += ` --uri ${url}${resource.path.replace(/{([^}+]+)\+}/, '{$1}')}`;
        const isMatch = resource.path.match(/{([^}+]+)\+}/);
        if (isMatch) {
          command += ` --request-parameters integration.request.path.${
            isMatch[1]
          }=method.request.path.${isMatch[1]}`;
        }
        return command;
      }),
    );
  });
  await Promise.all(commands.map(command => exec(command)));

  await exec(
    `aws apigateway create-deployment --rest-api-id ${config.restApiId} --stage-name prod`,
  );

  const region = await exec('aws configure get region').then((result) => {
    const { stdout } = result;
    return stdout.slice(0, -1);
  });
  return `https://${config.restApiId}.execute-api.${region}.amazonaws.com/prod`;
};
