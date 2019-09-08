FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y make build-essential libssl-dev zlib1g-dev libbz2-dev \
    libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev \
    xz-utils tk-dev libffi-dev liblzma-dev python-openssl git

RUN curl https://pyenv.run | bash && \
    echo 'export PATH="/root/.pyenv/bin:$PATH"' >> ~/.bashrc && \
    echo 'eval "$(pyenv init -)"' >> ~/.bashrc && \
    echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.bashrc

ENV PATH $PATH:/root/.pyenv/bin:/root/.local/bin
ENV PIPENV_YES true
ENV PIPENV_VENV_IN_PROJECT true

WORKDIR /root

RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python get-pip.py && \
    rm get-pip.py

RUN pip install --user pipenv

RUN apt-get install -y wget expect cpio pciutils python3-minimal python3-pip 

RUN cd / && \
    wget http://registrationcenter-download.intel.com/akdlm/irc_nas/15693/l_openvino_toolkit_p_2019.2.242_online.tgz && \
    tar -xvzf l_openvino_toolkit_p_2019.2.242_online.tgz && \
    rm l_openvino_toolkit_p_2019.2.242_online.tgz

COPY install /l_openvino_toolkit_p_2019.2.242_online/
RUN cd /l_openvino_toolkit_p_2019.2.242_online && \
    ./install_openvino_dependencies.sh && \
    expect ./install
