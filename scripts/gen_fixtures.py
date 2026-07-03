# -*- coding: utf-8 -*-
"""从 kintaiyi（Python 参考实现）批量生成黄金用例，供 TS 引擎对照验证。

用法：
    python scripts/gen_fixtures.py <kintaiyi_src_dir> [output_json]

<kintaiyi_src_dir> 指向 kintaiyi 仓库的 src/kintaiyi 目录（含 kintaiyi.py/config.py）。
依赖：pip install sxtwl cn2an bidict
"""
import json
import os
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else None
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    os.path.dirname(__file__), "..", "tests", "fixtures", "golden.json")

if not SRC or not os.path.isdir(SRC):
    print(__doc__)
    sys.exit(1)

# kintaiyi 包内使用相对导入，把上级目录加进 sys.path 后按包导入
pkg_parent = os.path.dirname(os.path.abspath(SRC))
sys.path.insert(0, pkg_parent)

from kintaiyi import kintaiyi as kt  # noqa: E402
from kintaiyi import config, jieqi   # noqa: E402

# 覆盖不同年代、节气边界、晚子时、闰月、分计的抽样时间点
DATES = [
    (604, 3, 3, 10, 0),      # 古代日期（儒略历区间，验证积日/干支对齐）
    (1000, 7, 15, 8, 0),
    (1900, 12, 22, 0, 30),
    (1912, 2, 5, 10, 0),
    (1949, 10, 1, 15, 0),
    (1976, 6, 21, 23, 5),    # 夏至附近 + 晚子时
    # 注意：节气日「交接时刻之前」的时间点不可用作黄金用例——kintaiyi 的
    # get_before_jieqi_start_date 从 day.before(15) 继续回扫，会跳过上一节气
    # 报出再上一个节气（如 1984-02-04 12:00 报小寒而非大寒），属参考实现缺陷。
    (1984, 2, 4, 23, 30),    # 甲子年立春日（23:19 交接后）+ 晚子时
    (1995, 8, 20, 6, 40),
    (2000, 1, 1, 0, 0),
    (2008, 8, 8, 20, 8),
    (2017, 7, 2, 9, 15),     # 闰六月
    (2020, 12, 21, 19, 30),  # 冬至日（18:02 交接后）
    (2024, 6, 20, 23, 59),   # 晚子时 + 夏至前夕
    (2026, 7, 3, 14, 30),
    (2044, 4, 28, 11, 11),
    (2100, 3, 15, 5, 45),
]

