/**
 * 太乙神数常数表。
 * 数据汇集自 MIT 协议开源项目 kentang2017/kintaiyi（config.py / taiyidict.py），
 * 并与 wlhyl/taiyipython 的推导式实现交叉核对。
 */
import { zipMap, rotate, JIAZI } from './utils';

export const DI_ZHI = [...'子丑寅卯辰巳午未申酉戌亥'];

/** 十六神盘辰序（顺时针） */
export const SIXTEEN = [...'子丑艮寅卯辰巽巳午未坤申酉戌乾亥'];

/** 十六神名（辰 -> 神名） */
export const SIXTEEN_GOD: Record<string, string> = {
  子: '地主', 丑: '陽德', 艮: '和德', 寅: '呂申',
  卯: '高叢', 辰: '太陽', 巽: '大炅', 巳: '大神',
  午: '大威', 未: '天道', 坤: '大武', 申: '武德',
  酉: '太簇', 戌: '陰主', 乾: '陰德', 亥: '大義',
};

/** 辰 -> 太乙宫数（十六辰两两归八宫；kintaiyi config.gong2 / l_num） */
export const CHEN_TO_GONG: Record<string, number> = {
  亥: 8, 子: 8, 丑: 3, 艮: 3, 寅: 4, 卯: 4, 辰: 9, 巽: 9,
  巳: 2, 午: 2, 未: 7, 坤: 7, 申: 6, 酉: 6, 戌: 1, 乾: 1,
};

/** 宫数 -> 宫名辰（kintaiyi config.num2gong：1乾 2午 3艮 4卯 5中 6酉 7坤 8子 9巽） */
export const NUM_TO_GONG: Record<number, string> = {
  1: '乾', 2: '午', 3: '艮', 4: '卯', 5: '中', 6: '酉', 7: '坤', 8: '子', 9: '巽',
};

/** 顺时针宫数环（自子宫起；kintaiyi config.num） */
export const NUM_RING = [8, 3, 4, 9, 2, 7, 6, 1];

/** 间辰（非宫名之辰） */
export const JC = [...'丑寅辰巳未申戌亥'];
/** 四维 */
export const JC1 = [...'巽艮坤乾'];
/** 太乙角宫 */
export const TYJC = [1, 3, 7, 9];

/** 八门 */
export const DOORS = [...'開休生傷杜景死驚'];

/** 始击七十二局表（kintaiyi config.sf_list） */
export const SF_LIST = [...('坤戌亥丑寅辰巳坤酉乾丑寅辰午坤酉亥子艮辰巳未申戌亥艮卯巽未丑戌子艮卯巳午'
  + '坤戌亥丑寅辰巳坤酉乾丑寅辰午坤酉亥子艮辰巳未申戌亥艮卯巽未丑戌子艮卯巳午')];

/** 文昌（天目）七十二局表（kintaiyi config.skyeyes_dict） */
export const SKYEYES_DICT: Record<'陽' | '陰', string[]> = {
  陽: [...('申酉戌乾乾亥子丑艮寅卯辰巽巳午未坤坤'.repeat(4))],
  陰: [...('寅卯辰巽巽巳午未坤申酉戌乾亥子丑艮艮'.repeat(4))],
};

/** 文昌阴阳七十二局处境（kintaiyi config.skyeyes_summary） */
export const SKYEYES_SUMMARY: Record<'陽' | '陰', string[]> = {
  陽: ',始擊擊,,內迫,,,辰迫,,囚,,囚,,,,,,囚,囚,客挾,,,,,,,,囚,囚,始擊擊,,,始擊擊,始擊掩,始擊掩,,,,囚,辰迫,,客挾,客挾,囚,客挾,宮迫,,主挾，宮迫,辰迫,,,,主挾，辰迫,宮迫,宮迫,始擊掩,,,,客挾,,,,,,主挾,辰擊,,始擊掩,始擊擊,始擊擊,囚,始擊擊'.split(','),
  陰: ',內辰迫,外辰迫,內辰擊,,,外宮迫,掩、辰迫,掩,掩、辰迫,掩、囚,內宮迫,內宮擊,,,掩、外辰迫,掩,掩,,關客,關客,關客,,外宮擊,,,外宮擊,,,,內宮擊,,關主,關客,,,外辰迫,掩,內辰迫,關客,內辰擊,,掩,內辰迫,內宮迫,掩,外宮迫,外宮迫,外宮擊,內宮擊,,內辰迫,外辰擊,掩,關主,,,外宮擊,掩,內宮擊,內宮迫,外宮擊,,內宮擊,,,,,,,,,'.split(','),
};

