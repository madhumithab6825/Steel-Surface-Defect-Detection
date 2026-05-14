from pydantic import BaseModel
from typing import List

class BoundingBox(BaseModel):
    label: str
    xmin: int
    ymin: int
    xmax: int
    ymax: int

class AnnotationRequest(BaseModel):
    image_name: str
    image_path: str   # ⭐ NEW
    boxes: List[BoundingBox]

class TrainRequest(BaseModel):
    dataset_path: str
    class_name: str

class AugmentationRequest(BaseModel):
    source_image: str
    target_image: str
    mask_path: str
    output_name: str