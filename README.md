# bushitsuchan-PC
OSKの部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん.
その部室に置いてあるPC側で動かすプログラム.

## Google Photos APIs を使えようにする
1. [Photos Library API](https://console.developers.google.com/apis/library/photoslibrary.googleapis.com)を有効にする.
1. [認証情報](https://console.developers.google.com/apis/credentials)でOAuth クライアント IDを作成する (アプリケーションの種類 は その他)
1. 作成した`クライアント ID`と`クライアント シークレット`を`oauth2.keys.json`に以下のように保存する

```json:oauth2.keys.json
{
  "web": {
    "client_id": "477...oav.apps.googleusercontent.com",
    "client_secret": "yEP..."
  }
}
```

## カメラを使えるようにする
Macなら
```shell
brew install imagesnap
```
Ubuntuは
```shell
sudo apt-get install fswebcam
```