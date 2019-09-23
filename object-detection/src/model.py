#!/usr/bin/env python3
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import numpy as np
import yaml

from openvino.inference_engine import IECore, IENetwork


class Model:
    def __init__(self, model_file: str, weights_file: str,
                 device: str = "CPU", cpu_extension: str = None) -> None:
        self.device = device
        self.ie = IECore()
        assert self.device in self.ie.available_devices, f"Cannot find the specified device: {self.device}."

        self.network = self.get_network(model_file, weights_file, cpu_extension)

        self.input_blobs: List[str] = list(self.network.inputs)
        self.out_blobs: List[str] = list(self.network.outputs)
        self.network.batch_size = 1

        self.input_shapes: Dict[str, List[int]] = {key: value.shape for key, value in self.network.inputs.items()}

        self.network = self.ie.load_network(network=self.network, device_name=device)

    def get_network(self, model_file: str, weights_file: str, cpu_extension: Optional[str]) -> IENetwork:
        if cpu_extension and self.device == "CPU":
            self.ie.add_extension(cpu_extension, "CPU")

        network = IENetwork(model=model_file, weights=weights_file)

        if "CPU" == self.device:
            supported_layers = set(self.ie.query_network(network, "CPU"))
            unsupported_layers = set(network.layers) - supported_layers
            if len(unsupported_layers):
                print("Several layers are not supported by the plugin for specified device.")
                print(f"The following layers are not supported.\n{unsupported_layers}")
                print("Please try to specify cpu extensions library path in sample's command line parameters using -l "
                      "or --cpu_extension command line argument")
                raise

        assert len(network.outputs) == 1, "Sample supports only single output topologies"
        return network

    def __call__(self, frame: np.ndarray) -> Dict[str, np.ndarray]:
        raise NotImplementedError

    def forward(self, inputs: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        output = self.network.infer(inputs=inputs)
        return output


class PreparedModel(Model):
    model_name: str
    file: str

    def __init__(self, *args, **kwargs) -> None:
        with open("/opt/intel/openvino/deployment_tools/tools/model_downloader/list_topologies.yml") as f:
            topologies = yaml.load(f, Loader=yaml.SafeLoader)
        topologies = {topologie["name"]: topologie for topologie in topologies["topologies"]}

        assert self.model_name in topologies, \
            f"{self.model_name} is not found in model zoo.\nPlease specify from the following.\n{topologies.keys()}"

        output = topologies[self.model_name]["output"] + self.file
        model_file = Path("models") / f"{output}.xml"
        weights_file = Path("models") / f"{output}.bin"

        if not all(file.exists() for file in [model_file, weights_file]):
            subprocess.call(["sh", "./get_model.sh", self.model_name])  # TODO check

        super(PreparedModel, self).__init__(model_file.__str__(), weights_file.__str__(), *args, **kwargs)


class FasterRCNNResnet101Coco(PreparedModel):
    def __init__(self, *args, **kwargs) -> None:
        self.model_name = "faster_rcnn_resnet101_coco"
        self.file = "FP32/faster_rcnn_resnet101_coco"

        super(FasterRCNNResnet101Coco, self).__init__(*args, **kwargs)

    def __call__(self, frame: np.ndarray) -> Dict[str, np.ndarray]:
        images = np.expand_dims(self.transform(frame), 0)
        inputs = {
            "image_tensor": images,
            "image_info": np.array([600, 600, 1])
        }
        output = self.forward(inputs)["detection_output"].squeeze(0)  # (1,N,7)
        output = output.squeeze(0)
        output = {
            "image_id": output[:, 0],
            "label": output[:, 1],
            "conf": output[:, 2],
            "bbox": output[:, 3:7]  # [x_min, y_min, x_max, y_max]
        }
        return output

    @staticmethod
    def transform(x: np.ndarray) -> np.ndarray:
        x = cv2.resize(x, dsize=(600, 600))
        x = cv2.cvtColor(x, cv2.COLOR_RGB2BGR)
        x = x.transpose([2, 0, 1])  # [H, W, C] -> [C, H, W]
        return x
