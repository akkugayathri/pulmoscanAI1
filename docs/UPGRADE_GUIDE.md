# PulmoScan AI — Complete Upgrade Guide

## Architecture Overview

```
Browser (React/Vite)
        │  multipart/form-data  (image + patient JSON)
        ▼
Node.js Backend  :3001   (Express + Multer + Mongoose)
        │  multipart/form-data  (image forwarded)
        ▼
Python Inference API  :5001   (Flask + TensorFlow)
        │
        ├─► EfficientNetB0 model (.keras)
        └─► Grad-CAM heatmap (base64 PNG)
        │
        ▼
MongoDB  :27017  (scan history, patient records, analytics)
```

---

## 1 · Dataset Setup (CheXpert)

### Download
1. Go to https://www.kaggle.com/datasets/mimsadiislam/chexpert
2. Download and unzip into `python-ai/data/`

### Organise folders
The training script expects images sorted by class label:

```
python-ai/data/
├── Normal/
│   ├── patient001_view1_frontal.jpg
│   └── …
├── Pneumonia/
│   └── …
├── COVID-19/
│   └── …
├── Lung Opacity/
│   └── …
└── Tuberculosis/
    └── …
```

**CheXpert label mapping guide:**
| CheXpert column             | PulmoScan class |
|-----------------------------|-----------------|
| No Finding = 1              | Normal          |
| Pneumonia = 1               | Pneumonia       |
| Lung Opacity = 1            | Lung Opacity    |
| (external COVID subset)     | COVID-19        |
| (external TB subset)        | Tuberculosis    |

If you prefer to work from the raw CheXpert CSV, edit `build_dataframe()` in
`train_model.py` to parse `train.csv` directly.

---

## 2 · Python Inference API

### Setup
```bash
cd python-ai
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Train the model
```bash
python train_model.py
```
Outputs to `python-ai/saved_model/`:
- `pulmoscan_model.keras` — full Keras model
- `saved_model/`          — TF SavedModel format
- `label_map.json`        — class index mapping
- `model_config.json`     — image size, class names
- `metrics.json`          — test set evaluation metrics

Training details:
- Architecture: **EfficientNetB0** (ImageNet pretrained)
- Phase 1: Freeze base, train classification head (15 epochs)
- Phase 2: Unfreeze top layers, fine-tune with LR 1e-5 (15 epochs)
- Data augmentation: rotation ±15°, shifts, zoom, horizontal flip, brightness
- Class balancing: `compute_class_weight('balanced')` from sklearn
- Loss: categorical crossentropy · Optimizer: Adam · Metrics: Accuracy, F1, ROC-AUC

### Start the inference API
```bash
python inference_api.py
# Listening on http://localhost:5001
```

**Demo mode**: If `saved_model/pulmoscan_model.keras` does not exist, the API
returns deterministic placeholder predictions (no crash). This lets you test the
full stack before training completes.

### API endpoints
| Method | Path           | Description                              |
|--------|----------------|------------------------------------------|
| GET    | /api/health    | Service health + model status            |
| GET    | /api/classes   | List of supported disease classes        |
| POST   | /api/predict   | Upload image → prediction + Grad-CAM     |

**POST /api/predict — request**
```
Content-Type: multipart/form-data
Field: image  (JPEG / PNG file)
```

**Response**
```json
{
  "predicted_class":  "Pneumonia",
  "confidence":       0.8731,
  "severity":         "Medium",
  "probabilities": {
    "Normal":       0.0412,
    "Pneumonia":    0.8731,
    "COVID-19":     0.0310,
    "Lung Opacity": 0.0391,
    "Tuberculosis": 0.0156
  },
  "affected_regions": ["Right lower lobe", "Left lower lobe"],
  "recommendations":  ["Consult a pulmonologist immediately", "…"],
  "heatmap_b64":      "data:image/png;base64,iVBORw0…",
  "demo_mode":        false
}
```

---

## 3 · Node.js Backend

### Setup
```bash
cd node-backend
cp .env.example .env      # edit values if needed
npm install
npm run dev               # or: npm start
```

### MongoDB
Start MongoDB locally or provide a remote URI in `.env`:
```
MONGO_URI=mongodb://localhost:27017/pulmoscan
```
Using Docker:
```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

