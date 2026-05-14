from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
import shutil
import os
import uuid
import cv2
import torch
import numpy as np
import xml.etree.ElementTree as ET
from effdet import create_model
import torchvision.transforms as T

router = APIRouter()

MODELS_DIR = "models"
RESULT_DIR = "detect_results"

os.makedirs(RESULT_DIR, exist_ok=True)

NORMALIZE = T.Compose([
    T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225])
])


# =====================================================
# LIST AVAILABLE MODELS
# =====================================================

@router.get("/models")
def list_models():

    if not os.path.exists(MODELS_DIR):
        return {"models": []}

    models = [
        f for f in os.listdir(MODELS_DIR)
        if f.endswith(".pt")
    ]

    models.sort()

    return {"models": models}


# =====================================================
# EFFICIENTDET DETECTION
# =====================================================

@router.post("/run")
async def run_detection(
    model_name: str = Form(...),
    file: UploadFile = File(...)
):

    temp_path = f"temp_{uuid.uuid4().hex}.jpg"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    model_path = os.path.join(MODELS_DIR, model_name)

    if not os.path.exists(model_path):
        os.remove(temp_path)
        return JSONResponse(status_code=404, content={"error": "Model not found"})

    try:

        device = "cuda" if torch.cuda.is_available() else "cpu"

        # ==============================
        # LOAD CLASS NAMES
        # ==============================

        meta_path = model_path.replace(".pt", "_classes.txt")
        class_names = []

        if os.path.exists(meta_path):
            with open(meta_path) as f:
                class_names = [l.strip() for l in f.read().splitlines() if l.strip()]

        num_classes = len(class_names) if class_names else 1

        # ==============================
        # LOAD MODEL
        # ==============================

        model = create_model(
            "tf_efficientdet_d0",
            bench_task="predict",
            num_classes=num_classes,
            pretrained=False
        )

        model.load_state_dict(
            torch.load(model_path, map_location=device)
        )

        model.to(device)
        model.eval()

        # ==============================
        # PREPROCESS — must match training
        # ==============================

        img_bgr = cv2.imread(temp_path)
        h, w = img_bgr.shape[:2]

        resized = cv2.resize(img_bgr, (512, 512))
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

        tensor = NORMALIZE(rgb).unsqueeze(0).to(device)

        # ==============================
        # INFERENCE
        # ==============================

        with torch.no_grad():
            outputs = model(tensor)

        detections = outputs[0].cpu().numpy()

        # print all scores to backend console for debugging
        all_scores = detections[:, 4] if len(detections) > 0 else []
        print("RAW SCORES (top 10):", sorted(all_scores, reverse=True)[:10])
        print("MAX SCORE:", max(all_scores) if len(all_scores) > 0 else 0)

        scale_x = w / 512
        scale_y = h / 512

        result_img = img_bgr.copy()
        found_detections = []
        valid_found = False

        COLORS = [
            (0, 255, 0), (255, 0, 0), (0, 0, 255),
            (255, 165, 0), (128, 0, 128), (0, 255, 255)
        ]

        for det in detections:

            x1, y1, x2, y2, score, cls_id = det

            if score < 0.01:
                continue

            if not np.isfinite([x1, y1, x2, y2, score]).all():
                continue

            x1 = int(max(0, min(w - 1, x1 * scale_x)))
            y1 = int(max(0, min(h - 1, y1 * scale_y)))
            x2 = int(max(0, min(w - 1, x2 * scale_x)))
            y2 = int(max(0, min(h - 1, y2 * scale_y)))

            if x2 <= x1 or y2 <= y1:
                continue

            cls_idx = int(cls_id) - 1
            label_name = (
                class_names[cls_idx]
                if 0 <= cls_idx < len(class_names)
                else f"class_{int(cls_id)}"
            )

            color = COLORS[cls_idx % len(COLORS)]

            cv2.rectangle(result_img, (x1, y1), (x2, y2), color, 3)

            label_text = f"{label_name} {score:.2f}"

            (tw, th), _ = cv2.getTextSize(
                label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2
            )

            cv2.rectangle(
                result_img,
                (x1, max(0, y1 - th - 8)),
                (x1 + tw + 4, y1),
                color, -1
            )

            cv2.putText(
                result_img,
                label_text,
                (x1 + 2, max(th, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (255, 255, 255), 2
            )

            found_detections.append({
                "label": label_name,
                "score": round(float(score), 3),
                "box": [x1, y1, x2, y2]
            })

            valid_found = True

        result_name = f"result_{uuid.uuid4().hex}.jpg"
        result_path = os.path.join(RESULT_DIR, result_name)

        cv2.imwrite(result_path, result_img)
        os.remove(temp_path)

        if not valid_found:
            return {
                "message": "No detections above threshold",
                "result_image": f"/detect/result/{result_name}",
                "detections": []
            }

        return {
            "result_image": f"/detect/result/{result_name}",
            "detections": found_detections
        }

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
