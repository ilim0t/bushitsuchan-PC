# bushitsuchan-PC
OSKの部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん.
その部室に置いてあるPC側で動かすプログラム.

# 環境の整備
まずこの`README.md`があるディレクトリに移動する.

## Google Photos APIs の有効化, 認証鍵を取得する
1. [Photos Library API](https://console.developers.google.com/apis/library/photoslibrary.googleapis.com)を有効にする.
1. [認証情報](https://console.developers.google.com/apis/credentials)でOAuth クライアント IDを作成する (アプリケーションの種類 は その他).
1. 作成した`クライアント ID`と`クライアント シークレット`を新たに作った`.envrc`ファイルに以下のように保存する.
```shell
export client_id="477...oav.apps.googleusercontent.com"
export client_secret="yEP..."
```

## SlackBotを作成, 認証鍵を取得する
1. [slack api](https://api.slack.com/apps)でSlack Appを作成.
1. 作成後, [slack api](https://api.slack.com/apps)から作成したBotのページの左メニューにある`Bot User`を押し移動.
1. このページにて`Bot User`を追加
1. 左メニューの`OAuth & Permissions`へ移動.
1. ページ内の`Scopes`>`Select Permission Scopes`のプルダウンリストで`Interactivity`>`Add a bot user`を選択.<br>その後`Save Changes`を押し保存.
2. 同`OAuth & Permissions`ページの`OAuth Tokens & Redirect URLs`で`Install App to Workspace`を押し，ワークスペースにAppを追加.
3. 同`OAuth & Permissions`ページの`OAuth Tokens & Redirect URL`>`Tokens for Your Workspace`>`Bot User OAuth Access Token`にある`xoxb-`で始まる文字列をコピー.
4. コピーした文字列を`.envrc`ファイルに以下のように保存する.
```shell
export slack_token="xoxb-..."
```

## direnvの設定
1. `.envrc`ファイルが以下のようになっていることを確認.
```shell
export client_id="477...oav.apps.googleusercontent.com"
export client_secret="yEP..."
export slack_token="xoxb-..."
```
2. `direnv`の有効化方法に従う
```shell
direnv allow
```

## カメラを使えるようにする
Usageで書いたが，`npm install`で自動で設定されるが，注意が必要なので[opencv4nodejs](https://www.npmjs.com/package/opencv4nodejs#how-to-install)が使えれるよう事前に準備しておく.

# Usage
1. `npm install`
2. `npm start`  
を実行.
途中でErrorが出たらまあ頑張れ. 多分`package-lock.json`, `token.json`を消してみるか, opencv4nodejsに必要なcmake, gcc, python等のlibraryを`apt`や`brew`で入れれば治る.