/** 四神三年一移三十六年周期表（局数循环取；kintaiyi config.four_god 等） */
export const FOUR_GOD = [...'乾乾乾午午午艮艮艮卯卯卯中中中酉酉酉坤坤坤子子子巽巽巽巳巳巳申申申寅寅寅'];
export const SKY_YI = [...'酉酉酉坤坤坤子子子巽巽巽巳巳巳申申申寅寅寅乾乾乾午午午艮艮艮卯卯卯中中中'];
export const EARTH_YI = [...'巽巽巽巳巳巳申申申寅寅寅乾乾乾午午午艮艮艮卯卯卯中中中酉酉酉坤坤坤子子子'];
export const ZHI_FU = [...'中中中酉酉酉坤坤坤子子子巽巽巽巳巳巳申申申寅寅寅乾乾乾午午午艮艮艮卯卯卯'];
/** 臣基三十六局周期表（kintaiyi config.officer_base） */
export const OFFICER_BASE = [...'巳巳午午午未未未申申申酉酉酉戌戌戌亥亥亥子子子丑丑丑寅寅寅卯卯卯辰辰辰巳'];

/** 纪（六纪）：日/时干支 -> 第几纪（kintaiyi config.epochdict） */
export const EPOCH_GROUPS: Array<[string[], string]> = [
  [['甲子', '甲午', '乙丑', '乙未', '丙寅', '丙申', '丁卯', '丁酉', '戊辰', '戊戌'], '一'],
  [['己巳', '己亥', '庚午', '庚子', '辛未', '辛丑', '壬申', '壬寅', '癸酉', '癸卯'], '二'],
  [['甲戌', '甲辰', '乙亥', '乙巳', '丙子', '丙午', '丁丑', '丁未', '戊寅', '戊申'], '三'],
  [['己卯', '己酉', '庚辰', '庚戌', '辛巳', '辛亥', '壬午', '壬子', '癸未', '癸丑'], '四'],
  [['甲申', '甲寅', '乙酉', '乙卯', '丙戌', '丙辰', '丁亥', '丁巳', '戊子', '戊午'], '五'],
  [['己丑', '己未', '庚寅', '庚申', '辛卯', '辛酉', '壬辰', '壬戌', '癸巳', '癸亥'], '六'],
];

/** 五元：干支 -> 元首（kintaiyi config.jiyuan_dict） */
export const JIYUAN_GROUPS: Array<[string[], string]> = [
  [['甲子', '甲午', '乙丑', '乙未', '丙寅', '丙申', '丁卯', '丁酉', '戊辰', '戊戌', '己巳', '己亥'], '甲子'],
  [['庚午', '庚子', '辛未', '辛丑', '壬申', '壬寅', '癸酉', '癸卯', '甲戌', '甲辰', '乙亥', '乙巳'], '丙子'],
  [['丙子', '丙午', '丁丑', '丁未', '戊寅', '戊申', '己卯', '己酉', '庚辰', '庚戌', '辛巳', '辛亥'], '戊子'],
  [['壬午', '壬子', '癸未', '癸丑', '甲申', '甲寅', '乙酉', '乙卯', '丙戌', '丙辰', '丁亥', '丁巳'], '庚子'],
  [['戊子', '戊午', '己丑', '己未', '庚寅', '庚申', '辛卯', '辛酉', '壬辰', '壬戌', '癸巳', '癸亥'], '壬子'],
];

/** 算数阴阳（kintaiyi config.numdict） */
export const NUM_DICT: Record<number, string> = {
  1: '雜陰', 2: '純陰', 3: '純陽', 4: '雜陽', 6: '純陰', 7: '雜陰',
  8: '雜陽', 9: '純陽', 11: '陰中重陽', 12: '下和', 13: '雜重陽',
  14: '上和', 16: '下和', 17: '陰中重陽', 18: '上和', 19: '雜重陽',
  22: '純陰', 23: '次和', 24: '雜重陰', 26: '純陰', 27: '下和',
  28: '雜重陰', 29: '次和', 31: '雜重陽', 32: '次和', 33: '純陽',
  34: '下和', 37: '雜重陽', 38: '下和', 39: '純陽',
};

