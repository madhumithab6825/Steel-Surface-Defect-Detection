from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.services.efficientdet_trainer import (
    EfficientDetTrainer,
    training_state
)

router = APIRouter()


# ====================================================
# START DETECTION TRAINING
# ====================================================

@router.post("/detection")
async def train_detection(request: Request):

    try:

        payload = await request.json()

        folders = payload.get("folders", [])
        label = payload.get("label", "default")

        if not folders:
            return JSONResponse(
                status_code=400,
                content={"error": "No folders selected"}
            )

        if training_state.get("status", "Idle") not in ("Idle",) and \
           not training_state["status"].startswith("Training Complete") and \
           not training_state["status"].startswith("ERROR"):
            return JSONResponse(
                status_code=400,
                content={"error": "Training already in progress"}
            )

        training_state["status"] = "Queued..."

        trainer = EfficientDetTrainer(folders, label)
        trainer.start()

        return {
            "success": True,
            "message": f"Training started for label '{label}' with {len(folders)} folder(s)"
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


# ====================================================
# TRAIN STATUS
# ====================================================

@router.get("/status")
def get_training_status():
    return training_state
