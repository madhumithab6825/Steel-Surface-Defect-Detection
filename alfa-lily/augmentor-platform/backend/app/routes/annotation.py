from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.schemas import AnnotationRequest
from app.services.annotation_service import AnnotationService
import os
import xml.etree.ElementTree as ET

router = APIRouter()


# ====================================================
# SAVE ANNOTATION
# ====================================================

@router.post("/save")
def save_annotation(request: AnnotationRequest):
    path = AnnotationService.save_pascal_voc(
        request.image_name,
        request.image_path,
        request.boxes
    )
    return {"annotation_saved": path}


# ====================================================
# LOAD ANNOTATION
# ====================================================

@router.get("/{image_name}")
def load_annotation(image_name: str):

    image_name = os.path.splitext(image_name)[0]
    xml_path = os.path.join("datasets", f"{image_name}.xml")

    if not os.path.exists(xml_path):
        return {"boxes": []}

    tree = ET.parse(xml_path)
    root = tree.getroot()

    boxes = []

    for obj in root.findall("object"):
        label = obj.find("name").text

        bndbox = obj.find("bndbox")
        xmin = int(bndbox.find("xmin").text)
        ymin = int(bndbox.find("ymin").text)
        xmax = int(bndbox.find("xmax").text)
        ymax = int(bndbox.find("ymax").text)

        boxes.append({
            "label": label,
            "xmin": xmin,
            "ymin": ymin,
            "xmax": xmax,
            "ymax": ymax
        })

    return JSONResponse(content={"boxes": boxes})
