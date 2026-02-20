"""
PulmoScan AI — CheXpert Dataset Preparation (3 real classes)
Classes: Normal, Pneumonia, Lung Opacity
"""

import os
import shutil
import pandas as pd
from pathlib import Path

CHEXPERT_ROOT = r"D:\CheXpert-v1.0-small"
OUTPUT_DIR    = r".\data"
MAX_PER_CLASS = 3000

CLASSES = ["Normal", "Pneumonia", "Lung Opacity"]

def get_label(row) -> str:
    def pos(col):
        try:
            return float(row.get(col, 0)) == 1.0
        except:
            return False

    def uncertain(col):
        try:
            return float(row.get(col, 0)) == -1.0
        except:
            return False

    if pos("Pneumonia") or uncertain("Pneumonia"):
        return "Pneumonia"
    if pos("Lung Opacity") or uncertain("Lung Opacity"):
        return "Lung Opacity"
    try:
        if float(row.get("No Finding", 0)) == 1.0:
            return "Normal"
    except:
        pass
    return None

def prepare():
    # Clean old data folders
    for cls in CLASSES:
        folder = os.path.join(OUTPUT_DIR, cls)
        if os.path.exists(folder):
            shutil.rmtree(folder)
        os.makedirs(folder)

    # Also remove fake folders from previous run
    for fake in ["COVID-19", "Tuberculosis"]:
        fake_path = os.path.join(OUTPUT_DIR, fake)
        if os.path.exists(fake_path):
            shutil.rmtree(fake_path)
            print(f"[INFO] Removed old fake folder: {fake_path}")

    csv_path = os.path.join(CHEXPERT_ROOT, "train.csv")
    print(f"[INFO] Reading {csv_path} ...")
    df = pd.read_csv(csv_path)
    print(f"[INFO] Total rows: {len(df)}")

    counts  = {cls: 0 for cls in CLASSES}
    skipped = 0
    errors  = 0

    for _, row in df.iterrows():
        label = get_label(row)
        if label is None:
            skipped += 1
            continue
        if counts[label] >= MAX_PER_CLASS:
            continue

        raw_path = str(row.get("Path", ""))
        if not raw_path:
            skipped += 1
            continue

        # Try resolving path
        parent = str(Path(CHEXPERT_ROOT).parent)
        src = os.path.join(parent, raw_path.replace("/", os.sep))

        if not os.path.exists(src):
            parts = raw_path.replace("\\", "/").split("/")
            if parts and "chexpert" in parts[0].lower():
                parts = parts[1:]
            src = os.path.join(CHEXPERT_ROOT, *parts)

        if not os.path.exists(src):
            errors += 1
            if errors <= 3:
                print(f"[WARN] Not found: {src}")
            continue

        ext  = os.path.splitext(src)[1]
        dest = os.path.join(OUTPUT_DIR, label, f"{label}_{counts[label]:05d}{ext}")
        shutil.copy2(src, dest)
        counts[label] += 1

    print("\n[DONE] Images copied:")
    total = 0
    for cls in CLASSES:
        print(f"  {cls:<15}: {counts[cls]:>5} images")
        total += counts[cls]
    print(f"  {'TOTAL':<15}: {total:>5} images")
    print(f"  Skipped: {skipped} | Errors: {errors}")

    if total == 0:
        print("\n[ERROR] No images copied. Check CHEXPERT_ROOT path.")
    else:
        print("\n✅ Dataset ready! Now run: python train_model.py")

if __name__ == "__main__":
    prepare()
