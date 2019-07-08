# bushitsuchan-PC
OSKの部室の様子を様子をオンラインで確認できるプロジェクト 部室ちゃん.
その部室に置いてあるPC側で動かすプログラム.

## Setup

### 環境変数
NGROK_TOKENにngrokのtokenをセットする

# Run
```bash=
node app.js
```

```bash=
ffmpeg -re -i example.mp4 -c copy -f flv rtmp://localhost/live/bushitsuchan
```

`app.js`を実行したときのlogに

```text
Please check https://*******.ngrok.io/viewer
```

とあるのでそれを開く。

> 再生が開始されないことがあるので，静止画で止まったままのときはサイトをリロードしてください。