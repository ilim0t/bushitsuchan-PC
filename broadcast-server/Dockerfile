FROM jrottenberg/ffmpeg

ADD broadcast.sh /usr/local/bin/broadcast.sh
RUN ["chmod", "+x", "/usr/local/bin/broadcast.sh"]

RUN apt-get update && apt-get install -y fonts-ipafont
ENTRYPOINT [ "/usr/local/bin/broadcast.sh" ]
