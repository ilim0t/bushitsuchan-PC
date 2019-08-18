# slack

## Slack bot

### Setup

[Slash Commands](https://api.slack.com/slash-commands)に従い Slack API ページにて以下のコマンドを追加してください。

Command: `/bushitsu-photo`  
Request URL: `https://[AWS_REST_API_ID].execute-api.[AWS_REGION].amazonaws.com/prod/slack/bushitsu-photo`

その際，Escape channels, users, and links sent to your app は有効に設定してください。

## Slack interactive message

### Setup

[Making messages interactive](https://api.slack.com/interactive-messages) に従い Request URL に`https://[AWS_REST_API_ID].execute-api.[AWS_REGION].amazonaws.com/prod/slack/actions/`を設定してください。
