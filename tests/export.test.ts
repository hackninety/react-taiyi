import { describe, it, expect } from 'vitest';
import { calculateTaiyi, calculateHuangji, applyTrueSolarTime } from '../src/taiyi';
import { calculateMingfa } from '../src/taiyi/mingfa';
import { toJSONText, toMarkdown, buildMeta, buildAnalysisContext } from '../src/taiyi/export';
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
    const huangji = calculateHuangji(2026, '祝泌', {
      monthGz: result.ganzhi[1], dayGz: result.ganzhi[2], hourBranch: result.ganzhi[3][1],
    });
    const meta = buildMeta({ result, huangji });
    expect(meta.太乙积年流派).toContain('太乙統宗');
    expect(meta.太乙积年流派).toContain('10,153,917');
    expect(meta.皇极岁卦流派).toContain('祝泌');
    expect(meta.皇极岁卦流派).toContain('仅供参考');
    expect(meta.启用模块).toContain('皇极经世历');
    expect(meta.流派声明).toContain('不可混用');
  });

  it('analysisContext 归集太乙与皇极要点', () => {
    const huangji = calculateHuangji(2026, '黄畿', {
      monthGz: result.ganzhi[1], dayGz: result.ganzhi[2], hourBranch: result.ganzhi[3][1],
    });
    const ctx = buildAnalysisContext({ result, huangji }) as Record<string, unknown>;
    expect(ctx.太乙盘要).toContain(result.kook.text);
    expect(Array.isArray(ctx.格局)).toBe(true);
    expect(ctx.皇极大势).toContain('会');
    expect(ctx.皇极大势).toContain('岁卦');
  });

  it('Markdown 含排盘明细与断事归集，标注祝泌参考状态', () => {
    const huangji = calculateHuangji(2026, '祝泌', {
      monthGz: result.ganzhi[1], dayGz: result.ganzhi[2], hourBranch: result.ganzhi[3][1],
    });
    const md = toMarkdown({ result, huangji });
    expect(md).toContain('## 排盘明细');
    expect(md).toContain('## 断事要点归集');
    expect(md).toContain('太乙积年流派');
    expect(md).toContain('未校订·仅供参考');
  });

  it('AI Prompt 含分析框架与完整 JSON', () => {
    const prompt = generateAIPrompt({ result, mingfa });
    expect(prompt).toContain('太乙神数');
    expect(prompt).toContain('### 1. 局式总论');
    expect(prompt).toContain('### 6. 太乙命法（人事）');
    expect(prompt).toContain('```json');
    expect(prompt).toContain(result.kook.text);
    const noMingfa = generateAIPrompt({ result });
    expect(noMingfa).not.toContain('太乙命法（人事）');
  });
});

describe('真太阳时', () => {
  it('经度每度校正 4 分钟（乌鲁木齐约 -130 分钟）', () => {
    const lng = findLongitude('新疆', '乌鲁木齐', '市区')!;
    const adjusted = applyTrueSolarTime(2026, 7, 3, 12, 25, lng);
    expect(adjusted.offsetMinutes).toBe(Math.round((lng - 120) * 4));
    expect(adjusted.hour).toBe(10);
    expect(adjusted.minute).toBe(15);
  });

  it('跨日回退', () => {
    const adjusted = applyTrueSolarTime(2026, 7, 1, 0, 30, 87.62);
    expect(adjusted.day).toBe(30);
    expect(adjusted.month).toBe(6);
    expect(adjusted.hour).toBe(22);
  });
});
