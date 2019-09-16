FROM ubuntu:18.04

ENV LANG C.UTF-8

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3.7 libpython3.7-dev python3-pip wget curl gnupg ca-certificates && \
    update-ca-certificates && \
    pip3 install pipenv

# ENV PIPENV_YES true
ENV PIPENV_VENV_IN_PROJECT true

RUN wget https://apt.repos.intel.com/openvino/2019/GPG-PUB-KEY-INTEL-OPENVINO-2019 && \
    apt-key add GPG-PUB-KEY-INTEL-OPENVINO-2019 & \
    bash -c "echo 'deb https://apt.repos.intel.com/openvino/2019/ all main' >> /etc/apt/sources.list.d/intel-openvino-2019.list" & \
    apt-key adv --keyserver apt.repos.intel.com --recv-keys && \
    apt-get update && \
    apt-get install -y --no-install-recommends intel-openvino-dev-ubuntu18 libglib2.0-dev libsm-dev libxrender-dev libxext-dev lsb-release libgtk-3-dev
# TODO /opt/intel/openvino/install_dependicy.sh の必要性とその中で行われるので省略できる処理の確認

RUN echo '/opt/intel/openvino/bin/setupvars.sh' >> ~/.bashrc
# ENV PYTHONPATH /opt/intel/openvino/python/python3.7:$PYTHONPATH
