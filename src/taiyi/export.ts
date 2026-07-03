/**
 * 排盘结果导出：JSON 与 Markdown（便于复制给 AI 分析或存档）。
 *
 * 为便于 AI 完整、准确地推理，导出时额外提供两块预处理信息：
 * - meta：口径明细，尤其标注**太乙积年流派**与**皇极岁卦流派**，防止多流派数据混用错乱；
 * - analysisContext：程序预先归集的断事要点，作为 AI 的推理抓手（细节仍以原始字段为准）。
 */
import type { AcumYear, GongName, TaiyiResult } from './types';
import type { MingfaResult } from './mingfa';
import type { SolarTimeInfo } from './solartime';
import type { HuangjiInfo, HuangjiSchool } from './huangji';
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

/** 四流派太乙积年常数（与 engine TN_DICT 一致，导出时注明以防混用） */
const ACUM_CONST: Record<AcumYear, number> = { 0: 10153917, 1: 1936557, 2: 10154193, 3: 10153917 };

/** 皇极流派简明校验标签 */
const schoolTag = (s: HuangjiSchool) => (s === '黄畿' ? '已校订原文' : '未校订·仅供参考');

const gongText = (n: number) => `${'一二三四五六七八九'[n - 1]}宮（${NUM_TO_GONG[n]}）`;
const hx = (h: { name: string; symbol: string }) => `${h.name}${h.symbol}`;

function solarText(solarTime?: SolarTimeInfo | null): string {
  if (solarTime?.applied) {
    const sign = solarTime.offsetMinutes! >= 0 ? '+' : '';
    return `已按 ${solarTime.place}（东经 ${solarTime.longitude}°）校正 ${sign}${solarTime.offsetMinutes} 分钟起局`;
  }
  return '未校正（按北京时间 UTC+8 起局）';
}

/** 口径明细：AI 读盘前先看这里，重点是流派标注，防止不同流派数据错乱 */
export function buildMeta({ result: r, mingfa, planets, solarTime, huangji }: ExportPayload) {
  const modules = ['太乙主盘'];
  if (mingfa) modules.push('太乙命法');
  if (planets) modules.push('十精（七曜落位）');
  if (huangji) modules.push('皇极经世历');

  return {
    应用: 'react-taiyi 太乙神数排盘',
    太乙计式: r.jiName,
    太乙积年流派: `${r.methodName}（积年常数 ${ACUM_CONST[r.input.acumYear].toLocaleString('en-US')}）`,
    真太阳时: solarText(solarTime),
    ...(huangji
      ? { 皇极岁卦流派: `${huangji.school}（${schoolTag(huangji.school)}；${huangji.schoolNote}）` }
      : {}),
    启用模块: modules,
    流派声明:
      '本盘涉及多套流派：太乙积年流派决定积数与全盘布局、皇极岁卦流派决定年卦口径，' +
      '不同流派结果不可混用。本导出所有数据均按上述指定流派计算，AI 分析时请锁定该口径，勿与其他流派数据交叉。',
    免责: '太乙神数属传统术数文化，本数据仅供文化研究与学习参考，不构成现实决策依据。',
  };
}

