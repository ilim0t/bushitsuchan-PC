FROM ubuntu:18.04

ARG NUM_THREADS=1
ENV LANG C.UTF-8

RUN sed -i.bak -e "s%http://archive.ubuntu.com/ubuntu/%http://jp.archive.ubuntu.com/ubuntu/%g" /etc/apt/sources.list && \
    apt-get update -yqq && \
    apt-get install -yq --no-install-recommends wget unzip gnupg ca-certificates lsb-release && \
    update-ca-certificates

# https://docs.openvinotoolkit.org/latest/_docs_install_guides_installing_openvino_apt.html
RUN wget https://apt.repos.intel.com/intel-gpg-keys/GPG-PUB-KEY-INTEL-SW-PRODUCTS-2019.PUB && \
    apt-key add GPG-PUB-KEY-INTEL-SW-PRODUCTS-2019.PUB && \
    rm GPG-PUB-KEY-INTEL-SW-PRODUCTS-2019.PUB && \
    bash -c "echo 'deb https://apt.repos.intel.com/openvino/2019/ all main' >> /etc/apt/sources.list.d/intel-openvino-2019.list" && \
    apt-get update && \
    apt-get install -yq --no-install-recommends intel-openvino-dev-ubuntu18

RUN apt-get install -yq --no-install-recommends libgtk-3-dev && \
    /opt/intel/openvino/install_dependencies/install_openvino_dependencies.sh

# https://docs.openvinotoolkit.org/latest/_docs_install_guides_installing_openvino_docker_linux.html#run_the_docker_image_for_intel_movidius_neural_compute_stick_and_intel_neural_compute_stick_2
RUN cd /tmp/ && \
    wget https://github.com/libusb/libusb/archive/v1.0.22.zip && \
    unzip v1.0.22.zip && cd libusb-1.0.22 && \
    ./bootstrap.sh && \
    ./configure --disable-udev --enable-shared && \
    make -j${NUM_THREADS} && make install && \
    rm -rf /tmp/*

RUN echo '/opt/intel/openvino/bin/setupvars.sh' >> ~/.bashrc

RUN apt-get install -yq --no-install-recommends python3.7 libpython3.7-dev python3-pip && \
    pip3 install pipenv

ENV PIPENV_VENV_IN_PROJECT true
