#!/usr/bin/env python3
import os
from io import BytesIO
from typing import Dict, List, Tuple, Union

import numpy as np
import requests
from PIL import Image

from draw import LABEL_NAME, draw
from model import FasterRCNNResnet101Coco, Model


def main() -> None:
    net = FasterRCNNResnet101Coco(os.getenv("DEVICE", "CPU"), os.getenv("CPU_EXTENSION"))

    threshold = float(os.getenv("THRESHOLD", 0.7))
    retention_time = float(os.getenv("RETENTION_SEC", 60 * 60 * 24))

    while True:
        image, prediction = predict(net, threshold)

        res = requests.post("http://image-storage/temporary", {"retention_time": retention_time},
                            files={"file": ("prediction", convert_image_buffer(image), "image/jpeg")})
        print(f"temporary/{res.json()['id']}")


def convert_image_buffer(image: np.ndarray) -> bytes:
    image = Image.fromarray(image)
    with BytesIO() as byte_io:
        image.save(byte_io, format="JPEG")
        buffer = byte_io.getvalue()
    return buffer


def predict(net: Model, threshold: float) -> Tuple[np.ndarray, Dict[str, Union[List[int], List[float], List[str]]]]:
    image = fetch_camera_image()
    output = net(image)
    output = select_top_prediction(output, threshold)

    image = draw(image, output)

    output["bbox"] = output["bbox"] * np.tile(np.array(image.shape[-2::-1]), 2)
    return image, {
        "bbox": output["bbox"].astype(int).tolist(),
        "confidence": output["conf"].tolist(),
        "label_id": output["label"].astype(int).tolist(),
        "label_name": [LABEL_NAME[label] for label in output["label"].astype(int)]
    }


def fetch_camera_image() -> np.ndarray:
    image = requests.get("http://image-storage/temporary")
    image = Image.open(BytesIO(image.content)).convert('RGB')
    image = np.asarray(image)
    return image


def select_top_prediction(prediction: Dict[str, np.ndarray], threshold: float) -> Dict[str, np.ndarray]:
    assert 0 <= threshold <= 1, "Specify 0 to 1 for threshold."
    keep = np.argsort(-prediction["conf"])[:(prediction["conf"] >= threshold).sum()]
    prediction = {key: value[keep] for key, value in prediction.items()}
    return prediction


if __name__ == "__main__":
    main()
