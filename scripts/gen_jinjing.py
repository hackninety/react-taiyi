#!/usr/bin/env python3
"""生成 mcp/data/jinjing.json —— 《太乙金鏡式經》（唐·王希明，四庫全書本）全十卷 + 四库提要。

数据源：维基文库（zh.wikisource.org）「太乙金鏡式經 (四庫全書本)」及其子页（公版）。
用途：MCP 工具 taiyi_classics 的经典原文库（金镜积年流派第一手经典）；
数据只供 MCP/Node 侧 fs 读取，不进 web 打包。

用法：
    python scripts/gen_jinjing.py           # 抓取（带缓存）并生成
    python scripts/gen_jinjing.py --offline # 仅用缓存生成

清洗规则（wikitext → 纯文本）：
    {{SK anchor|X}} → X；{{SK notes|X}} → 〔X〕；{{SKchar|N}} → □（四库缺字）；
    {{YL|X}}/{{!|X}} 等单参模板 → 取参数；SKQS header/footer/PD-old 等版式模板 → 删；
    仅取 <poem>…</poem> 正文；HTML 注释删；连续空行折叠。
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'mcp' / 'data' / 'jinjing.json'
CACHE = Path(__file__).resolve().parent / '.jinjing_cache'

BASE_TITLE = '太乙金鏡式經 (四庫全書本)'
CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
PAGES: list[tuple[str, str]] = [('提要', BASE_TITLE)] + [
    (f'卷{CN_NUM[i - 1]}', f'{BASE_TITLE}/卷{i:02d}') for i in range(1, 11)
]


def fetch_wikitext(title: str, offline: bool) -> str:
    CACHE.mkdir(exist_ok=True)
    cf = CACHE / (title.replace('/', '_').replace(' ', '') + '.wiki')
    if cf.exists():
        return cf.read_text(encoding='utf-8')
    if offline:
        raise SystemExit(f'缺少缓存且 --offline：{title}')
    qs = urllib.parse.urlencode({'action': 'parse', 'page': title, 'prop': 'wikitext', 'format': 'json'})
    req = urllib.request.Request(
        f'https://zh.wikisource.org/w/api.php?{qs}',
        headers={'User-Agent': 'react-taiyi-gen/1.0 (classics vendoring; contact: repo react-taiyi)'},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode('utf-8'))
            wt = data['parse']['wikitext']['*']
            cf.write_text(wt, encoding='utf-8')
            time.sleep(0.5)
            return wt
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                raise SystemExit(f'抓取失败 {title}: {e}')
            time.sleep(3)
    raise SystemExit('unreachable')


def clean(wikitext: str) -> str:
    t = re.sub(r'<!--.*?-->', '', wikitext, flags=re.S)
    m = re.search(r'<poem>(.*?)</poem>', t, flags=re.S)
    if m:
        t = m.group(1)
    # 模板替换（金镜式经页面无嵌套模板，线性替换足够；残留则循环再清一遍）
    for _ in range(3):
        before = t
        t = re.sub(r'\{\{SK anchor\|([^{}]*)\}\}', r'\1', t)
        t = re.sub(r'\{\{SK notes\|([^{}]*)\}\}', r'〔\1〕', t)
        t = re.sub(r'\{\{SKchar\|[^{}]*\}\}', '□', t)
        t = re.sub(r'\{\{YL\|([^{}]*)\}\}', r'\1', t)
        t = re.sub(r'\{\{[^{}|]*\|([^{}]*)\}\}', r'\1', t)  # 其余单参模板取参数
        t = re.sub(r'\{\{[^{}]*\}\}', '', t)                 # 无参/版式模板删除
        if t == before:
            break
    t = re.sub(r'</?onlyinclude>', '', t)
    t = re.sub(r'\n{3,}', '\n\n', t).strip()
    return t


def main() -> None:
    offline = '--offline' in sys.argv
    chapters = []
    for name, title in PAGES:
        raw = fetch_wikitext(title, offline)
        text = clean(raw)
        leftover = len(re.findall(r'\{\{', text))
        assert leftover == 0, f'{name} 残留未清洗模板 {leftover} 处'
        assert len(text) > 500, f'{name} 文本异常短：{len(text)}'
        chapters.append({'卷': name, '维基文库页': title, '字数': len(text), '文': text})
        print(f'{name:4} {len(text):>6} 字  <- {title}')

    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {
        '书名': '太乙金鏡式經',
        '作者': '唐·王希明',
        '版本': '四庫全書本（欽定四庫全書·子部·術數類）',
        '来源': 'zh.wikisource.org（维基文库，公版）',
        '抓取日期': date.today().isoformat(),
        '生成器': 'scripts/gen_jinjing.py（勿手改本文件；重跑生成器同步维基文库校对更新）',
        '说明': '金镜积年流派（太乙金镜）第一手经典。四库本无标点，〔〕为馆臣注，□为四库缺字。',
        '卷': chapters,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8', newline='\n')
    total = sum(c['字数'] for c in chapters)
    print(f'\nOK -> {OUT}（{len(chapters)} 卷，共 {total} 字，{OUT.stat().st_size} bytes）')


if __name__ == '__main__':
    main()
