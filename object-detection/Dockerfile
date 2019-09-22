FROM ubuntu:18.04

ARG NUM_THREADS=1
ENV LANG C.UTF-8

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3.7 libpython3.7-dev python3-pip wget curl unzip gnupg ca-certificates lsb-release && \
    update-ca-certificates && \
    pip3 install pipenv

# ENV PIPENV_YES true
ENV PIPENV_VENV_IN_PROJECT true

# https://docs.openvinotoolkit.org/latest/_docs_install_guides_installing_openvino_apt.html
RUN wget https://apt.repos.intel.com/openvino/2019/GPG-PUB-KEY-INTEL-OPENVINO-2019 && \
    apt-key add GPG-PUB-KEY-INTEL-OPENVINO-2019 & \
    bash -c "echo 'deb https://apt.repos.intel.com/openvino/2019/ all main' >> /etc/apt/sources.list.d/intel-openvino-2019.list" & \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 1A8497B11911E097 && \
    apt-get update && \
    apt-get install -y --no-install-recommends intel-openvino-dev-ubuntu18 libgtk-3-dev

# install_openvino_dependencies.sh か libglib2.0-dev libsm-dev libxrender-dev libxext-dev lsb-release のすべてのどちらか
RUN apt-get install -y --no-install-recommends && \
    /opt/intel/openvino/install_dependencies/install_openvino_dependencies.sh
# libglib2.0-dev libsm-dev libxrender-dev libxext-dev lsb-release

# https://docs.openvinotoolkit.org/latest/_docs_install_guides_installing_openvino_docker_linux.html#run_the_docker_image_for_intel_movidius_neural_compute_stick_and_intel_neural_compute_stick_2
RUN cd /tmp/ && \
    wget https://github.com/libusb/libusb/archive/v1.0.22.zip && \
    unzip v1.0.22.zip && cd libusb-1.0.22 && \
    ./bootstrap.sh && \
    ./configure --disable-udev --enable-shared && \
    make -j${NUM_THREADS} && make install && \
    rm -rf /tmp/*

RUN echo '/opt/intel/openvino/bin/setupvars.sh' >> ~/.bashrc
