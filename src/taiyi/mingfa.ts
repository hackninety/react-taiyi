/**
 * 太乙命法核心（kintaiyi kintaiyi.py 命法函数群 + config 辅助函数移植）：
 * 命法积数、三才数、十二命宫、阳九/百六行限、受气干支、出身卦与流年卦链。
 * 解读文本（taiyi_life_dict / mingfa 歌诀）不在此列，属内容层。
 */
import {
  DI_ZHI, GUA_64, WUXING_TO_NUM, GANZHI_NUM, GANZHI_PLACE, BAILIU_WUXING_NUM,
  TWELVE_GONGS, JQ_ACCUM_VALUES, JIEQI_NAME, NAYIN_WUXING, ganzhiWuxing,
} from './constants';
import { jqCountDays } from './calendar';
import { rotate, mod, JIAZI } from './utils';
import { TaiyiEngine } from './engine';
import type { TaiyiInput } from './types';

export type Sex = '男' | '女';

export interface GuaValue {
  num: number;
  gua: string | null;
}

export interface MingfaResult {
  sex: Sex;
  /** 命法积数（太乙人道命法积日数） */
  lifeAccum: number;
  /** 三才数 [天, 地, 人] */
  threeCai: [number, number, number];
  /** 十二命宫：地支 -> 宫名 */
  twelvePalaces: Record<string, string>;
  /** 阳九行限：[年龄段, 地支] 序列 */
  yangjiuXingxian: Array<[string, string]>;
  /** 百六行限 */
  bailiuXingxian: Array<[string, string]>;
  /** 受气数 */
  souqiNum: number;
  /** 受气干支 */
  shouqiGanzhi: string;
  /** 出身卦 */
  lifeStartGua: GuaValue;
  /** 值年卦（按 asOf 岁数推） */
  yearGua: GuaValue;
  monthGua: GuaValue;
  dayGua: GuaValue;
  hourGua: GuaValue;
  minuteGua: GuaValue;
}

/** kintaiyi config.generate_ranges：年龄段标签序列 */
function generateRanges(start: number, n: number, numRanges: number): string[] {
  const ranges: string[] = [`1-${start}`];
  let s = start;
  for (let i = 0; i < numRanges; i++) {
    const end = s + n - 1;
    ranges.push(`${s + 1}-${end + 1}`);
    s = end + 1;
  }
  return ranges;
}

function stemBranchNum(ch: string): number {
  return WUXING_TO_NUM[ganzhiWuxing(ch) ?? ''] ?? 0;
}

function nayinNum(gz: string): number {
  return WUXING_TO_NUM[NAYIN_WUXING.get(gz) ?? ''] ?? 0;
}

function guaOf(num: number): GuaValue {
  return { num, gua: num >= 1 && num <= 64 ? GUA_64[num - 1] : null };
}

/**
 * 流年卦链：num 原值沿链累加（不取模），仅取卦名时 >64 才 %64
 * （%64 为 0 时源实现无卦）。
 */
function chainGua(num: number): GuaValue {
  if (num > 64) {
    const r = num % 64;
    return { num, gua: r >= 1 ? GUA_64[r - 1] : null };
  }
  return guaOf(num);
}

