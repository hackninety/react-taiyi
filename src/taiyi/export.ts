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
import type { HuangjiInfo } from './huangji';
import { formatGregorianYearCn } from './huangji';
import { SIXTEEN_GOD, NUM_TO_GONG } from './constants';

export interface ExportPayload {
  /** 太乙主盘；超出太乙历法范围（600–9999 外的皇极全跨度年份）时为空 */
  result?: TaiyiResult | null;
  mingfa?: MingfaResult | null;
  /** 十精：地支 -> 行星 */
  planets?: Record<string, string[]> | null;
  /** 真太阳时校正信息 */
  solarTime?: SolarTimeInfo | null;
  /** 皇极经世历 */
  huangji?: HuangjiInfo | null;
  /** 仅皇极模式下的起局输入（公历，天文纪年） */
  huangjiOnlyInput?: { year: number; month: number; day: number; hour: number; minute: number } | null;
  /** kintaiyi 全解释盘（后端 pan() 直出，中文键与上游一致；后端不可用时为空） */
  kintaiyiPan?: Record<string, unknown> | null;
}

/** 四流派太乙积年常数（与 engine TN_DICT 一致，导出时注明以防混用） */
const ACUM_CONST: Record<AcumYear, number> = { 0: 10153917, 1: 1936557, 2: 10154193, 3: 10153917 };

/** 皇极流派简明校验标签 */

const gongText = (n: number) => `${'一二三四五六七八九'[n - 1]}宮（${NUM_TO_GONG[n]}）`;
const hx = (h: { name: string; symbol: string }) => `${h.name}${h.symbol}`;

/** 皇极大势一句话归集（主盘/仅皇极两种模式共用） */
function huangjiSummary(huangji: HuangjiInfo): string {
  return (
    `${formatGregorianYearCn(huangji.huangjiYear - 67017)}值${huangji.hui.branch}会（第 ${huangji.hui.ordinal} 会，辟卦 ${hx(huangji.hui.hexagram)}）、` +
    `元内第 ${huangji.yun.global} 运（运卦 ${hx(huangji.yun.hexagram)}）、第 ${huangji.shi.global} 世（世卦 ${hx(huangji.shi.hexagram)}）、世内第 ${huangji.shi.yearInShi} 年；` +
    `本年岁卦（黄畿派）${hx(huangji.sui)}；` +
    `十年卦 ${hx(huangji.decade.hexagram)}；` +
    `皇极岁内第 ${huangji.dayOfYear} 日 —— 月经卦 ${hx(huangji.yueJing)}、旬纬卦 ${hx(huangji.xunWei)}、日卦 ${hx(huangji.day)}、时经卦 ${hx(huangji.shiJing)}（${huangji.subYearNote}）。` +
    `皇极经世以元会运世观千年之势，可为断局提供大时代背景；${huangji.algorithmNote}。`
  );
}

function solarText(solarTime?: SolarTimeInfo | null): string {
  if (solarTime?.applied) {
    const sign = solarTime.offsetMinutes! >= 0 ? '+' : '';
    const tzMin = solarTime.tzOffsetMinutes ?? 0;
    const tzSign = tzMin >= 0 ? '+' : '-';
    const tzAbs = Math.abs(tzMin);
    const tzStr = `UTC${tzSign}${Math.floor(tzAbs / 60)}${tzAbs % 60 ? `:${String(tzAbs % 60).padStart(2, '0')}` : ''}`;
    return `输入时间按浏览器时区 ${solarTime.timezone ?? ''}（${tzStr}）解释，已按 ${solarTime.place}（经度 ${solarTime.longitude}°）校正 ${sign}${solarTime.offsetMinutes} 分钟起局`;
  }
  return '未校正（按浏览器本地时间起局）';
}

/** 口径明细结构（两种模式字段并集，未涉及的项为空） */
export interface ExportMeta {
  应用: string;
  太乙计式?: string;
  太乙积年流派?: string;
  历法口径?: string;
  真太阳时?: string;
  /** 仅皇极模式：太乙未出盘的说明 */
  太乙主盘?: string;
  皇极岁卦流派?: string;
  皇极月日时卦口径?: string;
  启用模块: string[];
  流派声明: string;
  免责: string;
}

