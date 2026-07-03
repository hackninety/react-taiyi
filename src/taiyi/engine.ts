/**
 * 太乙神数排盘引擎。
 * 算法主体移植自 kentang2017/kintaiyi（MIT，kintaiyi.py），
 * 与 wlhyl/taiyipython 的推导式实现交叉核对；
 * 为可与 kintaiyi 黄金用例逐字段对照，边界语义（截断、取余、空值跳过）保持一致。
 */
import {
  DI_ZHI, SIXTEEN, CHEN_TO_GONG, NUM_TO_GONG, NUM_RING, JC, JC1, TYJC, DOORS,
  SF_LIST, SKYEYES_DICT, SKYEYES_SUMMARY, FOUR_GOD, SKY_YI, EARTH_YI, ZHI_FU,
  OFFICER_BASE, EPOCH_GROUPS, JIYUAN_GROUPS, NUM_DICT, YANG_CAL, YING_CAL,
  GUA_64, SU, SU_GONG, ganzhiWuxing, wuxingRelation, NAYIN_WUXING,
  YANG_DUN_JIEQI, WANGZHUAI, WANGZHUAI_NUM, WANGZHUAI_JIEQI, JIEQI_WANG_GONG,
  JI_NAME, METHOD_NAME, toCn, FIVE_YUAN_HEADS, jiaziRing72,
} from './constants';
import { gangzhi, lunarDate, currentJieqi, daysBetween } from './calendar';
import { rotate, modOr, mod, divide, byIndex1, byCycle1, JIAZI } from './utils';
import type { AcumYear, Dun, GongName, JiStyle, KookInfo, SuanInfo, TaiyiInput, TaiyiResult } from './types';

/** 各流派太乙积年常数（kintaiyi accnum tndict） */
const TN_DICT: Record<AcumYear, number> = { 0: 10153917, 1: 1936557, 2: 10154193, 3: 10153917 };

const CNUM = [...'一二三四五六七八九十'];

/** Python 银行家舍入 */
function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

function jiaziIndex1(gz: string): number {
  const i = JIAZI.indexOf(gz);
  return i < 0 ? 1 : i + 1;
}

export class TaiyiEngine {
  private cache = new Map<string, unknown>();

  constructor(
    readonly year: number,
    readonly month: number,
    readonly day: number,
    readonly hour: number,
    readonly minute: number,
  ) {}

  private memo<T>(key: string, fn: () => T): T {
    if (this.cache.has(key)) return this.cache.get(key) as T;
    const v = fn();
    this.cache.set(key, v);
    return v;
  }

  gangzhi(): string[] {
    return this.memo('gz', () => gangzhi(this.year, this.month, this.day, this.hour, this.minute));
  }

  lunar() {
    return this.memo('lunar', () => lunarDate(this.year, this.month, this.day));
  }

  jieqi(): string {
    return this.memo('jq', () => currentJieqi(this.year, this.month, this.day, this.hour, this.minute));
  }

  /** 积数（kintaiyi accnum） */
  accNum(jiStyle: JiStyle, acumYear: AcumYear): number {
    return this.memo(`acc_${jiStyle}_${acumYear}`, () => {
      const tn = TN_DICT[acumYear];
      const lunar = this.lunar();
      const ly = lunar.year;

      if (jiStyle === 0) {
        return tn + ly + (ly < 0 ? 1 : 0);
      }
      if (jiStyle === 1) {
        const accYear = tn + ly - 1 + (ly < 0 ? 2 : 0);
        return accYear * 12 + 2 + lunar.month;
      }
      if (jiStyle === 2) {
        const diff = daysBetween(this.year, this.month, this.day, this.hour, 0, 1900, 6, 19);
        const configNum = 708011105 - acumYear - [185, 184, 183, 182][acumYear];
        const base = acumYear !== 3
          ? configNum + diff
          : pyRound((ly - 423) * (235 / 19) * 29.5306 + lunar.day);
        if (acumYear === 0) {
          // 统宗：对齐积日 %60 与日干支序
          const dayGz = this.gangzhi()[2];
          const idx = jiaziIndex1(dayGz);
          return base + mod(idx - mod(base, 60), 60);
        }
        return base;
      }
      if (jiStyle === 3) {
        const diff = daysBetween(this.year, this.month, this.day, this.hour, 0, 1900, 12, 21);
        const configNum = 708011105 - [0, 10153917, 10153917, 0][acumYear];
        const accDay = configNum + diff;
        let result = (accDay - 1) * 12 + Math.floor((this.hour + 1) / 2) + (acumYear !== 1 ? 1 : -11);
        if (acumYear === 3) {
          // 太乙局时计捷法：以六仪首推积时
          const dgz = this.gangzhi()[2];
          const headIdx = Math.floor(JIAZI.indexOf(dgz) / 6) * 6;
          const head = JIAZI[headIdx];
          const getfut = new Map(JIAZI.filter((_, i) => i % 6 === 0).map((h, i) => [h, 1 + i * 6])).get(head)!;
          const dgzNum = jiaziIndex1(dgz);
          const zhiNum = DI_ZHI.indexOf(this.gangzhi()[3][1]) + 1;
          result = (dgzNum - getfut) * 12 + zhiNum;
        }
        return result;
      }
      // jiStyle === 4 分计
      const diff = daysBetween(this.year, this.month, this.day, this.hour, this.minute, 1900, 12, 21);
      const configNum = 708011105 - [0, 10153917, 10153917, 0][acumYear];
      const accDay = configNum + diff;
      const base = (accDay - 1) * 23 + this.hour * 10500 + this.minute + 1;
      const minGz = this.gangzhi()[4];
      const idx = jiaziIndex1(minGz);
      return base + mod(idx - mod(base, 60), 60);
    });
  }

