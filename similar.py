import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np


IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".bmp", ".webp")

# Default folder structure (auto-created at startup)
DEFAULT_FOLDER_LAYOUT: Dict[str, List[str]] = {
    "vowels": [
        "a",
        "aa",
        "i",
        "ii",
        "u",
        "uu",
        "e",
        "ee",
        "ai",
        "o",
        "oo",
        "au",
    ],
    "consonants": [
        "ka",
        "nga",
        "ca",
        "nya",
        "tta",
        "nna",
        "tha",
        "na",
        "pa",
        "ma",
        "ya",
        "ra",
        "la",
        "va",
        "zha",
        "lla",
        "rra",
        "nnn",
    ],
    "grantha": ["ja", "sha", "ssa", "ha", "ksha"],
    "special_aytam": [
        "aytam",
        "pulli_virama",
        "thunai_kal",
        "kuril_suli",
        "nedil_suli",
        "nedil_kombu",
        "kuril_kombu_v2",
    ],
}


class CharacterFolderMatcher:
    """
    1) Auto-create default character folders.
    2) First crop: user selects target character folder.
    3) Next crops: recommend best folder by cosine similarity.
    """

    def __init__(self, root_dir: str = "character_library"):
        self.root_dir = Path(root_dir)
        self.root_dir.mkdir(parents=True, exist_ok=True)
        self._create_default_folders()

        self.hog = cv2.HOGDescriptor(
            _winSize=(64, 128),
            _blockSize=(16, 16),
            _blockStride=(8, 8),
            _cellSize=(8, 8),
            _nbins=9,
        )

    @staticmethod
    def _normalize_input_path(raw_path: str) -> str:
        return raw_path.strip().strip("'").strip('"')

    @staticmethod
    def _safe_text(value: str) -> str:
        clean = re.sub(r"[^a-zA-Z0-9_-]+", "_", value.strip())
        return clean or "item"

    def _create_default_folders(self) -> None:
        for group_name, characters in DEFAULT_FOLDER_LAYOUT.items():
            group_path = self.root_dir / group_name
            group_path.mkdir(parents=True, exist_ok=True)
            for character_name in characters:
                (group_path / character_name).mkdir(parents=True, exist_ok=True)

    def get_character_folders(self) -> List[Path]:
        folders: List[Path] = []
        for group_dir in sorted(self.root_dir.iterdir()):
            if not group_dir.is_dir():
                continue
            for char_dir in sorted(group_dir.iterdir()):
                if char_dir.is_dir():
                    folders.append(char_dir)
        return folders

    def print_folder_menu(self) -> List[Path]:
        folders = self.get_character_folders()
        if not folders:
            raise ValueError("No character folders available")

        print("\nSelect character folder:")
        print("-" * 72)
        current_group = None
        for idx, folder in enumerate(folders, start=1):
            group_name = folder.parent.name
            if group_name != current_group:
                current_group = group_name
                print(f"\n[{group_name}]")
            rel = folder.relative_to(self.root_dir)
            sample_count = len([p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS])
            print(f"{idx:2d}. {rel} (samples: {sample_count})")
        return folders

    def choose_folder_interactive(self) -> Path:
        folders = self.print_folder_menu()

        while True:
            raw = input("Enter folder number: ").strip()
            if not raw.isdigit():
                print("Please enter a valid number.")
                continue
            index = int(raw)
            if index < 1 or index > len(folders):
                print("Number out of range.")
                continue
            return folders[index - 1]

    def crop_character(self, image_path: str) -> np.ndarray:
        image_path = self._normalize_input_path(image_path)
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")

        roi = cv2.selectROI("Select character and press ENTER", image, False, False)
        cv2.destroyAllWindows()

        x, y, w, h = [int(v) for v in roi]
        if w == 0 or h == 0:
            raise ValueError("No crop selected")

        return image[y : y + h, x : x + w]

    def extract_features(self, image: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (64, 128))
        return self.hog.compute(resized).flatten()

    @staticmethod
    def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        denom = np.linalg.norm(vec_a) * np.linalg.norm(vec_b)
        if denom == 0:
            return 0.0
        return float(np.dot(vec_a, vec_b) / denom)

    def save_crop(self, crop: np.ndarray, folder: Path, source_tag: str = "crop") -> Path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_tag = self._safe_text(source_tag)
        output_path = folder / f"{safe_tag}_{timestamp}.png"
        cv2.imwrite(str(output_path), crop)
        return output_path

    def _iter_folder_images(self, folder: Path) -> List[Path]:
        return [
            p
            for p in sorted(folder.iterdir())
            if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        ]

    def recommend_folders(self, query_crop: np.ndarray, top_k: int = 5) -> List[Tuple[Path, float, int]]:
        query_features = self.extract_features(query_crop)
        folder_scores: List[Tuple[Path, float, int]] = []

        for folder in self.get_character_folders():
            image_files = self._iter_folder_images(folder)
            if not image_files:
                continue

            best_score = -1.0
            sample_count = 0
            for image_file in image_files:
                image = cv2.imread(str(image_file))
                if image is None:
                    continue
                sample_features = self.extract_features(image)
                score = self.cosine_similarity(query_features, sample_features)
                if score > best_score:
                    best_score = score
                sample_count += 1

            if sample_count > 0:
                folder_scores.append((folder, best_score, sample_count))

        folder_scores.sort(key=lambda item: item[1], reverse=True)
        return folder_scores[:top_k]

    def print_recommendations(self, recommendations: List[Tuple[Path, float, int]]) -> None:
        print("\nRecommended folders")
        print("-" * 72)
        if not recommendations:
            print("No saved samples found yet. Save first crop to any folder.")
            return

        for idx, (folder, score, sample_count) in enumerate(recommendations, start=1):
            rel = folder.relative_to(self.root_dir)
            print(
                f"{idx}. {rel} | similarity: {score:.4f} ({score * 100:.2f}%) | "
                f"samples: {sample_count}"
            )


