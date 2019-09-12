# bushitsuchan-PC

OSK の部室の様子をオンラインで確認できるプロジェクト 部室ちゃん
その部室に置いてある PC で動かすプログラム

## Support

以下の OS をサポートします

- Ubuntu 18.04
- macOS 10.14 (Debug mode のみ)

Debug mode 下では挙動に以下の差異があります

- ストリーミング映像がカメラからではなく任意の動画ファイルから取得される
- Time zone の設定がされず時刻がずれる

## Container

bushitsuchan-PC では[Docker](https://www.docker.com/)というソフトフェアを活用しています。  
Docker はコンテナ技術を体現したシステムの一つで，独立したサービス単位で環境それぞれを Container という形で OS レベルに分離させることができます。必要最低な構成を独立して扱うため再利用性が高まり，また分離しているため取り回しも良くなります。

bushitsuchan-PC における container の一覧と用途を記します。

### streaming-server

同時に複数のプロセスがカメラにアクセスすることができないためこの container で映像を管理し，複数のプロセスへとカメラ画像を受け渡します。

### streamer

**streaming-server** へと実際にカメラ画像をストリーミングします。遅延を減らすための圧縮や codec の変換も行います。

### media

各 container が必要とするカメラ画像や映像を **streaming-server** から代理で取り出します。また取り出す際のさらなる変換も行います。

### reverse-proxy

外部からのアクセスを URL 毎に **web** または **slack** へ振り分ける処理を行います。

### tunnel

外部へ **reverse-proxy** サーバを公開する際の初期設定などの処理を行います。

### web

ブラウザでウェブサイトへアクセスされた際の処理を行います。ログイン処理なども担います。

### slack

Slack 上での slash command や action への応答を処理しています。

### redis

データベースとして機能し，ログイン情報の保持や画像変換の待機管理を行います。

## Design

bushitsuchan-PC 全体のフロー

> [Sequence 図](/docs/sequence.md)

## Setup

### ngrok

#### 説明

特定のネットワーク下では，権限なしにウェブサーバーを外部に公開することはできません。
その状況下でも外部に暴露させることができるサービスの 1 つに ngrok があります。  
ngrok はユーザー登録をしていると使い勝手が良くなるので， bushitsuchan-PC ではそうしています。  
このとき，ユーザーごとに割り振られたキーが必要です。

#### 設定

[ngrok](https://ngrok.com/)に登録して，`Tunnel Authtoken` を取得します。  
それを後述する環境変数`NGROK_AUTH`にセットしてください。

### AWS API Gateway

#### 説明

ngrok 外部に公開したサイトへの URL は変動するので，[API Gateway](https://aws.amazon.com/jp/api-gateway/)を用いて固定された URL を ngrok の URL へリダイレクトします。  
API Gateway を利用するためには AWS アカウントと AWS へアクセスするキーが必要です。

#### 設定

[AWS アクセスキーの作成方法](https://aws.amazon.com/jp/premiumsupport/knowledge-center/create-access-key/)に従い

新たにユーザー作成し，`アクセスキー ID`と`シークレットアクセスキー`を作成してください。  
それを後述する環境変数`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`にセットしてください。

そのユーザーにはポリシー`AmazonAPIGatewayAdministrator`をアクセス権にアタッチしてください。

二回目以降の起動時は環境変数に`AWS_REST_API_ID`をセットする必要があります。この値は[Usage remote](#remote)にかかれている方法で確認できます。

### Sign in with Slack

#### 説明

Slack と連携し特定の Workspace に属する場合のみ LIVE Streaming 視聴を許可するように設定します。  
その際，Slack App という枠組みを利用しています。新たに Slack App を作成し，それに対応するいくつかの ID やキーが必要です。

また，Slash Commands やメッセージへのアクションを受け取るためには[slack 設定](slack/README.md)に従う必要があります。

#### 設定

まず[Sign in with Slack](https://api.slack.com/docs/sign-in-with-slack) に従い Slack App を作成してください。

Bot User メニューにて Redirect URLs は
`https://[RESOURCE_ID].execute-api.[REGION].amazonaws.com/prod/oauth-redirect`のみに設定し，
Scopes に`identity.basic`を追加してください。

作成した Slack App から以下の環境変数を設定してください。詳細は後述します。  
どの部分から得るのかの対応を書いておきます。

- `SLACK_CLIENT_ID`: Basic Information > App Credentials > Client ID
- `SLACK_CLIENT_SECRET`: Basic Information > App Credentials > Signing Client Secret
- `SLACK_BOT_ACCESS_TOKEN`: OAuth & Permissions > Tokens for Your Workspace > Bot User OAuth Access Token
- `SLACK_SIGNING_SECRET`: Basic Information > App Credentials > Signing Secret

### Slack Workspace

#### 説明

bushitsuchan-PC では slack で特定のワークスペースに属する場合のみ配信等を提供します。  
そのワークスペースに属するかどうかの判定に，ワークスペース固有の ID が必要です。

#### 設定

まず，そのワークスペースのサイトをブラウザで開きます。  
URL が`https://app.slack.com/client/VYS39C27C/UC7CHE35J`のようになっているはずです。  
この URL の`VYS39C27C`部分が必要な ID です。
後述する環境変数`WORKSTATION_ID`にセットしてください。

### 環境変数

#### 説明

環境変数は独立したアプリケーション間で共通の値を参照できるもので，通常は不変な ID やパスワードを設定します。

#### 設定

`.env`ファイルに以下の様に書き保存してください，

```text
AWS_REST_API_ID="j3i..."  # 二回目以降に必要
AWS_ACCESS_KEY_ID="FUB..."
AWS_SECRET_ACCESS_KEY="vKw..."

NGROK_AUTH="8HU..."

SESSION_SECRET="presetprivatekey"  # 暗に暗号化へ使う任意の頑強な文字列

SLACK_CLIENT_ID="179..."
SLACK_CLIENT_SECRET="38b..."
WORKSTATION_ID="VOW38CP2D"

SLACK_BOT_ACCESS_TOKEN="xoxb-3814..."
SLACK_SIGNING_SECRET="fb36..."
```

> ファイルを作成せずに [direnv](https://direnv.net/)などで環境変数に代入しても動作します。

## Requirement

- [Docker compose](https://docs.docker.com/compose/install/)
- Camera

## Run

```bash=
docker-compose -f docker-compose.prod.yml up -d
```

## Usage

### local

`http://localhost/viewer`を開いてください。

### remote

`docker-compose -f docker-compose.prod.yml logs tunnel`を実行すると表示される log の中に

```text=
Forwarding  https://[AWS_REST_API_ID].execute-api.[AWS_REGION].amazonaws.com/prod -> https://[NGROK_DOMAIN].jp.ngrok.io
```

とあります。1 つ目の URL に`/viewer`を付け加えた`https://[AWS_REST_API_ID].execute-api.[AWS_REGION].amazonaws.com/prod/viewer`を開いてください。

> この AWS の URL は半永久的に変わりません

すると，初回実行時(過去に Slack で認証をしていなければ) Slack の認証ページへリダイレクトされます。  
Sign in すると自動的に配信再生ページへ移動します。
