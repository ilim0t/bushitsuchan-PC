# bushitsuchan-PC

OSKの部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん.
その部室に置いてあるPC側で動かすプログラム.

## 環境の整備

まずこの`README.md`があるディレクトリに移動する.

### SlackBotを作成, 認証鍵を取得する

1. [slack api](https://api.slack.com/apps)でSlack Appを作成.
2. 作成後, [slack api](https://api.slack.com/apps)から作成したBotのページの左メニューにある`Bot User`を押し移動.
3. このページにて`Bot User`を追加
4. 左メニューの`OAuth & Permissions`へ移動.
5. ページ内の`Scopes`>`Select Permission Scopes`のプルダウンリストで`Interactivity`>`Add a bot user`を選択.  
その後`Save Changes`を押し保存.
6. 同`OAuth & Permissions`ページの`OAuth Tokens & Redirect URLs`で`Install App to Workspace`を押し，ワークスペースにAppを追加.
7. 同`OAuth & Permissions`ページの`OAuth Tokens & Redirect URL`>`Tokens for Your Workspace`>`Bot User OAuth Access Token`にある`xoxb-`で始まる文字列をコピー.
8. コピーした文字列を`.envrc`ファイルに以下のように保存する.

   ```bash
   export SLACK_BOT_TOKEN="xoxb-..."
   ```

9. 同じページで左メニューにある`Basic Information`を押し移動.
10. `App Credentials`>`Signing Secret`を`show`を押し表示, その文字列をコピー.
11. コピーした文字列を`.envrc`ファイルに以下のように保存する.

   ```bash
   export SLACK_SIGNING_SECRET="4218..."
   ```

### Slackのwebhook設定

1. 同ページで左メニューにある`Interactive Components`を押し移動し, `Interactivity` を有効化する.

### direnvの設定

1. `.envrc`ファイルが以下のようになっていることを確認.

   ```bash
   export SLACK_BOT_TOKEN="xoxb-..."
   export SLACK_SIGNING_SECRET="4218..."
   ```

2. `direnv`の有効化方法に従う

   ```bash
   direnv allow
   ```

### カメラを使えるようにする

Usageで書いたが，`npm install`で自動で設定されるが，注意が必要なので[opencv4nodejs](https://www.npmjs.com/package/opencv4nodejs#how-to-install)が使えれるよう事前に準備しておく.

## Usage

1. いつもの.

   ```bash
   npm install
   npm start
   ```

   途中でErrorが出たらまあ頑張れ. 多分`package-lock.json`, `token.json`を消してみるか, opencv4nodejsに必要なcmake, gcc, python等のlibraryを`apt`や`brew`で入れれば治る.

2. ngrokで理科大ウォール越える. 以下を実行する. ポート番号は環境変数 `PORT` (デフォルトは `3000`) と同じものを用いる. (**このコマンド及びプロセスはkillせず残す**)

   ```bash
   ngrok http 3000
   ```

3. 2で出力された `Forwarding` の項目のサブドメイン, ドメインをそれぞれ `.encrc` ファイル末尾に以下を追加する.

   ```bash
   export SUBDOMAIN="ee85f..."
   export DOMAIN="ngrok.io"
   ```

4. 以下を実行して `.envrc` を有効化して, `Request URL` 生成する.

   ```bash
   direnv allow
   echo "https://${SUBDOMAIN}.${DOMAIN}/slack/actions/"
   ```

5. 出力されたURLを

[slack api](https://api.slack.com/apps)から作成したBotのページにいき, `Features -> Interactive Components` と進み, `Interactivity` にある `Request URL` に4で `echo` したURLを入力して**保存**する.

> いつもtmuxで動かしてるので, 部室PCのssh接続した後, `tmux attach`を実行すれば実行中の様子が見れます.
