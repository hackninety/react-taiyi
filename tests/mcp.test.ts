import { describe, it, expect, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createTaiyiMcpServer } from '../mcp/server';

/**
 * MCP server 协议级测试：InMemoryTransport 直连 client/server，
 * 本地工具走真引擎，远程工具 stub 全局 fetch（不打真后端）。
 */

async function connect(): Promise<Client> {
  const server = createTaiyiMcpServer();
  const client = new Client({ name: 'test', version: '0' });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return client;
}

interface ToolResult { isError?: boolean; content: Array<{ type: string; text: string }> }

async function call(client: Client, name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
  return await client.callTool({ name, arguments: args }) as ToolResult;
}

const textOf = (r: ToolResult): string => r.content[0].text;

afterEach(() => vi.unstubAllGlobals());

describe('taiyi MCP server', () => {
  it('注册全部 14 个工具', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'huangji_calendar', 'kintaiyi_docs', 'kintaiyi_life', 'kintaiyi_liu', 'kintaiyi_pan',
      'taiyi_chart', 'taiyi_classics', 'taiyi_history_examples', 'taiyi_knowledge', 'taiyi_mingfa',
      'taiyi_mishu', 'taiyi_status', 'taiyi_tenjing', 'yijing_text',
    ].sort());
  });

  it('taiyi_classics：目录 / 取卷（中文与数字卷号）/ 检索 / 分段越界', async () => {
    const client = await connect();
    // 目录
    const dir = JSON.parse(textOf(await call(client, 'taiyi_classics')));
    expect(dir.书名).toBe('太乙金鏡式經');
    expect(dir.目录).toHaveLength(11); // 提要 + 十卷
    // 取卷（中文卷号）
    const v1 = JSON.parse(textOf(await call(client, 'taiyi_classics', { chapter: '卷一' })));
    expect(v1.文).toContain('推上元積年');
    expect(v1.文).toContain('王希明');
    // 数字卷号 → 卷三
    const v3 = JSON.parse(textOf(await call(client, 'taiyi_classics', { chapter: '3' })));
    expect(v3.卷).toBe('卷三');
    // 提要
    const ty = JSON.parse(textOf(await call(client, 'taiyi_classics', { chapter: '提要' })));
    expect(ty.文).toContain('太乙金鏡式經十卷唐王希明撰');
    // 全书检索
    const q = JSON.parse(textOf(await call(client, 'taiyi_classics', { query: '推上元積年' })));
    expect(q.命中).toBeGreaterThan(0);
    expect(q.行[0].卷).toBeTruthy();
    // 分段越界
    const err = await call(client, 'taiyi_classics', { chapter: '卷十', part: 99 });
    expect(err.isError).toBe(true);
  });

  it('taiyi_chart：本地排盘含 meta/analysisContext/秘書斷辭/周易附录，sex 附命法', async () => {
    const client = await connect();
    const r = await call(client, 'taiyi_chart', {
      year: 2026, month: 7, day: 10, hour: 12, minute: 0, jiStyle: 3, acumYear: 0, sex: '男',
    });
    expect(r.isError).toBeFalsy();
    const parsed = JSON.parse(textOf(r));
    expect(parsed.meta.太乙积年流派).toContain('太乙統宗');
    expect(parsed.analysisContext.主客态势).toBeTruthy();
    expect(parsed.result.kook.num).toBeGreaterThanOrEqual(1);
    expect(parsed.mishuText.斷辭.length).toBeGreaterThan(30);
    expect(parsed.yijingRefs.卦.length).toBeGreaterThan(0);
    expect(parsed.mingfa.lifeAccum).toBeGreaterThan(0);
    expect(parsed.huangji.sui.name).toBeTruthy();
  });

  it('taiyi_chart：真太阳时校正在导出中标注', async () => {
    const client = await connect();
    const r = await call(client, 'taiyi_chart', {
      year: 2026, month: 7, day: 10, hour: 12, minute: 0, jiStyle: 3, acumYear: 0,
      includeHuangji: false, trueSolarLongitude: 87.62, tzOffsetMinutes: 480,
    });
    const parsed = JSON.parse(textOf(r));
    expect(parsed.solarTime.applied).toBe(true);
    expect(parsed.solarTime.offsetMinutes).toBeLessThan(-100); // 乌鲁木齐经度 ≈ -130 分钟
  });

  it('taiyi_mishu：简体输入归一，返回局断辞', async () => {
    const client = await connect();
    const r = await call(client, 'taiyi_mishu', { dun: '阳', num: 1 });
    const parsed = JSON.parse(textOf(r));
    expect(parsed.出處).toBe('《太乙秘書》陽遁第 1 局');
    expect(parsed.斷辭).toContain('太乙在一宮');
  });

  it('yijing_text：繁/简/卦符均可查', async () => {
    const client = await connect();
    const r = await call(client, 'yijing_text', { names: ['乾', '归妹', '䷦'] });
    const parsed = JSON.parse(textOf(r));
    expect(parsed[0].爻辞[0]).toContain('潛龍');
    expect(parsed[1].卦).toBe('歸妹');
    expect(parsed[2].卦).toBe('蹇');
  });

  it('huangji_calendar：尧甲辰锚点（-2356 岁卦=隨）', async () => {
    const client = await connect();
    const r = await call(client, 'huangji_calendar', { year: -2356, month: 3, day: 15 });
    const parsed = JSON.parse(textOf(r));
    expect(parsed.huangji.sui.name).toBe('隨');
    expect(parsed.meta.皇极岁卦流派).toContain('黄畿');
  });

  it('taiyi_knowledge：返回判读规则速查', async () => {
    const client = await connect();
    const r = await call(client, 'taiyi_knowledge');
    expect(textOf(r)).toContain('判读规则速查');
    expect(textOf(r)).toContain('三门具不具');
  });

  it('kintaiyi_pan：无 keys 返回键目录，有 keys 过滤取键（stub fetch）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      source: 'kintaiyi', ref: 'abc1234',
      pan: { 釋格局: { 掩: '掩者……' }, 卷十二: { 統運入卦: '……' }, 太乙: 1 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const client = await connect();
    const dir = JSON.parse(textOf(await call(client, 'kintaiyi_pan', {
      year: 2026, month: 7, day: 10, hour: 12, minute: 0, jiStyle: 3, acumYear: 0,
    })));
    expect(dir.上游).toBe('abc1234');
    expect(JSON.stringify(dir.分组)).toContain('釋格局');
    expect(JSON.stringify(dir.其他键)).toContain('太乙');
    const picked = JSON.parse(textOf(await call(client, 'kintaiyi_pan', {
      year: 2026, month: 7, day: 10, hour: 12, minute: 0, jiStyle: 3, acumYear: 0,
      keys: ['釋格局', '不存在的键'],
    })));
    expect(picked.内容.釋格局.掩).toContain('掩者');
    expect(picked.未找到键).toEqual(['不存在的键']);
  });

  it('taiyi_history_examples：解析 md 表并按天文纪年匹配（stub fetch）', async () => {
    const md = '# 局數史例\n\n|年份|局數|事件|出處|\n|---|---|---|---|\n|-2357|39|尧即位|太乙金鏡|\n|1644|13|明亡|太乙統宗|\n';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(md, { status: 200 })));
    const client = await connect();
    const idx = JSON.parse(textOf(await call(client, 'taiyi_history_examples')));
    expect(idx.条数).toBe(2);
    // 天文纪年 -2356 = 公元前 2357 年直记
    const hit = JSON.parse(textOf(await call(client, 'taiyi_history_examples', { year: -2356 })));
    expect(hit.命中).toBe(1);
    expect(hit.史例[0].event).toBe('尧即位');
  });

  it('kintaiyi_docs：query 过滤返回命中行（stub fetch）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('甲\n太乙統宗寶鑑十六卷\n乙', { status: 200 })));
    const client = await connect();
    const r = await call(client, 'kintaiyi_docs', { name: 'guji', query: '統宗' });
    expect(textOf(r)).toContain('2: 太乙統宗寶鑑十六卷');
    expect(textOf(r)).not.toContain('甲');
  });

  it('工具内错误以 isError 返回（流卦運公元前）', async () => {
    const client = await connect();
    const r = await call(client, 'kintaiyi_liu', { year: 0, month: 1, day: 1, hour: 0, minute: 0 });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain('不支持公元前');
  });

  it('zod 参数校验在协议层拒绝（局数越界）', async () => {
    const client = await connect();
    const r = await call(client, 'taiyi_mishu', { dun: '陽', num: 73 });
    // SDK 对参数校验失败返回 isError 工具结果
    expect(r.isError).toBe(true);
  });
});
