/**
 * kintaiyi 全解释盘（上游 Taiyi.pan() 直出，经 python-taiyi POST /api/taiyi/pan 透传）。
 *
 * 数据为上游中文键原样（97 键），本模块只做「分组归类」供渲染与守卫测试：
 * - PAN_GROUPS：主题分组（值宿断事/断法解释/明所主术/釋格局/诸卷/军事/博弈…）
 * - PAN_IGNORED：与本地盘面重复展示或元信息键，不再重复渲染
 * 上游若新增键，tests/pan.test.ts 的「全覆盖」断言会报警提示归组。
 */
import type { TaiyiInput } from './types';

export type PanData = Record<string, unknown>;

export interface PanResp {
  source: string;
  ref: string;
  pan: PanData;
}

export async function fetchPan(
  input: TaiyiInput,
  base: string,
  game: boolean,
  signal?: AbortSignal,
): Promise<PanResp> {
  const res = await fetch(`${base}/api/taiyi/pan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      year: input.year, month: input.month, day: input.day,
      hour: input.hour, minute: input.minute,
      ji: input.jiStyle, acum: input.acumYear,
      game,
    }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail?.code) msg = `${body.detail.code}: ${body.detail.message ?? ''}`;
    } catch { /* keep */ }
    throw new Error(msg);
  }
  return res.json() as Promise<PanResp>;
}

/** 流卦運多期时间轴（后端 /api/taiyi/liu 直调上游 apps/hex_timeline 推法） */
export interface LiuStep {
  label: string;
  sub: string;
  時刻: number[];
  卦: string;
  卦符: string;
  卦數: number;
  爻: number;
  爻名: string;
}

export type LiuData = Record<'流年' | '流月' | '流日' | '流時' | '流分', LiuStep[]>;

export async function fetchLiu(
  input: TaiyiInput,
  base: string,
  signal?: AbortSignal,
): Promise<{ ref: string; liu: LiuData }> {
  const res = await fetch(`${base}/api/taiyi/liu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      year: input.year, month: input.month, day: input.day,
      hour: input.hour, minute: input.minute,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** 命法全盘（后端 /api/taiyi/life 直调上游 taiyi_life()，含卷二十扩展） */
export async function fetchLife(
  input: TaiyiInput,
  sex: '男' | '女',
  base: string,
  signal?: AbortSignal,
): Promise<{ ref: string; life: PanData }> {
  const res = await fetch(`${base}/api/taiyi/life`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      year: input.year, month: input.month, day: input.day,
      hour: input.hour, minute: input.minute, sex,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** 上游文档（局數史例/災異統計/古籍書目/看盤要領/教程/更新日誌）*/
export type DocName = 'example' | 'disaster' | 'guji' | 'instruction' | 'tutorial' | 'update';

export async function fetchDoc(name: DocName, base: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${base}/api/docs/${name}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export interface PanGroup {
  title: string;
  /** 出处/说明（《太乙統宗寶鑑》卷次等） */
  note?: string;
  keys: string[];
}

/** 主题分组（键名与上游 pan() 输出严格一致，勿改写） */
export const PAN_GROUPS: PanGroup[] = [
  {
    title: '盤面補充',
    note: '年號紀年、值日宿、值事門與金函玉鏡',
    keys: ['年號', '二十八宿值日', '八門值事', '金函玉鏡'],
  },
  {
    title: '值宿斷事',
    note: '太歲／始擊所值二十八宿及斷辭、十天干歲始擊落宮預測',
    keys: ['太歲二十八宿', '太歲值宿斷事', '始擊二十八宿', '始擊值宿斷事', '十天干歲始擊落宮預測'],
  },
  {
    title: '斷法解釋',
    note: '諸推斷法釋文（三門五將／主客／勝負／風雲飛鳥／孤單／厄會／雷公臨津獅子白雲猛虎白龍回軍等占）',
    keys: [
      '推三門具不具', '推五將發不發', '推主客相闗法', '推多少以占勝負',
      '推太乙風雲飛鳥助戰法', '推孤單以占成敗', '推陰陽以占厄會', '明天子巡狩之期術',
      '推雷公入水', '推臨津問道', '推獅子反擲', '推白雲捲空', '推猛虎相拒',
      '推白龍得雲', '推回軍無言', '推太乙當時法',
    ],
  },
  {
    title: '明所主術',
    note: '君臣民基／五福／天乙地乙值符所主',
    keys: [
      '明君基太乙所主術', '明臣基太乙所主術', '明民基太乙所主術',
      '明五福太乙所主術', '明五福吉算所主術',
      '明天乙太乙所主術', '明地乙太乙所主術', '明值符太乙所主術',
    ],
  },
  {
    title: '釋格局',
    note: '《太乙統宗寶鑑》卷四：本局所現格局全文釋義',
    keys: ['釋格局'],
  },
  {
    title: '九星貴神',
    note: '卷六／卷十：三旗行宮、九宮貴神、太乙九星、文昌九星、天目合會歲會',
    keys: ['三旗行宮', '九宮貴神', '太乙九星', '文昌九星', '卷十'],
  },
  {
    title: '運氣音律',
    note: '卷三／卷十：五運六氣與五音之數',
    keys: ['五運六氣', '五音之數'],
  },
  {
    title: '統運（卷十二）',
    note: '統運入卦、十二運立成、入爻禍福、流年直卦、歷史入爻、災厄首尾、變卦納甲、觀象期',
    keys: ['卷十二'],
  },
  {
    title: '卦象（卷十三）',
    note: '統運卦象、卦象總述與動爻辭全文、要訣',
    keys: ['卷十三'],
  },
  {
    title: '行支編年（卷十四）',
    note: '統運八卦行支編年與歷史驗例',
    keys: ['卷十四'],
  },
  {
    title: '分野（卷八）',
    note: '九宮十二分野、絳宮明堂玉堂、歲建分野',
    keys: ['卷八'],
  },
  {
    title: '軌運（卷九）',
    note: '大小遊軌運、內外入卦、四象之策、陽九百六限數、小遊行爻災祥',
    keys: ['卷九'],
  },
  {
    title: '州國災變（卷十一）',
    note: '十六宮間變化、州國災變月數、飛符四殺、城名厄會、歲內災發',
    keys: ['卷十一'],
  },
  {
    title: '十精雲氣（卷十八）',
    note: '十精落宮所主、雲氣合會斷語、子房總訣、雲氣色法',
    keys: ['卷十八'],
  },
  {
    title: '軍事',
    note: '卷五戰略／卷十五應用（五陣置旗·陳兵出鄉）／卷十七占斷／卷二卷七神將所主',
    keys: ['軍事戰略', '軍事應用', '軍事占斷', '神將所主'],
  },
  {
    title: '運籌博弈',
    note: '零和支付矩陣與 Nash 均衡（現代方法對照古法主客相關）',
    keys: ['運籌博弈分析'],
  },
];

/** 与本地盘面重复展示或输入元信息，不在解释卡重复渲染 */
export const PAN_IGNORED: string[] = [
  '太乙計', '太乙公式類別', '公元日期', '干支', '農曆', '紀元', '太歲',
  '局式', '五子元局', '陽九', '百六',
  '太乙落宮', '太乙', '天乙', '地乙', '四神', '直符', '文昌', '始擊',
  '主算', '主將', '主參', '客算', '客將', '客參', '定算',
  '合神', '計神', '定目', '君基', '臣基', '民基',
  '五福', '帝符', '太尊', '飛鳥', '三風', '五風', '八風', '大游', '小游',
  '八門分佈', '十六宮分佈', '八宮旺衰',
];
