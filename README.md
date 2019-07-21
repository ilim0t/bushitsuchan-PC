# bushitsuchan-PC

OSK の部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん
その部室に置いてある PC 側で動かすプログラム

# Support

以下の OS をサポートします

- Ubuntu 18.04
- macOS 10.14

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
 ├─ /stream
 │   ├─ GET
 │   └ /{file+}
 │      └─ GET
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

export PRIVATE_KEY="presetprivatekey"

export WORKSTATION_ID="VOW38CP2D"
```

[direnv](https://direnv.net/)なら以上のように設定されているはずです。

## ffmpeg

画像,音声をを取得するときに必要です。

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
mkdir -p /path/to/bushitsuchan-PC/hls
mount -t hfs /dev/disk2 /path/to/bushitsuchan-PC/hls
```

## Run

```bash=
npm start
```

## Streaming

以下のコマンドを実行してください。

### Step.1 Streaming to RTMP server

**Use USB Camera on Ubuntu**

```bash=
ffmpeg \
    -i /dev/video0 \
    -vcodec libx264 \
    -pix_fmt yuv420p \
    -preset veryfast \
    -tune fastdecode \
    -vb 2500k \
    -vf "drawtext=text='%{localtime\:%T}': fontcolor=white@0.8: x=7: y=700" \
    -f flv rtmp://localhost:1935/live/bushitsuchan
```

**Use USB Camera on macOS**

```bash=
ffmpeg \
    -f avfoundation \
    -framerate 30 \
    -i 0 \
    -r 10 \
    -vcodec libx264 \
    -pix_fmt yuv420p \
    -vb 2500k \
    -vf "drawtext=text='%{localtime\:%T}': fontcolor=white@0.8: x=7: y=700" \
    -f hls [Directory of ramdisk]/bushitsuchan/output.m3u8
```

### Step.2 Conversioning into HLS

```bash=
ffmpeg \
    -i rtmp://localhost:1935/live/bushitsuchan \
    -hls_flags delete_segments \
    -codec:v copy \
    -g 40 \
    -f hls [Directory of RAM disk]/bushitsuchan/output.m3u8
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
