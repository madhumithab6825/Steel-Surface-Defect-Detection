# Augmentor Platform

End-to-end car defect detection pipeline — Annotate → Augment → Train → Detect

## Stack
- **Backend**: FastAPI + EfficientDet (PyTorch)
- **Frontend**: React + TypeScript + Vite

## Setup & Run

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
Runs at: http://127.0.0.1:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at: http://localhost:5173

## Workflow
1. **Annotate** — draw bounding boxes on car images, save XML
2. **Augment** — generate training images using Poisson blending
3. **Train** — train EfficientDet detection model
4. **Detect** — run inference on new images