  /** 局式（kintaiyi kook） */
  kook(jiStyle: JiStyle, acumYear: AcumYear): KookInfo {
    return this.memo(`kook_${jiStyle}_${acumYear}`, () => {
      const jq = this.jieqi();
      const half: '冬至' | '夏至' = YANG_DUN_JIEQI.has(jq) ? '冬至' : '夏至';
      const k = modOr(this.accNum(jiStyle, acumYear), 72);
      const sanYear = ['理天', '理地', '理人'][(k - 1) % 3];

      let dun: Dun;
      if (jiStyle === 0 || jiStyle === 1 || jiStyle === 2) {
        dun = '陽';
      } else if (jiStyle === 4) {
        const gz = this.gangzhi();
        const dayStemYang = '甲丙戊庚壬'.includes(gz[2][0]);
        const hourBranch = gz[3][1];
        const groupA = '申酉戌亥子丑'.includes(hourBranch);
        if (half === '冬至') dun = dayStemYang === groupA ? '陽' : '陰';
        else dun = dayStemYang === groupA ? '陰' : '陽';
      } else {
        dun = half === '冬至' ? '陽' : '陰';
      }

      const accNum = this.accNum(jiStyle, acumYear);
      return {
        text: `${dun}遁${toCn(k)}局`,
        num: k,
        dun,
        sanYear,
        accNum,
      } satisfies KookInfo;
    });
  }

  /** 太乙落宫 1-9（kintaiyi ty；三局移一宫，不入中五） */
  taiyiGong(jiStyle: JiStyle, acumYear: AcumYear): number {
    const yangCycle: number[] = [];
    for (const g of [1, 2, 3, 4, 6, 7, 8, 9]) yangCycle.push(g, g, g);
    const yinCycle: number[] = [];
    for (const g of [9, 8, 7, 6, 4, 3, 2, 1]) yinCycle.push(g, g, g);
    const kook = this.kook(jiStyle, acumYear);
    const pattern = kook.dun === '陽' ? yangCycle : yinCycle;
    return pattern[(kook.num - 1) % 24];
  }

  /** 文昌（天目） */
  skyEyes(jiStyle: JiStyle, acumYear: AcumYear): string {
    const kook = this.kook(jiStyle, acumYear);
    return SKYEYES_DICT[kook.dun][kook.num - 1];
  }

  /** 文昌处境（七十二局表） */
  skyEyesDesc(jiStyle: JiStyle, acumYear: AcumYear): string {
    const kook = this.kook(jiStyle, acumYear);
    return SKYEYES_SUMMARY[kook.dun][kook.num - 1] ?? '';
  }

  /** 太岁（按计式取对应支） */
  taisui(jiStyle: JiStyle): string {
    const gz = this.gangzhi();
    const idx = jiStyle === 4 ? 4 : jiStyle;
    return gz[idx][1];
  }

  /** 合神：丑上起逆行 */
  heGod(jiStyle: JiStyle): string {
    const reversedZhi = [...DI_ZHI].reverse();
    const map = new Map(DI_ZHI.map((z, i) => [z, rotate(reversedZhi, '丑')[i]]));
    return map.get(this.taisui(jiStyle))!;
  }

  /** 计神：阳遁寅上起逆行、阴遁酉上顺行（kintaiyi jigod） */
  jiGod(jiStyle: JiStyle, acumYear: AcumYear): string {
    const dun = this.kook(jiStyle, acumYear).dun;
    const reversedZhi = [...DI_ZHI].reverse();
    const map = dun === '陽'
      ? new Map(DI_ZHI.map((z, i) => [z, rotate(reversedZhi, '寅')[i]]))
      : new Map(reversedZhi.map((z, i) => [z, rotate(DI_ZHI, '酉')[i]]));
    return map.get(this.taisui(jiStyle))!;
  }

  /** 始击（七十二局表） */
  shiJi(jiStyle: JiStyle, acumYear: AcumYear): string {
    return SF_LIST[this.kook(jiStyle, acumYear).num - 1];
  }

  /** 定目：文昌 +（太岁 − 合神） */
  dingMu(jiStyle: JiStyle, acumYear: AcumYear): string {
    const wc = this.skyEyes(jiStyle, acumYear);
    const hg = this.heGod(jiStyle);
    const ts = this.taisui(jiStyle);
    const ring = rotate(SIXTEEN, hg);
    const steps = ring.indexOf(ts);
    return rotate(SIXTEEN, wc)[steps];
  }

  /** 太岁禽星（kintaiyi year_chin） */
  yearChin(): string {
    const n = modOr(this.lunar().year + 15, 28);
    return SU[n - 1];
  }

  /** 始击值宿 */
  shiJiXiu(jiStyle: JiStyle, acumYear: AcumYear): string {
    const sf = this.shiJi(jiStyle, acumYear);
    const sfZ = SIXTEEN.indexOf(sf) + 1;
    const sfSu = SU_GONG[sf];
    const ycNum = SU.indexOf(this.yearChin()) + 1;
    let total = ycNum + sfZ;
    if (total > 28) total -= 28;
    return rotate(SU, sfSu)[total - 1];
  }

  /** 二十八宿排布起宿（kintaiyi twenty_eightstar 首位） */
  startXiu(jiStyle: JiStyle, acumYear: AcumYear): string {
    const sfXiu = this.shiJiXiu(jiStyle, acumYear);
    const sf = this.shiJi(jiStyle, acumYear);
    const suR = [...SU].reverse();
    const offset: Record<string, number> = {
      坤: -2, 酉: -3, 亥: -5, 巳: 1, 寅: 4, 卯: 3, 子: 6, 未: -1,
      申: -2, 戌: -4, 艮: 4, 巽: 1, 丑: 5, 午: 0, 乾: -5,
    };
    let num = suR.indexOf(sfXiu) - SIXTEEN.indexOf(sf) + SIXTEEN.indexOf('巳') + (offset[sf] ?? 2);
    num = num > 28 ? num - 28 : num < 0 ? num + 28 : num === 0 ? 28 : num;
    return suR[num - 1];
  }

  /** 主算 */
  homeCal(jiStyle: JiStyle, acumYear: AcumYear): number {
    const wc = this.skyEyes(jiStyle, acumYear);
    const wcNum = CHEN_TO_GONG[wc];
    const taiyi = this.taiyiGong(jiStyle, acumYear);
    const order = rotate(NUM_RING, wcNum);
    return order.slice(0, order.indexOf(taiyi)).reduce((a, b) => a + b, 0);
  }

