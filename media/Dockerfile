FROM node:alpine AS node

FROM jrottenberg/ffmpeg:alpine
COPY --from=node /usr/local /usr/local
