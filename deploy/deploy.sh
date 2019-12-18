#!/bin/sh
git pull
docker-compose -f ${DOCKER_COMPOSE_FILE} build --pull
docker-compose -f ${DOCKER_COMPOSE_FILE} pull
docker-compose -f ${DOCKER_COMPOSE_FILE} up -d --force-recreate
