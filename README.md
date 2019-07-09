# bushitsuchan-PC

OSK の部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん.
その部室に置いてある PC 側で動かすプログラム.

## Setup

### AWS CLI

[AWS CLI](https://aws.amazon.com/jp/cli/)をインストール
かつ，その設定をする

```bash=
brew install awscli
aws configure
```

### 固定 URL 設定

https://qiita.com/miso_develop/items/bdcf15489b069ba1fa61 に従い設定

```text=
 / (VIEWER_RESOURCE_ID)
 ├─ GET
 └─oauth-redirect (OAUTH_RESOURCE_ID)
    └─ GET  
```

### 環境変数

NGROK_TOKEN: ngrok の token  

AWS_REST_API_ID: 固定 URL 設定で得られた token  
VIEWER_RESOURCE_ID:  
OAUTH_RESOURCE_ID:  

GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET: GitHub oAuth の token  

LIVE_PRIVATE_KEY: live 接続のための key 暗に用いるので頑強であれば何でも良い  

ORGANIZATION: str, この Organization に入っている人のみに許可する

## Run

```bash=
node app.js
```

rtmp に向けストリーミング
OBS などでも行えますがここでは ffmpeg の例を書きます

```bash=
ffmpeg -re -i example.mp4 -c copy -f flv rtmp://localhost/live/stream
```

### local での確認

`http://localhost:3000/viewer`を開く

> 再生が開始されないことがあるので，静止画で止まったままのときはサイトをリロードしてください。

### remote での確認

`app.js`を実行したときの log に

```text=
Remote URL: https://*****.execute-api.us-east-2.amazonaws.com/prod
```

とあるので，それを開く

> 再生が開始されないことがあるので，静止画で止まったままのときはサイトをリロードしてください。

> この AWS の URL は半永久的に変わりません
