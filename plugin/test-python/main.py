#!/usr/bin/env python3
import cv2
import torchvision
import numpy as np

import torch
from typing import Dict, Union
from matplotlib import cm
from tqdm import tqdm

COCO_INSTANCE_CATEGORY_NAMES = [
    "__background__",
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "N/A",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "N/A",
    "backpack",
    "umbrella",
    "N/A",
    "N/A",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "N/A",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "N/A",
    "dining table",
    "N/A",
    "N/A",
    "toilet",
    "N/A",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "N/A",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush",
]


class ObjectDetector:
    def __init__(self) -> None:
        self.model = torchvision.models.detection.fasterrcnn_resnet50_fpn(
            pretrained=True
        )
        self.model.eval()

        self.color = cm.hsv(
            np.linspace(0, 1, len(COCO_INSTANCE_CATEGORY_NAMES) - 1)
        ).tolist()

    def __call__(self, img: np.ndarray) -> Dict[str, torch.Tensor]:
        prediction, = self.model(
            [torch.from_numpy(img).permute((2, 0, 1)).float() / 255]
        )
        prediction = self.select_top_prediction(prediction)
        return prediction

    def draw(self, img: np.ndarray, prediction: Dict[str, torch.Tensor]) -> np.ndarray:
        img = self.overlay_boxes(img, prediction)
        img = self.overlay_class_names(img, prediction)

        if isinstance(img, cv2.UMat):
            img = img.get()
        return img

    # https://github.com/facebookresearch/maskrcnn-benchmark/blob/master/demo/predictor.py
    def select_top_prediction(
        self, prediction: Dict[str, torch.Tensor], threshold: float = 0.8
    ) -> Dict[str, torch.Tensor]:
        scores = prediction["scores"]
        keep = torch.nonzero(scores > threshold).squeeze(1)
        prediction = prediction.copy()

        for key, value in prediction.items():
            prediction[key] = value[keep]

        # scores.sort(0, descending=True)
        return prediction

    def overlay_boxes(
        self, image: Union[np.ndarray, cv2.UMat], prediction: Dict[str, torch.Tensor]
    ) -> Union[np.ndarray, cv2.UMat]:
        labels = prediction["labels"]
        boxes = prediction["boxes"]

        colors = [self.color[i - 1] for i in labels]

        for box, color in zip(boxes, colors):
            box = box.long()
            top_left, bottom_right = box[:2].tolist(), box[2:].tolist()
            image = cv2.rectangle(
                image, tuple(top_left), tuple(bottom_right), tuple(color), 1
            )
        return image

    def overlay_class_names(
        self, image: Union[np.ndarray, cv2.UMat], prediction: Dict[str, torch.Tensor]
    ) -> Union[np.ndarray, cv2.UMat]:
        scores = prediction["scores"]
        labels = prediction["labels"]
        boxes = prediction["boxes"]

        labels = [COCO_INSTANCE_CATEGORY_NAMES[i] for i in labels]

        for box, score, label in zip(boxes, scores, labels):
            x, y = box[:2]
            text = f"{label}: {score :.2f}"
            cv2.putText(
                image, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1
            )
        return image


def main():
    cap = cv2.VideoCapture("rtmp://localhost:1935/live/bushitsuchan")
    cv2.namedWindow("img", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("img", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    detector = ObjectDetector()

    with tqdm() as pbar:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = np.asarray(frame)
            prediction = detector(frame)
            frame = detector.draw(frame, prediction)

            cv2.imshow("img", frame)

            key = cv2.waitKey(1)
            if key == 27:
                break
            pbar.update(1)

        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
