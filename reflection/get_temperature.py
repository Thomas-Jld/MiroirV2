import argparse

import cv2
import numpy as np
import torch
import pyrealsense2 as rs
import json
import math

from models.with_mobilenet import PoseEstimationWithMobileNet
from modules.keypoints import extract_keypoints, group_keypoints
from modules.load_state import load_state
from modules.pose import Pose
from val import normalize, pad_width





class VideoReader(object):
    def __init__(self):
        self.pipe = rs.pipeline()
        config = rs.config()

        self.width = 640
        self.height = 480

        config.enable_stream(rs.stream.infrared, self.width, self.height, rs.format.z16, 30)
        config.enable_stream(rs.stream.color, self.width, self.height, rs.format.bgr8, 30)

        profile = self.pipe.start(config)

        depth_sensor = profile.get_device().first_depth_sensor()

        laser_power = depth_sensor.get_option(rs.option.laser_power)
        depth_sensor.set_option(rs.option.laser_power, 0)

        self.depth_scale = depth_sensor.get_depth_scale()

        clipping_distance_in_meters = 3
        clipping_distance = clipping_distance_in_meters / self.depth_scale

        align_to = rs.stream.color
        self.align = rs.align(align_to)


    def next_frame(self):
        frameset = self.pipe.wait_for_frames()

        aligned_frames = self.align.process(frameset)

        color_frame = aligned_frames.get_color_frame()
        depth_frame = aligned_frames.get_depth_frame()

        self.depth_intrinsics = depth_frame.profile.as_video_stream_profile().intrinsics
        self.color_intrinsics = color_frame.profile.as_video_stream_profile().intrinsics

        color_frame = np.asanyarray(color_frame.get_data())
        depth_frame = np.asanyarray(depth_frame.get_data())

        return [color_frame, depth_frame]



def infer_fast(net, img, net_input_height_size, stride, upsample_ratio, cpu,
               pad_value=(0, 0, 0), img_mean=(128, 128, 128), img_scale=1/256):
    """
    Scale the image and estimate the probabilty of each point being a keypoint (heatmap)
    """
    height, width, _ = img.shape
    scale = net_input_height_size / height

    scaled_img = cv2.resize(img, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    scaled_img = normalize(scaled_img, img_mean, img_scale)
    min_dims = [net_input_height_size, max(scaled_img.shape[1], net_input_height_size)]
    padded_img, pad = pad_width(scaled_img, stride, pad_value, min_dims)

    tensor_img = torch.from_numpy(padded_img).permute(2, 0, 1).unsqueeze(0).float()
    if not cpu:
        tensor_img = tensor_img.cuda()

    stages_output = net(tensor_img)

    stage2_heatmaps = stages_output[-2]
    heatmaps = np.transpose(stage2_heatmaps.squeeze().cpu().data.numpy(), (1, 2, 0))
    heatmaps = cv2.resize(heatmaps, (0, 0), fx=upsample_ratio, fy=upsample_ratio, interpolation=cv2.INTER_CUBIC)

    stage2_pafs = stages_output[-1]
    pafs = np.transpose(stage2_pafs.squeeze().cpu().data.numpy(), (1, 2, 0))
    pafs = cv2.resize(pafs, (0, 0), fx=upsample_ratio, fy=upsample_ratio, interpolation=cv2.INTER_CUBIC)

    return heatmaps, pafs, scale, pad




def get_temperature(pose, joint: int, depth_frame) -> float:
    x = int(pose.keypoints[joint][0])
    y = int(pose.keypoints[joint][1])
    return np.mean(depth_frame[y - 3 : y + 3, x - 3 : x + 3])


def find_temperature(net, image_provider = VideoReader(), send = False, cpu = False):

    height_size = 256
    stride = 8
    upsample_ratio = 4
    num_keypoints = Pose.num_kpts

    data = {}

    frames = image_provider.next_frame()

    img = np.array(frames[0])
    depth = np.array(frames[1])

    """
    Estimate the pose and find the person in the middle
    """

    heatmaps, pafs, scale, pad = infer_fast(net, img, height_size, stride, upsample_ratio, cpu)

    total_keypoints_num = 0
    all_keypoints_by_type = []
    for kpt_idx in range(num_keypoints):  # 19th for bg
        total_keypoints_num += extract_keypoints(heatmaps[:, :, kpt_idx], all_keypoints_by_type, total_keypoints_num)

    pose_entries, all_keypoints = group_keypoints(all_keypoints_by_type, pafs, demo=True)
    for kpt_id in range(all_keypoints.shape[0]):
        all_keypoints[kpt_id, 0] = (all_keypoints[kpt_id, 0] * stride / upsample_ratio - pad[1]) / scale
        all_keypoints[kpt_id, 1] = (all_keypoints[kpt_id, 1] * stride / upsample_ratio - pad[0]) / scale
    current_poses = []

    distMin = 310
    midPose = None

    for n in range(len(pose_entries)):
        if len(pose_entries[n]) == 0:
            continue
        pose_keypoints = np.ones((num_keypoints, 2), dtype=np.int32) * -1
        for kpt_id in range(num_keypoints):
            if pose_entries[n][kpt_id] != -1.0:  # keypoint was found
                pose_keypoints[kpt_id, 0] = int(all_keypoints[int(pose_entries[n][kpt_id]), 0])
                pose_keypoints[kpt_id, 1] = int(all_keypoints[int(pose_entries[n][kpt_id]), 1])
        pose = Pose(pose_keypoints, pose_entries[n][18])

        dist = abs(pose.keypoints[0][0] - image_provider.width/2)
        if dist < distMin:
            distMin = dist
            midPose = pose
        current_poses.append(pose)

    """
    Find the temperature of each exposed parts of the body
    """

    if midPose != None:
        for n in range(len(Pose.kpt_names)):
            if midPose.keypoints[n][0] != 0 or midPose.keypoints[n][1] != 0:
                data[Pose.kpt_names[n]] = get_temperature(
                    midPose, n, depth
                )
    return data


def init(cpu = False):
    net = PoseEstimationWithMobileNet()

    checkpoint_path = "checkpoint_iter_370000.pth"
    checkpoint = torch.load(checkpoint_path, map_location='cpu') #load the existing model
    load_state(net, checkpoint)

    net = net.eval()
    if not cpu:
        net = net.cuda()

    return net
