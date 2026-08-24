#!/usr/bin/env python3
"""將 data/ 目錄下的 JSON 檔轉換為 JXA 能使用的 .js 格式。

由於 JXA 測試環境無法 fetch JSON，這個腳本讀取 data/ 底下的 JSON 檔，
輸出 tests/.data.js，內容為 var ELEMENTS = [...]; 等全域陣列定義。
"""

import pathlib
import json
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT_FILE = ROOT / "tests" / ".data.js"


def load_json(filename):
    """讀取 data/ 底下的 JSON 檔，若不存在回傳空陣列。"""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"警告：無法讀取 {filename}：{e}", file=sys.stderr)
        return []


def generate_js():
    """產生 .data.js 檔案。"""
    elements = load_json("elements.json")
    groups = load_json("mnemonics-groups.json")
    stages = load_json("stages.json")
    element_mnemonics = load_json("mnemonics-elements.json")

    js_content = f"""// 自動產生的資料夾樣本，供測試使用
// 由 tests/make-data-fixture.py 產生，不進版控

var ELEMENTS = {json.dumps(elements, ensure_ascii=False, indent=2)};

var GROUPS = {json.dumps(groups, ensure_ascii=False, indent=2)};

var STAGES = {json.dumps(stages, ensure_ascii=False, indent=2)};

var ELEMENT_MNEMONICS = {json.dumps(element_mnemonics, ensure_ascii=False, indent=2)};
"""

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"已產生 {OUTPUT_FILE}")


if __name__ == "__main__":
    generate_js()
