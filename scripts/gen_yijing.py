#!/usr/bin/env python3
"""生成 src/taiyi/yijing.ts —— 《周易》通行本 64 卦卦辞 + 384 爻辞（含乾用九/坤用六）。

数据源：Chinese Text Project (ctext.org) 权威公版经文 API
    https://api.ctext.org/gettext?urn=ctp:book-of-changes/<slug>
仅取核心经文（卦辞/爻辞），不含彖传/象传/文言等十翼注释。

用法：
    python scripts/gen_yijing.py          # 抓取（带本地缓存）并生成
    python scripts/gen_yijing.py --offline # 仅用已缓存 JSON 生成，不联网

抓取结果缓存在 scripts/.yijing_cache/，重跑不重复联网。
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'taiyi' / 'yijing.ts'
CACHE = Path(__file__).resolve().parent / '.yijing_cache'
API = 'https://api.ctext.org/gettext?urn=ctp:book-of-changes/'

# 王制序（King Wen）1..64：(繁体卦名, 简体卦名, 卦符, ctext slug)
# slug 经 ctext 目录页卦符 ䷀–䷿ 逐一核验（碰撞卦消歧：謙qian1/賁bi1/益yi1/困kun1/漸jian1/旅lu1/節jie1）
HEX = [
    ('乾', '乾', '䷀', 'qian'), ('坤', '坤', '䷁', 'kun'), ('屯', '屯', '䷂', 'zhun'),
    ('蒙', '蒙', '䷃', 'meng'), ('需', '需', '䷄', 'xu'), ('訟', '讼', '䷅', 'song'),
    ('師', '师', '䷆', 'shi'), ('比', '比', '䷇', 'bi'), ('小畜', '小畜', '䷈', 'xiao-xu'),
    ('履', '履', '䷉', 'lu'), ('泰', '泰', '䷊', 'tai'), ('否', '否', '䷋', 'pi'),
    ('同人', '同人', '䷌', 'tong-ren'), ('大有', '大有', '䷍', 'da-you'), ('謙', '谦', '䷎', 'qian1'),
    ('豫', '豫', '䷏', 'yu'), ('隨', '随', '䷐', 'sui'), ('蠱', '蛊', '䷑', 'gu'),
    ('臨', '临', '䷒', 'lin'), ('觀', '观', '䷓', 'guan'), ('噬嗑', '噬嗑', '䷔', 'shi-he'),
    ('賁', '贲', '䷕', 'bi1'), ('剝', '剥', '䷖', 'bo'), ('復', '复', '䷗', 'fu'),
    ('无妄', '无妄', '䷘', 'wu-wang'), ('大畜', '大畜', '䷙', 'da-xu'), ('頤', '颐', '䷚', 'yi'),
    ('大過', '大过', '䷛', 'da-guo'), ('坎', '坎', '䷜', 'kan'), ('離', '离', '䷝', 'li'),
    ('咸', '咸', '䷞', 'xian'), ('恆', '恒', '䷟', 'heng'), ('遯', '遁', '䷠', 'dun'),
    ('大壯', '大壮', '䷡', 'da-zhuang'), ('晉', '晋', '䷢', 'jin'), ('明夷', '明夷', '䷣', 'ming-yi'),
    ('家人', '家人', '䷤', 'jia-ren'), ('睽', '睽', '䷥', 'kui'), ('蹇', '蹇', '䷦', 'jian'),
    ('解', '解', '䷧', 'jie'), ('損', '损', '䷨', 'sun'), ('益', '益', '䷩', 'yi1'),
    ('夬', '夬', '䷪', 'guai'), ('姤', '姤', '䷫', 'gou'), ('萃', '萃', '䷬', 'cui'),
    ('升', '升', '䷭', 'sheng'), ('困', '困', '䷮', 'kun1'), ('井', '井', '䷯', 'jing'),
    ('革', '革', '䷰', 'ge'), ('鼎', '鼎', '䷱', 'ding'), ('震', '震', '䷲', 'zhen'),
    ('艮', '艮', '䷳', 'gen'), ('漸', '渐', '䷴', 'jian1'), ('歸妹', '归妹', '䷵', 'gui-mei'),
    ('豐', '丰', '䷶', 'feng'), ('旅', '旅', '䷷', 'lu1'), ('巽', '巽', '䷸', 'xun'),
    ('兌', '兑', '䷹', 'dui'), ('渙', '涣', '䷺', 'huan'), ('節', '节', '䷻', 'jie1'),
    ('中孚', '中孚', '䷼', 'zhong-fu'), ('小過', '小过', '䷽', 'xiao-guo'),
    ('既濟', '既济', '䷾', 'ji-ji'), ('未濟', '未济', '䷿', 'wei-ji'),
]


# 经文爻辞行以「爻题＋：/，」开头；十翼小象以引文开头、文言以「爻题曰」开头，故 [：，] 分隔可排除
YAO_ANCHOR = re.compile(r'^(初九|初六|九二|六二|九三|六三|九四|六四|九五|六五|上九|上六|用九|用六)[：，]')


def _http(url: str) -> str:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (react-taiyi-gen)'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode('utf-8', errors='replace')


def html_fulltext(trad: str, sym: str, slug: str) -> dict:
    """HTML 页回退提取（API 限流时用）：经文爻辞按爻题锚定，与 API fulltext 逐字等价
    （已在 乾/咸 上比对验证）。仅经文，排除彖/象/文言。"""
    html = _http(f'https://ctext.org/book-of-changes/{slug}/zh')
    cells = re.findall(r'>([^<>]+?)</td>', html)
    gua = next((c for c in cells if c.startswith(trad + '：') or c.startswith(trad + '，')), None)
    if gua is None:  # 卦名即卦辞首字者（履/同人…），卦辞行不以「卦名：」起，取含卦符符号后的首个非爻题句
        gua = next((c for c in cells if c and not YAO_ANCHOR.match(c) and c.startswith(trad)), None)
    yao, seen = [], set()
    for c in cells:
        if YAO_ANCHOR.match(c) and c[:2] not in seen:
            seen.add(c[:2])
            yao.append(c)
    if gua is None or not yao:
        raise SystemExit(f'HTML 提取失败 {slug}: gua={gua!r} yao={len(yao)}')
    return {'fulltext': [gua] + yao, 'title': sym + trad, 'via': 'html'}


def fetch(trad: str, sym: str, slug: str, offline: bool) -> dict:
    CACHE.mkdir(exist_ok=True)
    cf = CACHE / f'{slug}.json'
    if cf.exists():
        return json.loads(cf.read_text(encoding='utf-8'))
    if offline:
        raise SystemExit(f'缺少缓存且 --offline：{slug}')
    # 先试 API（返回干净 fulltext）；限流则回退 HTML（已验证与 API 等价）
    for attempt in range(3):
        try:
            data = json.loads(_http(API + slug))
            if 'error' in data:
                code = data['error'].get('code', '?')
                print(f'  … {slug} API 限流({code})，回退 HTML 页提取', file=sys.stderr)
                data = html_fulltext(trad, sym, slug)
            cf.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
            time.sleep(0.8)
            return data
        except SystemExit:
            raise
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                raise SystemExit(f'抓取失败 {slug}: {e}')
            time.sleep(3)
    raise SystemExit('unreachable')


# 爻题固定集（ctext 在爻题后用「：」或「，」分隔，不一致，故按爻题正则切分）
YAO_RE = re.compile(r'^(初九|初六|九二|六二|九三|六三|九四|六四|九五|六五|上九|上六|用九|用六)[：，]?(.*)$')


def parse(trad: str, sym: str, full: list[str]) -> tuple[str, list[dict]]:
    """fulltext[0]=卦辞（多带「卦名：」前缀）；其余=爻题+爻辞。"""
    # 卦辞：卦名作标签时（「卦名：」或「卦名，」，ctext 两种分隔皆有，如乾用：、咸用，）剥离卦名+分隔符；
    # 「卦名即卦辞首字」的卦（履虎尾/同人于野/否之匪人/艮其背…，卦名后直接接正文无分隔）整条即卦辞
    head = full[0].strip()
    if head[:len(trad) + 1] in (trad + '：', trad + '，'):
        gua_ci = head[len(trad) + 1:].strip()
    else:
        gua_ci = head

    yao = []
    for entry in full[1:]:
        m = YAO_RE.match(entry.strip())
        if not m:
            raise SystemExit(f'{trad}: 爻题无法识别: {entry!r}')
        yao.append({'name': m.group(1), 'text': m.group(2).strip()})
    return gua_ci, yao


def ts(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def main() -> None:
    offline = '--offline' in sys.argv
    rows = []
    for num, (trad, simp, sym, slug) in enumerate(HEX, 1):
        data = fetch(trad, sym, slug, offline)
        title = data.get('title', '')  # 形如 "䷀乾"
        if sym not in title:
            raise SystemExit(f'{trad}({slug}): 卦符核验失败，title={title!r} 期望含 {sym}')
        gua_ci, yao = parse(trad, sym, data['fulltext'])
        # 结构不变量：乾/坤 6 爻 + 用九/用六 = 7；其余 6 爻
        expect = 7 if trad in ('乾', '坤') else 6
        if len(yao) != expect:
            raise SystemExit(f'{trad}: 爻数 {len(yao)} ≠ 期望 {expect}')
        rows.append((num, trad, simp, sym, gua_ci, yao))
        print(f'{num:2} {sym}{trad} 卦辞{len(gua_ci)}字 爻{len(yao)}')

    lines = [
        '/**',
        ' * 《周易》通行本六十四卦：卦辞 + 三百八十四爻辞（含乾「用九」、坤「用六」）。',
        ' *',
        ' * 数据源：Chinese Text Project (ctext.org) 公版经文 API，仅取核心经文（卦辞/爻辞），',
        ' * 不含彖传/象传/文言等十翼注释。由 scripts/gen_yijing.py 生成，勿手改；',
        ' * 重新生成：python scripts/gen_yijing.py（王制序，卦符 ䷀–䷿ 逐卦核验）。',
        ' *',
        ' * 用途：AI 导出时为盘面/皇极/流卦/命法出现的每个卦与动爻附上经文原文，',
        ' * 抑制 LLM 背诵爻辞时的错位串卦（反幻觉）。',
        ' */',
        '',
        'export interface YaoCi {',
        '  /** 爻题，如「初九」「用九」 */',
        '  name: string;',
        '  /** 爻辞原文 */',
        '  text: string;',
        '}',
        '',
        'export interface Hexagram {',
        '  /** 王制序 1..64 */',
        '  num: number;',
        '  /** 繁体卦名（与 GUA_64 一致） */',
        '  name: string;',
        '  /** 简体卦名 */',
        '  nameSimp: string;',
        '  /** 卦符 ䷀..䷿ */',
        '  symbol: string;',
        '  /** 卦辞（不含卦名前缀） */',
        '  guaCi: string;',
        '  /** 爻辞（乾/坤为 7 条，含用九/用六；其余 6 条） */',
        '  yao: YaoCi[];',
        '}',
        '',
        'const HEXAGRAMS: Hexagram[] = [',
    ]
    for num, trad, simp, sym, gua_ci, yao in rows:
        yao_ts = ', '.join(f'{{ name: {ts(y["name"])}, text: {ts(y["text"])} }}' for y in yao)
        lines.append(
            f'  {{ num: {num}, name: {ts(trad)}, nameSimp: {ts(simp)}, symbol: {ts(sym)}, '
            f'guaCi: {ts(gua_ci)}, yao: [{yao_ts}] }},'
        )
    lines += [
        '];',
        '',
        '/** 卦名（繁/简）与卦符 → 卦 的查表（键含繁体名、简体名、卦符） */',
        'const INDEX: Record<string, Hexagram> = {};',
        'for (const h of HEXAGRAMS) {',
        '  INDEX[h.name] = h;',
        '  INDEX[h.nameSimp] = h;',
        '  INDEX[h.symbol] = h;',
        '}',
        '',
        'export const YIJING_HEXAGRAMS = HEXAGRAMS;',
        '',
        '/**',
        ' * 按卦名或卦符取卦（容错：剥离卦符、空白、括注，繁简通吃）。',
        ' * 接受如「乾」「乾䷀」「䷀乾」「乾卦」等形态；查无返回 null。',
        ' */',
        '// 卦名异体字归一（無→无：卦25「无妄」经文用「无」，而 yhys 皇极卦名用繁体「無」）',
        'const normalizeGua = (s: string): string => s.replace(/無/g, "\\u65E0");',
        '',
        'export function getHexagram(input: string | null | undefined): Hexagram | null {',
        '  if (!input) return null;',
        '  // 先试卦符直查',
        '  for (const ch of input) {',
        '    if (INDEX[ch] && ch >= "\\u4DC0" && ch <= "\\u4DFF") return INDEX[ch];',
        '  }',
        '  // 剥离非卦名字符（卦符/空白/标点/英数），保留 CJK 表意文字，并异体归一',
        '  const cjk = normalizeGua(input.replace(/[^\\u3400-\\u9FFF]/g, ""));',
        '  if (INDEX[cjk]) return INDEX[cjk];',
        '  // 退化：去掉尾「卦」字再试',
        '  const noGua = cjk.replace(/卦$/, "");',
        '  if (INDEX[noGua]) return INDEX[noGua];',
        '  // 两字卦名内含（如输入含多余字）',
        '  for (const h of HEXAGRAMS) {',
        '    if (cjk.includes(h.name) || cjk.includes(h.nameSimp)) return h;',
        '  }',
        '  return null;',
        '}',
        '',
        '/** 取指定卦的某爻辞（爻题如「初九」「六三」「用九」）；查无返回 null。 */',
        'export function getYaoCi(hexName: string, yaoName: string): YaoCi | null {',
        '  const h = getHexagram(hexName);',
        '  if (!h) return null;',
        '  return h.yao.find((y) => y.name === yaoName) ?? null;',
        '}',
        '',
    ]
    OUT.write_text('\n'.join(lines), encoding='utf-8', newline='\n')
    print(f'\nOK -> {OUT} ({OUT.stat().st_size} bytes, {len(rows)} 卦)')


if __name__ == '__main__':
    main()