/** 口径明细：AI 读盘前先看这里，重点是流派标注，防止不同流派数据错乱 */
export function buildMeta({ result: r, mingfa, planets, solarTime, huangji, kintaiyiPan }: ExportPayload): ExportMeta {
  const payloadHasPan = Boolean(kintaiyiPan && Object.keys(kintaiyiPan).length);
  const modules: string[] = [];
  if (r) modules.push('太乙主盘');
  if (mingfa) modules.push('太乙命法');
  if (planets) modules.push('十精（七曜落位）');
  if (huangji) modules.push('皇极经世历');
  if (payloadHasPan) modules.push('kintaiyi 全解释盘（統宗寶鑑诸卷）');

  return {
    应用: 'react-taiyi 太乙神数排盘',
    ...(r
      ? {
        太乙计式: r.jiName,
        太乙积年流派: `${r.methodName}（积年常数 ${ACUM_CONST[r.input.acumYear].toLocaleString('en-US')}）`,
        历法口径: r.calendarMode === '皇极拟推'
          ? '皇极拟推——四柱按纯干支算术＋天文节气推得（拟推格里历），农历为节气月建拟推，属现代拟推、非古历考据，不在黄金用例验证范围内'
          : '标准——lunar-typescript 历法，公元 600–9999 经黄金用例对照验证',
        真太阳时: solarText(solarTime),
      }
      : {
        太乙主盘: '未出盘——起局年份超出太乙历法验证范围（公元 600–9999），本导出仅含皇极经世历（一元全跨度：公元前 67016 — 公元 62583）',
      }),
    ...(huangji
      ? {
        皇极岁卦流派: `黄畿（已校订原文；${huangji.algorithmNote}）`,
        皇极月日时卦口径: `${huangji.subYearNote}（皇极岁内第 ${huangji.dayOfYear} 日）`,
      }
      : {}),
    启用模块: modules,
    流派声明:
      '本盘涉及多套流派：太乙积年流派决定积数与全盘布局、皇极岁卦流派决定年卦口径，' +
      '不同流派结果不可混用。本导出所有数据均按上述指定流派计算，AI 分析时请锁定该口径，勿与其他流派数据交叉。',
    免责: '太乙神数属传统术数文化，本数据仅供文化研究与学习参考，不构成现实决策依据。',
  };
}

/** 断事要点预归集：给 AI 的推理抓手 */
export function buildAnalysisContext({ result: r, mingfa, solarTime, huangji, huangjiOnlyInput }: ExportPayload) {
  const ctx: Record<string, unknown> = {};

  if (!r) {
    ctx.盘序须知 =
      '本导出为皇极经世历单独推算（起局年份超出太乙历法验证范围，太乙主盘未出盘）。' +
      '以下为程序预先归集的断读要点，细节以 huangji 原始字段为准。';
    if (huangjiOnlyInput) {
      const i = huangjiOnlyInput;
      ctx.时空 =
        `${formatGregorianYearCn(i.year)}${i.month}月${i.day}日 ` +
        `${String(i.hour).padStart(2, '0')}:${String(i.minute).padStart(2, '0')}（拟推格里历，天文纪年 ${i.year}）。`;
    }
    if (huangji) ctx.皇极大势 = huangjiSummary(huangji);
    return ctx;
  }

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
    ctx.皇极大势 = huangjiSummary(huangji);
  }

  return ctx;
}

export function toJSONText(payload: ExportPayload): string {
  const { result, mingfa, planets, solarTime, huangji, huangjiOnlyInput, kintaiyiPan } = payload;
  return JSON.stringify(
    {
      app: 'react-taiyi',
      exportedAt: new Date().toISOString(),
      meta: buildMeta(payload),
      analysisContext: buildAnalysisContext(payload),
      ...(solarTime?.applied ? { solarTime } : {}),
      ...(result ? { result } : {}),
      ...(huangjiOnlyInput ? { input: huangjiOnlyInput } : {}),
      ...(mingfa ? { mingfa } : {}),
      ...(planets ? { tenJing: planets } : {}),
      ...(huangji ? { huangji } : {}),
      // kintaiyi 全解释盘（《太乙統宗寶鑑》诸卷释文/統運/卦象/军事/博弈），繁体中文键为上游原样
      ...(kintaiyiPan ? { kintaiyiPan } : {}),
    },
    null,
    2,
  );
}

const BOARD_ORDER: GongName[] = [
  '巳', '午', '未', '坤', '申', '酉', '戌', '乾', '亥', '子', '丑', '艮', '寅', '卯', '辰', '巽', '中',
];

