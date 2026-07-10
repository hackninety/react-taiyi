import { describe, it, expect } from 'vitest';
import { KNOWLEDGE_APPENDIX } from '../src/lib/knowledge';

describe('判读规则速查附录', () => {
  it('覆盖各判读层的关键规则', () => {
    for (const key of [
      '判读规则速查', '无天', '无地', '无人', '三才足数', '纯阳', '纯阴',
      '掩：始击与太乙同宫', '三门具不具', '五将发不发',
      '十六神方位', '君基', '阳九主旱厄', '值卦',
    ]) {
      expect(KNOWLEDGE_APPENDIX, key).toContain(key);
    }
  });
  it('是纯规则文本、不含具体盘面数值占位', () => {
    expect(KNOWLEDGE_APPENDIX).not.toContain('undefined');
    expect(KNOWLEDGE_APPENDIX.length).toBeGreaterThan(800);
  });
});
