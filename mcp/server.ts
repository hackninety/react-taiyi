/**
 * 太乙 MCP server（协议接线）：把 tools.ts 的本地引擎与后端透传注册为 MCP 工具，
 * 供 Claude 等支持 MCP 的 AI 多轮调用推理（排盘 → 查局断辞 → 查釋文 → 查史例互证 → 应期）。
 *
 * 入口见 main.ts（stdio）；测试经 InMemoryTransport（tests/mcp.test.ts）。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as T from './tools';

const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });

function wrap(fn: () => string | Promise<string>) {
  return async () => {
    try {
      return text(await fn());
    } catch (e) {
      return { isError: true, ...text(`错误：${e instanceof Error ? e.message : String(e)}`) };
    }
  };
}

const dateShape = {
  year: z.number().int().describe('公历年，天文纪年（0=公元前1年，-1=前2年…）'),
  month: z.number().int().min(1).max(12).describe('月'),
  day: z.number().int().min(1).max(31).describe('日'),
  hour: z.number().int().min(0).max(23).describe('时（24小时制）'),
  minute: z.number().int().min(0).max(59).default(0).describe('分'),
};

const jiShape = {
  jiStyle: z.number().int().min(0).max(4).default(3)
    .describe('计式：0=年计 1=月计 2=日计 3=时计 4=分计（默认时计）'),
  acumYear: z.number().int().min(0).max(3).default(0)
    .describe('积年流派：0=太乙统宗 1=太乙金镜 2=太乙淘金歌 3=太乙局（默认统宗；不同流派结果不可混用）'),
};

const sexEnum = z.enum(['男', '女']);

export function createTaiyiMcpServer(): McpServer {
  const server = new McpServer({ name: 'taiyi', version: '0.1.0' });

  server.tool(
    'taiyi_chart',
    '太乙神数排盘（本地引擎，公元 600–9999 经黄金用例对照 kintaiyi；范围外自动切皇极拟推口径并在 meta 标注）。'
    + '返回完整 JSON：meta（流派口径，先读并全程锁定）、analysisContext（断事要点归集）、result（局式/太乙落宫/文昌始击/主客三算与将参/格局/八门/神煞/值卦）、'
    + 'mishuText（《太乙秘書》本局经典断辞，主客胜负以此为纲）、yijingRefs（本盘出现之卦的周易经文原文）。'
    + '可选：sex 给出即附太乙命法；trueSolarLongitude 给出即做真太阳时校正。排盘请先调此工具。',
    {
      ...dateShape, ...jiShape,
      sex: sexEnum.optional().describe('给出即附太乙命法（个人命盘，600–9999 内）'),
      includeHuangji: z.boolean().default(true).describe('是否附皇极经世历（元会运世大势）'),
      trueSolarLongitude: z.number().min(-180).max(180).optional()
        .describe('真太阳时校正：出生/事发地经度（东经为正）；不给则不校正'),
      tzOffsetMinutes: z.number().int().optional()
        .describe('输入时间的解释时区偏移分钟（默认 480=UTC+8 中国钟表时间；仅配合 trueSolarLongitude）'),
    },
    (a) => wrap(() => T.chart(a))(),
  );

  server.tool(
    'taiyi_mingfa',
    '太乙命法（个人命盘，本地引擎，600–9999）：命法积数、三才数、十二命宫（男女顺逆）、'
    + '阳九/百六行限（大限全表）、受气干支、出身卦与流年卦链（年月日时分）。',
    { ...dateShape, sex: sexEnum.describe('性别（决定十二命宫顺逆）') },
    (a) => wrap(() => T.mingfa(a))(),
  );

  server.tool(
    'huangji_calendar',
    '皇极经世历（邵雍元会运世，黄畿派岁卦·已校订原文；本地引擎，一元全跨度公元前 67016—公元 62583）：'
    + '任一年份的会（辟卦）/运卦（含变爻）/世卦/十年卦/岁卦，及月经/旬纬/日/时经卦（冬至换岁），'
    + '含 meta、大势归集与周易经文附录 yijingRefs。',
    {
      year: z.number().int().describe('公历年，天文纪年（0=公元前1年）'),
      month: z.number().int().min(1).max(12).optional().describe('月（影响岁内月日时卦；默认 6）'),
      day: z.number().int().min(1).max(31).optional().describe('日（默认 15）'),
      hour: z.number().int().min(0).max(23).optional().describe('时（默认 12）'),
    },
    (a) => wrap(() => T.huangji(a))(),
  );

  server.tool(
    'taiyi_mishu',
    '《太乙秘書》局断辞查表（本地数据，144 局全）：某阳/阴遁某局的经典总断——利主利客、出军方位、'
    + '阵法旗色、云气、伏兵时辰。主客胜负与趋避推演以此为纲、与盘面互证。',
    {
      dun: z.enum(['陽', '陰', '阳', '阴']).describe('阳遁/阴遁（繁简均可）'),
      num: z.number().int().min(1).max(72).describe('局数 1–72'),
    },
    (a) => wrap(() => T.mishu(a))(),
  );

  server.tool(
    'yijing_text',
    '《周易》通行本卦辞/爻辞原文查询（本地数据，源自 ctext.org 权威公版）。'
    + '引用任何卦爻辞前请先查此工具核对原文，勿凭记忆背诵（防错位串卦）。卦名繁/简/卦符 ䷀–䷿ 均可。',
    { names: z.array(z.string()).min(1).max(16).describe('卦名列表，如 ["乾","歸妹","䷦"]') },
    (a) => wrap(() => T.yijing(a))(),
  );

  server.tool(
    'taiyi_tenjing',
    '十精七曜落位（本地预计算表，kintaiyi find_stars 移植）：某公历日 日/月/辰星/太白/熒惑/歲星/填星所落地支。',
    {
      year: z.number().int().describe('公历年'),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    },
    (a) => wrap(() => T.tenjing(a))(),
  );

  server.tool(
    'taiyi_knowledge',
    '太乙判读规则速查（静态知识）：主客定位、两目一定起法、算数阴阳属性判定（无天无地无人/纯阳纯阴/三才足数）、'
    + '格局成立条件（掩迫关囚击格对提挟执提四郭固杜）、八门与三门五将、十六神方位、神煞所主、值卦。不熟太乙术语时先读。',
    {},
    () => wrap(() => T.knowledge())(),
  );

  server.tool(
    'kintaiyi_pan',
    'kintaiyi 全解释盘（后端直出《太乙統宗寶鑑》诸卷 97 键釋文：值宿断事/断法解释/釋格局全文/九星贵神/五運六氣五音/'
    + '統運卷十二/卦象卷十三/行支編年卷十四/分野卷八/軌運卷九/州國災變卷十一/十精雲氣卷十八/军事三卷/運籌博弈）。'
    + '**不带 keys 先返回键目录（含体积），再按需以 keys 取具体键**，防上下文爆量。',
    {
      ...dateShape, ...jiShape,
      keys: z.array(z.string()).optional().describe('要提取的键名（可跨分组多选，如 ["釋格局","卷十二"]）；缺省返回键目录'),
    },
    (a) => wrap(() => T.panRemote(a))(),
  );

  server.tool(
    'kintaiyi_life',
    '命法卷二十釋文（后端 taiyi_life 直出 59 键）：安命安身宮、飛祿飛馬黑符、十提金賦、十二宮星斷、'
    + '雙星同宮論、諸星上中下三等与卷二十全篇——命理人事断的第一手釋文。不带 keys 先返回键目录。',
    {
      ...dateShape,
      sex: sexEnum,
      keys: z.array(z.string()).optional().describe('要提取的键名；缺省返回键目录'),
    },
    (a) => wrap(() => T.lifeRemote(a))(),
  );

  server.tool(
    'kintaiyi_liu',
    '流卦運多期时间轴（后端直调上游 hex_timeline 推法）：流年12期/流月12期/流日15期/流時12辰/流分10期，'
    + '首期即起局时刻。注意：这是命法流卦相位（随起局时辰变化，非全年恒定），论流年以排盘值年卦为纲、此相位为辅。公元 1 年起。',
    dateShape,
    (a) => wrap(() => T.liuRemote(a))(),
  );

  server.tool(
    'taiyi_history_examples',
    '局數史例（上游 kintaiyi 古籍史例库 67 例）：给 year（天文纪年）查该年史载纪事与史載局數，供断局与史实互证；'
    + '不给 year 返回可查年份索引。',
    { year: z.number().int().optional().describe('天文纪年（0=公元前1年）；缺省返回年份索引') },
    (a) => wrap(() => T.historyExamples(a))(),
  );

  server.tool(
    'kintaiyi_docs',
    '上游 kintaiyi 文档直读：example=局數史例全文 / disaster=災異統計 / guji=古籍書目（按朝代） / '
    + 'instruction=看盤要領（使用步骤+六篇要義） / tutorial=教程 / update=上游更新日誌。长文档请用 query 按关键词过滤行。',
    {
      name: z.enum(['example', 'disaster', 'guji', 'instruction', 'tutorial', 'update']),
      query: z.string().optional().describe('关键词过滤（返回命中行及行号）'),
    },
    (a) => wrap(() => T.docs(a))(),
  );

  server.tool(
    'taiyi_status',
    '本地引擎能力范围与 kintaiyi 后端可用性/版本（排障用）。',
    {},
    () => wrap(() => T.status())(),
  );

  return server;
}
