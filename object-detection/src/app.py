#!/usr/bin/env python3

import glob
import os
from io import BytesIO
from time import time
from typing import Dict

import numpy as np
import requests
from flask import Flask, jsonify, request
from PIL import Image

from draw import LABEL_NAME, draw
from model import FasterRCNNResnet101Coco

image_dir = "/dev/shm/photo"
os.makedirs(image_dir, exist_ok=True)

app = Flask(__name__, static_url_path='/photo', static_folder=image_dir)


app.logger.info("Loading network")
net = FasterRCNNResnet101Coco(os.getenv("DEVICE", "CPU"), os.getenv("CPU_EXTENSION"))


@app.route('/faster_rcnn_resnet101_coco')
def object_detection():
    photo_id = request.args.get("photo_id")
    threshold = request.args.get("threshold", os.getenv("THRESHOLD", 0.7))
    retention = float(request.args.get("retention", os.getenv("RETENTION_SEC", 60*60*24)))

    url = f"http://media/photo/{photo_id}"
    image = requests.get(url)
    image = Image.open(BytesIO(image.content)).convert('RGB')
    image = np.asarray(image)

    output = net(image)
    output = select_top_prediction(output, threshold)

    image = draw(image, output)
    for f in glob.glob(f"{image_dir}/*"):
        if f.split("/")[-1].isdecimal() and float(f.split("/")[-1]) / 1000 + retention < time():
            os.remove(f)
    Image.fromarray(image).save(f"{image_dir}/{photo_id}", "JPEG")

    return jsonify({
        "bbox": (output["bbox"].reshape(-1, 2, 2) * np.array(image.shape[-2::-1])).reshape(-1, 4).astype(int).tolist(),
        "confidence": output["conf"].tolist(),
        "label_id": output["label"].astype(int).tolist(),
        "label_name": [LABEL_NAME[label] for label in output["label"].astype(int)],
        "photo_id": photo_id
    })


def select_top_prediction(prediction: Dict[str, np.ndarray], threshold: float) -> Dict[str, np.ndarray]:
    assert 0 <= threshold <= 1, "Specify 0 to 1 for threshold."
    keep = np.argsort(-prediction["conf"])[:(prediction["conf"] >= threshold).sum()]
    prediction = {key: value[keep] for key, value in prediction.items()}
    return prediction


if __name__ == "__main__":
    app.run(port=80)