/** 皇极经世历 Markdown 段（主盘/仅皇极两种模式共用） */
function pushHuangjiSection(L: string[], huangji: HuangjiInfo): void {
  L.push('## 皇极经世历');
  L.push('');
  L.push(`- 岁卦流派：**黄畿派** · 已校订原文 — ${huangji.algorithmNote}`);
  L.push(`- 皇极纪年：第 ${huangji.huangjiYear} 年（元起于公元前 67017 年，一元 129,600 年），对应${formatGregorianYearCn(huangji.huangjiYear - 67017)}`);
  L.push(`- 会：${huangji.hui.branch}会（第 ${huangji.hui.ordinal} 会）· 辟卦 ${hx(huangji.hui.hexagram)} · 会内第 ${huangji.hui.yearInHui} 年`);
  L.push(`- 运：元内第 ${huangji.yun.global} 运 · 运卦 ${hx(huangji.yun.hexagram)}（主卦${huangji.yun.master.name}变${huangji.yun.yaoName}爻）· 运内第 ${huangji.yun.yearInYun} 年`);
  L.push(`- 世：元内第 ${huangji.shi.global} 世 · 世卦 ${hx(huangji.shi.hexagram)} · 世内第 ${huangji.shi.yearInShi} 年`);
  L.push(`- 十年卦：${hx(huangji.decade.hexagram)}（世卦变${huangji.decade.yaoName}爻，黄畿注口径）`);
  L.push(`- 岁卦（黄畿派）：${hx(huangji.sui)}`);
  L.push(`- 皇极岁内第 ${huangji.dayOfYear} 日 · 月经卦 / 旬纬卦 / 日卦 / 时经卦：${hx(huangji.yueJing)} / ${hx(huangji.xunWei)} / ${hx(huangji.day)} / ${hx(huangji.shiJing)}`);
  L.push(`  - 推法：${huangji.subYearNote}`);
  L.push('');
}

const MD_FOOTER = '*由 react-taiyi 生成；算法参照 kentang2017/kintaiyi（MIT）；皇极经世历引用 yhys-core（github:hackninety/react-yhys）。*';

/** 仅皇极模式（起局年份超出太乙历法范围）的 Markdown */
function toHuangjiOnlyMarkdown(payload: ExportPayload): string {
  const { huangji, huangjiOnlyInput } = payload;
  const L: string[] = [];
  const meta = buildMeta(payload);
  const yearCn = huangji ? formatGregorianYearCn(huangji.huangjiYear - 67017) : '';

  L.push(`# 皇极经世历 · ${yearCn}`);
  L.push('');
  L.push('## 推算明细');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|---|');
  L.push(`| 太乙主盘 | ${meta.太乙主盘 ?? '—'} |`);
  if (huangji) {
    L.push(`| 皇极岁卦流派 | 黄畿派 · 已校订原文 |`);
    L.push(`| 月日时卦口径 | ${meta.皇极月日时卦口径 ?? '—'} |`);
  }
  if (huangjiOnlyInput) {
    const i = huangjiOnlyInput;
    L.push(`| 起局时间 | ${yearCn}${i.month}月${i.day}日 ${String(i.hour).padStart(2, '0')}:${String(i.minute).padStart(2, '0')}（拟推格里历，天文纪年 ${i.year}） |`);
  }
  L.push('');
  L.push(`> ⚠️ ${meta.流派声明}`);
  L.push('');
  if (huangji) {
    L.push('## 大势归集（程序预读，供 AI 抓手）');
    L.push('');
    L.push(`- ${huangjiSummary(huangji)}`);
    L.push('');
    pushHuangjiSection(L, huangji);
  }
  L.push('---');
  L.push(MD_FOOTER);
  return L.join('\n');
}

export function toMarkdown(payload: ExportPayload): string {
  const { result: r, mingfa, planets, solarTime, huangji } = payload;
  if (!r) return toHuangjiOnlyMarkdown(payload);
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
  L.push(`| 历法口径 | ${meta.历法口径} |`);
  L.push(`| 真太阳时 | ${meta.真太阳时} |`);
  if (huangji) L.push(`| 皇极岁卦流派 | 黄畿派 · 已校订原文 |`);
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
    pushHuangjiSection(L, huangji);
  }

  L.push('---');
  L.push(MD_FOOTER);
  return L.join('\n');
}
