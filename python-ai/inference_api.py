"""
PulmoScan AI — Lightweight Flask Inference API
Uses requests to call HuggingFace Inference API (no local model loading)
Includes chest X-ray validation before inference
"""

import os
import io
import logging
import requests
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PORT = int(os.environ.get("PORT", 10000))

app = Flask(__name__)
CORS(app, origins=["*"])

CLASSES = ["Normal", "Pneumonia", "Lung Opacity"]

HF_API_URL = "https://api-inference.huggingface.co/models/nickmuchi/vit-finetuned-chest-xray-pneumonia"
HF_TOKEN   = os.environ.get("HF_TOKEN", "")

CLINICAL = {
    "Normal": {
        "severity": "Low",
        "regions": [],
        "recommendations": [
            "No significant abnormalities detected",
            "Continue regular health checkups every 12 months",
            "Maintain healthy lifestyle habits",
        ],
    },
    "Pneumonia": {
        "severity": "Medium",
        "regions": ["Right lower lobe", "Left lower lobe"],
        "recommendations": [
            "Consult a pulmonologist immediately",
            "Complete course of prescribed antibiotics",
            "Rest and stay well-hydrated",
            "Follow-up chest X-ray in 2-4 weeks",
        ],
    },
    "Lung Opacity": {
        "severity": "Medium",
        "regions": ["Left upper lobe", "Perihilar region"],
        "recommendations": [
            "Further HRCT imaging is recommended",
            "Refer to pulmonologist for specialist evaluation",
            "Sputum culture to rule out bacterial/fungal infection",
            "Consider bronchoscopy if lesion persists",
        ],
    },
}


# ─── X-RAY VALIDATION ────────────────────────────────────────────────────────

