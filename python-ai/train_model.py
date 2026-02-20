"""
PulmoScan AI — Model Training Script
Dataset: CheXpert (3 classes: Normal, Pneumonia, Lung Opacity)
Fix: Grayscale images converted to RGB via color_mode="grayscale" + repeat channels
"""

import os
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import (classification_report, confusion_matrix,
                              roc_auc_score, accuracy_score, f1_score,
                              precision_score, recall_score)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import json
import warnings
warnings.filterwarnings('ignore')

CONFIG = {
    "IMAGE_SIZE":    (224, 224),
    "BATCH_SIZE":    32,
    "EPOCHS_PHASE1": 20,
    "EPOCHS_PHASE2": 20,
    "LEARNING_RATE": 1e-3,
    "FINE_TUNE_LR":  1e-4,
    "DROPOUT":       0.3,
    "CLASSES":       ["Normal", "Pneumonia", "Lung Opacity"],
    "NUM_CLASSES":   3,
    "DATA_DIR":      "./data",
    "MODEL_DIR":     "./saved_model",
    "PLOTS_DIR":     "./plots",
    "SEED":          42,
}

os.makedirs(CONFIG["MODEL_DIR"], exist_ok=True)
os.makedirs(CONFIG["PLOTS_DIR"], exist_ok=True)
tf.random.set_seed(CONFIG["SEED"])
np.random.seed(CONFIG["SEED"])


def build_dataframe(data_dir, classes):
    records = []
    for label in classes:
        class_dir = os.path.join(data_dir, label)
        if not os.path.isdir(class_dir):
            print(f"[WARN] Missing directory: {class_dir}. Skipping.")
            continue
        files = [f for f in os.listdir(class_dir)
                 if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        for fname in files:
            records.append({
                "filepath": os.path.join(class_dir, fname),
                "label":    label,
            })
    df = pd.DataFrame(records)
    print(f"[INFO] Total samples: {len(df)}")
    print(df["label"].value_counts())
    return df


def stratified_split(df):
    train_df, tmp = train_test_split(
        df, test_size=0.20, stratify=df["label"], random_state=CONFIG["SEED"])
    val_df, test_df = train_test_split(
        tmp, test_size=0.50, stratify=tmp["label"], random_state=CONFIG["SEED"])
    return (train_df.reset_index(drop=True),
            val_df.reset_index(drop=True),
            test_df.reset_index(drop=True))


def make_generators(train_df, val_df, test_df):
    IMG = CONFIG["IMAGE_SIZE"]
    BS  = CONFIG["BATCH_SIZE"]

    # Load as grayscale, then stack to 3 channels inside the model
    train_gen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=10,
        width_shift_range=0.08,
        height_shift_range=0.08,
        zoom_range=0.10,
        horizontal_flip=True,
        fill_mode="nearest",
    )
    eval_gen = ImageDataGenerator(rescale=1./255)

    # color_mode="grayscale" → single channel, we replicate to 3 in the model
    train_flow = train_gen.flow_from_dataframe(
        train_df, x_col="filepath", y_col="label",
        target_size=IMG, batch_size=BS,
        color_mode="grayscale",
        class_mode="categorical", shuffle=True, seed=CONFIG["SEED"])
    val_flow = eval_gen.flow_from_dataframe(
        val_df, x_col="filepath", y_col="label",
        target_size=IMG, batch_size=BS,
        color_mode="grayscale",
        class_mode="categorical", shuffle=False)
    test_flow = eval_gen.flow_from_dataframe(
        test_df, x_col="filepath", y_col="label",
        target_size=IMG, batch_size=BS,
        color_mode="grayscale",
        class_mode="categorical", shuffle=False)

    return train_flow, val_flow, test_flow


def get_class_weights(train_df):
    classes     = np.array(sorted(train_df["label"].unique()))
    y           = train_df["label"].values
    weights_arr = compute_class_weight("balanced", classes=classes, y=y)
    return dict(enumerate(weights_arr))


