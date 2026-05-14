import xml.etree.ElementTree as ET


def parse_voc(xml_path):
    """
    Parse Pascal VOC XML annotation safely.
    Returns:
        [
            {
                "label": "damage",
                "bbox": [xmin, ymin, xmax, ymax]
            }
        ]
    """

    boxes = []

    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()

    except Exception as e:
        print(f"[VOC ERROR] Cannot parse XML: {xml_path} -> {e}")
        return boxes

    for obj in root.findall("object"):

        try:
            name_tag = obj.find("name")
            bbox = obj.find("bndbox")

            if name_tag is None or bbox is None:
                continue

            xmin_tag = bbox.find("xmin")
            ymin_tag = bbox.find("ymin")
            xmax_tag = bbox.find("xmax")
            ymax_tag = bbox.find("ymax")

            if None in (xmin_tag, ymin_tag, xmax_tag, ymax_tag):
                continue

            xmin = int(float(xmin_tag.text))
            ymin = int(float(ymin_tag.text))
            xmax = int(float(xmax_tag.text))
            ymax = int(float(ymax_tag.text))

            boxes.append({
                "label": name_tag.text.strip(),
                "bbox": [xmin, ymin, xmax, ymax]
            })

        except Exception as e:
            print(f"[VOC WARNING] Skipping invalid object in {xml_path} -> {e}")
            continue

    if len(boxes) == 0:
        print(f"[VOC WARNING] No boxes found in {xml_path}")

    return boxes