/** 断事要点预归集：给 AI 的推理抓手 */
export function buildAnalysisContext({ result: r, mingfa, solarTime, huangji }: ExportPayload) {
  const ctx: Record<string, unknown> = {};

  ctx.盘序须知 =
    `本盘为太乙神数【${r.jiName} · ${r.methodName}】，以下为程序预先归集的断读要点，` +
    '仅作抓手，落宫、算数等细节以 result 原始字段为准。';

  ctx.时空 =
    `公历 ${r.input.year}-${String(r.input.month).padStart(2, '0')}-${String(r.input.day).padStart(2, '0')} ` +
    `${String(r.input.hour).padStart(2, '0')}:${String(r.input.minute).padStart(2, '0')}；` +
    `真太阳时${solarText(solarTime)}；四柱 ${r.ganzhi[0]}年 ${r.ganzhi[1]}月 ${r.ganzhi[2]}日 ${r.ganzhi[3]}时；` +
    `农历 ${r.lunar.text}；节气 ${r.jieqi}。`;

  ctx.太乙盘要 =
    `${r.kook.text}（${r.kook.sanYear}）；太乙落${gongText(r.taiyiGong)}` +
    `${r.homeAwayHint ? `，${r.homeAwayHint}` : ''}；` +
    `文昌（天目）在${r.skyEyes}${r.skyEyesDesc ? `（${r.skyEyesDesc}）` : ''}，始击（客目）在${r.shiJi}，定目在${r.dingMu}。`;

  ctx.主客态势 =
    `主算 ${r.homeSuan.value}（${r.homeSuan.descriptions.join('、') || '中平'}），主将${gongText(r.homeGeneral)}；` +
    `客算 ${r.awaySuan.value}（${r.awaySuan.descriptions.join('、') || '中平'}），客将${gongText(r.awayGeneral)}；` +
    `定算 ${r.setSuan.value}。三门：${r.threeDoors}五将：${r.fiveGenerals}` +
    `${r.homeAwayRelation ? ` 主客相关：${r.homeAwayRelation}。` : ''}${r.guDan ? ` ${r.guDan}` : ''}`;

  ctx.格局 = Object.keys(r.geJu).map((k) => `${k}：${r.geJu[k]}`);

  ctx.值卦与周期 =
    `值年卦 ${r.yearGua}、值日卦 ${r.dayGua}、值时卦 ${r.hourGua}；阳九在${r.yangjiu}、百六在${r.bailiu}。`;

  if (mingfa) {
    ctx.命法要 =
      `${mingfa.sex}命；命法积数 ${mingfa.lifeAccum}，三才数（天/地/人）${mingfa.threeCai.join('/')}；` +
      `出身卦 ${mingfa.lifeStartGua.gua ?? '—'}；受气干支 ${mingfa.shouqiGanzhi}；` +
      `流年卦链 年${mingfa.yearGua.gua ?? '—'}→月${mingfa.monthGua.gua ?? '—'}→日${mingfa.dayGua.gua ?? '—'}→时${mingfa.hourGua.gua ?? '—'}→分${mingfa.minuteGua.gua ?? '—'}；` +
      '十二命宫、阳九/百六行限详见 mingfa 字段。';
  }

  if (huangji) {
    ctx.皇极大势 =
      `当今${huangji.hui.branch}会（第 ${huangji.hui.ordinal} 会，辟卦 ${hx(huangji.hui.hexagram)}）、` +
      `元内第 ${huangji.yun.global} 运（运卦 ${hx(huangji.yun.hexagram)}）、第 ${huangji.shi.global} 世（世卦 ${hx(huangji.shi.hexagram)}）；` +
      `本年岁卦（${huangji.school}派）${hx(huangji.sui)}` +
      `${huangji.suiOther.hexagram.name !== huangji.sui.name ? `（${huangji.suiOther.school}派作 ${hx(huangji.suiOther.hexagram)}）` : `（${huangji.suiOther.school}派同）`}。` +
      `皇极经世以元会运世观千年之势，可为太乙断局提供大时代背景；${huangji.school}派${huangji.schoolNote}。`;
  }

  return ctx;
}

export function toJSONText(payload: ExportPayload): string {
  const { result, mingfa, planets, solarTime, huangji } = payload;
  return JSON.stringify(
    {
      app: 'react-taiyi',
      exportedAt: new Date().toISOString(),
      meta: buildMeta(payload),
      analysisContext: buildAnalysisContext(payload),
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

const BOARD_ORDER: GongName[] = [
  '巳', '午', '未', '坤', '申', '酉', '戌', '乾', '亥', '子', '丑', '艮', '寅', '卯', '辰', '巽', '中',
];

export function toMarkdown(payload: ExportPayload): string {
  const { result: r, mingfa, planets, solarTime, huangji } = payload;
  const L: string[] = [];
  const { input } = r;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');

  L.push(`# 太乙神数排盘 · ${r.jiName} · ${r.methodName}`);
  L.push('');

  // 排盘明细（流派口径优先，防错乱）
  const meta = buildMeta(payload);
  L.push('## 排盘明细');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|---|');
  L.push(`| 太乙计式 | ${meta.太乙计式} |`);
  L.push(`| 太乙积年流派 | ${meta.太乙积年流派} |`);
  L.push(`| 真太阳时 | ${meta.真太阳时} |`);
  if (huangji) L.push(`| 皇极岁卦流派 | ${huangji.school}派 · ${schoolTag(huangji.school)} |`);
  L.push(`| 启用模块 | ${meta.启用模块.join('、')} |`);
  L.push('');
  L.push(`> ⚠️ ${meta.流派声明}`);
  L.push('');

  // 断事要点归集
  const ctx = buildAnalysisContext(payload);
  L.push('## 断事要点归集（程序预读，供 AI 抓手）');
  L.push('');
  L.push(`- **太乙盘要**：${ctx.太乙盘要}`);
  L.push(`- **主客态势**：${ctx.主客态势}`);
  L.push(`- **格局**：${(ctx.格局 as string[]).join('；') || '主客清明'}`);
  L.push(`- **值卦与周期**：${ctx.值卦与周期}`);
  if (mingfa) L.push(`- **命法要**：${ctx.命法要}`);
  if (huangji) L.push(`- **皇极大势**：${ctx.皇极大势}`);
  L.push('');

  L.push('## 起局与局式');
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
    L.push('## 皇极经世历');
    L.push('');
    L.push(`- 岁卦流派：**${huangji.school}派** · ${schoolTag(huangji.school)} — ${huangji.schoolNote}`);
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
  L.push('*由 react-taiyi 生成；算法参照 kentang2017/kintaiyi（MIT）与 wlhyl/taiyipython；皇极经世历引用 yhys-core（github:hackninety/react-yhys）。*');
  return L.join('\n');
}
