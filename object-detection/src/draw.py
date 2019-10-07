#!/usr/bin/env python3

import json
from typing import Dict, List

import cv2
import numpy as np
from matplotlib import cm

with open("labels.json") as f:
    LABEL_NAME: List[str] = json.load(f)


LABEL_COLOR = [[int(j*255) for j in cm.hsv(i)] for i in np.linspace(0, 1, len(LABEL_NAME), endpoint=False)]


def draw(image: np.ndarray, prediction: Dict[str, np.ndarray]) -> np.ndarray:
    image = overlay_boxes(image, prediction)
    image = overlay_class_names(image, prediction)
    return image


def overlay_boxes(image: np.ndarray, prediction: Dict[str, np.ndarray]) -> np.ndarray:
    labels = prediction["label"].astype(int)
    boxes = (prediction["bbox"].reshape(-1, 2, 2) * np.array(image.shape[-2::-1])).reshape(-1, 4).astype(int)

    colors = [LABEL_COLOR[i] for i in labels]

    for box, color in zip(boxes, colors):
        top_left, bottom_right = box[:2].tolist(), box[2:].tolist()
        image = cv2.rectangle(
            image, tuple(top_left), tuple(bottom_right), tuple(color), 1
        )
    return image


def overlay_class_names(image: np.ndarray, prediction: Dict[str, np.ndarray]) -> np.ndarray:
    boxes = (prediction["bbox"].reshape(-1, 2, 2) * np.array(image.shape[-2::-1])).reshape(-1, 4).astype(int)
    scores = prediction["conf"]
    labels = prediction["label"].astype(int)

    labels = [LABEL_NAME[i] for i in labels]

    for box, score, label in zip(boxes, scores, labels):
        x, y = box[:2]
        text = f"{label}: {score :.2f}"
        image = cv2.putText(
            image, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 3
        )
        image = cv2.putText(
            image, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2
        )
    return image
