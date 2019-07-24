# bushitsuchan-PC

OSK の部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん
その部室に置いてある PC 側で動かすプログラム

## Support

以下の OS をサポートします

- Ubuntu 18.04
- macOS 10.14

## Design

> [Sequence 図](/docs/sequence.md)

## Setup

### ngrok

[ngrok](https://ngrok.com/)に登録して，`Tunnel Authtoken` を取得します。

### AWS CLI

[AWS CLI](https://aws.amazon.com/jp/cli/)をインストール
かつ，その設定をします。

**macOS**

```bash=
brew install awscli
aws configure
```

**Ubuntu**

```bash=
sudo apt-get install awscli
aws configure
```

### AWS API Gateway

ngrok で得られる URL はは変動するので，[API Gateway](https://aws.amazon.com/jp/api-gateway/)を用いて固定 URL を ngrok の URL へリダイレクトするように設定します。

[ngrok を無料プランで URL 固定してみる](https://qiita.com/miso_develop/items/bdcf15489b069ba1fa61) に従い設定します。

```text=
 /
 ├─ GET
 ├─ /auth
 │   └─ GET
 ├─ /login
 │   └─ GET
 ├─ /logout
 │   └─ GET
 ├─ /oauth-redirect
 │   └─ GET
 ├─ /photo.jpeg
 │   └─ GET
 ├─ /photo-viewer
 │   └─ GET
 ├─ /slack
 │   └ /{path+}
 │      ├─ GET
 │      └─ POST
 ├─ /stream
 │   └ /{file+}
 │      └─ GET
 └─ /viewer
      └─ GET
```

上のような構造になります。

> API Gateway を設定した region，AWSCLI で設定する region を一致させてください

### Sign in with Slack

Slack と連携し，指定の Workspace に属する場合のみ LIVE Streaming 視聴を許可するように設定します。
[Sign in with Slack](https://api.slack.com/docs/sign-in-with-slack) に従い Slack Apps を作成してください。

Bot User メニューにて Redirect URLs は
`https://[RESOURCE_ID].execute-api.[REGION].amazonaws.com/prod/oauth-redirect`のみに設定し，
Scopes に`identity.basic`を追加してください。

### Slack bot

[Slash Commands](https://api.slack.com/slash-commands)に従い slack api ページにて，  
Command: `/bushitsu-photo`  
Request URL: `https://[AWS_REST_API_ID].execute-api.[REGION].amazonaws.com/prod/slack/photo`  
Escape channels, users, and links sent to your app を有効  
に設定します。

### Slack interactive message

[Making messages interactive](https://api.slack.com/interactive-messages) に従い設定します。
Request URL は`https://[AWS_REST_API_ID].execute-api.[REGION].amazonaws.com/prod/slack/actions/`を設定してください。

### 環境変数

`NGROK_TOKEN`: Tunnel Authtoken, 無料プランでプランでも動作します

`AWS_REST_API_ID`: API Gateway で得た ID

`SLACK_CLIENT_ID`: Slack Apps の Client ID  
`SLACK_CLIENT_SECRET`: Slack Apps の Client Secret

`SLACK_BOT_ACCESS_TOKEN`: Slack Apps の OAuth Access Token  
`SLACK_SIGNING_SECRET`: Slack Apps の Signing Secret

`CONTACT_CHANNEL`: Slack でのメッセージにのせる問い合せ先の channel ID

> 参考: [Formatting text in messages](https://api.slack.com/messaging/composing/formatting#linking-channels)

`LIVE_PRIVATE_KEY`: live streaming に認証をかけるための key, 暗に用いるので頑強であれば何でも良い

`WORKSTATION_ID`: Slack の WorkSpace の ID

```bash=
export NGROK_TOKEN="8HU..."

export AWS_REST_API_ID="h7c..."

export SLACK_CLIENT_ID="179..."
export SLACK_CLIENT_SECRET="38b..."

export SLACK_BOT_ACCESS_TOKEN="xoxb-3814..."
export SLACK_SIGNING_SECRET="fb36..."

export CONTACT_CHANNEL="JCP..."

export PRIVATE_KEY="presetprivatekey"

export WORKSTATION_ID="VOW38CP2D"
```

> `IS_MAC`, `DEBUG` この２つの変数で flag を立てることもできます
> `true`, `false`, `0`, `1` で指定可能です。

[direnv](https://direnv.net/)なら以上のように設定されているはずです。

### ffmpeg

画像,音声をを取得するときに必要です。インストールします。

**Mac**

```bash=
brew install ffmpeg
```

**Ubuntu**

```bash=
sudo apt-get install ffmpeg
```

### RAM Disk

Ubuntu では自動で行われますが，Mac の場合 OS 起動の度に手動で行う必要があります。
以下のように実行してください。

```bash=
hdiutil attach -nomount ram://204800
newfs_hfs /dev/disk2
cd /path/to/bushitsuchan-PC
mkdir -p hls/
mount -t hfs /dev/disk2 hls/
```

> 一行目の実行結果が`/dev/disk2`以外だった場合は，それ以降の`/dev/disk2`を実行結果のパスへ変更してください。

### node_module

```bash=
cd /path/to/bushitsuchan-PC
npm install
```

## Run

```bash=
npm start
```

## Usage

**local**

`http://localhost:3000/viewer`を開く

**remote**

`app.js`を実行したときの log に

```text=
Remote URL: https://[AWS_REST_API_ID].execute-api.[REGION].amazonaws.com/prod
```

とあります。それに`/viewer`を付け加えた`https://[AWS_REST_API_ID].execute-api.[REGION].amazonaws.com/prod/viewer`を開いてください。

> この AWS の URL は半永久的に変わりません

すると，初回実行時(過去に Slack で認証をしていなければ) Slack の認証ページへリダイレクトされます。  
Sign in すると自動的に配信再生ページへ移動します。

## Debug

WEB サイトデザインのためのデバッグモード

環境変数`DEBUG`をつけると他のすべての環境変数を省略できます。  
外部や Slack からのアクセスができなくなる代わりに煩わしい設定が不要になります。

> `http://localhost:3000/viewer`でアクセスできます。

Setup では以下のもの以外は飛ばして構いません。

- [ffmpeg](#ffmpeg)
- [RAM Disk](#RAM-Disk)
- [node_module](#node_module)
- [環境変数](#環境変数)
