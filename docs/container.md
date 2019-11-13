# Container

bushitsuchan-PC における container の一覧と用途を記します。

## streaming-server

同時に複数のプロセスがカメラにアクセスすることができないためこの container で映像を管理し，複数のプロセスへとカメラ画像を受け渡します。

## streamer

**streaming-server** へと実際にカメラ画像をストリーミングします。遅延を減らすための圧縮や codec の変換も行います。

## media

各 container が必要とするカメラ画像や映像を **streaming-server** から代理で取り出します。また取り出す際のさらなる変換も行います。

## reverse-proxy

外部からのアクセスを URL 毎に **web** または **slack** へ振り分ける処理を行います。

## tunnel

外部へ **reverse-proxy** サーバを公開する際の初期設定などの処理を行います。

## web

ブラウザでウェブサイトへアクセスされた際の処理を行います。ログイン処理なども担います。

## slack

Slack 上での slash command や action への応答を処理しています。

## redis

データベースとして機能し，ログイン情報の保持や画像変換の待機管理を行います。
