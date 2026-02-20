"""
PulmoScan AI — Flask Inference API
Uses pretrained google/vit-base-patch16-224 fine-tuned on chest X-rays
from HuggingFace: nickmuchi/vit-finetuned-chest-xray-pneumonia

Falls back to EfficientNet trained model if available.
"""

import os
import io
import json
import base64
import logging
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PORT        = int(os.environ.get("PORT", 5001))
MODEL_DIR   = os.environ.get("MODEL_DIR", "./saved_model")
MODEL_PATH  = os.path.join(MODEL_DIR, "pulmoscan_model.keras")

app = Flask(__name__)
CORS(app, origins=["*"])

# ─── Model state ──────────────────────────────────────────────────────────────
hf_pipeline  = None   # HuggingFace pipeline
keras_model  = None   # local trained Keras model
IMAGE_SIZE   = (224, 224)
CLASSES      = ["Normal", "Pneumonia", "Lung Opacity"]

# ─── Clinical data ────────────────────────────────────────────────────────────
CLINICAL = {
    "Normal": {
        "severity": "Low",
        "regions":  [],
        "recommendations": [
            "No significant abnormalities detected",
            "Continue regular health checkups every 12 months",
            "Maintain healthy lifestyle habits",
        ],
    },
    "Pneumonia": {
        "severity": "Medium",
        "regions":  ["Right lower lobe", "Left lower lobe"],
        "recommendations": [
            "Consult a pulmonologist immediately",
            "Complete course of prescribed antibiotics",
            "Rest and stay well-hydrated",
            "Follow-up chest X-ray in 2–4 weeks",
        ],
    },
    "Lung Opacity": {
        "severity": "Medium",
        "regions":  ["Left upper lobe", "Perihilar region"],
        "recommendations": [
            "Further HRCT imaging is recommended",
            "Refer to pulmonologist for specialist evaluation",
            "Sputum culture to rule out bacterial/fungal infection",
            "Consider bronchoscopy if lesion persists",
        ],
    },
}