  /** 主大将：以七十二局主算表约减入宫（kintaiyi home_general） */
  homeGeneral(jiStyle: JiStyle, acumYear: AcumYear): number {
    const kook = this.kook(jiStyle, acumYear);
    const table = kook.dun === '陽' ? YANG_CAL : YING_CAL;
    const hc = table[kook.num - 1][0];
    let result = this.homeCal(jiStyle, acumYear);
    if (hc < 10) result = hc;
    if (hc % 10 === 0) result = 1;
    if (hc > 10 && hc < 20) result = hc - 10;
    if (hc > 20 && hc < 30) result = hc - 20;
    if (hc > 30 && hc < 40) result = hc - 30;
    return result;
  }

  homeVGen(jiStyle: JiStyle, acumYear: AcumYear): number {
    const v = (this.homeGeneral(jiStyle, acumYear) * 3) % 10;
    return v === 0 ? 5 : v;
  }

  /** 客算（kintaiyi away_cal，含间辰/角宫诸变例） */
  awayCal(jiStyle: JiStyle, acumYear: AcumYear): number {
    const shiji = this.shiJi(jiStyle, acumYear);
    const sfNum = CHEN_TO_GONG[shiji];
    const taiyi = this.taiyiGong(jiStyle, acumYear);
    const sfJc = JC.includes(shiji);
    const tyJc = TYJC.includes(taiyi);
    const sfJc1 = JC1.includes(shiji);
    const order = rotate(NUM_RING, sfNum);
    const sumTo = (end: number) => order.slice(0, end).reduce((a, b) => a + b, 0);
    const sumFrom = (start: number) => order.slice(start).reduce((a, b) => a + b, 0);
    const idxTy = order.indexOf(taiyi);

    if (sfJc && !tyJc && !sfJc1) return sumTo(JC.indexOf(shiji) + 1) + 1;
    if (!sfJc && !tyJc && sfJc1) {
      if (taiyi === 6) return sumFrom(taiyi - 2);
      if (taiyi < 5) return sumTo(taiyi + 1);
      return sumTo(idxTy);
    }
    if (!sfJc && tyJc && !sfJc1) return sumTo(order.indexOf(TYJC[0]));
    if (sfJc && tyJc && !sfJc1) return sumTo(idxTy) + 1;
    if (!sfJc && tyJc && sfJc1) return sumTo(idxTy);
    if (!sfJc && !tyJc && !sfJc1) return sfNum === taiyi ? taiyi : sumTo(idxTy);
    return taiyi;
  }

  awayGeneral(jiStyle: JiStyle, acumYear: AcumYear): number {
    const kook = this.kook(jiStyle, acumYear);
    const table = kook.dun === '陽' ? YANG_CAL : YING_CAL;
    const ac = table[kook.num - 1][1];
    let result = 5;
    if (ac === 1) result = 1;
    if (ac < 10) result = ac;
    if (ac % 10 === 0) result = 5;
    if (ac > 10 && ac < 20) result = ac - 10;
    if (ac > 20 && ac < 30) result = ac - 20;
    if (ac > 30 && ac < 40) result = ac - 30;
    return result;
  }

  awayVGen(jiStyle: JiStyle, acumYear: AcumYear): number {
    const v = (this.awayGeneral(jiStyle, acumYear) * 3) % 10;
    return v === 0 ? 5 : v;
  }

  /** 定算 */
  setCal(jiStyle: JiStyle, acumYear: AcumYear): number {
    const se = this.dingMu(jiStyle, acumYear);
    const seNum = CHEN_TO_GONG[se];
    const taiyi = this.taiyiGong(jiStyle, acumYear);
    const seJc = JC.includes(se);
    const tyJc = TYJC.includes(taiyi);
    const seJc1 = JC1.includes(se);
    const order = rotate(NUM_RING, seNum);
    const sum = order.slice(0, order.indexOf(taiyi)).reduce((a, b) => a + b, 0);

    if (seJc && !tyJc && !seJc1) return sum === 0 ? 1 : sum + 1;
    if (!seJc && !tyJc && seJc1) return sum;
    if (!seJc && tyJc && !seJc1) return sum;
    if (seJc && tyJc && !seJc1) return sum + 1;
    if (!seJc && tyJc && seJc1) return sum === 0 ? 1 : sum;
    if (!seJc && !tyJc && !seJc1) return seNum === taiyi ? taiyi : sum;
    return sum;
  }

  setGeneral(jiStyle: JiStyle, acumYear: AcumYear): number {
    const v = this.setCal(jiStyle, acumYear) % 10;
    return v === 0 ? 5 : v;
  }

  setVGen(jiStyle: JiStyle, acumYear: AcumYear): number {
    const v = (this.setGeneral(jiStyle, acumYear) * 3) % 10;
    return v === 0 ? 5 : v;
  }

  /** 算数阴阳解（kintaiyi cal_des） */
  calDes(num: number): string[] {
    const t: string[] = [];
    if (num > 10 && num % 10 > 5) t.push('三才足數');
    if (num < 10) t.push('無天，二曜虛蝕、五緯失度、慧孛飛流、霜雹為害');
    if (num % 10 < 5) t.push('無地，有崩地震、川竭蝗蝻之象');
    if (num % 10 === 0) t.push('無人，口舌妖言更相殘賊，疾疫、遷移、流亡');
    const nd = NUM_DICT[num];
    if (nd) t.push(nd);
    return t;
  }

  /** 君基 */
  kingBase(jiStyle: JiStyle, acumYear: AcumYear): string {
    const kb = Math.floor(mod(this.accNum(jiStyle, acumYear) + 250, 360) / 30) || 1;
    return rotate(DI_ZHI, '午')[kb - 1];
  }

  /** 臣基 */
  officerBase(jiStyle: JiStyle, acumYear: AcumYear): string {
    return byCycle1(OFFICER_BASE, this.kook(jiStyle, acumYear).num)!;
  }

  /** 民基 */
  pplBase(jiStyle: JiStyle, acumYear: AcumYear): string {
    return byCycle1(rotate(DI_ZHI, '申'), this.kook(jiStyle, acumYear).num)!;
  }

  fourGod(jiStyle: JiStyle, acumYear: AcumYear): string {
    return byCycle1(FOUR_GOD, this.kook(jiStyle, acumYear).num)!;
  }

