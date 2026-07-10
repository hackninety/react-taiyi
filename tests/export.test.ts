import { describe, it, expect } from 'vitest';
import { calculateTaiyi, calculateHuangji, applyTrueSolarTime } from '../src/taiyi';
import { calculateMingfa } from '../src/taiyi/mingfa';
import { decode } from '@toon-format/toon';
import { toJSONText, toTOONText, toMarkdown, buildMeta, buildAnalysisContext } from '../src/taiyi/export';
import { generateAIPrompt } from '../src/lib/prompt';
import { findLongitude } from '../src/lib/cities';

const input = { year: 2026, month: 7, day: 3, hour: 14, minute: 30, jiStyle: 3, acumYear: 0 } as const;

describe('导出', () => {
  const result = calculateTaiyi({ ...input });
  const mingfa = calculateMingfa({ ...input }, '男', { year: 2026, month: 7, day: 3 });

  it('JSON 可解析且包含核心字段', () => {
    const parsed = JSON.parse(toJSONText({ result, mingfa }));
    expect(parsed.app).toBe('react-taiyi');
    expect(parsed.result.kook.num).toBe(result.kook.num);
    expect(parsed.result.board['中']).toBeDefined();
    expect(parsed.mingfa.lifeAccum).toBe(mingfa.lifeAccum);
  });

  it('时区/常居住地/流卦運并入导出（meta+JSON+ctx+markdown）', () => {
    const liuTimelines = {
      流年: [{ label: '2026', sub: '', 時刻: [2026, 7, 3, 14, 30], 卦: '乾', 卦符: '䷀', 卦數: 1, 爻: 1, 爻名: '初九' }],
      流月: [], 流日: [], 流時: [], 流分: [],
    };
    const payload = {
      result,
      solarTime: { applied: false, timezone: 'Asia/Tokyo', tzOffsetMinutes: 540 },
      residence: { text: '广东潮州湘桥区' },
      liuTimelines,
    };
    const meta = buildMeta(payload);
    expect(meta.时区).toContain('Asia/Tokyo');
    expect(meta.时区).toContain('UTC+9');
    expect(meta.常居住地).toContain('潮州');
    expect(meta.启用模块).toContain('流卦運多期（流年/月/日/時/分）');
    const parsed = JSON.parse(toJSONText(payload));
    expect(parsed.residence.text).toBe('广东潮州湘桥区');
    expect(parsed.liuTimelines.流年[0].卦).toBe('乾');
    expect(parsed.solarTime.timezone).toBe('Asia/Tokyo');
    const ctx = buildAnalysisContext(payload) as Record<string, string>;
    expect(ctx.常居住地).toContain('潮州');
    expect(ctx.流卦運要).toContain('流年：2026乾初九');
    const md = toMarkdown(payload);
    expect(md).toContain('常居住地：广东潮州湘桥区');
    expect(md).toContain('## 流卦運（五計多期）');
    expect(md).toContain('输入时间按 Asia/Tokyo（UTC+9）解释');
    // 断事要点归集补齐（与 JSON analysisContext 对齐）：流卦運要/常居住地 出现在归集 bullet
    expect(md).toContain('- **流卦運要**：');
    expect(md).toContain('- **常居住地**：');
    expect(md).toContain('- **卦爻辞须知**：');
  });

  it('kintaiyiPan 全解释盘并入 JSON 导出与 meta 模块', () => {
    const kintaiyiPan = { 釋格局: { 掩: '太乙掩击之释文' }, 卷十二: { 統運入卦: {} } };
    const parsed = JSON.parse(toJSONText({ result, kintaiyiPan }));
    expect(parsed.kintaiyiPan.釋格局.掩).toBe('太乙掩击之释文');
    expect(parsed.meta.启用模块).toContain('kintaiyi 全解释盘（統宗寶鑑诸卷）');
    // 未提供时不出现该字段
    const without = JSON.parse(toJSONText({ result }));
    expect(without.kintaiyiPan).toBeUndefined();
  });

  it('kintaiyiLife 命法卷二十釋文并入导出（JSON+meta+ctx+markdown+prompt）', () => {
    const kintaiyiLife = { 十提金賦: '三基五福太乙賦……', 十二宮星斷: { 命宮: { 五福: '五福居旺……' } } };
    const payload = { result, mingfa, kintaiyiLife };
    const parsed = JSON.parse(toJSONText(payload));
    expect(parsed.kintaiyiLife.十提金賦).toContain('三基五福');
    expect(parsed.meta.启用模块.join()).toContain('命法卷二十釋文');
    const ctx = buildAnalysisContext(payload) as Record<string, string>;
    expect(ctx.命法要).toContain('kintaiyiLife');
    const md = toMarkdown(payload);
    expect(md).toContain('### 卷二十釋文');
    const prompt = generateAIPrompt(payload);
    expect(prompt).toContain('kintaiyiLife');
    expect(prompt).toContain('十提金賦');
    expect(prompt).toContain('命理人事断的第一手釋文'); // 阅读指引（仅 hasLife 时出现）
    // 未提供时：无 kintaiyiLife 字段，且无命法釋文阅读指引（meta.流派声明仍会提及键名，故断言指引短语）
    expect(JSON.parse(toJSONText({ result, mingfa })).kintaiyiLife).toBeUndefined();
    expect(generateAIPrompt({ result, mingfa })).not.toContain('命理人事断的第一手釋文');
  });

  it('《太乙秘書》本局断辞并入导出（JSON+ctx+markdown+prompt）', () => {
    const parsed = JSON.parse(toJSONText({ result }));
    expect(parsed.mishuText.出處).toBe(`《太乙秘書》${result.kook.dun}遁第 ${result.kook.num} 局`);
    expect(parsed.mishuText.斷辭.length).toBeGreaterThan(30);
    const ctx = buildAnalysisContext({ result }) as Record<string, string>;
    expect(ctx.秘書局斷).toContain(`${result.kook.dun}遁第 ${result.kook.num} 局`);
    const md = toMarkdown({ result });
    expect(md).toContain('## 《太乙秘書》本局斷辭');
    expect(md).toContain('- **秘書局斷**：');
    const prompt = generateAIPrompt({ result });
    expect(prompt).toContain('mishuText');
    expect(prompt).toContain('《太乙秘書》');
  });

  it('所占何事（inquiry）并入导出与 Prompt 聚焦（meta+ctx+JSON+md+prompt）', () => {
    const payload = { result, inquiry: { topic: '事占', text: '某项目下半年可否推进' } };
    const meta = buildMeta(payload);
    expect(meta.所占之事).toContain('【事占】某项目下半年可否推进');
    const ctx = buildAnalysisContext(payload) as Record<string, string>;
    expect(ctx.所占之事).toContain('围绕此事');
    const parsed = JSON.parse(toJSONText(payload));
    expect(parsed.inquiry.topic).toBe('事占');
    const md = toMarkdown(payload);
    expect(md).toContain('所占何事：【事占】某项目下半年可否推进');
    const prompt = generateAIPrompt(payload);
    expect(prompt).toContain('本次所占（分析聚焦）');
    expect(prompt).toContain('宜动宜静');
    // 未设置时不出现
    expect(buildMeta({ result }).所占之事).toBeUndefined();
    expect(generateAIPrompt({ result })).not.toContain('本次所占');
    // 仅皇极模式同样注入
    const hjPrompt = generateAIPrompt({
      result: null,
      huangji: calculateHuangji(-2356, { month: 3, day: 15, hour: 12 }),
      huangjiOnlyInput: { year: -2356, month: 3, day: 15, hour: 12, minute: 0 },
      inquiry: { topic: '年运' },
    });
    expect(hjPrompt).toContain('本次所占（分析聚焦）');
  });

  it('周易经文附录并入导出（JSON+meta+ctx+markdown）', () => {
    const huangji = calculateHuangji(2026, { month: input.month, day: input.day, hour: input.hour });
    const payload = { result, huangji };
    const parsed = JSON.parse(toJSONText(payload));
    // 值卦与皇极各层的卦都应有经文
    expect(Array.isArray(parsed.yijingRefs.卦)).toBe(true);
    expect(parsed.yijingRefs.卦.length).toBeGreaterThan(0);
    const first = parsed.yijingRefs.卦[0];
    expect(first.卦辞.length).toBeGreaterThan(0);
    expect(Array.isArray(first.爻辞)).toBe(true);
    // 值年卦（result.yearGua，带卦符）应能被收录（卦符块 U+4DC0–4DFF 在 U+4E00 前，用 一-鿿 剥离）
    const yearHex = result.yearGua.replace(/[^一-鿿]/g, '');
    expect(parsed.yijingRefs.卦.some((h: { 卦: string }) => h.卦 === yearHex)).toBe(true);
    // 皇极运卦变爻应标为「本盘动爻」
    expect(parsed.yijingRefs.卦.some((h: { 本盘动爻?: string[] }) => h.本盘动爻?.length)).toBe(true);
    expect(parsed.meta.启用模块.join()).toContain('周易经文附录');
    const ctx = buildAnalysisContext(payload) as Record<string, string>;
    expect(ctx.卦爻辞须知).toContain('yijingRefs');
    const md = toMarkdown(payload);
    expect(md).toContain('## 周易经文（本盘出现之卦）');
    // 仅皇极模式也应有经文附录
    const hjOnly = JSON.parse(toJSONText({
      result: null,
      huangji: calculateHuangji(-2356, { month: 3, day: 15, hour: 12 }),
      huangjiOnlyInput: { year: -2356, month: 3, day: 15, hour: 12, minute: 0 },
    }));
    expect(hjOnly.yijingRefs.卦.length).toBeGreaterThan(0);
  });

  it('Markdown 含全部章节与关键数据', () => {
    const md = toMarkdown({
      result,
      mingfa,
      planets: { 午: ['太白'], 子: ['月'] },
    });
    for (const section of [
      '# 太乙神数排盘', '## 落位与主客定算', '## 十六神式盘',
      '## 九宫八门与旺衰', '## 格局', '## 神煞 · 卦', '## 十精（七曜落位）', '## 太乙命法',
      '### 十二命宫', '### 阳九行限', '### 百六行限',
    ]) {
      expect(md, section).toContain(section);
    }
    expect(md).toContain(result.kook.text);
    expect(md).toContain(`主算 | ${result.homeSuan.value}`);
    expect(md).toContain('太白(星)');
    expect(md).toContain(String(mingfa.lifeAccum));
  });

  it('无命法/十精时不输出对应章节', () => {
    const md = toMarkdown({ result });
    expect(md).not.toContain('## 太乙命法');
    expect(md).not.toContain('## 十精');
  });

  it('meta 标注流派明细，防错乱', () => {
    const huangji = calculateHuangji(2026, {
      month: input.month, day: input.day, hour: input.hour,
    });
    const meta = buildMeta({ result, huangji });
    expect(meta.太乙积年流派).toContain('太乙統宗');
    expect(meta.太乙积年流派).toContain('10,153,917');
    expect(meta.皇极岁卦流派).toContain('黄畿');
    expect(meta.皇极岁卦流派).toContain('已校订原文');
    expect(meta.启用模块).toContain('皇极经世历（元会运世卦历）');
    expect(meta.流派声明).toContain('不可混用');
  });

  it('analysisContext 归集太乙与皇极要点', () => {
    const huangji = calculateHuangji(2026, {
      month: input.month, day: input.day, hour: input.hour,
    });
    const ctx = buildAnalysisContext({ result, huangji }) as Record<string, unknown>;
    expect(ctx.太乙盘要).toContain(result.kook.text);
    expect(Array.isArray(ctx.格局)).toBe(true);
    expect(ctx.皇极大势).toContain('会');
    expect(ctx.皇极大势).toContain('岁卦');
  });

  it('Markdown 含排盘明细与断事归集，标注黄畿已校订状态', () => {
    const huangji = calculateHuangji(2026, {
      month: input.month, day: input.day, hour: input.hour,
    });
    const md = toMarkdown({ result, huangji });
    expect(md).toContain('## 排盘明细');
    expect(md).toContain('## 断事要点归集');
    expect(md).toContain('太乙积年流派');
    expect(md).toContain('黄畿派 · 已校订原文');
  });

  it('AI Prompt 含分析框架与完整 TOON 数据（含格式说明）', () => {
    const prompt = generateAIPrompt({ result, mingfa });
    expect(prompt).toContain('太乙神数');
    expect(prompt).toContain('### 1. 局式总论');
    expect(prompt).toContain('### 6. 太乙命法（人事）');
    expect(prompt).toContain('```toon');
    expect(prompt).toContain('数据格式说明');
    expect(prompt).toContain(result.kook.text);
    const noMingfa = generateAIPrompt({ result });
    expect(noMingfa).not.toContain('太乙命法（人事）');
    // 仅皇极模式同样为 TOON
    const hj = generateAIPrompt({
      result: null,
      huangji: calculateHuangji(-2356, { month: 3, day: 15, hour: 12 }),
      huangjiOnlyInput: { year: -2356, month: 3, day: 15, hour: 12, minute: 0 },
    });
    expect(hj).toContain('```toon');
  });

  it('TOON 导出与 JSON 同构：往返解码逐字段一致且体积更小', () => {
    const huangji = calculateHuangji(2026, { month: input.month, day: input.day, hour: input.hour });
    const payload = { result, mingfa, huangji };
    const jsonStr = toJSONText(payload);
    const toonStr = toTOONText(payload);
    const jo = JSON.parse(jsonStr) as Record<string, unknown>;
    const to = decode(toonStr) as Record<string, unknown>;
    // exportedAt 为两次调用的时间戳，剔除后比对
    delete jo.exportedAt;
    delete to.exportedAt;
    expect(to).toEqual(jo);
    expect(toonStr.length).toBeLessThan(jsonStr.length);
  });

  it('AI Prompt 反幻觉工程：事实清单+应期专节+自检+键路径', () => {
    const huangji = calculateHuangji(2026, { month: input.month, day: input.day, hour: input.hour });
    const prompt = generateAIPrompt({ result, mingfa, huangji });
    // 事实清单先行
    expect(prompt).toContain('第一步 · 盘面事实清单');
    expect(prompt).toContain('只誊录、不解读');
    // 应期推断专节（命法+皇极时 = 第 8 节）
    expect(prompt).toContain('### 8. 应期推断（时间维度）');
    expect(prompt).toContain('### 9. 综合断语与建议');
    // 自检段
    expect(prompt).toContain('分析后 · 自检');
    expect(prompt).toContain('来源键路径');
    // 无命法无皇极时应期为第 6 节、综合为第 7 节
    const bare = generateAIPrompt({ result });
    expect(bare).toContain('### 6. 应期推断（时间维度）');
    expect(bare).toContain('### 7. 综合断语与建议');
  });

  it('meta 流派声明澄清释文不随积年流派切换', () => {
    const meta = buildMeta({ result });
    expect(meta.流派声明).toContain('統宗寶鑑');
    expect(meta.流派声明).toContain('不随所选积年流派切换');
  });
});