def run_workflow() -> None:
    tool = CharacterFolderMatcher(root_dir="character_library")

    print("Default folders ready at: character_library")
    print("First step: crop one character and select its folder manually.")

    previous_features: Optional[np.ndarray] = None

    # First crop (manual folder choice)
    while True:
        try:
            first_image_path = input("\nEnter first image path: ").strip()
            first_crop = tool.crop_character(first_image_path)
            first_folder = tool.choose_folder_interactive()

            first_tag = Path(tool._normalize_input_path(first_image_path)).stem or "first"
            first_saved_path = tool.save_crop(first_crop, first_folder, source_tag=first_tag)
            previous_features = tool.extract_features(first_crop)

            print(f"Saved first crop to: {first_saved_path}")
            break
        except Exception as exc:
            print(f"Error: {exc}")

    # Next crops (recommend by similarity)
    while True:
        print("\nOptions:")
        print("1. Crop next character and get recommendation")
        print("2. Select folder list")
        print("3. Exit")
        choice = input("Enter choice (1/2/3): ").strip()

        if choice == "1":
            try:
                image_path = input("Enter next image path: ").strip()
                next_crop = tool.crop_character(image_path)
                next_features = tool.extract_features(next_crop)

                if previous_features is not None:
                    prev_similarity = tool.cosine_similarity(next_features, previous_features)
                    print(
                        "Similarity to previous crop: "
                        f"{prev_similarity:.4f} ({prev_similarity * 100:.2f}%)"
                    )

                recommendations = tool.recommend_folders(next_crop, top_k=5)
                tool.print_recommendations(recommendations)

                if recommendations:
                    recommended_folder = recommendations[0][0]
                    default_rel = recommended_folder.relative_to(tool.root_dir)
                    save_choice = input(
                        f"Save to recommended folder '{default_rel}'? "
                        "[Y=Yes / S=Select folder / N=Skip]: "
                    ).strip().lower()

                    if save_choice in ("", "y", "yes"):
                        target_folder = recommended_folder
                    elif save_choice in ("s", "select"):
                        target_folder = tool.choose_folder_interactive()
                    else:
                        target_folder = None

                    if target_folder is not None:
                        source_tag = Path(tool._normalize_input_path(image_path)).stem or "next"
                        saved_path = tool.save_crop(next_crop, target_folder, source_tag=source_tag)
                        print(f"Saved crop to: {saved_path}")
                else:
                    manual_choice = input(
                        "No recommendations (no samples yet). Select folder manually to save? [Y/N]: "
                    ).strip().lower()
                    if manual_choice in ("y", "yes", ""):
                        target_folder = tool.choose_folder_interactive()
                        source_tag = Path(tool._normalize_input_path(image_path)).stem or "next"
                        saved_path = tool.save_crop(next_crop, target_folder, source_tag=source_tag)
                        print(f"Saved crop to: {saved_path}")

                previous_features = next_features

            except Exception as exc:
                print(f"Error: {exc}")

        elif choice == "2":
            try:
                tool.print_folder_menu()
            except Exception as exc:
                print(f"Error: {exc}")

        elif choice == "3":
            print("Exiting.")
            break

        else:
            print("Invalid choice. Please enter 1, 2, or 3.")


if __name__ == "__main__":
    run_workflow()
