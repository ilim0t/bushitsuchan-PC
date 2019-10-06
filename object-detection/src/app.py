#!/usr/bin/env python3

import io
import os
from typing import Dict

import numpy as np
import requests
from flask import Flask, jsonify, request
from PIL import Image

from model import FasterRCNNResnet101Coco

app = Flask(__name__)
app.logger.info("Loading network")
net = FasterRCNNResnet101Coco(os.getenv("DEVICE", "CPU"), os.getenv("CPU_EXTENSION"))
app.logger.info("Network loading finished")


@app.route('/faster_rcnn_resnet101_coco')
def object_detection():
    url = request.json.get("url")
    threshold = request.json.get("threshold", os.getenv("THRESHOLD", 0.7))
    image = requests.get(url)

    image = Image.open(io.BytesIO(image.content)).convert('RGB')
    image = np.asarray(image)

    output = net(image)
    output = select_top_prediction(output, threshold)
    return jsonify({
        "bbox": (output["bbox"].reshape(-1, 2, 2) * np.array(image.shape[:2])).reshape(-1, 4).astype(int).tolist(),
        "conf": output["conf"].tolist(),
        "label": output["label"].astype(int).tolist()
    })


def select_top_prediction(prediction: Dict[str, np.ndarray], threshold: float) -> Dict[str, np.ndarray]:
    assert 0 <= threshold <= 1, "Specify 0 to 1 for threshold."
    keep = np.argsort(-prediction["conf"])[:(prediction["conf"] >= threshold).sum()]
    prediction = {key: value[keep] for key, value in prediction.items()}
    return prediction


if __name__ == "__main__":
    app.run()
