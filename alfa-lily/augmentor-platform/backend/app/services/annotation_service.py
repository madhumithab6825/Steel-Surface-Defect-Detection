import os
import xml.etree.ElementTree as ET
from app.config import DATASET_DIR

class AnnotationService:

    @staticmethod
    def save_pascal_voc(image_name, image_path, boxes):
        annotation = ET.Element("annotation")

        filename = ET.SubElement(annotation, "filename")
        filename.text = image_path   # ⭐ FULL PATH SAVED

        for box in boxes:
            obj = ET.SubElement(annotation, "object")

            name = ET.SubElement(obj, "name")
            name.text = box.label

            bndbox = ET.SubElement(obj, "bndbox")

            ET.SubElement(bndbox, "xmin").text = str(box.xmin)
            ET.SubElement(bndbox, "ymin").text = str(box.ymin)
            ET.SubElement(bndbox, "xmax").text = str(box.xmax)
            ET.SubElement(bndbox, "ymax").text = str(box.ymax)

        tree = ET.ElementTree(annotation)

        save_path = os.path.join(
            DATASET_DIR,
            image_name.replace(".jpg", ".xml").replace(".png", ".xml")
        )

        tree.write(save_path)
        return save_path