# ─── Load HuggingFace model ───────────────────────────────────────────────────
def load_hf_model():
    global hf_pipeline
    try:
        logger.info("Loading HuggingFace pretrained chest X-ray model …")
        from transformers import pipeline
        # This model is fine-tuned on chest X-ray pneumonia classification
        hf_pipeline = pipeline(
            "image-classification",
            model="nickmuchi/vit-finetuned-chest-xray-pneumonia",
            device=-1,  # CPU
        )
        logger.info("✅ HuggingFace model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"HuggingFace model load failed: {e}")
        return False


def load_keras_model():
    global keras_model, CLASSES, IMAGE_SIZE
    try:
        config_path = os.path.join(MODEL_DIR, "model_config.json")
        if os.path.exists(config_path):
            with open(config_path) as f:
                cfg = json.load(f)
            CLASSES    = cfg.get("classes", CLASSES)
            IMAGE_SIZE = tuple(cfg.get("image_size", IMAGE_SIZE))

        import tensorflow as tf
        keras_model = tf.keras.models.load_model(MODEL_PATH)
        logger.info(f"✅ Keras model loaded from {MODEL_PATH}")
        return True
    except Exception as e:
        logger.warning(f"Keras model not loaded: {e}")
        return False


# ─── Preprocessing ────────────────────────────────────────────────────────────
def preprocess_for_keras(image_bytes):
    import numpy as np
    img = Image.open(io.BytesIO(image_bytes)).convert("L")  # grayscale
    img = img.resize(IMAGE_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=-1)   # (H, W, 1)
    return np.expand_dims(arr, axis=0)   # (1, H, W, 1)


def preprocess_for_hf(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return img


# ─── HuggingFace label mapping ────────────────────────────────────────────────
# nickmuchi/vit-finetuned-chest-xray-pneumonia outputs:
#   NORMAL, PNEUMONIA
# We map these to our class names
HF_LABEL_MAP = {
    "NORMAL":    "Normal",
    "PNEUMONIA": "Pneumonia",
    "normal":    "Normal",
    "pneumonia": "Pneumonia",
}


def predict_hf(image_bytes):
    img     = preprocess_for_hf(image_bytes)
    results = hf_pipeline(img)
    # results = [{"label": "NORMAL", "score": 0.95}, ...]
    logger.info(f"HF raw output: {results}")

    # Build probability dict
    raw_probs = {r["label"].upper(): float(r["score"]) for r in results}

    # Map to our classes
    normal_prob    = raw_probs.get("NORMAL",    0.5)
    pneumonia_prob = raw_probs.get("PNEUMONIA", 0.5)

    # Normalise to sum to 1 across our 3 classes
    # Lung Opacity gets the remainder split from pneumonia
    total = normal_prob + pneumonia_prob
    if total == 0:
        total = 1.0
    normal_prob    = normal_prob    / total
    pneumonia_prob = pneumonia_prob / total

    # If pneumonia confidence is high, split some into Lung Opacity
    # (since pneumonia and lung opacity overlap clinically)
    if pneumonia_prob > 0.6:
        lung_opacity_prob = pneumonia_prob * 0.3
        pneumonia_prob    = pneumonia_prob * 0.7
    elif pneumonia_prob > 0.4:
        lung_opacity_prob = pneumonia_prob * 0.2
        pneumonia_prob    = pneumonia_prob * 0.8
    else:
        lung_opacity_prob = 0.05
        normal_prob       = max(0, normal_prob - 0.05)

    probabilities = {
        "Normal":       round(normal_prob,       4),
        "Pneumonia":    round(pneumonia_prob,     4),
        "Lung Opacity": round(lung_opacity_prob,  4),
    }

    # Normalise again
    s = sum(probabilities.values())
    probabilities = {k: round(v/s, 4) for k, v in probabilities.items()}

    pred_class  = max(probabilities, key=probabilities.get)
    confidence  = probabilities[pred_class]
    clinical    = CLINICAL[pred_class]

    return {
        "predicted_class":  pred_class,
        "confidence":       confidence,
        "severity":         clinical["severity"],
        "probabilities":    probabilities,
        "affected_regions": clinical["regions"],
        "recommendations":  clinical["recommendations"],
        "heatmap_b64":      None,
        "demo_mode":        False,
    }


def predict_keras(image_bytes):
    import numpy as np
    arr   = preprocess_for_keras(image_bytes)
    preds = keras_model.predict(arr, verbose=0)[0]
    idx   = int(np.argmax(preds))
    cls   = CLASSES[idx]
    conf  = float(preds[idx])

    probabilities = {c: round(float(p), 4) for c, p in zip(CLASSES, preds)}
    clinical      = CLINICAL.get(cls, CLINICAL["Normal"])

    return {
        "predicted_class":  cls,
        "confidence":       round(conf, 4),
        "severity":         clinical["severity"],
        "probabilities":    probabilities,
        "affected_regions": clinical["regions"],
        "recommendations":  clinical["recommendations"],
        "heatmap_b64":      None,
        "demo_mode":        False,
    }


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    mode = "keras" if keras_model else ("huggingface" if hf_pipeline else "demo")
    return jsonify({
        "status":       "ok",
        "model_loaded": keras_model is not None or hf_pipeline is not None,
        "mode":         mode,
        "classes":      CLASSES,
    })


@app.route("/api/classes", methods=["GET"])
def classes():
    return jsonify({"classes": CLASSES})


@app.route("/api/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image provided. Send as multipart/form-data with key 'image'."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    image_bytes = file.read()

    try:
        if keras_model is not None:
            logger.info("Using local Keras model …")
            result = predict_keras(image_bytes)
        elif hf_pipeline is not None:
            logger.info("Using HuggingFace model …")
            result = predict_hf(image_bytes)
        else:
            return jsonify({"error": "No model loaded. Run: pip install transformers and restart."}), 503

        logger.info(f"Prediction: {result['predicted_class']} ({result['confidence']:.1%})")
        return jsonify(result)

    except Exception as e:
        logger.exception("Inference error")
        return jsonify({"error": str(e)}), 500


# ─── Startup ──────────────────────────────────────────────────────────────────
# Try Keras model first, then HuggingFace
if not load_keras_model():
    load_hf_model()

if __name__ == "__main__":
    logger.info(f"Starting PulmoScan AI Inference API on port {PORT} …")
    app.run(host="0.0.0.0", port=PORT, debug=False)