/** 主客定算七十二局表（kintaiyi config.find_cal，[主算, 客算, 定算]） */
export const YANG_CAL: Array<[number, number, number]> = [
  [7, 13, 13], [6, 1, 1], [1, 40, 32], [25, 17, 10], [25, 14, 1], [25, 10, 12], [8, 25, 9], [1, 22, 3], [3, 15, 33], [1, 12, 25],
  [4, 4, 13], [37, 1, 4], [18, 19, 19], [10, 9, 9], [9, 7, 6], [1, 33, 26], [7, 27, 16], [7, 26, 11], [8, 32, 14], [7, 26, 2],
  [2, 17, 33], [16, 30, 1], [16, 23, 32], [16, 17, 23], [39, 40, 40], [32, 31, 31], [31, 28, 31], [14, 9, 38], [13, 39, 26], [10, 32, 17],
  [33, 10, 34], [25, 8, 24], [24, 3, 15], [26, 4, 11], [25, 28, 1], [25, 27, 36], [1, 7, 7], [6, 35, 35], [35, 34, 26], [27, 19, 12],
  [27, 16, 3], [27, 12, 34], [8, 17, 1], [23, 14, 32], [32, 7, 25], [5, 16, 29], [4, 8, 17], [1, 5, 8], [24, 25, 25], [16, 15, 15],
  [15, 13, 6], [39, 31, 24], [38, 25, 14], [38, 24, 9], [16, 3, 22], [15, 34, 10], [10, 25, 10], [12, 26, 27], [12, 19, 28], [12, 13, 19],
  [33, 34, 34], [26, 25, 25], [25, 22, 18], [16, 11, 7], [15, 1, 28], [12, 34, 19], [25, 2, 26], [17, 8, 16], [16, 32, 7], [30, 4, 15],
  [29, 32, 5], [29, 31, 9],
];
export const YING_CAL: Array<[number, number, number]> = [
  [5, 29, 7], [4, 17, 1], [1, 16, 30], [25, 33, 2], [25, 30, 1], [17, 26, 10], [2, 3, 3], [1, 7, 7], [7, 33, 27], [1, 24, 25],
  [6, 26, 19], [35, 23, 8], [12, 37, 12], [12, 27, 11], [11, 25, 4], [1, 15, 24], [3, 9, 16], [3, 8, 9], [14, 16, 16], [13, 10, 10],
  [10, 1, 39], [24, 14, 1], [24, 7, 40], [16, 1, 29], [31, 16, 32], [30, 7, 29], [29, 4, 26], [8, 25, 32], [7, 15, 26], [2, 8, 15],
  [27, 28, 28], [27, 26, 26], [26, 18, 15], [29, 22, 9], [25, 10, 1], [25, 9, 34], [1, 25, 3], [4, 13, 37], [37, 12, 26], [33, 1, 10],
  [33, 38, 9], [25, 34, 38], [2, 1, 1], [39, 38, 38], [38, 31, 25], [7, 1, 31], [6, 32, 25], [1, 29, 14], [16, 1, 17], [16, 31, 15],
  [15, 29, 4], [33, 7, 16], [32, 1, 8], [32, 8, 1], [16, 18, 18], [15, 12, 12], [12, 3, 1], [18, 8, 35], [18, 1, 34], [10, 35, 25],
  [27, 22, 28], [26, 3, 25], [25, 4, 12], [16, 33, 3], [15, 23, 34], [10, 16, 23], [25, 26, 26], [25, 24, 24], [24, 16, 13], [32, 28, 15],
  [31, 16, 7], [31, 15, 1],
];

/** 六十四卦（序号 1..64） */
export const GUA_64 = '乾䷀,坤䷁,屯䷂,蒙䷃,需䷄,訟䷅,師䷆,比䷇,小畜䷈,履䷉,泰䷊,否䷋,同人䷌,大有䷍,謙䷎,豫䷏,隨䷐,蠱䷑,臨䷒,觀䷓,噬嗑䷔,賁䷕,剝䷖,復䷗,无妄䷘,大畜䷙,頤䷚,大過䷛,坎䷜,離䷝,咸䷞,恆䷟,遯䷠,大壯䷡,晉䷢,明夷䷣,家人䷤,睽䷥,蹇䷦,解䷧,損䷨,益䷩,夬䷪,姤䷫,萃䷬,升䷭,困䷮,井䷯,革䷰,鼎䷱,震䷲,艮䷳,漸䷴,歸妹䷵,豐䷶,旅䷷,巽䷸,兌䷹,渙䷺,節䷻,中孚䷼,小過䷽,既濟䷾,未濟䷿'.split(',');