  skyYi(jiStyle: JiStyle, acumYear: AcumYear): string {
    return byCycle1(SKY_YI, this.kook(jiStyle, acumYear).num)!;
  }

  earthYi(jiStyle: JiStyle, acumYear: AcumYear): string {
    return byCycle1(EARTH_YI, this.kook(jiStyle, acumYear).num)!;
  }

  zhiFu(jiStyle: JiStyle, acumYear: AcumYear): string {
    return byCycle1(ZHI_FU, this.kook(jiStyle, acumYear).num)!;
  }

  /** 飞符 */
  flyFu(jiStyle: JiStyle, acumYear: AcumYear): string {
    const fly = Math.trunc((this.accNum(jiStyle, acumYear) % 360 % 36) / 3);
    return byIndex1(rotate(DI_ZHI, '辰'), fly) ?? '中';
  }

  // —— 以积数起例的诸神（kintaiyi config 系列函数；返回 undefined 表示不上盘） ——

  wuxingGod(acc: number): string | undefined {
    const f = acc % 5;
    if (f === 0) {
      const fv = divide(acc, 5);
      return byIndex1(SIXTEEN, fv % 5);
    }
    return byIndex1([...'乾子艮巽坤'], f);
  }

  kingFu(acc: number): string | undefined {
    let n = acc % 20;
    if (n === 0) n = divide(acc, 20) % 20;
    if (n > 16) n -= 16;
    return byIndex1(rotate(SIXTEEN, '戌'), n);
  }

  tianWang(acc: number): string | undefined {
    const tw = acc % 20;
    if (tw === 0) {
      let v = divide(acc, 20) % 20;
      if (v > 16) v -= 16;
      return byIndex1(SIXTEEN, v);
    }
    return byIndex1(rotate(SIXTEEN, '申'), tw);
  }

  tianShi(acc: number): string | undefined {
    const tw = acc % 12;
    if (tw === 0) {
      let v = divide(acc, 12) % 12;
      if (v > 16) v -= 16;
      return byIndex1(SIXTEEN, v);
    }
    return byIndex1(rotate(SIXTEEN, '寅'), tw);
  }

  taiJun(acc: number): string | undefined {
    const f = acc % 4;
    if (f === 0) {
      let v = divide(acc, 4) % 4;
      if (v > 16) v -= 16;
      return byIndex1(SIXTEEN, v);
    }
    return byIndex1([...'子午卯酉'], f);
  }

  wuFu(acc: number): number {
    const f = mod(acc + 250, 225) % 45;
    const fv = f % 5;
    return fv !== 0 ? fv : 5;
  }

  flyBird(acc: number): number | undefined {
    const f = acc % 8;
    if (f === 0) return undefined; // 源实现返回「坤」字符串，入盘时被丢弃
    return byIndex1([1, 8, 3, 4, 9, 2, 7, 6], f);
  }

  threeWind(acc: number): number | undefined {
    const f = acc % 9;
    if (f === 0) return divide(acc, 9) % 9;
    return byIndex1([7, 2, 6, 1, 3, 9, 4, 8], f % 9 === 0 ? Math.trunc(f / 9) : f % 9);
  }

  fiveWind(acc: number): number | undefined {
    const f = acc % 29;
    if (f === 0) return divide(acc, 29) % 29;
    if (f % 9 === 0) return byIndex1([1, 3, 5, 7, 9, 2, 4, 6, 8], Math.trunc(f / 9));
    return byIndex1([1, 3, 5, 7, 9, 2, 4, 6, 8], f % 9);
  }

  eightWind(acc: number): number | undefined {
    const f = acc % 9;
    if (f === 0) return divide(acc, 9) % 9;
    return byIndex1([2, 3, 4, 6, 7, 8, 9, 1], f);
  }

  bigYo(acc: number): number | undefined {
    let big = mod(acc + 34, 288);
    if (big > 36) big = big / 36;
    if (big < 6) big = 6;
    return new Map<number, number>([[7, 1], [8, 2], [9, 3], [1, 4], [2, 5], [3, 6], [4, 7], [6, 8]]).get(Math.trunc(big));
  }

  smallYo(acc: number): number | undefined {
    const smallYo = acc % 360;
    const table = new Map<number, number>([[1, 1], [2, 2], [3, 3], [4, 4], [6, 5], [7, 6], [8, 7], [9, 8]]);
    let sm = 0;
    if (smallYo < 24) {
      sm = smallYo % 3;
    } else if (smallYo > 24) {
      sm = smallYo % 24;
      if (smallYo > 10) sm = smallYo - 9;
      if (sm % 3 !== 0) return table.get(sm % 3) ?? 1;
      return table.get(Math.trunc(sm / 3)) ?? 1;
    }
    return table.get(sm % 3) ?? 1;
  }

  /** 阳九（按农历年） */
  yangJiu(): string {
    const y = this.lunar().year;
    const v = mod(y + 12607, 4560) % 456 % 12;
    const ring = rotate(DI_ZHI, '寅');
    return v === 0 ? ring[11] : ring[v - 1];
  }

  /** 百六（按农历年） */
  baiLiu(): string {
    const y = this.lunar().year;
    const v = mod(y + 12607, 4320) % 288 % 24;
    if (v > 12) return rotate(DI_ZHI, '卯')[((v - 12) % 12) - 1];
    if (v === 0) return rotate(DI_ZHI, '酉')[11];
    return rotate(DI_ZHI, '酉')[v - 1];
  }

  /** 值事门（源实现：积数 %240，为 0 时取 120，每三十为一门） */
  zhishiDoor(acc: number): string {
    const acc240 = acc % 240 === 0 ? 120 : acc % 240;
    let zhishi = Math.floor(acc240 / 30);
    if (zhishi % 30 !== 0) zhishi += 1;
    else if (zhishi === 0) zhishi = 1;
    return DOORS[zhishi - 1];
  }

