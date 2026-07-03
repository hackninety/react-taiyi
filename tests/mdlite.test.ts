/**
 * mdlite 解析器测试：用上游 docs/*.md 的真实结构片段验证
 * （表格/编号节/标题分节/HTML 剥离/URL 链接化）。
 */
import { describe, it, expect } from 'vitest';
import {
  firstTable, splitByHeading, numberedSections, stripHtml, splitLinks, paragraphs,
} from '../src/lib/mdlite';

const EXAMPLE_MD = `# 歷史局例

| 年份          |     局數     | 事件                 | 出處       |
| ------------- |  ---------| ------------------ | ------------- |
| -578 | 8 | 魯成公十三年事略。 | 太乙統宗寶鑑 |
| 11 |  44 | 新莽建國三年辛未事略。 | 太乙淘金歌 |
`;

const DISASTER_MD = `歷史災異案例

1.地震

1303年-2013年7級以上地震情況表 (資料來源︰某書, 2017)
| 年份  | 級  | 地方 | 局   | 主客算     |   格局  |
| ---- |  ----| ----|----- | --------- |  ------ |
| 1303  | 8 |  山西 |  52 | 39、31| 無地之算 |
| 1556  | 8 |  陝西 |  17 | 7、27 | 無天之算 |

2.水災

某說明行
| 年份 | 地方 |
| ---- | ---- |
| 1931 | 江淮 |
`;

const UPDATE_MD = `堅太乙排盤更新日誌
-----
### 【2026/07/01】
 - 重度優化界面

-----
### 【2026/04/22】
 - LLM自選第三方服務商密鑰
 - 另一條
`;

describe('mdlite', () => {
  it('parseTables/firstTable：列对齐与负数年份', () => {
    const t = firstTable(EXAMPLE_MD)!;
    expect(t.headers[0]).toBe('年份');
    expect(t.rows).toHaveLength(2);
    expect(Number(t.rows[0][0])).toBe(-578);
    expect(t.rows[1][2]).toContain('新莽');
  });

  it('numberedSections：災異编号节与节内表格', () => {
    const secs = numberedSections(DISASTER_MD);
    expect(secs.map((s) => s.title)).toEqual(['地震', '水災']);
    const t1 = firstTable(secs[0].body)!;
    expect(t1.rows).toHaveLength(2);
    expect(t1.rows[0][2]).toBe('山西');
    // 表格行里的数字不误判为节标题
    expect(secs[0].body).toContain('1303');
  });

  it('splitByHeading：更新日誌按 ### 分节', () => {
    const secs = splitByHeading(UPDATE_MD, '###');
    expect(secs).toHaveLength(2);
    expect(secs[0].title).toBe('【2026/07/01】');
    expect(secs[1].body).toContain('另一條');
  });

  it('stripHtml/splitLinks/paragraphs', () => {
    expect(stripHtml('<a name="x"></a>正文<details><summary>目錄</summary>xx</details><b>粗</b>'))
      .toBe('正文粗');
    const parts = splitLinks('見 https://example.com/a 及其後文');
    expect(parts.find((p) => p.href)?.href).toBe('https://example.com/a');
    expect(paragraphs('甲\n乙\n\n丙\n\n\n')).toEqual(['甲\n乙', '丙']);
  });
});
