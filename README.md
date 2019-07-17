# bushitsuchan-PC

OSK の部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん
その部室に置いてある PC 側で動かすプログラム

## Setup

### ngrok

[ngrok](https://ngrok.com/)に登録して，`Tunnel Authtoken` を取得します。

### AWS CLI

[AWS CLI](https://aws.amazon.com/jp/cli/)をインストール
かつ，その設定をします。

** Mac**

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
 ├─ /oauth-redirect
 │   └─ GET
 └─ /viewer
      └─ GET
```

上のような構造になります。

> `app.js`内の`config.region`にて region を指定しています。この値と API Gateway を設定した region，AWSCLI で設定する region を一致させてください

### Sign in with Slack

Slack と連携し，指定の Workspace に属する場合のみ LIVE Streaming 視聴を許可するように設定します。
[Sign in with Slack](https://api.slack.com/docs/sign-in-with-slack) に従い Slack Apps を作成してください。

Bot User メニューにて Redirect URLs は
`https://[RESOURCE_ID].execute-api.[REGION].amazonaws.com/prod/oauth-redirect`のみに設定し，
Scopes に`identity.basic`を追加してください。

### 環境変数

`NGROK_TOKEN`: Tunnel Authtoken, 無料プランでプランでも動作します

`AWS_REST_API_ID`: API Gateway で得た ID

`SLACK_CLIENT_ID`: Slack Apps の Client ID  
`SLACK_CLIENT_SECRET`: Slack Apps の Client Secret

`LIVE_PRIVATE_KEY`: live streaming に認証をかけるための key, 暗に用いるので頑強であれば何でも良い

`WORKSTATION_ID`: Slack の WorkSpace の ID

```bash=
export NGROK_TOKEN="8HU..."

export AWS_REST_API_ID="h7c..."

export SLACK_CLIENT_ID="179..."
export SLACK_CLIENT_SECRET="38b..."

export LIVE_PRIVATE_KEY="presetprivatekey"

export WORKSTATION_ID="VOW38CP2D"
```

[direnv](https://direnv.net/)なら以上のように設定されているはずです。

## Run

```bash=
npm start
```

rtmp に向けストリーミングします。  
OBS などでも行えますがここでは ffmpeg の例を書きます。

**Mac**

```bash=
brew install ffmpeg
```

**Ubuntu**

```bash=
sudo apt-get install ffmpeg
```

**Use Video files**

```bash=
ffmpeg -re -i example.mp4 -c copy -f flv rtmp://localhost/live/stream
```

**Use USB Camera**

```bash=
ffmpeg -i /dev/video0 -framerate 1 -video_size 1080x720 -vcodec libx264 -maxrate 768k -bufsize 8080k -vf "format=yuv420p" -g 60 -f flv rtmp://localhost/live/stream
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

> 再生が開始されないことがあるので，静止画で止まったままのときはサイトをリロードしてください。
