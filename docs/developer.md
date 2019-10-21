# bushitsuchan-PC

Developer 向けの情報を書き置きます。

## 初期設定

任意の動画を`sample_movie.mp4`という名前でリポジトリ直下においてください。
streamer が利用します。

## 開発環境

以下を使うと開発が楽になります。

- [lazydocker](https://github.com/jesseduffield/lazydocker)
- [Visual Studio Code](https://code.visualstudio.com/)

## Debug

### Run

必要な container ごとに起動ができます。

例えば

```sh=
docker-compose -f docker-compose.debug.yml up -d web slack
```

と実行すれば web container,slack container が立ち上がります。
またそれらが依存する container も自動で立ち上がります。

Mac の場合 Docker の性能劣化の関係で，実行順序が望むものと異なってしまうという現象が起こります。  
その場合依存関係を解決できなくなるため，lazydocker などでモニタして修正する必要があります。

### Log

```sh=
lazydocker
```

と実行すると，各 container の起動状況が確認できます。
各 container の出力を見れたり，container 内で shell を起動することもできます。

### debugger

各 container では debugger が起動しています。
VScode で，[launch.json](vscode/launch.json)のように設定すると，各 container の debugger へと接続ができます。

## CPU 固有の設定

NCS2 を用いずに object-detection を行う場合，つまり CPU で演算をする場合に OpenVINO で SIMD 命令を利用しますが，CPU によって命令セットが異なる場合があります。

もし，object-detection container が特別な出力なしに強制終了する場合は，以下の変更が必要です。
`docker-compose.debug.yml`ファイルの`object-detection`の設定する箇所で，

```sh=
- CPU_EXTENSION=/opt/intel/openvino/inference_engine/lib/intel64/libcpu_extension_avx2.so
```

とあります。
この行での`avx2`を`sse4`または`avx512`へと，自分の PC に合わせたものへの変更を行ってください。

## utils

以下のコマンドで各 container が必要とする Package を完全にインストールします。  
環境をリセットし lock した情報から復元するため時間がかかりますが，完全に復元できます。

```sh=
docker-compose -f utils/docker-compose.install.yml up -d
```

以下のコマンドで各 container が必要とする Package の不足分と，脆弱性が見つかった Package の Upgrade を行います。

```sh=
docker-compose -f utils/docker-compose.update.yml up -d
```
