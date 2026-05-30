import shutil
import json
import os
from pathlib import Path

from prepare_final import prepare_final_output
from trend_analyzer import analyze_trends

if __name__ == "__main__":
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(exist_ok=True)

    print("--- Phase 3: Preparing final output ---")
    prepare_final_output()

    print("\n--- Generating trend analysis ---")
    trends = analyze_trends(output_dir=str(output_dir))
    if trends:
        with open(output_dir / 'trends.json', 'w', encoding='utf-8') as f:
            json.dump(trends, f, indent=2, ensure_ascii=False)
        print(f"Saved: {output_dir / 'trends.json'}")

    # Back up current week for next run's comparison
    src = output_dir / 'products.json'
    dst = output_dir / 'products_previous.json'
    if src.exists():
        shutil.copy(src, dst)
        print(f"Backed up products.json -> products_previous.json")

    print("\nPhase 3 complete.")