def build_model(num_classes):
    """
    Input: (224, 224, 1) grayscale
    → Repeat channels to get (224, 224, 3)
    → EfficientNetB0 (ImageNet weights)
    → Classification head
    """
    from tensorflow.keras.applications import EfficientNetB0

    # Grayscale input
    inputs = tf.keras.Input(shape=(*CONFIG["IMAGE_SIZE"], 1), name="grayscale_input")

    # Replicate single channel → 3 channels so EfficientNet works
    x = layers.Lambda(lambda t: tf.repeat(t, 3, axis=-1), name="gray_to_rgb")(inputs)

    # EfficientNetB0 backbone
    base = EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=(*CONFIG["IMAGE_SIZE"], 3),
    )
    base.trainable = False

    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(CONFIG["DROPOUT"])(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(CONFIG["DROPOUT"] / 2)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs, name="PulmoScan_EfficientNetB0")
    model.compile(
        optimizer=optimizers.Adam(CONFIG["LEARNING_RATE"]),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()
    return model, base


def train(model, base_model, train_flow, val_flow, class_weights):
    checkpoint_path = os.path.join(CONFIG["MODEL_DIR"], "best_model.keras")

    cbs = [
        callbacks.ModelCheckpoint(
            filepath=checkpoint_path,
            monitor="val_accuracy", save_best_only=True, verbose=1),
        callbacks.EarlyStopping(
            monitor="val_loss", patience=7,
            restore_best_weights=True, verbose=1),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.3,
            patience=3, verbose=1, min_lr=1e-7),
    ]

    print("\n[PHASE 1] Training classification head (base frozen) …")
    h1 = model.fit(
        train_flow, validation_data=val_flow,
        epochs=CONFIG["EPOCHS_PHASE1"],
        class_weight=class_weights, callbacks=cbs,
    )

    print("\n[PHASE 2] Fine-tuning top 20% of EfficientNetB0 layers …")
    base_model.trainable = True
    freeze_until = int(len(base_model.layers) * 0.8)
    for layer in base_model.layers[:freeze_until]:
        layer.trainable = False

    model.compile(
        optimizer=optimizers.Adam(CONFIG["FINE_TUNE_LR"]),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    h2 = model.fit(
        train_flow, validation_data=val_flow,
        epochs=CONFIG["EPOCHS_PHASE2"],
        class_weight=class_weights, callbacks=cbs,
    )

    combined = {}
    for k in h1.history:
        combined[k] = h1.history[k] + h2.history[k]
    return combined


def evaluate(model, test_flow, class_names):
    test_flow.reset()
    y_pred_prob = model.predict(test_flow, verbose=1)
    y_pred      = np.argmax(y_pred_prob, axis=1)
    y_true      = test_flow.classes

    idx2label     = {v: k for k, v in test_flow.class_indices.items()}
    y_pred_labels = [idx2label[i] for i in y_pred]
    y_true_labels = [idx2label[i] for i in y_true]

    acc  = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    rec  = recall_score(y_true, y_pred, average="weighted", zero_division=0)
    f1   = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    try:
        auc = roc_auc_score(
            tf.keras.utils.to_categorical(y_true, num_classes=len(class_names)),
            y_pred_prob, average="macro", multi_class="ovr")
    except Exception:
        auc = None

    metrics = {
        "accuracy":  round(float(acc),  4),
        "precision": round(float(prec), 4),
        "recall":    round(float(rec),  4),
        "f1_score":  round(float(f1),   4),
        "roc_auc":   round(float(auc),  4) if auc else "N/A",
    }
    print("\n[METRICS]")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    print("\n[CLASSIFICATION REPORT]")
    print(classification_report(y_true_labels, y_pred_labels, target_names=class_names))

    with open(os.path.join(CONFIG["MODEL_DIR"], "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    cm = confusion_matrix(y_true_labels, y_pred_labels, labels=class_names)
    plt.figure(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names)
    plt.title("Confusion Matrix — PulmoScan AI")
    plt.ylabel("True")
    plt.xlabel("Predicted")
    plt.tight_layout()
    plt.savefig(os.path.join(CONFIG["PLOTS_DIR"], "confusion_matrix.png"), dpi=150)
    plt.close()
    return metrics


def plot_history(history):
    epochs = range(1, len(history["accuracy"]) + 1)
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    axes[0].plot(epochs, history["accuracy"],     label="Train")
    axes[0].plot(epochs, history["val_accuracy"], label="Val")
    axes[0].set_title("Accuracy")
    axes[0].set_xlabel("Epoch")
    axes[0].legend()
    axes[1].plot(epochs, history["loss"],     label="Train")
    axes[1].plot(epochs, history["val_loss"], label="Val")
    axes[1].set_title("Loss")
    axes[1].set_xlabel("Epoch")
    axes[1].legend()
    plt.tight_layout()
    plt.savefig(os.path.join(CONFIG["PLOTS_DIR"], "training_history.png"), dpi=150)
    plt.close()


def save_artefacts(model, class_indices):
    model.save(os.path.join(CONFIG["MODEL_DIR"], "pulmoscan_model.keras"))
    label_map = {v: k for k, v in class_indices.items()}
    with open(os.path.join(CONFIG["MODEL_DIR"], "label_map.json"), "w") as f:
        json.dump(label_map, f, indent=2)
    with open(os.path.join(CONFIG["MODEL_DIR"], "model_config.json"), "w") as f:
        json.dump({
            "image_size":  list(CONFIG["IMAGE_SIZE"]),
            "classes":     CONFIG["CLASSES"],
            "num_classes": CONFIG["NUM_CLASSES"],
        }, f, indent=2)
    print(f"[INFO] Model saved to {CONFIG['MODEL_DIR']}/")


def main():
    print("=" * 60)
    print("  PulmoScan AI — Model Training (Grayscale Fix)")
    print("=" * 60)

    df = build_dataframe(CONFIG["DATA_DIR"], CONFIG["CLASSES"])
    if len(df) == 0:
        print("[ERROR] No data found. Run prepare_dataset.py first.")
        return

    train_df, val_df, test_df = stratified_split(df)
    print(f"[INFO] Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")

    train_flow, val_flow, test_flow = make_generators(train_df, val_df, test_df)
    class_weights = get_class_weights(train_df)
    print("[INFO] Class weights:", class_weights)

    model, base_model = build_model(CONFIG["NUM_CLASSES"])
    history = train(model, base_model, train_flow, val_flow, class_weights)
    plot_history(history)

    print("\n[INFO] Evaluating best checkpoint …")
    best = tf.keras.models.load_model(
        os.path.join(CONFIG["MODEL_DIR"], "best_model.keras"))
    evaluate(best, test_flow, CONFIG["CLASSES"])
    save_artefacts(best, train_flow.class_indices)

    print("\n✅ Training complete!")


if __name__ == "__main__":
    main()
