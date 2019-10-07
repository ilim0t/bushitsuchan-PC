sed -e "s/data_type=FP32/data_type=FP16/g" /opt/intel/openvino/deployment_tools/tools/model_downloader/list_topologies.yml > ./list_topologies.yml

python /opt/intel/openvino/deployment_tools/tools/model_downloader/downloader.py \
    --config ./list_topologies.yml \
    --name $1 \
    --cache_dir ./.cache \
    --output_dir ./models

python /opt/intel/openvino/deployment_tools/tools/model_downloader/converter.py \
    --config ./list_topologies.yml \
    --name $1 \
    --mo /opt/intel/openvino/deployment_tools/model_optimizer/mo.py \
    --download_dir ./models
