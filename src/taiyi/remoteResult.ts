/**
 * 上游古歷盘装配：把 kintaiyi 后端的 /api/taiyi（chart）与 /api/taiyi/pan（pan）
 * 响应组装成本地 TaiyiResult，供公元 600 前（未启用皇极拟推时）直接以
 * **sxtwl 中国古历表**口径渲染盘面——与上游 demo 的公元前排盘同款同源。
 *
 * 字段全部取自上游输出（十六宮分佈=board、釋格局全文、八宮旺衰、断法文本等），
 * 本地不重推任何算法；仅 homeAwayHint（太乙在天外地内助主客）为固定宫位规则。
 */
import type { GongName, TaiyiInput, TaiyiResult } from './types';
import { JI_NAME, METHOD_NAME, NUM_TO_GONG } from './constants';
import type { PanData } from './pan';

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

function suan(chartVal: unknown, panPair: unknown): { value: number; descriptions: string[] } {
  const value = n(chartVal);
  const descriptions = Array.isArray(panPair) && Array.isArray((panPair as unknown[])[1])
    ? ((panPair as unknown[])[1] as unknown[]).map(String)
    : [];
  return { value, descriptions };
}

function numKeyed(v: unknown): Record<number, string> {
  const out: Record<number, string> = {};
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[Number(k)] = s(x);
  }
  return out;
}

/** chart=POST /api/taiyi 的 chart 字段；pan=POST /api/taiyi/pan 的 pan 字段 */
export function buildRemoteResult(
  input: TaiyiInput,
  chart: Record<string, unknown>,
  pan: PanData,
): TaiyiResult {
  const kookText = s(chart.kook_text);
  const ty = n(chart.ty);
  const gongName = NUM_TO_GONG[ty] ?? '';
  const lunarArr = Array.isArray(chart.lunar) ? (chart.lunar as unknown[]).map(n) : [0, 0, 0];
  const board: Record<string, string[]> = {};
  if (pan['十六宮分佈'] && typeof pan['十六宮分佈'] === 'object') {
    for (const [k, v] of Object.entries(pan['十六宮分佈'] as Record<string, unknown>)) {
      board[k] = Array.isArray(v) ? (v as unknown[]).map(String) : [];
    }
  }
  const geJu: Record<string, string> = {};
  if (pan['釋格局'] && typeof pan['釋格局'] === 'object') {
    for (const [k, v] of Object.entries(pan['釋格局'] as Record<string, unknown>)) geJu[k] = s(v);
  }

  return {
    input,
    jiName: JI_NAME[input.jiStyle],
    methodName: METHOD_NAME[input.acumYear],
    calendarMode: '上游古歷',
    ganzhi: Array.isArray(chart.gz) ? (chart.gz as unknown[]).map(String) : [],
    lunar: {
      year: lunarArr[0], month: lunarArr[1], day: lunarArr[2],
      text: `上游古歷（sxtwl）· ${lunarArr[0]}年${lunarArr[1]}月${lunarArr[2]}日`,
    },
    jieqi: s(chart.jq),
    jiyuan: s(chart.jiyuan),
    taisui: s(chart.taishui),
    kook: {
      text: kookText,
      num: n(chart.kook_num),
      dun: kookText.includes('陰') ? '陰' : '陽',
      sanYear: s(chart.kook_year),
      accNum: n(chart.acc),
    },
    fiveYuanKook: s(chart.five_yuan),
    yangjiu: s(chart.yangjiu),
    bailiu: s(chart.baliu),
    taiyiGong: ty,
    taiyiGongName: gongName,
    homeAwayHint: [1, 8, 3, 4].includes(ty)
      ? `太乙在${gongName}，助主。`
      : [9, 2, 6, 7].includes(ty) ? `太乙在${gongName}，助客。` : '',
    skyEyes: s(chart.wc),
    skyEyesDesc: s(chart.wc_des),
    shiJi: s(chart.sf),
    shiJiXiu: s(chart.sf_num),
    dingMu: s(chart.se),
    heGod: s(chart.hegod),
    jiGod: s(chart.jigod),
    homeSuan: suan(chart.home_cal, pan['主算']),
    homeGeneral: n(chart.home_g),
    homeVGen: n(chart.home_v),
    awaySuan: suan(chart.away_cal, pan['客算']),
    awayGeneral: n(chart.away_g),
    awayVGen: n(chart.away_v),
    setSuan: suan(chart.set_cal, pan['定算']),
    setGeneral: n(chart.set_g),
    setVGen: n(chart.set_v),
    kingBase: s(chart.kingbase),
    officerBase: s(chart.officerbase),
    pplBase: s(chart.pplbase),
    fourGod: s(chart.fgd),
    skyYi: s(chart.skyyi),
    earthYi: s(chart.earthyi),
    zhiFu: s(chart.zhifu),
    flyFu: s(chart.flyfu),
    yearChin: s(chart.year_chin),
    startXiu: s(chart.sf_num),
    doors: numKeyed(chart.doors),
    zhishiDoor: s(pan['八門值事']),
    threeDoors: s(pan['推三門具不具']),
    fiveGenerals: s(pan['推五將發不發']),
    homeAwayRelation: s(pan['推主客相闗法']),
    guDan: s(pan['推孤單以占成敗']),
    yearGua: s(chart.yeargua),
    dayGua: s(chart.daygua),
    hourGua: s(chart.hourgua),
    geJu,
    board: board as Record<GongName, string[]>,
    wangZhuai: numKeyed(pan['八宮旺衰']),
  };
}
