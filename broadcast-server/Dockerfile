FROM jrottenberg/ffmpeg

RUN ["chmod", "+x", "/usr/local/bin/broadcast.sh"]

RUN apt-get update && apt-get install -y fonts-ipafont
ENTRYPOINT [ "/usr/local/bin/broadcast.sh" ]
