# 🚗 Augmentor Platform — AI Car Defect Detection System

An end-to-end **AI-powered car defect detection platform** built from scratch.  
Annotate car damage images → Generate augmented training data → Train a custom EfficientDet model → Detect defects in real time.

---

## 🎯 What It Does

This platform solves a real-world problem in the **automotive and insurance industry** — automatically detecting and localizing car defects (scratches, dents, damage, marks) from photos using a custom-trained deep learning model.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📝 **Annotator** | Draw bounding boxes on car images, assign labels, save Pascal VOC XML |
| 🔁 **Augmentor** | Generate 50–100 training images per defect using Poisson blending |
| 🏋️ **Trainer** | Train a custom EfficientDet-D0 object detection model on augmented data |
| 🔍 **Detector** | Upload any car image and get labeled bounding boxes with confidence scores |
| 📊 **Dashboard** | Live backend status, trained models list, workflow navigation |

---

## 🛠 Tech Stack

### Backend
- **FastAPI** — REST API
- **PyTorch** — Deep learning framework
- **EfficientDet-D0** — Object detection model (via `effdet` + `timm`)
- **OpenCV** — Image processing, Poisson blending, mask generation
- **Pascal VOC XML** — Annotation format

### Frontend
- **React 18** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool
- **React Router** — Page navigation

---

## 📁 Project Structure

```
augmentor-platform/
│
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── annotation.py       # Save/load annotations
│   │   │   ├── augmentation.py     # Generate augmented images
│   │   │   ├── mask.py             # Generate defect masks
│   │   │   ├── training.py         # Start/monitor training
│   │   │   └── inference.py        # Run detection
│   │   ├── services/
│   │   │   ├── efficientdet_trainer.py  # EfficientDet training pipeline
│   │   │   ├── dataset_builder.py       # Build training dataset from folders
│   │   │   ├── mask_service.py          # Mask generation from annotations
│   │   │   ├── poisson_blend.py         # Poisson blending for augmentation
│   │   │   ├── annotation_service.py    # Pascal VOC XML writer
│   │   │   └── voc_writer.py            # VOC XML utilities
│   │   └── main.py                 # FastAPI app entry point
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Dashboard.tsx        # Homepage with live stats
        │   ├── Canvas.tsx           # Annotation canvas
        │   ├── DetectionView.tsx    # Detection results UI
        │   ├── ModelTrainer.tsx     # Training + augmentation UI
        │   ├── Ribbon.tsx           # Annotation toolbar
        │   └── RightPanel.tsx       # Labels + image list panel
        ├── pages/
        │   ├── Annotator.tsx        # Annotation page
        │   ├── Augment.tsx          # Augmentation page
        │   ├── Train.tsx            # Training page
        │   └── Detect.tsx           # Detection page
        └── services/
            └── api.ts               # All API calls
```

---

## 🔄 How It Works

```
Step 1 — ANNOTATE
Open your car damage images → Draw bounding boxes → Label them (damage / scratch / dent / mark) → Save as XML

Step 2 — AUGMENT
Upload annotated images + XML files → System generates masks from bounding boxes →
Poisson blending pastes defects onto clean car backgrounds → Creates 50–100 training images per label

Step 3 — TRAIN
Select augmented folders → DatasetBuilder combines them into a training dataset →
EfficientDet-D0 trains for 30 epochs with AdamW optimizer → Model saved as .pt file

Step 4 — DETECT
Upload any car image → Model runs inference → Bounding boxes drawn with label + confidence score
```

---

## 🚀 Setup & Run

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
- API runs at: `http://127.0.0.1:8000`
- API docs at: `http://127.0.0.1:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- App runs at: `http://localhost:5173`

---

## 🧠 ML Pipeline Details

- **Model**: EfficientDet-D0 (`tf_efficientdet_d0`)
- **Input size**: 512 × 512
- **Pretrained**: ImageNet weights (transfer learning)
- **Optimizer**: AdamW (lr=1e-4, weight_decay=1e-4)
- **Scheduler**: StepLR (step=5, gamma=0.5)
- **Epochs**: 30
- **Augmentation**: Poisson blending — seamlessly pastes defect regions onto clean backgrounds
- **Annotation format**: Pascal VOC XML
- **Classes saved**: `{model_name}_classes.txt` alongside `.pt` file

---

## 🎯 Detectable Defect Classes

- `damage` — General body damage
- `scratch` — Surface scratches
- `dent` — Dents and deformations
- `mark` — Paint marks and scuffs

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/annotation/save` | Save bounding box annotations |
| GET | `/annotation/{image}` | Load annotations for an image |
| POST | `/mask/generate_all` | Generate masks from annotations |
| POST | `/augment/dataset` | Generate augmented training images |
| GET | `/augment/folders` | List augmentation runs |
| POST | `/train/detection` | Start model training |
| GET | `/train/status` | Get live training status |
| GET | `/detect/models` | List available trained models |
| POST | `/detect/run` | Run detection on an image |

---

## 📸 Screenshots

> Add screenshots of your UI here after running the app

---

## 👤 Author

Built by **[Your Name]**  
GitHub: [github.com/YOUR_USERNAME](https://github.com/YOUR_USERNAME)  
LinkedIn: [linkedin.com/in/YOUR_PROFILE](https://linkedin.com/in/YOUR_PROFILE)
