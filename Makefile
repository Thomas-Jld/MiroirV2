delete:
	sudo nvidia-docker image rm -f mirror_release

clear:
	sudo nvidia-docker container prune

build:
	sudo nvidia-docker build -t mirror_release .

run:
	sudo nvidia-docker run -it --expose 5000 --network="host" --privileged --volume=/dev:/dev mirror_release
	#  --mount type=bind,source=${CURDIR},target=/Miroir

launch:
	sudo nvidia-docker run --expose 5000 --network="host" --privileged --volume=/dev:/dev mirror_release
	
restart:
	sudo systemctl restart docker
