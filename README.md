# bushitsuchan-PC

OSK の部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん
その部室に置いてある PC 側で動かすプログラム

## Support

以下の OS をサポートします

- Ubuntu 18.04
- macOS 10.14 (debug のみ)

## Design

> [Sequence 図](/docs/sequence.md)

## Setup

### ngrok

#### 説明

特定のネットワーク下では，権限なしにウェブサーバーを外部に公開することはできません。
その状況下でも外部に暴露させることができるツールの一つに ngrok があります。

#### 設定

[ngrok](https://ngrok.com/)に登録して，`Tunnel Authtoken` を取得します。  
それを後述する`NGROK_AUTH`に代入してください。

### AWS API Gateway

#### 説明

ngrok 外部に公開したサイトへの URL は変動するので，[API Gateway](https://aws.amazon.com/jp/api-gateway/)を用いて固定された URL を ngrok の URL へリダイレクトします。

#### 設定

[AWS アクセスキーの作成方法](https://aws.amazon.com/jp/premiumsupport/knowledge-center/create-access-key/)に従い

新たにユーザー作成し，`アクセスキー ID`と`シークレットアクセスキー`を作成してください。  
それを後述する`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`に代入してください。

そのユーザーにはポリシー`AmazonAPIGatewayAdministrator`をアクセス権にアタッチしてください。

### Sign in with Slack

#### 説明

Slack と連携し特定の Workspace に属する場合のみ LIVE Streaming 視聴を許可するように設定します。  
また，Slash Commands やメッセージへのアクションを受け取るための設定があるため[設定](slack/README.md)に従ってください。

#### 設定

[Sign in with Slack](https://api.slack.com/docs/sign-in-with-slack) に従い Slack Apps を作成してください。

Bot User メニューにて Redirect URLs は
`https://[RESOURCE_ID].execute-api.[REGION].amazonaws.com/prod/oauth-redirect`のみに設定し，
Scopes に`identity.basic`を追加してください。

### 環境変数

#### 説明

環境変数は独立したアプリケーション間で共通の値を参照できるもので，通常は不変な ID やパスワードを設定します。

#### 設定

`.env`ファイルに以下の様に書き保存してください，

```text
AWS_ACCESS_KEY_ID="FUB..."
AWS_SECRET_ACCESS_KEY="vKw..."

NGROK_AUTH="8HU..."

SESSION_SECRET="presetprivatekey"
SLACK_CLIENT_ID="179..."
SLACK_CLIENT_SECRET="38b..."
WORKSTATION_ID="VOW38CP2D"

SLACK_BOT_ACCESS_TOKEN="xoxb-3814..."
SLACK_SIGNING_SECRET="fb36..."
CONTACT_CHANNEL="JCP..."
```

> ファイルを作成せずに [direnv](https://direnv.net/)などで環境変数に代入しても代入しても動作します。

## Run

```bash=
docker-compose -f docker-compose.prod.yml up -d
```

## Usage

### local

`http://localhost/viewer`を開く

### remote

`docker-compose -f docker-compose.prod.yml logs tunnel`を実行すると見れる log に

```text=
Forwarding  https://[AWS_REST_API_ID].execute-api.[REGION].amazonaws.com/prod-> https://[NGROK_DOMAIN].jp.ngrok.io
```

とあります。1 つ目の URL に`/viewer`を付け加えた`https://[AWS_REST_API_ID].execute-api.[REGION].amazonaws.com/prod/viewer`を開いてください。

> この AWS の URL は半永久的に変わりません

すると，初回実行時(過去に Slack で認証をしていなければ) Slack の認証ページへリダイレクトされます。  
Sign in すると自動的に配信再生ページへ移動します。
