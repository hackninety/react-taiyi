/**
 * 排盘结果导出：JSON 与 Markdown（便于复制给 AI 分析或存档）。
 */
import type { GongName, TaiyiResult } from './types';
import type { MingfaResult } from './mingfa';
import type { SolarTimeInfo } from './solartime';
import type { HuangjiInfo } from './huangji';
import { SIXTEEN_GOD, NUM_TO_GONG } from './constants';

export interface ExportPayload {
  result: TaiyiResult;
  mingfa?: MingfaResult | null;
  /** 十精：地支 -> 行星 */
  planets?: Record<string, string[]> | null;
  /** 真太阳时校正信息 */
  solarTime?: SolarTimeInfo | null;
  /** 皇极经世历 */
  huangji?: HuangjiInfo | null;
}

export function toJSONText({ result, mingfa, planets, solarTime, huangji }: ExportPayload): string {
  return JSON.stringify(
    {
      app: 'react-taiyi',
      exportedAt: new Date().toISOString(),
      ...(solarTime?.applied ? { solarTime } : {}),
      result,
      ...(mingfa ? { mingfa } : {}),
      ...(planets ? { tenJing: planets } : {}),
      ...(huangji ? { huangji } : {}),
    },
    null,
    2,
  );
}

const gongText = (n: number) => `${'一二三四五六七八九'[n - 1]}宮（${NUM_TO_GONG[n]}）`;

const BOARD_ORDER: GongName[] = [
  '巳', '午', '未', '坤', '申', '酉', '戌', '乾', '亥', '子', '丑', '艮', '寅', '卯', '辰', '巽', '中',
];

