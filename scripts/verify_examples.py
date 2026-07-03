# -*- coding: utf-8 -*-
"""局數史例全表验证：用 kintaiyi（sxtwl 古历，原生支持公元前）对 docs/example.md
的每一行按年计 × 四积年流派计算局数，与史載局數比对。

用法：
    PYTHONPATH=<kintaiyi>/src python scripts/verify_examples.py <kintaiyi>/docs/example.md [out.json]

注：example.md 的负数年 = 公元前 N 年（kintaiyi/sxtwl 同约定，直传）。
"""
import json
import re
import sys

from kintaiyi import kintaiyi as kt

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else None
SCHOOLS = ["統宗", "金鏡", "淘金歌", "太乙局"]

rows = []
with open(SRC, encoding="utf-8") as f:
    for line in f:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 4 or not re.fullmatch(r"-?\d+", cells[0] or ""):
            continue
        rows.append({
            "year": int(cells[0]),
            "kook": int(re.sub(r"\D", "", cells[1]) or 0),
            "event": cells[2][:40],
            "source": cells[3],
        })

print(f"parsed {len(rows)} rows")
ok = 0
results = []
for r in rows:
    y = r["year"]
    matches = []
    computed = {}
    gz0 = ""
    for acum in range(4):
        try:
            t = kt.Taiyi(y, 6, 15, 12, 0)
            gz0 = t._get_gangzhi()[0]
            k = t.kook(0, acum)
            computed[SCHOOLS[acum]] = k.get("數")
            if k.get("數") == r["kook"]:
                matches.append(SCHOOLS[acum])
        except Exception as exc:  # noqa: BLE001
            computed[SCHOOLS[acum]] = f"ERR:{type(exc).__name__}"
    hit = "✓" if matches else "✗"
    if matches:
        ok += 1
    results.append({**r, "年柱": gz0, "computed": computed, "matches": matches})
    print(f"{hit} {y:>6} 史載{r['kook']:>3} | 年柱{gz0} | "
          + " ".join(f"{s}={computed[s]}" for s in SCHOOLS)
          + (f" ← {'/'.join(matches)}" if matches else f"  [{r['source'][:12]}]"))

print(f"\n匹配 {ok}/{len(rows)}")
from collections import Counter
c = Counter(s for x in results for s in x["matches"])
print("各派命中：", dict(c))

if OUT:
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    print("wrote", OUT)