export function calculateMingfa(
  input: TaiyiInput,
  sex: Sex,
  /** 流年卦推算基准日（默认今天；对照测试传固定日期） */
  asOf: { year: number; month: number; day: number } = (() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  })(),
): MingfaResult {
  const { year, month, day, hour, minute } = input;
  const e = new TaiyiEngine(year, month, day, hour, minute);
  const gz = e.gangzhi();
  const lunar = e.lunar();

  // —— 命法积数（kintaiyi taiyi_life_accum） ——
  const yearValue = 126944450 + Math.floor((year - 1564) / 60) * 3145500;
  const jiaziAccum = (JIAZI.indexOf(gz[0]) + 1) * 3652425;
  const jq = e.jieqi();
  const jqAccum = new Map(rotate(JIEQI_NAME, '冬至').map((n, i) => [n, JQ_ACCUM_VALUES[i]])).get(jq) ?? 0;
  const days = jqCountDays(year, month, day, hour, minute);
  const lifeAccum = Math.floor((jiaziAccum + yearValue + jqAccum + days * 10000) / 10000);

  // —— 三才数（kintaiyi three_cai_num；地人同数为源实现语义） ——
  const sky = lifeAccum % 720;
  const earth = sky % 72;
  const ppl = earth % 72;

  // —— 十二命宫（kintaiyi _twelve_palace_map） ——
  const yz = gz[0][1];
  const mz = gz[1][1];
  const reversedZhi = [...DI_ZHI].reverse();
  const yinyang = DI_ZHI.indexOf(yz) % 2 === 0 ? '陽' : '陰';
  const direction = (sex === '男') === (yinyang === '陽') ? '順' : '逆';
  const zhiNum = (z: string) => DI_ZHI.indexOf(z) + 1;
  const yzArrange = rotate(DI_ZHI, yz)[zhiNum(yz) - 1];
  const mzArrange = rotate(DI_ZHI, yzArrange)[zhiNum(mz) - 1];
  const mzArrangeR = rotate(reversedZhi, yzArrange)[zhiNum(mz) - 1];
  const arrangeList = direction === '順' ? rotate(DI_ZHI, mzArrangeR) : rotate(DI_ZHI, mzArrange);
  const twelvePalaces: Record<string, string> = {};
  arrangeList.forEach((z, i) => { twelvePalaces[z] = TWELVE_GONGS[i]; });

  // —— 阳九行限（kintaiyi yangjiu_xingxian） ——
  const mGan = gz[1][0];
  const yjNum = GANZHI_NUM[mGan];
  const yjPlace = GANZHI_PLACE[mGan];
  const yjBranches = sex === '男' ? rotate(DI_ZHI, yjPlace) : rotate(reversedZhi, yjPlace);
  const yangjiuXingxian = generateRanges(yjNum, 10, 11)
    .map((r, i) => [r, yjBranches[i]] as [string, string])
    .filter(([, b]) => b !== undefined);

  // —— 受气数 / 受气干支（kintaiyi souqi_num / shouqi_ganzhi） ——
  const souqiNum = (
    stemBranchNum(gz[2][0]) + stemBranchNum(gz[2][1]) +
    stemBranchNum(gz[3][0]) + stemBranchNum(gz[3][1]) +
    nayinNum(gz[2]) + nayinNum(gz[3]) + 55
  ) % 60;
  const shouqiGanzhi = JIAZI[mod(JIAZI.indexOf(gz[2]) - (souqiNum || 60) + 1, 60)];

  // —— 百六行限（kintaiyi bailiu_xingxian） ——
  const blPlace = GANZHI_PLACE[shouqiGanzhi[0]];
  const blNum = BAILIU_WUXING_NUM[ganzhiWuxing(shouqiGanzhi[0]) ?? ''] ?? 1;
  const blBranches = sex === '男' ? rotate(DI_ZHI, blPlace) : rotate(reversedZhi, blPlace);
  const bailiuXingxian = generateRanges(blNum, 10, 11)
    .map((r, i) => [r, blBranches[i]] as [string, string])
    .filter(([, b]) => b !== undefined);

  // —— 出身卦（kintaiyi life_start_gua）：四柱干支纳音策数总和 ——
  const pillarSum = (p: string) => stemBranchNum(p[0]) + stemBranchNum(p[1]) + nayinNum(p);
  const startNum = (pillarSum(gz[0]) + pillarSum(gz[1]) + pillarSum(gz[2]) + pillarSum(gz[3]) + 55) % 64;
  const lifeStartGua = guaOf(startNum);

  // —— 流年卦链（kintaiyi year_gua/month_gua/day_gua/hour_gua/minute_gua） ——
  const age = asOf.year - year - ((asOf.month * 100 + asOf.day) < (month * 100 + day) ? 1 : 0);
  const yearGua = chainGua(lifeStartGua.num + age);
  const monthGua = chainGua(yearGua.num + 2 + lunar.month);
  const dayGua = chainGua(monthGua.num + (JIAZI.indexOf(gz[2]) + 1));
  const hourGua = chainGua(dayGua.num + (DI_ZHI.indexOf(gz[3][1]) + 1));
  const minuteGua = chainGua(hourGua.num + (JIAZI.indexOf(gz[4]) + 1));

  return {
    sex,
    lifeAccum,
    threeCai: [sky, earth, ppl],
    twelvePalaces,
    yangjiuXingxian,
    bailiuXingxian,
    souqiNum,
    shouqiGanzhi,
    lifeStartGua,
    yearGua,
    monthGua,
    dayGua,
    hourGua,
    minuteGua,
  };
}
