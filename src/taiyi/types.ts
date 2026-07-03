/** 太乙计式：0=年计 1=月计 2=日计 3=时计 4=分计 */
export type JiStyle = 0 | 1 | 2 | 3 | 4;

/** 积年流派：0=太乙统宗 1=太乙金镜 2=太乙淘金歌 3=太乙局 */
export type AcumYear = 0 | 1 | 2 | 3;

export type Dun = '陽' | '陰';

export interface TaiyiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  jiStyle: JiStyle;
  acumYear: AcumYear;
}

export interface KookInfo {
  /** 如「陽遁七十二局」 */
  text: string;
  /** 局数 1..72 */
  num: number;
  /** 阳遁/阴遁 */
  dun: Dun;
  /** 理天/理地/理人 */
  sanYear: string;
  /** 积数 */
  accNum: number;
}

export interface SuanInfo {
  /** 算数 */
  value: number;
  /** 算数阴阳解（纯阳/杂阴/无天/无地…） */
  descriptions: string[];
}

/** 十六神盘 17 个位置（十六辰 + 中） */
export type GongName =
  | '子' | '丑' | '艮' | '寅' | '卯' | '辰' | '巽' | '巳'
  | '午' | '未' | '坤' | '申' | '酉' | '戌' | '乾' | '亥' | '中';

export interface TaiyiResult {
  input: TaiyiInput;
  jiName: string;          // 年计/月计/日计/时计/分计
  methodName: string;      // 太乙统宗/太乙金镜/太乙淘金歌/太乙局
  /** 历法口径：标准（lunar-typescript，600–9999 黄金验证）或 皇极拟推（全跨度） */
  calendarMode: '标准' | '皇极拟推';
  /** [年柱, 月柱, 日柱, 时柱, 分柱] */
  ganzhi: string[];
  lunar: { year: number; month: number; day: number; text: string };
  jieqi: string;           // 当前节气
  jiyuan: string;          // 纪元
  taisui: string;          // 太岁（按计式取支）
  kook: KookInfo;
  fiveYuanKook: string;    // 五子元局
  yangjiu: string;         // 阳九
  bailiu: string;          // 百六
  taiyiGong: number;       // 太乙落宫 1-9
  taiyiGongName: string;   // 太乙落宫辰名
  homeAwayHint: string;    // 太乙在天外地内（助主/助客）
  skyEyes: string;         // 文昌（天目）所在辰
  skyEyesDesc: string;     // 文昌处境（七十二局格局表）
  shiJi: string;           // 始击所在辰
  shiJiXiu: string;        // 始击值宿（二十八宿）
  dingMu: string;          // 定目
  heGod: string;           // 合神
  jiGod: string;           // 计神
  homeSuan: SuanInfo;      // 主算
  homeGeneral: number;     // 主大将宫
  homeVGen: number;        // 主参将宫
  awaySuan: SuanInfo;      // 客算
  awayGeneral: number;     // 客大将宫
  awayVGen: number;        // 客参将宫
  setSuan: SuanInfo;       // 定算
  setGeneral: number;      // 定大将宫
  setVGen: number;         // 定参将宫
  kingBase: string;        // 君基
  officerBase: string;     // 臣基
  pplBase: string;         // 民基
  fourGod: string;         // 四神
  skyYi: string;           // 天乙
  earthYi: string;         // 地乙
  zhiFu: string;           // 直符
  flyFu: string;           // 飞符
  yearChin: string;        // 太岁禽星
  startXiu: string;        // 二十八宿起宿（始击值宿排布首位）
  doors: Record<number, string>;    // 八门分布：宫数 -> 门
  zhishiDoor: string;      // 值事门
  threeDoors: string;      // 三门具不具
  fiveGenerals: string;    // 五将发不发
  homeAwayRelation: string; // 推主客相关法
  guDan: string;            // 孤单以占成败
  yearGua: string;          // 值年卦
  dayGua: string;           // 值日卦
  hourGua: string;          // 值时卦
  geJu: Record<string, string>;  // 格局 -> 释义
  /** 十六神盘（含中宫）每格的星将列表 */
  board: Record<GongName, string[]>;
  /** 各宫旺衰（按节气） */
  wangZhuai: Record<number, string>;
}