/** 二十八宿 */
export const SU = [...'角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫'];

/** 十六辰 -> 宿（kintaiyi config.su_gong） */
export const SU_GONG: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  const keys = [...'子丑艮寅卯辰巽巳午未坤申酉戌乾亥'];
  const vals = [...'虛斗牛尾房亢角翼星鬼井參昴婁奎室'];
  keys.forEach((k, i) => { m[k] = vals[i]; });
  return m;
})();

/** 干支/卦 -> 五行（kintaiyi config.Ganzhiwuxing） */
export function ganzhiWuxing(ch: string): string | undefined {
  const groups: Array<[string, string]> = [
    ['甲寅乙卯震巽', '木'],
    ['丙巳丁午離', '火'],
    ['壬亥癸子坎', '水'],
    ['庚申辛酉乾兌', '金'],
    ['未丑戊己未辰戌艮坤', '土'],
  ];
  for (const [chars, wx] of groups) if (chars.includes(ch)) return wx;
  return undefined;
}

/** 五行两两关系（kintaiyi config.wuxing_relation_2，主体为前字） */
export function wuxingRelation(pair: string): string | undefined {
  const groups: Array<[string, string]> = [
    ['火水金火木金水土土木', '尅我'],
    ['水火火金金木土水木土', '我尅'],
    ['火火金金木木土土水水', '比和'],
    ['火木水金木水土火金土', '生我'],
    ['木火金水水木火土土金', '我生'],
  ];
  for (const [chars, rel] of groups) {
    for (let i = 0; i < chars.length; i += 2) {
      if (chars.slice(i, i + 2) === pair) return rel;
    }
  }
  return undefined;
}

/** 纳音五行（干支 -> 五行；kintaiyi config.nayin_wuxing） */
export const NAYIN_WUXING: Map<string, string> = (() => {
  const nayin = '甲子乙丑壬申癸酉庚辰辛巳甲午乙未壬寅癸卯庚戌辛亥,丙寅丁卯甲戌乙亥戊子己丑丙申丁酉甲辰乙巳戊午己未,戊辰己巳壬午癸未庚寅辛卯戊戌己亥壬子癸丑庚申辛酉,庚午辛未戊寅己卯丙戌丁亥庚子辛丑戊申己酉丙辰丁巳,甲申乙酉丙子丁丑甲寅乙卯丙午丁未壬戌癸亥壬辰癸巳'.split(',');
  const wx = [...'金火木土水'];
  const m = new Map<string, string>();
  nayin.forEach((s, gi) => {
    for (let i = 0; i < s.length; i += 2) m.set(s.slice(i, i + 2), wx[gi]);
  });
  return m;
})();

/** 节气名（自春分起；kintaiyi jieqi.jieqi_name 序） */
export const JIEQI_NAME = '春分,清明,穀雨,立夏,小滿,芒種,夏至,小暑,大暑,立秋,處暑,白露,秋分,寒露,霜降,立冬,小雪,大雪,冬至,小寒,大寒,立春,雨水,驚蟄'.split(',');

/** 阳遁节气（冬至起十二节气），其余为阴遁 */
export const YANG_DUN_JIEQI = new Set(rotate(JIEQI_NAME, '冬至').slice(0, 12));

