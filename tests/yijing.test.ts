import { describe, it, expect } from 'vitest';
import { YIJING_HEXAGRAMS, getHexagram, getYaoCi } from '../src/taiyi/yijing';

/**
 * 《周易》64 卦经文守卫：数据由 scripts/gen_yijing.py 自 ctext.org 权威公版经文生成。
 * 锁定结构完整性、名句原文与查找容错（生成器/上游变更时报警）。
 */
const YAO_NAMES_YANG = ['初九', '九二', '九三', '九四', '九五', '上九'];

describe('周易 64 卦经文', () => {
  it('恰 64 卦，王制序 1..64，卦符唯一', () => {
    expect(YIJING_HEXAGRAMS).toHaveLength(64);
    expect(YIJING_HEXAGRAMS.map((h) => h.num)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    expect(new Set(YIJING_HEXAGRAMS.map((h) => h.symbol)).size).toBe(64);
    expect(new Set(YIJING_HEXAGRAMS.map((h) => h.name)).size).toBe(64);
  });

  it('每卦爻数与爻题正确（乾/坤 7 含用九用六，余 6）', () => {
    for (const h of YIJING_HEXAGRAMS) {
      const expected = h.name === '乾' || h.name === '坤' ? 7 : 6;
      expect(h.yao.length, `${h.name} 爻数`).toBe(expected);
      expect(h.guaCi.length, `${h.name} 卦辞非空`).toBeGreaterThan(0);
      for (const y of h.yao) expect(y.text.length, `${h.name}${y.name} 爻辞非空`).toBeGreaterThan(0);
    }
  });

  it('乾卦经文逐字（含用九）', () => {
    const qian = getHexagram('乾')!;
    expect(qian.guaCi).toBe('元亨，利貞。');
    expect(qian.yao.map((y) => y.name)).toEqual([...YAO_NAMES_YANG, '用九']);
    expect(getYaoCi('乾', '初九')!.text).toBe('潛龍，勿用。');
    expect(getYaoCi('乾', '上九')!.text).toBe('亢龍有悔。');
    expect(getYaoCi('乾', '用九')!.text).toBe('見群龍无首，吉。');
  });

  it('名句抽查（跨 API 源与 HTML 源）', () => {
    expect(getYaoCi('坤', '初六')!.text).toBe('履霜，堅冰至。');
    expect(getYaoCi('坤', '用六')!.text).toBe('利永貞。');
    // 井（HTML 源提取）
    expect(getHexagram('井')!.guaCi).toContain('改邑不改井');
    expect(getYaoCi('井', '上六')!.text).toBe('井收勿幕，有孚元吉。');
    // 未濟（末卦，HTML 源）
    expect(getYaoCi('未濟', '上九')!.text).toContain('濡其首');
    // 卦名内嵌者卦辞保留卦名
    expect(getHexagram('履')!.guaCi).toBe('履虎尾，不咥人，亨。');
  });

  it('查找容错：繁/简/卦符/带符/带「卦」字', () => {
    const shi = getHexagram('師')!; // 卦7 師/师 繁简异形
    expect(shi.nameSimp).toBe('师');
    expect(getHexagram('师')).toBe(shi); // 简体输入
    expect(getHexagram('復')).toBe(getHexagram('复')); // 復/复
    expect(getHexagram('歸妹')).toBe(getHexagram('归妹')); // 歸妹/归妹
    expect(getHexagram('無妄')).toBe(getHexagram('无妄')); // 異體歸一：yhys 皇极卦名用繁体「無」
    expect(getHexagram('乾䷀')).toBe(getHexagram('乾')); // 名+符
    expect(getHexagram('䷀乾')).toBe(getHexagram('乾')); // 符+名
    expect(getHexagram('䷀')).toBe(getHexagram('乾')); // 纯卦符
    expect(getHexagram('乾卦')).toBe(getHexagram('乾')); // 带「卦」字
    expect(getHexagram('')).toBeNull();
    expect(getHexagram('不存在')).toBeNull();
  });
});
