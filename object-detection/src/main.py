#!/usr/bin/env python3
import os
import argparse
import cv2
# from logging import getLogger
import json
import asyncio
from model import Net

# logger = getLogger(__name__)

parser = argparse.ArgumentParser()
parser.add_argument(
    "-l", "--cpu-extension",
    help="Required for CPU custom layers. MKLDNN (CPU)-targeted custom layers. Absolute path to a shared library with "
         "the kernels implementations.",
    type=str)
parser.add_argument(
    "-d", "--device",
    help="Specify the target device to infer. The sample will look for a suitable plugin for device specified.",
    default=os.getenv("DEVICE", "CPU"),
    choices=["CPU", "GPU", "FPGA", "HDDL", "MYRIAD", "HETERO"],
    type=str)
parser.add_argument(
    "--interval",
    help="Infers through the network every specified number of seconds.",
    default=os.getenv("INFERENCE_INTERVAL_SEC", 60 * 5),
    type=int)
parser.add_argument(
    "--rtmp-server-url",
    help="Streaming server address starting with rtmp:// .",
    default=os.getenv("RTMP_SERVER_URL", "rtmp://streaming-server/live"),
    type=str)
parser.add_argument(
    "--stream-name",
    help="The stream name assigned to the stream on the streaming server.",
    default=os.getenv("STREAM_NAME"),
    type=str)
parser.add_argument(
    "--model-file",
    help="The path of .xml file where network model data is described.",
    default=os.getenv("MODEL_FILE"),
    type=str)
parser.add_argument(
    "--weights-file",
    help="The path of the .bin file that describes the network weight.",
    default=os.getenv("WEIGHTS_FILE"),
    type=str)


def main():
    args = parser.parse_args()
    print(json.dumps(args.__dict__, indent=2))

    cap = cv2.VideoCapture(f"{args.rtmp_server_url}/{args.stream_name}")
    net = Net(args.model_file, args.weights_file, args.device, args.cpu_extension, cap)

    loop = asyncio.get_event_loop()
    loop.call_later(args.interval, inference, net, loop)
    loop.run_forever()

    # loop.close()


def inference(net: Net, loop=None):
    loop = loop or asyncio.get_event_loop()
    ouput = net()
    loop.stop()


if __name__ == "__main__":
    print("start")
    main()
