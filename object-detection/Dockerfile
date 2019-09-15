FROM ubuntu:18.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3.7 wget gnupg curl ca-certificates && \
    apt-get download python3-distutils && \
    dpkg-deb -x python3-distutils* / && \
    rm python3-distutils* && \
    update-ca-certificates

RUN curl -kL https://bootstrap.pypa.io/get-pip.py | python3.7 && \
    pip3 install pipenv

# ENV PIPENV_YES true
ENV PIPENV_VENV_IN_PROJECT true

RUN wget https://apt.repos.intel.com/openvino/2019/GPG-PUB-KEY-INTEL-OPENVINO-2019 && \
    apt-key add GPG-PUB-KEY-INTEL-OPENVINO-2019 & \
    bash -c "echo 'deb https://apt.repos.intel.com/openvino/2019/ all main' >> /etc/apt/sources.list.d/intel-openvino-2019.list" & \
    apt-key adv --keyserver apt.repos.intel.com --recv-keys && \
    apt-get update && \
    apt-get install -y --no-install-recommends intel-openvino-dev-ubuntu18 libglib2.0-dev libsm-dev libxrender-dev libxext-dev lsb-release
# TODO /opt/intel/openvino/install_dependicy.sh の必要性とその中で行われるので省略できる処理の確認

RUN echo '/opt/intel/openvino/bin/setupvars.sh' >> ~/.bashrc