### API endpoints
| Method | Path                   | Description                       |
|--------|------------------------|-----------------------------------|
| GET    | /api/health            | Node + Python + MongoDB status    |
| POST   | /api/diagnose          | Submit scan (multipart/form-data) |
| GET    | /api/history           | Paginated scan history            |
| GET    | /api/analytics         | Summary stats for dashboard       |
| DELETE | /api/history/:scanId   | Delete a record                   |

**POST /api/diagnose — request**
```
Content-Type: multipart/form-data
Fields:
  image       – chest X-ray file (JPEG/PNG, max 10 MB)
  patientData – JSON string of patient details
```

---

## 4 · Frontend (React + Vite)

### Setup
```bash
cd pulmoscan-ai-diagnostics-main
cp .env.example .env   # or edit .env directly
npm install
npm run dev
# Opens at http://localhost:5173
```

### Changed files
| File | Change |
|------|--------|
| `src/lib/api.ts`                                           | **NEW** — typed API client calling Node.js backend |
| `src/types/patient.ts`                                     | Added `DiseaseClass`, `probabilities`, `demoMode`, `scanId` |
| `src/components/diagnosis/ProcessingAnimation.tsx`         | Replaced `Math.random()` with real `submitDiagnosis()` call |
| `src/components/diagnosis/ResultsDisplay.tsx`              | Shows Grad-CAM image, probability bar chart, demo badge |
| `.env`                                                     | `VITE_API_URL=http://localhost:3001` |

### Environment variable
```
VITE_API_URL=http://localhost:3001   # change if backend runs elsewhere
```

---

## 5 · Running Everything Together

Open three terminals:

```bash
# Terminal 1 — Python Inference API
cd python-ai && source venv/bin/activate
python inference_api.py

# Terminal 2 — Node.js Backend
cd node-backend && npm run dev

# Terminal 3 — React Frontend
cd pulmoscan-ai-diagnostics-main && npm run dev
```

Then visit **http://localhost:5173**.

---

## 6 · Model Performance (expected after training)

| Metric         | Expected (CheXpert, 5-class) |
|----------------|------------------------------|
| Test Accuracy  | 85–92 %                      |
| Weighted F1    | 0.84–0.91                    |
| ROC-AUC (OvR)  | 0.92–0.97                    |

Actual results depend on dataset size and balance. Plots are saved to
`python-ai/plots/training_history.png` and `confusion_matrix.png`.

---

## 7 · Production Deployment

### Python API
```bash
gunicorn -w 4 -b 0.0.0.0:5001 inference_api:app
```

### Node.js Backend
```bash
NODE_ENV=production npm start
```

### Docker Compose (recommended)
```yaml
# docker-compose.yml (template)
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]

  python-api:
    build: ./python-ai
    ports: ["5001:5001"]
    environment:
      MODEL_DIR: /app/saved_model
    volumes:
      - ./python-ai/saved_model:/app/saved_model

  node-backend:
    build: ./node-backend
    ports: ["3001:3001"]
    environment:
      MONGO_URI: mongodb://mongo:27017/pulmoscan
      PYTHON_API_URL: http://python-api:5001
    depends_on: [mongo, python-api]

  frontend:
    build: ./pulmoscan-ai-diagnostics-main
    ports: ["80:80"]
    environment:
      VITE_API_URL: http://node-backend:3001
    depends_on: [node-backend]
```

---

## 8 · Security Notes

- Never store raw X-ray images in MongoDB — only metadata and results.
- Enable HTTPS and authentication (JWT) before deploying publicly.
- Add rate limiting to `/api/diagnose` to prevent abuse.
- Review CORS `origins` list in both the Flask and Express servers.
- This system is for **research/educational use**. It must not be used as a
  substitute for clinical diagnosis without regulatory approval.
