python /opt/intel/openvino/deployment_tools/tools/model_downloader/downloader.py \
    --name faster_rcnn_resnet101_coco \
    --cache_dir ./.cache \
    --output_dir ./models

python /opt/intel/openvino/deployment_tools/tools/model_downloader/converter.py \
    --name faster_rcnn_resnet101_coco \
    --mo /opt/intel/openvino/deployment_tools/model_optimizer/mo.py \
    --download_dir ./models
