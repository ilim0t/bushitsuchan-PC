FROM python:3.7.4-slim-stretch AS python
FROM ubuntu:16.04

ENV LANG C.UTF-8

# COPY --from=python /bin /bin
# COPY --from=python /boot /boot
# COPY --from=python /dev /dev
COPY --from=python /etc /etc
# COPY --from=python /home /home
COPY --from=python /lib /lib
COPY --from=python /lib64 /lib64
# COPY --from=python /media /media
# COPY --from=python /mnt /mnt
# COPY --from=python /opt /opt
# COPY --from=python /proc /proc
# COPY --from=python /root /root
# COPY --from=python /run /run
# COPY --from=python /sbin /sbin
# COPY --from=python /srv /srv
# COPY --from=python /sys /sys
# COPY --from=python /tmp /tmp
COPY --from=python /usr /usr
# COPY --from=python /var /var

WORKDIR /root
RUN pip install pipenv
# ARG PYTHON_VERSION=3.7.4
# RUN apt-get update && apt-get install -y --no-install-recommends  make build-essential libssl-dev zlib1g-dev libbz2-dev \
#     libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev \
#     xz-utils tk-dev libffi-dev liblzma-dev python-openssl git

# RUN git config --global http.sslVerify false && \
#     git clone https://github.com/pyenv/pyenv.git && \
#     cd pyenv/plugins/python-build && \
#     ./install.sh && \
#     python-build ${PYTHON_VERSION} ~/local/python-${PYTHON_VERSION}

# WORKDIR /root
# ENV PATH $PATH:/root/local/python-${PYTHON_VERSION}/bin
# ENV PIPENV_YES true
# ENV PIPENV_VENV_IN_PROJECT true

# RUN  curl -kL https://bootstrap.pypa.io/get-pip.py | python3 && \
#     pip install pipenv

ENV PIPENV_YES true
ENV PIPENV_VENV_IN_PROJECT true

# https://docs.openvinotoolkit.org/latest/_docs_install_guides_installing_openvino_docker_linux.html
ENV http_proxy $HTTP_PROXY
ENV https_proxy $HTTPS_PROXY
ARG DOWNLOAD_LINK=http://registrationcenter-download.intel.com/akdlm/irc_nas/15792/l_openvino_toolkit_p_2019.2.275_online.tgz
ARG INSTALL_DIR=/opt/intel/openvino
ARG TEMP_DIR=/tmp/openvino_installer
# TODO lsb-releaseがpythonをいれてしまう
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    cpio \
    sudo \
    lsb-release && \
    rm -rf /var/lib/apt/lists/*
RUN mkdir -p $TEMP_DIR && cd $TEMP_DIR && \
    wget -c $DOWNLOAD_LINK && \
    tar xf l_openvino_toolkit*.tgz && \
    cd l_openvino_toolkit* && \
    sed -i 's/decline/accept/g' silent.cfg && \
    ./install.sh -s silent.cfg && \
    rm -rf $TEMP_DIR
# TODO install_openvino_dependencies.shがpythonをいれてしまう

RUN sed -i 's/libpng12-dev/libpng-dev/g' $INSTALL_DIR/install_dependencies/install_openvino_dependencies.sh && \
    $INSTALL_DIR/install_dependencies/install_openvino_dependencies.sh

# build Inference Engine samples
RUN mkdir $INSTALL_DIR/deployment_tools/inference_engine/samples/build && cd $INSTALL_DIR/deployment_tools/inference_engine/samples/build && \
    /bin/bash -c "source $INSTALL_DIR/bin/setupvars.sh && cmake .. && make -j1"

RUN apt-get install -y --no-install-recommends unzip && \
    cd /tmp/ && \
    wget https://github.com/libusb/libusb/archive/v1.0.22.zip && \
    unzip v1.0.22.zip && cd libusb-1.0.22 && \
    ./bootstrap.sh && \
    ./configure --disable-udev --enable-shared && \
    make -j4 && make install && \
    rm -rf /tmp/*
