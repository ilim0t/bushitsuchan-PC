python /opt/intel/openvino/deployment_tools/open_model_zoo/tools/downloader/downloader.py \
    --name $1 \
    --cache_dir ./.cache \
    --output_dir ./models

python /opt/intel/openvino/deployment_tools/open_model_zoo/tools/downloader/converter.py \
    --name $1 \
    --precisions=FP16 \
    --mo /opt/intel/openvino/deployment_tools/model_optimizer/mo.py \
    --download_dir ./models