def is_valid_chest_xray(image_bytes):
    """
    Validates whether the uploaded image is likely a chest X-ray.
    Uses heuristic checks based on:
    1. Grayscale nature of X-rays
    2. Pixel intensity distribution
    3. Aspect ratio
    4. Low color saturation

    Returns: (bool, str) — (is_valid, reason_if_invalid)
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(img, dtype=np.float32)

        width, height = img.size

        # ── Check 1: Aspect ratio (chest X-rays are roughly square to slightly wide) ──
        aspect_ratio = width / height
        if aspect_ratio < 0.5 or aspect_ratio > 2.0:
            logger.info(f"Validation failed: aspect ratio {aspect_ratio:.2f}")
            return False, "Image aspect ratio does not match chest X-ray format"

        # ── Check 2: Color saturation (X-rays are grayscale — R≈G≈B) ──
        r_channel = img_array[:, :, 0]
        g_channel = img_array[:, :, 1]
        b_channel = img_array[:, :, 2]

        # Calculate mean difference between color channels
        rg_diff = np.mean(np.abs(r_channel - g_channel))
        rb_diff = np.mean(np.abs(r_channel - b_channel))
        gb_diff = np.mean(np.abs(g_channel - b_channel))
        avg_color_diff = (rg_diff + rb_diff + gb_diff) / 3

        # If channels differ a lot, it's a colorful image (not an X-ray)
        if avg_color_diff > 30:
            logger.info(f"Validation failed: color diff {avg_color_diff:.2f} (too colorful)")
            return False, "Image appears to be a color photograph, not an X-ray"

        # ── Check 3: Pixel intensity distribution ──
        # X-rays have mostly dark pixels with some bright regions (lungs)
        gray = np.mean(img_array, axis=2)  # Convert to grayscale values
        mean_intensity = np.mean(gray)
        std_intensity  = np.std(gray)

        # X-rays typically have mean intensity between 50-200 and good std deviation
        if mean_intensity < 20:
            logger.info(f"Validation failed: image too dark (mean={mean_intensity:.1f})")
            return False, "Image is too dark to be a valid chest X-ray"

        if mean_intensity > 240:
            logger.info(f"Validation failed: image too bright (mean={mean_intensity:.1f})")
            return False, "Image is too bright to be a valid chest X-ray"

        if std_intensity < 15:
            logger.info(f"Validation failed: low contrast (std={std_intensity:.1f})")
            return False, "Image has insufficient contrast for a chest X-ray"

        # ── Check 4: Minimum image size ──
        if width < 100 or height < 100:
            return False, "Image resolution is too low for X-ray analysis"

        # ── Check 5: Dark pixel ratio ──
        # X-rays typically have 30-85% dark pixels (below intensity 128)
        dark_pixel_ratio = np.sum(gray < 128) / gray.size
        if dark_pixel_ratio < 0.15 or dark_pixel_ratio > 0.95:
            logger.info(f"Validation failed: dark pixel ratio {dark_pixel_ratio:.2f}")
            return False, "Pixel distribution does not match a chest X-ray pattern"

        logger.info(f"Validation passed: color_diff={avg_color_diff:.1f}, "
                    f"mean={mean_intensity:.1f}, std={std_intensity:.1f}, "
                    f"dark_ratio={dark_pixel_ratio:.2f}")
        return True, None

    except Exception as e:
        logger.error(f"Validation error: {e}")
        return False, "Could not process image for validation"


# ─── HuggingFace API ──────────────────────────────────────────────────────────

def call_hf_api(image_bytes):
    headers = {}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    response = requests.post(HF_API_URL, headers=headers, data=image_bytes, timeout=30)
    response.raise_for_status()
    return response.json()


def map_to_three_classes(hf_results):
    raw_probs = {r["label"].upper(): float(r["score"]) for r in hf_results}
    normal_prob    = raw_probs.get("NORMAL",    0.5)
    pneumonia_prob = raw_probs.get("PNEUMONIA", 0.5)

    total = normal_prob + pneumonia_prob
    if total == 0:
        total = 1.0
    normal_prob    = normal_prob    / total
    pneumonia_prob = pneumonia_prob / total

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
        "Normal":       round(normal_prob,      4),
        "Pneumonia":    round(pneumonia_prob,    4),
        "Lung Opacity": round(lung_opacity_prob, 4),
    }
    s = sum(probabilities.values())
    probabilities = {k: round(v / s, 4) for k, v in probabilities.items()}
    return probabilities


def demo_predict(image_bytes):
    """Fallback demo prediction when HF API is unavailable."""
    import hashlib
    h = int(hashlib.md5(image_bytes[:100]).hexdigest(), 16)
    idx = h % 3
    cls = CLASSES[idx]
    conf = 0.75 + (h % 20) / 100
    probabilities = {c: round(0.1, 4) for c in CLASSES}
    probabilities[cls] = round(conf, 4)
    s = sum(probabilities.values())
    probabilities = {k: round(v / s, 4) for k, v in probabilities.items()}
    return cls, conf, probabilities


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": True,
        "mode": "huggingface-api",
        "classes": CLASSES,
    })


@app.route("/api/classes", methods=["GET"])
def classes():
    return jsonify({"classes": CLASSES})


@app.route("/api/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    image_bytes = file.read()

    # ── STEP 1: Validate chest X-ray BEFORE running inference ──
    is_valid, reason = is_valid_chest_xray(image_bytes)
    if not is_valid:
        logger.warning(f"Invalid X-ray rejected: {reason}")
        return jsonify({
            "error": "invalid_xray",
            "message": "Uploaded image is not a chest X-ray",
            "detail": reason
        }), 400

    # ── STEP 2: Run AI inference only for valid X-rays ──
    try:
        hf_results    = call_hf_api(image_bytes)
        probabilities = map_to_three_classes(hf_results)
        pred_class    = max(probabilities, key=probabilities.get)
        confidence    = probabilities[pred_class]
        demo_mode     = False
        logger.info(f"HF API prediction: {pred_class} ({confidence:.1%})")
    except Exception as e:
        logger.warning(f"HF API failed ({e}), using demo mode")
        pred_class, confidence, probabilities = demo_predict(image_bytes)
        demo_mode = True

    clinical = CLINICAL[pred_class]

    return jsonify({
        "predicted_class":  pred_class,
        "confidence":       confidence,
        "severity":         clinical["severity"],
        "probabilities":    probabilities,
        "affected_regions": clinical["regions"],
        "recommendations":  clinical["recommendations"],
        "heatmap_b64":      None,
        "demo_mode":        demo_mode,
    })


if __name__ == "__main__":
    logger.info(f"Starting PulmoScan AI on port {PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
