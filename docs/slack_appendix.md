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

## Slack Message Channel

[Slack Workspace](../README.md#Slack\ Workspace)で行った設定に似ています。
いくつかの Channel ID の設定が必要です。

### Setup

以下の環境変数をセットしてください。
ここで挙げる環境変数には Channel ID をセットしてください。

- `CONTACT_CHANNEL`: bushitsuchan-PC に関する管理を行うチャンネル
- `NOTIFICATION_CHANNEL`: 物体検出の結果を投稿するチャンネル

また，Channel ID は以下の手順で取得できます。
まず，Slack の ID を知りたい Slack チャンネルをブラウザで開きます。  
URL が`https://app.slack.com/client/VYS39C27C/UC7CHE35J`のようになっているはずです。  
この URL の`UC7CHE35J`部分が Channel ID です。
