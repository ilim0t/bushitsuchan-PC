FROM ubuntu:16.04
ARG PYTHON_VERSION=3.7.4

RUN apt-get update && apt-get install -y make build-essential libssl-dev zlib1g-dev libbz2-dev \
    libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev \
    xz-utils tk-dev libffi-dev liblzma-dev python-openssl git

RUN git clone git://github.com/pyenv/pyenv.git && \
    cd pyenv/plugins/python-build && \
    ./install.sh && \
    python-build ${PYTHON_VERSION} ~/local/python-${PYTHON_VERSION}

WORKDIR /root
ENV PATH $PATH:/root/local/python-${PYTHON_VERSION}/bin
ENV PIPENV_YES true
ENV PIPENV_VENV_IN_PROJECT true

RUN  curl -kL https://bootstrap.pypa.io/get-pip.py | python3 && \
    pip install pipenv

RUN apt-get install -y wget expect cpio pciutils

RUN cd / && \
    wget http://registrationcenter-download.intel.com/akdlm/irc_nas/15693/l_openvino_toolkit_p_2019.2.242_online.tgz && \
    tar -xvzf l_openvino_toolkit_p_2019.2.242_online.tgz && \
    rm l_openvino_toolkit_p_2019.2.242_online.tgz

COPY install /l_openvino_toolkit_p_2019.2.242_online/
RUN cd /l_openvino_toolkit_p_2019.2.242_online && \
    ./install_openvino_dependencies.sh && \
    expect ./install
