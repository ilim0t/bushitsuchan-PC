#!/bin/ash

ffmpeg \
    -stream_loop -1 \
    -s 1280x960 \
    -i /dev/video0 \
    -vcodec libx264 \
    -pix_fmt yuv420p \
    -preset veryfast \
    -tune zerolatency,stillimage,film \
    -vb 2500k \
    -vf "drawtext=fontfile='/ipag00303/ipag.ttf':text='%{localtime}':fontcolor=white@0.7:bordercolor=black@0.7:borderw=3:x=0:y=h-lh*1.2:fontsize=24" \
    -f flv "${RTMP_SERVER_URL}/${STREAM_NAME}" \
    -loglevel warning