cases = []
for (y, mo, d, h, mi) in DATES:
    t = kt.Taiyi(y, mo, d, h, mi)
    for ji in range(0, 5):
        for acum in range(0, 4):
            try:
                acc = t.accnum(ji, acum)
                kook = t.kook(ji, acum)
                acc_key = [k for k in kook if k.startswith("積")][0]
                doors = t.geteightdoors(ji, acum)
                case = {
                    "input": [y, mo, d, h, mi],
                    "ji": ji,
                    "acum": acum,
                    "gz": t._get_gangzhi(),
                    "lunar": [t._get_lunar_date().get("年"),
                              t._get_lunar_date().get("月"),
                              t._get_lunar_date().get("日")],
                    "jq": jieqi.jq(y, mo, d, h, mi),
                    "acc": acc,
                    "kook_text": kook.get("文"),
                    "kook_num": kook.get("數"),
                    "kook_year": kook.get("年"),
                    "kook_acc": kook.get(acc_key),
                    "ty": t.ty(ji, acum),
                    "wc": t.skyeyes(ji, acum),
                    "wc_des": t.skyeyes_des(ji, acum),
                    "sf": t.sf(ji, acum),
                    "se": t.se(ji, acum),
                    "jigod": t.jigod(ji),
                    "hegod": t.hegod(ji),
                    "taishui": t.taishui(ji),
                    "home_cal": t.home_cal(ji, acum),
                    "home_g": t.home_general(ji, acum),
                    "home_v": t.home_vgen(ji, acum),
                    "away_cal": t.away_cal(ji, acum),
                    "away_g": t.away_general(ji, acum),
                    "away_v": t.away_vgen(ji, acum),
                    "set_cal": t.set_cal(ji, acum),
                    "set_g": t.set_general(ji, acum),
                    "set_v": t.set_vgen(ji, acum),
                    "kingbase": t.kingbase(ji, acum),
                    "officerbase": t.officerbase(ji, acum),
                    "pplbase": t.pplbase(ji, acum),
                    "fgd": t.fgd(ji, acum),
                    "skyyi": t.skyyi(ji, acum),
                    "earthyi": t.earthyi(ji, acum),
                    "zhifu": t.zhifu(ji, acum),
                    "flyfu": t.flyfu(ji, acum),
                    "doors": {str(k): v for k, v in doors.items()},
                    "geju": sorted(t.shi_geju(ji, acum).keys()),
                    "jiyuan": t.jiyuan(ji, acum),
                    "five_yuan": t.get_five_yuan_kook(ji, acum),
                    "yangjiu": config.yangjiu(y, mo, d),
                    "baliu": config.baliu(y, mo, d),
                    "yeargua": t.yeargua(acum),
                    "daygua": t.daygua(acum),
                    "hourgua": t.hourgua(acum),
                    "year_chin": t.year_chin(),
                    "sf_num": t.sf_num(ji, acum),
                    "tian_wang": config.tian_wang(acc),
                    "tian_shi": config.tian_shi(acc),
                    "wuxing_god": config.wuxing(acc),
                    "kingfu": config.kingfu(acc),
                    "taijun": config.taijun(acc),
                    "wufu": config.wufu(acc),
                    "threewind": config.threewind(acc),
                    "fivewind": config.fivewind(acc),
                    "eightwind": config.eightwind(acc),
                    "flybird": config.flybird(acc),
                    "bigyo": config.bigyo(acc),
                    "smyo": config.smyo(acc),
                }
                cases.append(case)
            except Exception as exc:  # noqa: BLE001 — 记录参考实现自身抛错的组合
                cases.append({
                    "input": [y, mo, d, h, mi],
                    "ji": ji,
                    "acum": acum,
                    "error": f"{type(exc).__name__}: {exc}",
                })

# —— 命法黄金用例（每个时间点 × 男女；流年卦链依赖“今天”，记录生成日供 TS 侧复现） ——
import datetime as _dt
_today = _dt.date.today()
mingfa_cases = []
for (y, mo, d, h, mi) in DATES:
    t = kt.Taiyi(y, mo, d, h, mi)
    for sex in ("男", "女"):
        try:
            mingfa_cases.append({
                "input": [y, mo, d, h, mi],
                "sex": sex,
                "as_of": [_today.year, _today.month, _today.day],
                "life_accum": t.taiyi_life_accum(),
                "three_cai": list(t.three_cai_num()),
                "twelve_palaces": t._twelve_palace_map(sex),
                "yangjiu_xingxian": list(t.yangjiu_xingxian(sex).items()),
                "bailiu_xingxian": list(t.bailiu_xingxian(sex).items()),
                "souqi_num": t.souqi_num(),
                "shouqi_ganzhi": t.shouqi_ganzhi(),
                "life_start_gua": t.life_start_gua(),
                "year_gua": t.year_gua(),
                "month_gua": t.month_gua(),
                "day_gua": t.day_gua(),
                "hour_gua": t.hour_gua(),
                "minute_gua": t.minute_gua(),
            })
        except Exception as exc:  # noqa: BLE001
            mingfa_cases.append({
                "input": [y, mo, d, h, mi],
                "sex": sex,
                "error": f"{type(exc).__name__}: {exc}",
            })

payload = {"cases": cases, "mingfa": mingfa_cases}
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=1)

ok = sum(1 for c in cases if "error" not in c)
mok = sum(1 for c in mingfa_cases if "error" not in c)
print(f"wrote {len(cases)} cases ({ok} ok) + {len(mingfa_cases)} mingfa ({mok} ok) -> {OUT}")
