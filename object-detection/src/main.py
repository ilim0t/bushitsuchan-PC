#!/usr/bin/env python3
import argparse
import asyncio
import json
import os
from typing import Dict

import cv2
import numpy as np

from model import FasterRCNNResnet101Coco, Model
from openvino.inference_engine import IECore

parser = argparse.ArgumentParser()
parser.add_argument(
    "-l", "--cpu-extension",
    help="Required for CPU custom layers. MKLDNN (CPU)-targeted custom layers. Absolute path to a shared library with "
         "the kernels implementations.",
    default="/opt/intel/openvino/inference_engine/lib/intel64/libcpu_extension_avx2.so",
    type=str)
parser.add_argument(
    "-d", "--device",
    help="Specify the target device to infer. The sample will look for a suitable plugin for device specified.",
    default=os.getenv("DEVICE", "CPU"),
    choices=IECore().available_devices,
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
    default=os.getenv("STREAM_NAME", "bushitsuchan"),
    type=str)
parser.add_argument(
    "-t",
    "--threshold",
    help="Ignore predictions below a specified value.",
    default=os.getenv("THRESHOLD", 0.7),
    type=float)


def main():
    args = parser.parse_args()
    print(json.dumps(args.__dict__, indent=2))

    cap = cv2.VideoCapture(f"{args.rtmp_server_url}/{args.stream_name}")
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    net = FasterRCNNResnet101Coco(args.device, args.cpu_extension)

    loop = asyncio.get_event_loop()
    loop.call_later(args.interval, inference, net, cap, args.threshold, loop)
    loop.run_forever()
    # loop.close()


def inference(net: Model, cap: cv2.VideoCapture, threshold: float, loop=None):
    loop = loop or asyncio.get_event_loop()
    ret, frame = cap.read()
    assert ret, f"Can't get image from {cap}"  # TODO capのf-string内での表示

    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    output = net(frame)
    output = select_top_prediction(output, threshold)
    loop.stop()


def select_top_prediction(prediction: Dict[str, np.ndarray], threshold: float) -> Dict[str, np.ndarray]:
    assert 0 <= threshold <= 1, "Specify 0 to 1 for threshold."
    keep = np.argsort(-prediction["conf"])[:(prediction["conf"] >= threshold).sum()]
    prediction = {key: value[keep] for key, value in prediction.items()}
    return prediction


if __name__ == "__main__":
    print("start")
    main()
