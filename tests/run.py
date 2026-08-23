#!/usr/bin/env python3
"""串接 ES module 原始碼與測試檔，交給 osascript (JXA) 執行。

環境沒有 node，也沒有 jsc；macOS 內建的 osascript -l JavaScript（JXA）
能執行現代 JS，但不支援 ES modules。這裡的做法是用 Python 讀取原始碼、
以正規表示式移除 import / export 關鍵字、與測試檔串接後交給 osascript 執行。

用法：python3 tests/run.py js/core/scheduler.js tests/scheduler.test.js
測試全過 exit 0，有失敗 exit 1。
"""
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
HARNESS = ROOT / "tests" / "harness.js"
FOOTER = '\nif (__report() > 0) { throw new Error("TESTS_FAILED"); }\n'


def strip_modules(src):
    """移除 ES module 語法，讓 JXA 能直接執行。"""
    src = re.sub(r'^\s*import\s+[^;]*?;\s*$', '', src, flags=re.M | re.S)
    src = re.sub(r'^\s*export\s+default\s+', '', src, flags=re.M)
    src = re.sub(r'^\s*export\s+', '', src, flags=re.M)
    return src


def build_bundle(paths):
    parts = [HARNESS.read_text(encoding="utf-8")]
    for p in paths:
        path = pathlib.Path(p)
        if not path.is_absolute():
            path = ROOT / path
        parts.append("// ==== %s ====" % p)
        parts.append(strip_modules(path.read_text(encoding="utf-8")))
    parts.append(FOOTER)
    return "\n".join(parts)


def main(paths):
    if not paths:
        sys.stderr.write("用法：python3 tests/run.py <src.js>... <file.test.js>\n")
        return 2
    bundle = build_bundle(paths)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False,
                                     encoding="utf-8") as f:
        f.write(bundle)
        tmp = f.name
    result = subprocess.run(["osascript", "-l", "JavaScript", tmp],
                            capture_output=True, text=True)
    sys.stdout.write(result.stdout)
    # 注意：osascript 執行 JXA 時，console.log 的輸出一律導向 stderr，
    # 不會出現在 stdout（已實測確認，即使沒有拋出例外也一樣）。
    # 因此測試結果訊息（PASS/FAIL、通過/失敗統計）實際上都在 stderr 裡，
    # 必須印出來，只過濾掉 osascript 自己附加的技術性錯誤列
    # （script 拋出 TESTS_FAILED 時會多一行 "execution error: ..."）。
    stderr_lines = [ln for ln in result.stderr.splitlines()
                     if "execution error" not in ln]
    if stderr_lines:
        sys.stdout.write("\n".join(stderr_lines) + "\n")
    return 1 if result.returncode != 0 else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
