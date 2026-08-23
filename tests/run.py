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


class MissingSource(Exception):
    """來源檔不存在。用例外而非直接印訊息，讓 main 決定怎麼回報。"""


def build_bundle(paths):
    parts = [HARNESS.read_text(encoding="utf-8")]
    for p in paths:
        path = pathlib.Path(p)
        if not path.is_absolute():
            path = ROOT / path
        # TDD 的第一步就是「檔案還沒建立」，這條路徑會天天走到。
        # 讓它噴 Python traceback 只會讓人以為是測試工具壞了。
        if not path.is_file():
            raise MissingSource(p)
        parts.append("// ==== %s ====" % p)
        parts.append(strip_modules(path.read_text(encoding="utf-8")))
    parts.append(FOOTER)
    return "\n".join(parts)


def main(paths):
    if not paths:
        sys.stderr.write("用法：python3 tests/run.py <src.js>... <file.test.js>\n")
        return 2
    try:
        bundle = build_bundle(paths)
    except MissingSource as e:
        sys.stderr.write("找不到來源檔：%s\n" % e)
        return 2
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
    # 必須印出來。
    #
    # osascript 在腳本擲出未捕捉例外時，會在 stderr 最後多附加一行
    # 自己合成的技術性錯誤列，格式固定為
    # "<腳本暫存檔路徑>: execution error: <錯誤訊息> (<錯誤碼>)"。
    # 這裡用「精確錨定該暫存檔路徑」的正規表示式只移除那一行，
    # 而不是用「行內含有 execution error 字串」這種泛用子字串比對
    # ——後者會連測試訊息本身剛好提到那幾個字的行都一併誤殺。
    stderr_text = result.stderr
    lines = stderr_text.splitlines()
    synth_line = re.compile(r'^' + re.escape(tmp) + r': execution error: .*$')
    filtered = [ln for ln in lines if not synth_line.match(ln)]
    # 保底：如果例外發生在任何 test() 呼叫之前（例如來源檔語法錯誤，
    # 或測試檔在 test() 之外的頂層程式碼直接拋出），stderr 就只會有
    # 那唯一一行合成錯誤列，過濾後會變成完全沒有輸出。這種情況下
    # 過濾前的原始 stderr 才是唯一的除錯線索，絕對不能吞掉——否則
    # 又會重現「exit code 正確但畫面全空、看不出原因」的危險狀況。
    output_lines = filtered if any(ln.strip() for ln in filtered) else lines
    if output_lines:
        sys.stdout.write("\n".join(output_lines) + "\n")
    return 1 if result.returncode != 0 else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