  /** 八门分布（宫数 -> 门） */
  eightDoors(jiStyle: JiStyle, acumYear: AcumYear): Record<number, string> {
    const taiyi = this.taiyiGong(jiStyle, acumYear);
    const ring = rotate([8, 3, 4, 9, 2, 7, 6, 1], taiyi);
    const acc = this.accNum(jiStyle, acumYear);
    const doors = rotate(DOORS, this.zhishiDoor(acc));
    if (jiStyle !== 3) {
      const out: Record<number, string> = {};
      ring.forEach((g, i) => { out[g] = doors[i]; });
      return out;
    }
    const half = YANG_DUN_JIEQI.has(this.jieqi()) ? '冬至' : '夏至';
    let num = half === '夏至' ? acc % 120 % 30 : acc % 240 % 30;
    if (num > 8) num %= 8;
    if (num === 0) num = 8;
    const start = ring[num - 1];
    const out: Record<number, string> = {};
    rotate(ring, start).forEach((g, i) => { out[g] = doors[i]; });
    return out;
  }

  /** 推三门具不具 */
  threeDoors(jiStyle: JiStyle, acumYear: AcumYear): string {
    const taiyi = this.taiyiGong(jiStyle, acumYear);
    const door = this.eightDoors(jiStyle, acumYear)[taiyi];
    return '休生開'.includes(door) ? '三門不具。' : '三門具。';
  }

  /** 推五将发不发 */
  fiveGenerals(jiStyle: JiStyle, acumYear: AcumYear): string {
    const hg = this.homeGeneral(jiStyle, acumYear);
    const ag = this.awayGeneral(jiStyle, acumYear);
    const des = this.skyEyesDesc(jiStyle, acumYear);
    if (des === '' && hg !== 5 && ag !== 5) return '五將發。';
    if (hg === 5) return '主將主參不出中門，杜塞無門。';
    if (ag === 5) return '客將客參不出中門，杜塞無門。';
    return `${des}。五將不發。`;
  }

  /** 推主客相关法 */
  homeAwayRelation(jiStyle: JiStyle, acumYear: AcumYear): string {
    const wc = this.skyEyes(jiStyle, acumYear);
    const sj = this.shiJi(jiStyle, acumYear);
    const wcF = ganzhiWuxing(wc) ?? '';
    const sjF = ganzhiWuxing(sj) ?? '';
    const hg = this.homeGeneral(jiStyle, acumYear);
    const taiyi = this.taiyiGong(jiStyle, acumYear);
    const hguan = NAYIN_WUXING.get(this.gangzhi()[3]);
    const guan = hguan === sjF ? '客關' : '關';
    const relation = wuxingRelation(wcF + sjF);
    if (relation === '我尅' && taiyi === hg) return '主將囚，不利主';
    if (relation === '我尅' && taiyi !== hg) return '主尅客，主勝';
    if (relation === '尅我') return `${guan}得主人，客勝`;
    if (relation && ['比和', '生我', '我生'].includes(relation)) return `${guan}${relation}，和`;
    return '';
  }

  /** 推孤单以占成败 */
  guDan(jiStyle: JiStyle, acumYear: AcumYear): string {
    const singleYinYang = (d: number) => (TYJC.includes(d) ? '單陽' : [2, 4, 6, 8].includes(d) ? '單陰' : '');
    const homecal = String(this.homeCal(jiStyle, acumYear));
    const awaycal = String(this.awayCal(jiStyle, acumYear));
    if (homecal.length === 1) {
      const one = singleYinYang(Number(homecal));
      return `主筭得${one}，${one === '單陽' ? '不利上，不利主人也。' : '沒不利也。'}`;
    }
    if (awaycal.length === 1) {
      const one = singleYinYang(Number(awaycal));
      return `客筭得${one}，${one === '單陽' ? '沒不利也。' : '不利上，不利客人也。'}`;
    }
    for (const [calc, prefix] of [[homecal, '主算'], [awaycal, '客算']] as const) {
      if (calc.length === 2) {
        const two = [1, 3].includes(Number(calc[1])) ? '孤陽' : '孤陰';
        const first = singleYinYang(Number(calc[0]));
        if (two === '孤陰' && first === '單陰') return `${prefix}為單陰並孤陰，為重陰。`;
        if (two === '孤陽' && first === '單陰') return `${prefix}為單陰並孤陽，沒不利。`;
        if (two === '孤陰' && first === '單陽') return `${prefix}為單陽並孤陰，沒不利。`;
        if (two === '孤陽' && first === '單陽') return `${prefix}為單陽並孤陽，為重陽。`;
      }
    }
    return '';
  }

  /** 太乙在天外地内（助主/助客） */
  homeAwayHint(jiStyle: JiStyle, acumYear: AcumYear): string {
    const taiyi = this.taiyiGong(jiStyle, acumYear);
    const gongName = NUM_TO_GONG[taiyi];
    if ([1, 8, 3, 4].includes(taiyi)) return `太乙在${gongName}，助主。`;
    if ([9, 2, 6, 7].includes(taiyi)) return `太乙在${gongName}，助客。`;
    return '';
  }

  /** 纪（kintaiyi getepoch） */
  epoch(jiStyle: JiStyle, acumYear: AcumYear): { yuan?: string; ji: string } {
    const acc = this.accNum(jiStyle, acumYear);
    if (jiStyle === 0 || jiStyle === 1 || jiStyle === 2) {
      let jiNum = acc % 360 === 1 ? 1 : Math.trunc(Math.floor(acc % 360 / 60)) + 1;
      let jiNum2 = Math.trunc((acc % 360 % 72 % 24) / 3) || 1;
      if (jiNum2 > 6) jiNum2 -= 6;
      if (jiNum > 6) jiNum -= 6;
      return { yuan: CNUM[jiNum2 - 1], ji: CNUM[jiNum - 1] };
    }
    const gz = this.gangzhi()[jiStyle === 3 ? 2 : 3];
    for (const [group, label] of EPOCH_GROUPS) {
      if (group.includes(gz)) return { ji: label };
    }
    return { ji: '' };
  }

  /** 元（kintaiyi getyuan） */
  yuanHead(jiStyle: JiStyle, acumYear: AcumYear): string {
    const acc = this.accNum(jiStyle, acumYear);
    const find = pyRound(acc % 360) === 1 ? 1 : Math.trunc(pyRound((acc % 360) / 72));
    return byIndex1(FIVE_YUAN_HEADS, find || 1) ?? FIVE_YUAN_HEADS[0];
  }

