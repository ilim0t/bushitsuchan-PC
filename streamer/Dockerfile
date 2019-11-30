# alpineだと/dev/video0を入力とするとエラー
FROM jrottenberg/ffmpeg
WORKDIR /
RUN apt-get update -yqq && \
    apt-get install -yq --no-install-recommends wget unzip && \
    wget https://ipafont.ipa.go.jp/IPAfont/ipag00303.zip && \
    unzip ipag00303.zip && \
    rm  -rf ipag00303.zip