describe('仅皇极模式导出（太乙范围外）', () => {
  const huangji = calculateHuangji(-2356, { month: 3, day: 15, hour: 12 });
  const payload = {
    result: null,
    huangji,
    huangjiOnlyInput: { year: -2356, month: 3, day: 15, hour: 12, minute: 0 },
  };

  it('JSON 无 result、含 meta 未出盘说明与皇极数据', () => {
    const parsed = JSON.parse(toJSONText(payload));
    expect(parsed.result).toBeUndefined();
    expect(String(parsed.meta.太乙主盘)).toContain('未出盘');
    expect(parsed.huangji.sui.name).toBe('隨');
    expect(parsed.analysisContext.皇极大势).toContain('隨');
  });

  it('Markdown 为皇极单页且标注公元前年份', () => {
    const md = toMarkdown(payload);
    expect(md).toContain('# 皇极经世历 · 公元前 2357 年');
    expect(md).toContain('## 推算明细');
    expect(md).toContain('岁卦（黄畿派）：隨');
    expect(md).not.toContain('## 十六神式盘');
  });

  it('AI Prompt 用元会运世专用框架', () => {
    const prompt = generateAIPrompt(payload);
    expect(prompt).toContain('### 1. 元会运世定位');
    expect(prompt).toContain('皇极岁卦流派');
    expect(prompt).not.toContain('主客定算');
  });
});