  /** 纪元（kintaiyi jiyuan） */
  jiYuan(jiStyle: JiStyle, acumYear: AcumYear): string {
    const gz = this.gangzhi();
    if (jiStyle === 3 || jiStyle === 4) {
      const key = gz[jiStyle === 4 || acumYear === 1 ? 3 : 2];
      let head = '';
      for (const [group, label] of JIYUAN_GROUPS) {
        if (group.includes(key)) { head = label; break; }
      }
      return `第${this.epoch(jiStyle, acumYear).ji}紀${head}元`;
    }
    const e = this.epoch(jiStyle, acumYear);
    return `第${e.ji}紀第${e.yuan}${this.yuanHead(jiStyle, acumYear)}元`;
  }

  /** 五子元局（kintaiyi get_five_yuan_kook / five_zi_yuan） */
  fiveYuanKook(jiStyle: JiStyle, acumYear: AcumYear): string {
    const gz = this.gangzhi();
    const kook = this.kook(jiStyle, acumYear);
    const k = kook.num;
    const bases = [1, 73, 145, 217, 289];

    let pillar = gz[jiStyle];
    let cIdx = k - 1;
    if (jiStyle === 4) {
      // 分计五子元：分柱地支移位后按 k-2 取（kintaiyi min_five_zi_yuan）
      const shift: Record<string, string> = {
        戌: '申', 子: '戌', 丑: '亥', 寅: '子', 卯: '丑', 辰: '寅',
        巳: '卯', 午: '辰', 未: '巳', 申: '午', 酉: '未', 亥: '酉',
      };
      const raw = gz[4];
      pillar = raw[0] + (shift[raw[1]] ?? raw[1]);
      cIdx = mod(k - 2, 72);
    }

    for (let i = 0; i < FIVE_YUAN_HEADS.length; i++) {
      const ring = jiaziRing72(FIVE_YUAN_HEADS[i]);
      if (ring[cIdx] === pillar) {
        return `${kook.dun}遁${toCn(bases[i] + k - 1)}局`;
      }
    }
    return '';
  }

  /** 值年卦 / 值日卦 / 值时卦 */
  yearGua(acumYear: AcumYear): string {
    const n = modOr(this.accNum(0, acumYear), 64);
    return GUA_64[n - 1];
  }

  dayGua(acumYear: AcumYear): string {
    const n = this.accNum(1, acumYear) % 646464 % 20 || 64;
    return GUA_64[n - 1];
  }

  hourGua(acumYear: AcumYear): string {
    const n = modOr(this.accNum(3, acumYear), 64);
    return GUA_64[n - 1];
  }

  /** 宫旺衰（按节气八节） */
  wangZhuai(): Record<number, string> {
    const jq = this.jieqi();
    let anchor = '';
    for (const [group, label] of WANGZHUAI_JIEQI) {
      if (group.includes(jq)) { anchor = label; break; }
    }
    const wangGong = JIEQI_WANG_GONG.get(anchor);
    const out: Record<number, string> = {};
    if (wangGong === undefined) return out;
    rotate(WANGZHUAI_NUM, wangGong).forEach((g, i) => { out[g] = WANGZHUAI[i]; });
    return out;
  }

  /**
   * 格局（《太乙统宗宝鉴》卷四：掩迫关囚击格对提挟执提四郭固；kintaiyi shi_geju）
   */
  geJu(jiStyle: JiStyle, acumYear: AcumYear): Record<string, string> {
    const gongOf = (ch: string) => CHEN_TO_GONG[ch];
    const gong2chen: Record<number, string[]> = {};
    for (const ch of [...'亥子丑艮寅卯辰巽巳午未坤申酉戌乾']) {
      const g = CHEN_TO_GONG[ch];
      (gong2chen[g] ??= []).push(ch);
    }
    const eightOrder = [1, 2, 3, 4, 6, 7, 8, 9];
    const opp: Record<number, number> = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };

    const ty = this.taiyiGong(jiStyle, acumYear);
    const wc = this.skyEyes(jiStyle, acumYear);
    const sj = this.shiJi(jiStyle, acumYear);
    const se = this.dingMu(jiStyle, acumYear);
    const hd = this.homeGeneral(jiStyle, acumYear);
    const hv = this.homeVGen(jiStyle, acumYear);
    const ad = this.awayGeneral(jiStyle, acumYear);
    const av = this.awayVGen(jiStyle, acumYear);
    const generals: Array<[string, number]> = [['主大', hd], ['主參', hv], ['客大', ad], ['客參', av]];
    const results: Record<string, string> = {};

    if (gongOf(sj) === ty) results['掩'] = '始擊臨太乙宮，陰盛陽衰、君弱臣強之象';

    if (gongOf(wc) === ty) results['關囚(文昌)'] = '文昌與太乙同宮，拘繫執正，不利為主';
    for (const [nm, g] of generals) {
      if (g === ty && g !== 5) results[`囚(${nm})`] = `${nm}與太乙同宮為囚，下犯上之象`;
    }

    for (let i = 0; i < generals.length; i++) {
      for (let j = i + 1; j < generals.length; j++) {
        if (generals[i][1] === generals[j][1] && generals[i][1] !== 5) {
          results[`關(${generals[i][0]}、${generals[j][0]})`] = '主客四將同宮，相持爭鋒，不利有為';
        }
      }
    }

    const oppTy = opp[ty];
    if (oppTy) {
      if (gongOf(sj) === oppTy) results['格(始擊)'] = '始擊在太乙對宮，政事上下相格、盜侮其君';
      if (ad === oppTy) results['格(客大)'] = '客大在太乙對宮為格';
      if (av === oppTy) results['格(客參)'] = '客參在太乙對宮為格';
    }

    if (oppTy && gongOf(wc) === oppTy) results['對'] = '文昌與太乙相對，大臣懷二、將吏挾奸';

    const prevG = eightOrder[mod(eightOrder.indexOf(ty) - 1, 8)];
    const nextG = eightOrder[mod(eightOrder.indexOf(ty) + 1, 8)];
    const chens = gong2chen[ty] ?? [];
    let outChen: string | null = null;
    let inChen: string | null = null;
    if (chens.length === 2) {
      const p0 = SIXTEEN.indexOf(chens[0]);
      const p1 = SIXTEEN.indexOf(chens[1]);
      outChen = SIXTEEN[mod(p1 + 1, 16)];
      inChen = SIXTEEN[mod(p0 - 1, 16)];
    }

