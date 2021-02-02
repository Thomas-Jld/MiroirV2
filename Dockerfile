FROM nvidia/cuda:10.2-cudnn7-devel-ubuntu18.04

#CMD nvidia-smi

WORKDIR /Miroir/

RUN apt-get update && \
  apt-get -y install python3-pip libusb-1.0-0-dev libgl1-mesa-glx nano git curl nodejs software-properties-common && \
  pip3 install --upgrade pip 

# RUN add-apt-repository -y ppa:deadsnakes/ppa

# RUN apt -y install python3.7

# ADD requirements2.txt .
# RUN python3.7 -m pip install -r requirements2.txt

ADD requirements.txt .

RUN pip install -r requirements.txt

RUN apt-get -o Dpkg::Options::="--force-confmiss" install --reinstall netbase

COPY . .

RUN git clone https://github.com/Thomas-Jld/detectron2 reflection/detectron2
RUN curl https://dl.fbaipublicfiles.com/densepose/densepose_rcnn_R_50_FPN_s1x/165712039/model_final_162be9.pkl --output reflection/models/model_final_162be9.pkl 
RUN	curl https://download.01.org/opencv/openvino_training_extensions/models/human_pose_estimation/checkpoint_iter_370000.pth --output reflection/pose-estimation/checkpoint_iter_370000.pth

WORKDIR /Miroir/reflection/

RUN python3 -m pip install -e detectron2 

CMD ./launch_reflection.sh