export function toMarkdown({ result: r, mingfa, planets, solarTime, huangji }: ExportPayload): string {
  const L: string[] = [];
  const { input } = r;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');

  L.push(`# 太乙神数排盘 · ${r.jiName} · ${r.methodName}`);
  L.push('');
  L.push(`- 公历：${pad(input.year, 4)}-${pad(input.month)}-${pad(input.day)} ${pad(input.hour)}:${pad(input.minute)}`);
  if (solarTime?.applied) {
    L.push(`- 真太阳时：已按 ${solarTime.place}（东经 ${solarTime.longitude}°）校正 ${solarTime.offsetMinutes! >= 0 ? '+' : ''}${solarTime.offsetMinutes} 分钟，上行公历为校正后时间`);
  }
  L.push(`- 四柱：${r.ganzhi[0]}年 ${r.ganzhi[1]}月 ${r.ganzhi[2]}日 ${r.ganzhi[3]}时（分柱 ${r.ganzhi[4]}）`);
  L.push(`- 农历：${r.lunar.text} · 节气：${r.jieqi}`);
  L.push(`- 纪元：${r.jiyuan} · 积数：${r.kook.accNum}`);
  L.push(`- 局式：${r.kook.text}（${r.kook.sanYear}）${r.fiveYuanKook ? ` · 五子元局：${r.fiveYuanKook}` : ''}`);
  L.push(`- 太岁：${r.taisui} · 阳九：${r.yangjiu} · 百六：${r.bailiu}`);
  L.push('');

  L.push('## 落位与主客定算');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|---|');
  L.push(`| 太乙 | ${gongText(r.taiyiGong)}${r.homeAwayHint ? `，${r.homeAwayHint}` : ''} |`);
  L.push(`| 文昌（天目） | ${r.skyEyes}${r.skyEyesDesc ? `（${r.skyEyesDesc}）` : ''} |`);
  L.push(`| 始击（客目） | ${r.shiJi}，值宿 ${r.shiJiXiu} |`);
  L.push(`| 定目 | ${r.dingMu} |`);
  L.push(`| 计神 / 合神 | ${r.jiGod} / ${r.heGod} |`);
  L.push(`| 主算 | ${r.homeSuan.value}（${r.homeSuan.descriptions.join('、') || '—'}） |`);
  L.push(`| 主将 / 主参 | ${gongText(r.homeGeneral)} / ${gongText(r.homeVGen)} |`);
  L.push(`| 客算 | ${r.awaySuan.value}（${r.awaySuan.descriptions.join('、') || '—'}） |`);
  L.push(`| 客将 / 客参 | ${gongText(r.awayGeneral)} / ${gongText(r.awayVGen)} |`);
  L.push(`| 定算 | ${r.setSuan.value}（${r.setSuan.descriptions.join('、') || '—'}） |`);
  L.push(`| 定将 / 定参 | ${gongText(r.setGeneral)} / ${gongText(r.setVGen)} |`);
  L.push('');

  L.push('## 十六神式盘');
  L.push('');
  L.push('| 辰位 | 十六神 | 落宫星将 |');
  L.push('|---|---|---|');
  for (const chen of BOARD_ORDER) {
    const stars = r.board[chen];
    const planetsHere = chen !== '中' && planets?.[chen] ? planets[chen].map((p) => `${p}(星)`) : [];
    const all = [...stars, ...planetsHere];
    if (all.length === 0) continue;
    L.push(`| ${chen} | ${chen === '中' ? '中宫' : SIXTEEN_GOD[chen]} | ${all.join('、')} |`);
  }
  L.push('');

  L.push('## 九宫八门与旺衰');
  L.push('');
  L.push('| 宫 | 门 | 旺衰 |');
  L.push('|---|---|---|');
  for (const g of [1, 2, 3, 4, 6, 7, 8, 9]) {
    L.push(`| ${gongText(g)} | ${r.doors[g] ?? '—'} | ${r.wangZhuai[g] ?? '—'} |`);
  }
  L.push(`\n值事门：${r.zhishiDoor}门`);
  L.push('');

  L.push('## 格局');
  L.push('');
  for (const [name, desc] of Object.entries(r.geJu)) {
    L.push(`- **${name}**：${desc}`);
  }
  L.push('');
  L.push(`- 三门：${r.threeDoors}`);
  L.push(`- 五将：${r.fiveGenerals}`);
  if (r.homeAwayRelation) L.push(`- 主客相关：${r.homeAwayRelation}`);
  if (r.guDan) L.push(`- 孤单：${r.guDan}`);
  L.push('');

  L.push('## 神煞 · 卦');
  L.push('');
  L.push(`- 君基 / 臣基 / 民基：${r.kingBase} / ${r.officerBase} / ${r.pplBase}`);
  L.push(`- 四神 / 天乙 / 地乙：${r.fourGod} / ${r.skyYi} / ${r.earthYi}`);
  L.push(`- 直符 / 飞符：${r.zhiFu} / ${r.flyFu}`);
  L.push(`- 太岁禽星：${r.yearChin} · 廿八宿起 ${r.startXiu}`);
  L.push(`- 值年卦 ${r.yearGua} · 值日卦 ${r.dayGua} · 值时卦 ${r.hourGua}`);
  L.push('');

  if (planets) {
    L.push('## 十精（七曜落位）');
    L.push('');
    for (const [zhi, names] of Object.entries(planets)) {
      L.push(`- ${zhi}：${names.join('、')}`);
    }
    L.push('');
  }

  if (mingfa) {
    L.push('## 太乙命法');
    L.push('');
    L.push(`- 性别：${mingfa.sex} · 命法积数：${mingfa.lifeAccum} · 三才数（天/地/人）：${mingfa.threeCai.join(' / ')}`);
    L.push(`- 受气数：${mingfa.souqiNum} · 受气干支：${mingfa.shouqiGanzhi}`);
    L.push(`- 出身卦：${mingfa.lifeStartGua.gua ?? '—'}（${mingfa.lifeStartGua.num}）`);
    L.push(`- 流年卦链：年 ${mingfa.yearGua.gua ?? '—'} → 月 ${mingfa.monthGua.gua ?? '—'} → 日 ${mingfa.dayGua.gua ?? '—'} → 时 ${mingfa.hourGua.gua ?? '—'} → 分 ${mingfa.minuteGua.gua ?? '—'}`);
    L.push('');
    L.push('### 十二命宫');
    L.push('');
    L.push('| 地支 | 宫 |');
    L.push('|---|---|');
    for (const [zhi, gong] of Object.entries(mingfa.twelvePalaces)) {
      L.push(`| ${zhi} | ${gong} |`);
    }
    L.push('');
    L.push('### 阳九行限');
    L.push('');
    L.push(`| ${mingfa.yangjiuXingxian.map(([range]) => range).join(' | ')} |`);
    L.push(`|${mingfa.yangjiuXingxian.map(() => '---').join('|')}|`);
    L.push(`| ${mingfa.yangjiuXingxian.map(([, zhi]) => zhi).join(' | ')} |`);
    L.push('');
    L.push('### 百六行限');
    L.push('');
    L.push(`| ${mingfa.bailiuXingxian.map(([range]) => range).join(' | ')} |`);
    L.push(`|${mingfa.bailiuXingxian.map(() => '---').join('|')}|`);
    L.push(`| ${mingfa.bailiuXingxian.map(([, zhi]) => zhi).join(' | ')} |`);
    L.push('');
  }

  if (huangji) {
    const hx = (h: { name: string; symbol: string }) => `${h.name}${h.symbol}`;
    L.push('## 皇极经世历');
    L.push('');
    L.push(`- 皇极纪年：第 ${huangji.huangjiYear} 年（元起于公元前 67017 年，一元 129,600 年）`);
    L.push(`- 会：${huangji.hui.branch}会（第 ${huangji.hui.ordinal} 会）· 辟卦 ${hx(huangji.hui.hexagram)} · 会内第 ${huangji.hui.yearInHui} 年`);
    L.push(`- 运：元内第 ${huangji.yun.global} 运 · 运卦 ${hx(huangji.yun.hexagram)}（主卦${huangji.yun.master.name}变${huangji.yun.yaoName}爻）· 运内第 ${huangji.yun.yearInYun} 年`);
    L.push(`- 世：元内第 ${huangji.shi.global} 世 · 世卦 ${hx(huangji.shi.hexagram)} · 世内第 ${huangji.shi.yearInShi} 年`);
    L.push(`- 十年卦：${hx(huangji.decade.hexagram)}（世卦变${huangji.decade.yaoName}爻，黄畿注口径）`);
    L.push(`- 岁卦（${huangji.school}派）：${hx(huangji.sui)}（${huangji.suiOther.school}派作 ${hx(huangji.suiOther.hexagram)}）`);
    L.push(`- 月卦 / 日卦 / 时卦：${hx(huangji.month)} / ${hx(huangji.day)} / ${hx(huangji.hour)}`);
    L.push('');
  }

  L.push('---');
  L.push('*由 react-taiyi 生成；算法参照 kentang2017/kintaiyi（MIT）与 wlhyl/taiyipython；皇极经世历参照 react-yhys。*');
  return L.join('\n');
}
