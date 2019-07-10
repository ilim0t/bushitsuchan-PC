# bushitsuchan-PC

OSK の部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん.
その部室に置いてある PC 側で動かすプログラム.

## Setup

### ngrok

[ngrok](https://ngrok.com/)に登録して，`Tunnel Authtoken` を取得する

### AWS CLI

[AWS CLI](https://aws.amazon.com/jp/cli/)をインストール
かつ，その設定をする

```bash=
brew install awscli
aws configure
```

### AWS API Gateway

ngrok で得られる URL はは変動するので，[API Gateway](https://aws.amazon.com/jp/api-gateway/)を用いて固定 URL を ngrok の URL へリダイレクトするように設定する

https://qiita.com/miso_develop/items/bdcf15489b069ba1fa61 に従い設定

```text=
 / (VIEWER_RESOURCE_ID)
 ├─ GET
 └─ /oauth-redirect (OAUTH_RESOURCE_ID)
     └─ GET
```

上のような構造にします

> `app.js`内の`config.region`にて region を指定しています。この値と API Gateway を設定した region，AWSCLI で設定する region を一致させてください

### GitHub OAuth Apps

GitHub と連携し，指定の指定の Organization に属する場合のみ，live streaming 視聴を視聴を許可するように設定します

[Building OAuth Apps](https://developer.github.com/apps/building-oauth-apps/) に従い OAuth Apps を作成してください。  
`Authorization callback URL` は AWS API Gateway で得られる URL を設定します

`https://[VIEWER_RESOURCE_ID].execute-api.[REGION].amazonaws.com/prod/oauth-redirect`のようになります

### 環境変数

NGROK_TOKEN: Tunnel Authtoken, 無料プランでプランでも動作します

AWS_REST_API_ID: API Gateway で得た ID  
VIEWER_RESOURCE_ID: API Gateway で得たルートの ID  
OAUTH_RESOURCE_ID: API Gateway で得た/oauth-redirect リソース の ID

GITHUB_CLIENT_ID: GitHub OAuth Apps の Client ID  
GITHUB_CLIENT_SECRET: GitHub OAuth Apps の Client Secret

LIVE_PRIVATE_KEY: live streaming に認証をかけるための key, 暗に用いるので頑強であれば何でも良い

ORGANIZATION: Organization のサイトを開いたときに URL に表示されている文字列, この Organization に入っている人のみに許可します

```bash=
export NGROK_TOKEN="8HU..."

export AWS_REST_API_ID="h7c..."
export VIEWER_RESOURCE_ID="2kv..."
export OAUTH_RESOURCE_ID="zoo..."

export GITHUB_CLIENT_ID="1b08..."
export GITHUB_CLIENT_SECRET="jvi..."

export LIVE_PRIVATE_KEY="presetprivatekey"

export ORGANIZATION="TUS-OSK"
```

[direnv](https://direnv.net/)なら以上のように設定されているはずです

## Run

```bash=
node app.js
```

rtmp に向けストリーミングします  
OBS などでも行えますがここでは ffmpeg の例を書きます

```bash=
ffmpeg -re -i example.mp4 -c copy -f flv rtmp://localhost/live/stream
```

## Usage

**local**

`http://localhost:3000/auth`を開く

**remote**

`app.js`を実行したときの log に

```text=
Remote URL: https://[AWS_REST_API_ID].execute-api.[REGION].amazonaws.com/prod
```

とあるので，それを開きます

> この AWS の URL は半永久的に変わりません

すると，初回実行時(過去に GitHub 認証をしていなければ)GitHub の認証ページへリダイレクトされます  
指定 Organization の許可が取れていることを確認して認証します  
認証後は自動的に streaming 配信再生ページへ移動します

> 再生が開始されないことがあるので，静止画で止まったままのときはサイトをリロードしてください。
