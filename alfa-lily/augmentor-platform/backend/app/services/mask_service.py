import os
import cv2
import numpy as np
import xml.etree.ElementTree as ET

from app.utils.voc_parser import parse_voc


class MaskService:

    # =====================================================
    # GENERATE SINGLE MASK
    # =====================================================
    @staticmethod
    def generate_mask(image_path, annotation_path, output_path, selected_label):

        image = cv2.imread(image_path)

        if image is None:
            print(f"[MASK ERROR] Cannot read image: {image_path}")
            return None

        h, w = image.shape[:2]

        mask = np.zeros((h, w), dtype=np.uint8)

        try:

            tree = ET.parse(annotation_path)
            root = tree.getroot()

            found = False

            for obj in root.findall("object"):

                label = obj.find("name").text

                # ⭐ FILTER LABEL
                if label != selected_label:
                    continue

                found = True

                bndbox = obj.find("bndbox")

                x1 = int(bndbox.find("xmin").text)
                y1 = int(bndbox.find("ymin").text)
                x2 = int(bndbox.find("xmax").text)
                y2 = int(bndbox.find("ymax").text)

                # -----------------------------------
                # SAFETY CLAMP
                # -----------------------------------
                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(w, x2)
                y2 = min(h, y2)

                if x2 <= x1 or y2 <= y1:
                    continue

                # -----------------------------------
                # ⭐ NEW : IGNORE VERY SMALL DEFECTS
                # -----------------------------------
                if (x2 - x1) < 10 or (y2 - y1) < 10:
                    print("[MASK INFO] bbox too small skipped")
                    continue

                # -----------------------------------
                # ⭐ NEW : SHRINK BOX SLIGHTLY
                # avoids background blending
                # -----------------------------------
                shrink = 2

                x1 += shrink
                y1 += shrink
                x2 -= shrink
                y2 -= shrink

                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(w, x2)
                y2 = min(h, y2)

                if x2 <= x1 or y2 <= y1:
                    continue

                mask[y1:y2, x1:x2] = 255

            if not found:
                print(
                    f"[MASK INFO] Label '{selected_label}' not found in {annotation_path}"
                )
                return None

        except Exception as e:

            print(f"[MASK WARNING] XML parse failed {annotation_path}: {e}")
            return None

        if np.sum(mask) == 0:
            print(f"[MASK WARNING] Empty mask skipped: {annotation_path}")
            return None

        # -----------------------------------
        # ⭐ NEW : STRONGER MASK FOR POISSON
        # -----------------------------------
        kernel = np.ones((5, 5), np.uint8)

        mask = cv2.dilate(
            mask,
            kernel,
            iterations=1
        )

        # ⭐ include label in mask filename
        base = os.path.splitext(os.path.basename(output_path))[0]

        output_path = os.path.join(
            os.path.dirname(output_path),
            f"{selected_label}_{base}.png"
        )

        cv2.imwrite(output_path, mask)

        print(f"[MASK] Generated -> {output_path}")

        return output_path

    # =====================================================
    # READ IMAGE NAME FROM XML
    # =====================================================
    @staticmethod
    def _get_image_name_from_xml(xml_path):

        try:

            tree = ET.parse(xml_path)
            root = tree.getroot()

            filename_tag = root.find("filename")

            if filename_tag is not None and filename_tag.text:

                name = filename_tag.text.strip()

                return os.path.basename(name)

        except Exception as e:

            print(
                f"[MASK WARNING] Cannot read filename from XML {xml_path}: {e}"
            )

        return None

    # =====================================================
    # GENERATE ALL MASKS
    # =====================================================
    @staticmethod
    def generate_all_masks(data_path, save_path, selected_label):

        os.makedirs(save_path, exist_ok=True)

        generated = []

        print(f"[MASK] Images folder: {data_path}")
        print(f"[MASK] XML folder   : {save_path}")
        print(f"[MASK] FILTER LABEL: {selected_label}")

        files = os.listdir(save_path)

        if len(files) == 0:
            print("[MASK WARNING] XML folder is empty.")

        for file in files:

            if not file.lower().endswith(".xml"):
                continue

            xml_path = os.path.join(save_path, file)

            xml_image_name = MaskService._get_image_name_from_xml(
                xml_path
            )

            img_path = None

            if xml_image_name:

                candidate = os.path.join(
                    data_path,
                    xml_image_name
                )

                if os.path.exists(candidate):

                    img_path = candidate

            if img_path is None:

                base = os.path.splitext(
                    os.path.basename(file)
                )[0]

                for ext in [".jpg", ".jpeg", ".png", ".bmp"]:

                    candidate = os.path.join(
                        data_path,
                        base + ext
                    )

                    if os.path.exists(candidate):

                        img_path = candidate
                        break

            if img_path is None:

                # try resolving from the full path stored in the XML filename tag
                if xml_image_name and os.path.isabs(xml_image_name):
                    if os.path.exists(xml_image_name):
                        img_path = xml_image_name

            if img_path is None and xml_image_name:

                # try the path relative to common base dirs on the system
                search_roots = [
                    "C:\\Users\\Admin\\Desktop",
                    "C:\\Users\\Admin\\Downloads",
                    "C:\\Users\\Admin\\Documents",
                    "C:\\Users\\Admin",
                ]

                rel = xml_image_name.replace("/", os.sep).replace("\\", os.sep).lstrip(os.sep)

                for root_dir in search_roots:
                    candidate = os.path.join(root_dir, rel)
                    if os.path.exists(candidate):
                        img_path = candidate
                        print(f"[MASK] Found image via path search: {img_path}")
                        break

            if img_path is None:

                print(
                    f"[MASK WARNING] Image missing for XML: {file} (looked for: {xml_image_name})"
                )

                continue

            base_name = os.path.splitext(
                os.path.basename(img_path)
            )[0]

            mask_out = os.path.join(
                save_path,
                base_name + "_mask"
            )

            result = MaskService.generate_mask(

                img_path,
                xml_path,
                mask_out,
                selected_label

            )

            if result:

                generated.append(result)

        print(f"[MASK] TOTAL GENERATED: {len(generated)}")

        return {

            "status": "masks generated",
            "count": len(generated),
            "masks": generated
        }