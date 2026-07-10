#!/usr/bin/env python3
"""从 kintaiyi 源码生成 src/taiyi/mishu.ts（《太乙秘書》七十二陽局/陰局斷辭查表）。

用法：
    python scripts/gen_mishu.py [<kintaiyi>/src]

默认读取 D:\\WWW\\kintaiyi\\src。上游 taiyimishu.py 更新后重新运行即可同步。
数据按上游原样移植（含个别干支写法之历史原貌），不做校改。
"""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src' / 'taiyi' / 'mishu.ts'


def pairs(lst: list[str]) -> dict[int, dict[str, str]]:
    assert len(lst) == 144, f'期望 144 行（72 局×头/文），实得 {len(lst)}'
    out: dict[int, dict[str, str]] = {}
    for i in range(72):
        header = lst[2 * i].lstrip('●').strip()
        text = lst[2 * i + 1].strip()
        parts = header.split()
        assert parts[0].endswith('局'), f'局头异常: {header!r}'
        out[i + 1] = {'ganzhi': '、'.join(parts[1:]), 'text': text}
    return out


def ts_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def emit(name: str, table: dict[int, dict[str, str]]) -> str:
    lines = [f'  {name}: {{']
    for num in range(1, 73):
        e = table[num]
        lines.append(f'    {num}: {{ ganzhi: {ts_str(e["ganzhi"])}, text: {ts_str(e["text"])} }},')
    lines.append('  },')
    return '\n'.join(lines)


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r'D:\WWW\kintaiyi\src')
    sys.path.insert(0, str(src))
    from kintaiyi.taiyimishu import yang, ying  # noqa: PLC0415

    yang_t, yin_t = pairs(yang), pairs(ying)
    body = f"""/**
 * 《太乙秘書》七十二陽局／陰局斷辭（全 144 局）。
 *
 * 数据源自 kentang2017/kintaiyi src/kintaiyi/taiyimishu.py（MIT）——上游 streamlit 端以
 * taiyi_yingyang[阴阳遁][局数] 查表展示，不在 pan() 输出内，故在本项目静态移植（本地模式亦可用）。
 * 由 scripts/gen_mishu.py 生成，勿手改；上游更新后重新生成：python scripts/gen_mishu.py <kintaiyi>/src
 * 文本按上游原样（含个别干支写法之历史原貌），以保可对照性。
 */
import type {{ Dun }} from './types';

export interface MishuEntry {{
  /** 该局所辖五元干支（甲子/丙子/戊子/庚子/壬子五元各一组岁次） */
  ganzhi: string;
  /** 《太乙秘書》本局斷辭全文 */
  text: string;
}}

export const TAIYI_MISHU: Record<Dun, Record<number, MishuEntry>> = {{
{emit('陽', yang_t)}
{emit('陰', yin_t)}
}};

/** 取本局《太乙秘書》斷辭（dun 阳/阴遁 × 局数 1..72；查无则 null） */
export function getMishu(dun: Dun, num: number): MishuEntry | null {{
  return TAIYI_MISHU[dun]?.[num] ?? null;
}}
"""
    OUT.write_text(body, encoding='utf-8', newline='\n')
    print(f'OK -> {OUT} ({OUT.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
