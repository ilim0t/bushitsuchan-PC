FROM ubuntu:18.04

ARG NUM_THREADS=1
ENV LANG C.UTF-8

# https://docs.openvinotoolkit.org/latest/_docs_install_guides_installing_openvino_docker_linux.html#building-for-cpu
ARG DOWNLOAD_LINK=http://registrationcenter-download.intel.com/akdlm/irc_nas/15693/l_openvino_toolkit_p_2019.2.242_online.tgz
ARG INSTALL_DIR=/opt/intel/openvino
ARG TEMP_DIR=/tmp/openvino_installer

RUN sed -i.bak -e "s%http://archive.ubuntu.com/ubuntu/%http://jp.archive.ubuntu.com/ubuntu/%g" /etc/apt/sources.list && \
    apt-get update -yqq && \
    apt-get install -yq --no-install-recommends wget unzip cpio sudo lsb-release
RUN mkdir -p $TEMP_DIR && \
    cd $TEMP_DIR && \
    wget -c $DOWNLOAD_LINK && \
    tar xf l_openvino_toolkit*.tgz && \
    cd l_openvino_toolkit* && \
    sed -i 's/decline/accept/g' silent.cfg && \
    sed -i 's/#INTEL_SW_IMPROVEMENT_PROGRAM_CONSENT=no/INTEL_SW_IMPROVEMENT_PROGRAM_CONSENT=no/g' silent.cfg && \
    ./install.sh -s silent.cfg && \
    rm -rf $TEMP_DIR
RUN $INSTALL_DIR/install_dependencies/install_openvino_dependencies.sh && \
    apt-get install -yq --no-install-recommends libgtk-3-dev


# https://docs.openvinotoolkit.org/latest/_docs_install_guides_installing_openvino_docker_linux.html#run_the_docker_image_for_intel_movidius_neural_compute_stick_and_intel_neural_compute_stick_2
RUN cd /tmp/ && \
    apt-get install -yq --no-install-recommends unzip && \
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
