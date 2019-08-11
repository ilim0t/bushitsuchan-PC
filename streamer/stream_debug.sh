#!/bin/ash

ffmpeg \
    -stream_loop -1 \
    -re -i sample_movie.mp4 \
    -r 5 \
    -vcodec libx264 \
    -pix_fmt yuv420p \
    -preset veryfast \
    -c:v copy -c:a copy \
    -vb 1000k \
    -f flv "${RTMP_SERVER_URL}/${STREAM_NAME}"