describe('真太阳时（校正量 = 经度×4 − 解释时区偏移；城市模式恒 UTC+8）', () => {
  it('城市模式：选乌鲁木齐（UTC+8 解释）≈ -130 分钟', () => {
    const lng = findLongitude('新疆', '乌鲁木齐', '市区')!;
    const adjusted = applyTrueSolarTime(2026, 7, 3, 12, 25, lng, 480);
    expect(adjusted.offsetMinutes).toBe(Math.round(lng * 4 - 480));
    expect(adjusted.offsetMinutes).toBe(Math.round((lng - 120) * 4));
    expect(adjusted.hour).toBe(10);
    expect(adjusted.minute).toBe(15);
  });

  it('城市模式：东京操作选潮州湘桥 6:10（视为北京时间）→ -13 分钟 → 5:57', () => {
    const lng = findLongitude('广东', '潮州', '湘桥区')!;
    const adjusted = applyTrueSolarTime(2026, 7, 4, 6, 10, lng, 480);
    expect(adjusted.offsetMinutes).toBe(Math.round(lng * 4 - 480));
    expect(adjusted.hour).toBe(5);
    expect([56, 57]).toContain(adjusted.minute); // 经度表精度容差 ±1 分钟
  });

  it('纯函数数学口径：经度 116.41 × tz540 → -74 分钟（自动模式跨区等价式）', () => {
    const lng = findLongitude('北京', '北京', '市区')!; // 116.41
    const adjusted = applyTrueSolarTime(2026, 7, 3, 19, 12, lng, 540);
    expect(adjusted.offsetMinutes).toBe(-74);
    expect(adjusted.hour).toBe(17);
    expect(adjusted.minute).toBe(58);
  });

  it('自动模式：东京时区在东京 ≈ +19 分钟', () => {
    const adjusted = applyTrueSolarTime(2026, 7, 3, 19, 12, 139.69, 540);
    expect(adjusted.offsetMinutes).toBe(19);
    expect(adjusted.hour).toBe(19);
    expect(adjusted.minute).toBe(31);
  });

  it('跨日回退', () => {
    const adjusted = applyTrueSolarTime(2026, 7, 1, 0, 30, 87.62, 480);
    expect(adjusted.day).toBe(30);
    expect(adjusted.month).toBe(6);
    expect(adjusted.hour).toBe(22);
  });
});