/** 宫旺衰（kintaiyi jieqi.gong_wangzhuai） */
export const WANGZHUAI = [...'旺相胎沒死囚休廢'];
export const WANGZHUAI_NUM = [3, 4, 9, 2, 7, 6, 1, 8];
export const WANGZHUAI_JIEQI: Array<[string[], string]> = [
  [['春分', '清明', '穀雨'], '春分'],
  [['立夏', '小滿', '芒種'], '立夏'],
  [['夏至', '小暑', '大暑'], '夏至'],
  [['立秋', '處暑', '白露'], '立秋'],
  [['秋分', '寒露', '霜降'], '秋分'],
  [['立冬', '小雪', '大雪'], '立冬'],
  [['冬至', '小寒', '大寒'], '冬至'],
  [['立春', '雨水', '驚蟄'], '立春'],
];
/** 八节 -> 旺宫（jieqi_name[0::3] 与 wangzhuai_num 对位） */
export const JIEQI_WANG_GONG: Map<string, number> = zipMap(
  [JIEQI_NAME[0], JIEQI_NAME[3], JIEQI_NAME[6], JIEQI_NAME[9], JIEQI_NAME[12], JIEQI_NAME[15], JIEQI_NAME[18], JIEQI_NAME[21]],
  WANGZHUAI_NUM,
);

/** 计式名 */
export const JI_NAME: Record<number, string> = { 0: '年計', 1: '月計', 2: '日計', 3: '時計', 4: '分計' };
/** 积年流派名 */
export const METHOD_NAME: Record<number, string> = { 0: '太乙統宗', 1: '太乙金鏡', 2: '太乙淘金歌', 3: '太乙局' };

/** 中文数字（与 cn2an.an2cn 一致：19 -> 十九，110 -> 一百一十，103 -> 一百零三） */
const CN_DIGITS = [...'零一二三四五六七八九'];
function cnTens(n: number): string {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ''}`;
}
export function toCn(n: number): string {
  if (n < 10) return CN_DIGITS[n];
  if (n < 20) return `十${n % 10 ? CN_DIGITS[n % 10] : ''}`;
  if (n < 100) return cnTens(n);
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  const head = `${CN_DIGITS[hundreds]}百`;
  if (rem === 0) return head;
  if (rem < 10) return `${head}零${CN_DIGITS[rem]}`;
  return head + cnTens(rem);
}

/** 五子元起元干支 */
export const FIVE_YUAN_HEADS = ['甲子', '丙子', '戊子', '庚子', '壬子'];

// —— 命法用常数（kintaiyi config：Ganzhi_num/Ganzhi_place/gangzhi_to_num 等） ——

/** 五行 -> 策数（金13 木11 水7 火9 土15） */
export const WUXING_TO_NUM: Record<string, number> = { 金: 13, 木: 11, 水: 7, 火: 9, 土: 15 };

/** 天干合化数（甲己5 乙庚4 丙辛1 丁壬3 戊癸2） */
export const GANZHI_NUM: Record<string, number> = {
  甲: 5, 己: 5, 乙: 4, 庚: 4, 丙: 1, 辛: 1, 丁: 3, 壬: 3, 戊: 2, 癸: 2,
};

/** 天干起限之支（甲己午 乙庚巳 丙辛申 丁壬亥 戊癸寅） */
export const GANZHI_PLACE: Record<string, string> = {
  甲: '午', 己: '午', 乙: '巳', 庚: '巳', 丙: '申', 辛: '申', 丁: '亥', 壬: '亥', 戊: '寅', 癸: '寅',
};

/** 百六行限五行起数（土5 金4 水1 木3 火2） */
export const BAILIU_WUXING_NUM: Record<string, number> = { 土: 5, 金: 4, 水: 1, 木: 3, 火: 2 };

/** 十二命宫 */
export const TWELVE_GONGS = '命宮,兄弟,妻妾,子孫,財帛,田宅,官祿,奴僕,疾厄,福德,相貌,父母'.split(',');

/** 命法节气积数表（自冬至起二十四节气；kintaiyi config.jq_accum） */
export const JQ_ACCUM_VALUES = [
  3652425, 152184.37, 304368.75, 456553.12, 608727.50, 760921.87, 913106.25, 1065290.62,
  1217475, 1369659.37, 1522843.75, 1674028.12, 1826212.50, 1978396.87, 2130581.25, 2282765.62,
  2434950, 2587134.37, 2739318.75, 2891503.12, 3043687.50, 3195871.87, 3348056.25, 3500240.62,
];

/** 十精行星键（kintaiyi find_stars；日/月原键带全角空格，此处已裁剪） */
export const PLANET_KEYS = ['日', '月', '辰星', '太白', '熒惑', '歲星', '填星'];

/** 六十甲子自某干支起的 72 长循环（五子元局用） */
export function jiaziRing72(head: string): string[] {
  return [...rotate(JIAZI, head), ...rotate(JIAZI, head)].slice(0, 72);
}
