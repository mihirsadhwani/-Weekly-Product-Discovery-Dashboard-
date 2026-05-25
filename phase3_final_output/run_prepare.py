import shutil
import json
import os

from prepare_final import prepare_final_output
from trend_analyzer import analyze_trends

if __name__ == "__main__":
    print("--- Phase 3: Preparing final output ---")
    prepare_final_output()

    print("\n--- Generating trend analysis ---")
    trends = analyze_trends(output_dir='output')
    if trends:
        with open('output/trends.json', 'w', encoding='utf-8') as f:
            json.dump(trends, f, indent=2, ensure_ascii=False)
        print("Saved: output/trends.json")

    # Back up current week for next run's comparison
    src = 'output/products.json'
    dst = 'output/products_previous.json'
    if os.path.exists(src):
        shutil.copy(src, dst)
        print(f"Backed up products.json -> products_previous.json")

    print("\nPhase 3 complete.")