    for (const [nm, ch] of [['文昌', wc], ['始擊', sj], ['定目', se]] as const) {
      if (gongOf(ch) === ty) continue;
      if (ch === outChen) results[`辰迫(外、${nm})`] = `${nm}在太乙前一辰，外辰迫，災急而重`;
      else if (ch === inChen) results[`辰迫(內、${nm})`] = `${nm}在太乙後一辰，內辰迫，災尤速`;
      const og = gongOf(ch);
      if (og === nextG) results[`宮迫(外、${nm})`] = `${nm}在太乙前一宮，外宮迫，災緩而輕`;
      else if (og === prevG) results[`宮迫(內、${nm})`] = `${nm}在太乙後一宮，內宮迫`;
    }
    for (const [nm, g] of generals) {
      if (g === 5 || g === ty) continue;
      if (g === nextG) results[`宮迫(外、${nm})`] = `${nm}在太乙前一宮，外宮迫`;
      else if (g === prevG) results[`宮迫(內、${nm})`] = `${nm}在太乙後一宮，內宮迫`;
    }

    if (gongOf(sj) !== ty) {
      if (sj === outChen) results['擊(外辰)'] = '始擊在太乙前一辰，外辰擊，諸侯侵凌';
      else if (sj === inChen) results['擊(內辰)'] = '始擊在太乙後一辰，內辰擊，親王后妃憑凌';
      if (gongOf(sj) === nextG) results['擊(外宮)'] = '始擊在太乙前一宮，外宮擊';
      else if (gongOf(sj) === prevG) results['擊(內宮)'] = '始擊在太乙後一宮，內宮擊';
    }

    if (gongOf(wc) !== ty && gongOf(sj) !== ty && chens.length === 2) {
      const tyMid = (SIXTEEN.indexOf(chens[0]) + SIXTEEN.indexOf(chens[1])) / 2;
      const side = (idx: number) => {
        const d = mod(idx - tyMid, 16);
        return d > 0 && d < 8 ? '外' : d > 8 ? '內' : '中';
      };
      const sWc = side(SIXTEEN.indexOf(wc));
      const sSj = side(SIXTEEN.indexOf(sj));
      if (sWc !== '中' && sSj !== '中' && sWc !== sSj) {
        results['提挾'] = '二目(文昌、始擊)挾太乙，政由大臣、下專權之象';
      }
    }

    const doors = this.eightDoors(jiStyle, acumYear);
    const kaiGong = Object.keys(doors).map(Number).find((g) => doors[g] === '開');
    const shengGong = Object.keys(doors).map(Number).find((g) => doors[g] === '生');
    for (const g of [kaiGong, shengGong]) {
      if (g === undefined) continue;
      if (g === ty) results['執(開生門合)'] = '太乙與開生門合，執提之象，不可舉事';
      else if (opp[ty] && g === opp[ty]) results['提格(開生門衝)'] = '太乙與開生門衝，提格之象';
    }

    if (gongOf(wc) === ty && hd === hv && hd !== 5) {
      results['四郭固'] = '文昌囚太乙宮、主二將相關，堅壁固守，不可有為';
    } else if (gongOf(sj) === ty && ad !== 5 && (ad === av || ad === hd || av === hv)) {
      results['四郭固'] = '客目臨太乙宮、客主二將相關，四郭固，宜固守';
    }

    // 四郭杜（采自 wlhyl/taiyipython 的推导式规则，kintaiyi 未收录）：
    // 文昌临客将之宫，且主客将参交互同宫，四郭杜塞
    const wcGong = gongOf(wc);
    if ((wcGong === ad || wcGong === av) && (hv === ad || hd === av)) {
      results['四郭杜'] = '文昌臨客將之宮、主客將參相關，四郭杜塞，宜守不宜攻';
    }

