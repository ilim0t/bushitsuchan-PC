python /opt/intel/openvino/deployment_tools/tools/model_downloader/downloader.py \
    --name $1 \
    --cache_dir ./.cache \
    --output_dir ./models

python /opt/intel/openvino/deployment_tools/tools/model_downloader/converter.py \
    --name $1 \
    --mo /opt/intel/openvino/deployment_tools/model_optimizer/mo.py \
    --download_dir ./models
