import os
import shutil
import threading
import torch
import cv2
import xml.etree.ElementTree as ET
from torch.utils.data import Dataset, DataLoader
from effdet import create_model
import torchvision.transforms as T

from app.services.dataset_builder import DatasetBuilder

training_state = {"status": "Idle"}


# =========================================
# AUTO CLASS DETECTOR
# =========================================

def extract_classes(annotation_dir):
    class_set = set()

    for file in os.listdir(annotation_dir):
        if not file.endswith(".xml"):
            continue

        tree = ET.parse(os.path.join(annotation_dir, file))
        root = tree.getroot()

        for obj in root.findall("object"):
            name = obj.find("name").text.strip()
            class_set.add(name)

    class_list = sorted(list(class_set))
    class_map = {name: idx + 1 for idx, name in enumerate(class_list)}

    print("Detected Classes:", class_map)

    return class_map


# =========================================
# VOC DATASET
# =========================================

class VOCDataset(Dataset):
    def __init__(self, image_dir, annotation_dir, class_map):
        self.image_dir = image_dir
        self.annotation_dir = annotation_dir
        self.class_map = class_map

        self.images = [
            f for f in os.listdir(image_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        self.transform = T.Compose([
            T.ToTensor(),
            T.Normalize([0.485, 0.456, 0.406],
                        [0.229, 0.224, 0.225])
        ])

    def __len__(self):
        return len(self.images)

    def parse_xml(self, xml_path, orig_w, orig_h):
        tree = ET.parse(xml_path)
        root = tree.getroot()

        boxes = []
        labels = []

        for obj in root.findall("object"):
            class_name = obj.find("name").text.strip()

            if class_name not in self.class_map:
                continue

            label = self.class_map[class_name]
            bndbox = obj.find("bndbox")

            xmin = float(bndbox.find("xmin").text)
            ymin = float(bndbox.find("ymin").text)
            xmax = float(bndbox.find("xmax").text)
            ymax = float(bndbox.find("ymax").text)

            # scale boxes to 512x512
            xmin = xmin / orig_w * 512
            ymin = ymin / orig_h * 512
            xmax = xmax / orig_w * 512
            ymax = ymax / orig_h * 512

            xmin = max(0, min(511, xmin))
            ymin = max(0, min(511, ymin))
            xmax = max(0, min(511, xmax))
            ymax = max(0, min(511, ymax))

            if xmax > xmin and ymax > ymin:
                boxes.append([xmin, ymin, xmax, ymax])
                labels.append(label)

        return boxes, labels

    def __getitem__(self, idx):
        img_name = self.images[idx]
        img_path = os.path.join(self.image_dir, img_name)

        xml_name = os.path.splitext(img_name)[0] + ".xml"
        xml_path = os.path.join(self.annotation_dir, xml_name)

        image = cv2.imread(img_path)
        orig_h, orig_w = image.shape[:2]

        image = cv2.resize(image, (512, 512))
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = self.transform(image)

        boxes, labels = self.parse_xml(xml_path, orig_w, orig_h)

        if len(boxes) == 0:
            boxes = [[0.0, 0.0, 1.0, 1.0]]
            labels = [1]

        target = {
            "bbox": torch.tensor(boxes, dtype=torch.float32),
            "cls": torch.tensor(labels, dtype=torch.float32),
            "img_scale": torch.tensor(1.0),
            "img_size": torch.tensor([[512, 512]], dtype=torch.float32),
        }

        return image, target


# =========================================
# COLLATE
# =========================================

def collate_fn(batch):
    images, targets = zip(*batch)
    images = torch.stack(images)

    max_boxes = max(t["bbox"].shape[0] for t in targets)

    batched_bbox = torch.zeros(len(targets), max_boxes, 4)
    batched_cls = torch.zeros(len(targets), max_boxes)

    for i, t in enumerate(targets):
        n = t["bbox"].shape[0]
        batched_bbox[i, :n] = t["bbox"]
        batched_cls[i, :n] = t["cls"]

    return images, {
        "bbox": batched_bbox,
        "cls": batched_cls,
        "img_scale": torch.ones(len(targets)),
        "img_size": torch.tensor([[512, 512]] * len(targets), dtype=torch.float32),
    }


# =========================================
# TRAINER
# =========================================

class EfficientDetTrainer:

    def __init__(self, folders=None, label="default"):
        self.folders = folders or []
        self.label = label

    def train(self):
        global training_state

        try:
            # ==============================
            # STEP 1 — BUILD DATASET
            # ==============================

            training_state["status"] = "Building dataset..."

            dataset_path, total_images = DatasetBuilder.build(self.folders)

            if total_images == 0:
                training_state["status"] = "ERROR: No training images found in selected folders"
                return

            training_state["status"] = f"Dataset ready — {total_images} images"

            annotation_dir = os.path.join(dataset_path, "labels")
            image_dir = os.path.join(dataset_path, "images")

            # ==============================
            # STEP 2 — EXTRACT CLASSES
            # ==============================

            training_state["status"] = "Extracting classes..."

            class_map = extract_classes(annotation_dir)
            num_classes = len(class_map)

            if num_classes == 0:
                training_state["status"] = "ERROR: No classes found in annotations"
                return

            training_state["status"] = f"Classes: {list(class_map.keys())}"

            # ==============================
            # STEP 3 — DATASET + LOADER
            # ==============================

            dataset = VOCDataset(
                image_dir=image_dir,
                annotation_dir=annotation_dir,
                class_map=class_map
            )

            dataloader = DataLoader(
                dataset,
                batch_size=2,
                shuffle=True,
                collate_fn=collate_fn,
                num_workers=0
            )

            # ==============================
            # STEP 4 — MODEL
            # ==============================

            device = "cuda" if torch.cuda.is_available() else "cpu"

            training_state["status"] = f"Loading model on {device}..."

            model = create_model(
                "tf_efficientdet_d0",
                bench_task="train",
                num_classes=num_classes,
                pretrained=True
            )

            model.to(device)
            model.train()

            optimizer = torch.optim.AdamW(
                model.parameters(),
                lr=1e-4,
                weight_decay=1e-4
            )

            scheduler = torch.optim.lr_scheduler.StepLR(
                optimizer,
                step_size=5,
                gamma=0.5
            )

            # ==============================
            # STEP 5 — TRAIN
            # ==============================

            epochs = 30

            for epoch in range(epochs):

                model.train()
                epoch_loss = 0.0
                steps = 0

                for images, targets in dataloader:

                    images = images.to(device)

                    targets = {
                        k: v.to(device) for k, v in targets.items()
                    }

                    loss_out = model(images, targets)

                    if isinstance(loss_out, dict):
                        loss = loss_out["loss"]
                    else:
                        loss = loss_out

                    optimizer.zero_grad()
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                    optimizer.step()

                    epoch_loss += loss.item()
                    steps += 1

                scheduler.step()

                avg_loss = epoch_loss / max(steps, 1)

                training_state["status"] = (
                    f"Epoch {epoch+1}/{epochs} — Loss: {avg_loss:.4f}"
                )

                print(f"Epoch {epoch+1}/{epochs} loss={avg_loss:.4f}")

            # ==============================
            # STEP 6 — SAVE
            # ==============================

            os.makedirs("models", exist_ok=True)

            model_path = os.path.join("models", f"{self.label}_detector.pt")

            torch.save(model.state_dict(), model_path)

            meta_path = model_path.replace(".pt", "_classes.txt")
            with open(meta_path, "w") as f:
                f.write("\n".join(sorted(class_map.keys())))

            training_state["status"] = (
                f"Training Complete — {model_path} | Classes: {list(class_map.keys())}"
            )

        except Exception as e:
            import traceback
            traceback.print_exc()
            training_state["status"] = f"ERROR: {str(e)}"

    def start(self):
        thread = threading.Thread(target=self.train, daemon=True)
        thread.start()
