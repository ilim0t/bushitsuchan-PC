FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y wget expect cpio pciutils python3-minimal python3-pip 

RUN cd / && \
    wget http://registrationcenter-download.intel.com/akdlm/irc_nas/15693/l_openvino_toolkit_p_2019.2.242_online.tgz && \
    tar -xvzf l_openvino_toolkit_p_2019.2.242_online.tgz && \
    rm l_openvino_toolkit_p_2019.2.242_online.tgz

COPY install /l_openvino_toolkit_p_2019.2.242_online/
RUN cd /l_openvino_toolkit_p_2019.2.242_online && \
    ./install_openvino_dependencies.sh && \
    expect ./install