    if (Object.keys(results).length === 0) {
      results['無格局'] = '太乙無掩迫關囚擊格對提挾諸格局，主客清明';
    }
    return results;
  }

  /** 十六神盘（含中宫）星将布局 */
  board(jiStyle: JiStyle, acumYear: AcumYear): Record<GongName, string[]> {
    const acc = this.accNum(jiStyle, acumYear);
    const n2g = (n: number | undefined) => (n === undefined ? undefined : NUM_TO_GONG[n]);

    const entries: Array<[string | undefined, string]> = jiStyle !== 4
      ? [
        [this.skyEyes(jiStyle, acumYear), '文昌'],
        [this.taisui(jiStyle), '太歲'],
        [this.heGod(jiStyle), '合神'],
        [this.jiGod(jiStyle, acumYear), '計神'],
        [this.shiJi(jiStyle, acumYear), '始擊'],
        [this.dingMu(jiStyle, acumYear), '定計'],
        [this.kingBase(jiStyle, acumYear), '君基'],
        [this.officerBase(jiStyle, acumYear), '臣基'],
        [this.pplBase(jiStyle, acumYear), '民基'],
        [this.fourGod(jiStyle, acumYear), '四神'],
        [this.skyYi(jiStyle, acumYear), '天乙'],
        [this.earthYi(jiStyle, acumYear), '地乙'],
        [this.zhiFu(jiStyle, acumYear), '直符'],
        [this.flyFu(jiStyle, acumYear), '飛符'],
        [this.tianWang(acc), '天皇'],
        [this.tianShi(acc), '天時'],
        [this.wuxingGod(acc), '五行'],
        [this.kingFu(acc), '帝符'],
        [this.taiJun(acc), '太尊'],
        [n2g(this.wuFu(acc)), '五福'],
        [n2g(this.homeGeneral(jiStyle, acumYear)), '主大'],
        [n2g(this.homeVGen(jiStyle, acumYear)), '主參'],
        [n2g(this.awayGeneral(jiStyle, acumYear)), '客大'],
        [n2g(this.awayVGen(jiStyle, acumYear)), '客參'],
        [n2g(this.threeWind(acc)), '三風'],
        [n2g(this.fiveWind(acc)), '五風'],
        [n2g(this.eightWind(acc)), '八風'],
        [n2g(this.flyBird(acc)), '飛鳥'],
        [n2g(this.bigYo(acc)), '大游'],
        [n2g(this.smallYo(acc)), '小游'],
        [this.yangJiu(), '陽九'],
        [this.baiLiu(), '百六'],
        [n2g(this.taiyiGong(jiStyle, acumYear)), '太乙'],
      ]
      : [
        [this.skyEyes(jiStyle, acumYear), '文昌'],
        [this.heGod(jiStyle), '合神'],
        [this.jiGod(jiStyle, acumYear), '計神'],
        [this.shiJi(jiStyle, acumYear), '始擊'],
        [this.kingBase(jiStyle, acumYear), '君基'],
        [this.officerBase(jiStyle, acumYear), '臣基'],
        [this.pplBase(jiStyle, acumYear), '民基'],
        [this.fourGod(jiStyle, acumYear), '四神'],
        [this.skyYi(jiStyle, acumYear), '天乙'],
        [this.earthYi(jiStyle, acumYear), '地乙'],
        [this.zhiFu(jiStyle, acumYear), '直符'],
        [this.flyFu(jiStyle, acumYear), '飛符'],
        [this.tianWang(acc), '天皇'],
        [this.wuxingGod(acc), '五行'],
        [this.kingFu(acc), '帝符'],
        [this.taiJun(acc), '太尊'],
        [n2g(this.wuFu(acc)), '五福'],
        [n2g(this.homeGeneral(jiStyle, acumYear)), '主大'],
        [n2g(this.homeVGen(jiStyle, acumYear)), '主參'],
        [n2g(this.awayGeneral(jiStyle, acumYear)), '客大'],
        [n2g(this.awayVGen(jiStyle, acumYear)), '客參'],
        [n2g(this.threeWind(acc)), '三風'],
        [n2g(this.fiveWind(acc)), '五風'],
        [n2g(this.eightWind(acc)), '八風'],
        [n2g(this.flyBird(acc)), '飛鳥'],
        [n2g(this.taiyiGong(jiStyle, acumYear)), '太乙'],
      ];

    const board: Record<GongName, string[]> = {
      巳: [], 午: [], 未: [], 坤: [], 申: [], 酉: [], 戌: [], 乾: [],
      亥: [], 子: [], 丑: [], 艮: [], 寅: [], 卯: [], 辰: [], 巽: [], 中: [],
    };
    for (const [pos, name] of entries) {
      if (pos && pos in board) board[pos as GongName].push(name);
    }
    return board;
  }
}

/** 主入口：一次排盘 */
export function calculateTaiyi(input: TaiyiInput): TaiyiResult {
  const { year, month, day, hour, minute, jiStyle, acumYear } = input;
  const e = new TaiyiEngine(year, month, day, hour, minute);

  const kook = e.kook(jiStyle, acumYear);
  const homeSuanValue = e.homeCal(jiStyle, acumYear);
  const awaySuanValue = e.awayCal(jiStyle, acumYear);
  const setSuanValue = e.setCal(jiStyle, acumYear);
  const taiyiGong = e.taiyiGong(jiStyle, acumYear);

  const suan = (value: number): SuanInfo => ({ value, descriptions: e.calDes(value) });

  return {
    input,
    jiName: JI_NAME[jiStyle],
    methodName: METHOD_NAME[acumYear],
    ganzhi: e.gangzhi(),
    lunar: e.lunar(),
    jieqi: e.jieqi(),
    jiyuan: e.jiYuan(jiStyle, acumYear),
    taisui: e.taisui(jiStyle),
    kook,
    fiveYuanKook: e.fiveYuanKook(jiStyle, acumYear),
    yangjiu: e.yangJiu(),
    bailiu: e.baiLiu(),
    taiyiGong,
    taiyiGongName: NUM_TO_GONG[taiyiGong],
    homeAwayHint: e.homeAwayHint(jiStyle, acumYear),
    skyEyes: e.skyEyes(jiStyle, acumYear),
    skyEyesDesc: e.skyEyesDesc(jiStyle, acumYear),
    shiJi: e.shiJi(jiStyle, acumYear),
    shiJiXiu: e.shiJiXiu(jiStyle, acumYear),
    dingMu: e.dingMu(jiStyle, acumYear),
    heGod: e.heGod(jiStyle),
    jiGod: e.jiGod(jiStyle, acumYear),
    homeSuan: suan(homeSuanValue),
    homeGeneral: e.homeGeneral(jiStyle, acumYear),
    homeVGen: e.homeVGen(jiStyle, acumYear),
    awaySuan: suan(awaySuanValue),
    awayGeneral: e.awayGeneral(jiStyle, acumYear),
    awayVGen: e.awayVGen(jiStyle, acumYear),
    setSuan: suan(setSuanValue),
    setGeneral: e.setGeneral(jiStyle, acumYear),
    setVGen: e.setVGen(jiStyle, acumYear),
    kingBase: e.kingBase(jiStyle, acumYear),
    officerBase: e.officerBase(jiStyle, acumYear),
    pplBase: e.pplBase(jiStyle, acumYear),
    fourGod: e.fourGod(jiStyle, acumYear),
    skyYi: e.skyYi(jiStyle, acumYear),
    earthYi: e.earthYi(jiStyle, acumYear),
    zhiFu: e.zhiFu(jiStyle, acumYear),
    flyFu: e.flyFu(jiStyle, acumYear),
    yearChin: e.yearChin(),
    startXiu: e.startXiu(jiStyle, acumYear),
    doors: e.eightDoors(jiStyle, acumYear),
    zhishiDoor: e.zhishiDoor(kook.accNum),
    threeDoors: e.threeDoors(jiStyle, acumYear),
    fiveGenerals: e.fiveGenerals(jiStyle, acumYear),
    homeAwayRelation: e.homeAwayRelation(jiStyle, acumYear),
    guDan: e.guDan(jiStyle, acumYear),
    yearGua: e.yearGua(acumYear),
    dayGua: e.dayGua(acumYear),
    hourGua: e.hourGua(acumYear),
    geJu: e.geJu(jiStyle, acumYear),
    board: e.board(jiStyle, acumYear),
    wangZhuai: e.wangZhuai(),
  };
}
