/**
 * 轻量 Markdown 解析（专为 kintaiyi 上游 docs/*.md 的固定结构，不引第三方库）：
 * - 管道表格（example/disaster/guji）
 * - 「N.标题」编号节（disaster）
 * - ## / ### 标题分节（tutorial/update）
 * - 去 HTML 标签、URL 链接化
 */

export interface MdTable {
  headers: string[];
  rows: string[][];
}

const isSepRow = (line: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');

function splitRow(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

/** 解析全部管道表（容忍首尾竖线缺失与列数不齐） */
export function parseTables(md: string): MdTable[] {
  const lines = md.split(/\r?\n/);
  const tables: MdTable[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('|') && i + 1 < lines.length && isSepRow(lines[i + 1])) {
      const headers = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && !isSepRow(lines[i])) {
        const cells = splitRow(lines[i]);
        if (cells.some((c) => c !== '')) {
          // 列数对齐表头（截断/补空）
          rows.push(headers.map((_, c) => cells[c] ?? ''));
        }
        i += 1;
      }
      tables.push({ headers, rows });
    } else {
      i += 1;
    }
  }
  return tables;
}

export function firstTable(md: string): MdTable | null {
  return parseTables(md)[0] ?? null;
}

export interface MdSection {
  title: string;
  body: string;
}

/** 按标题级别分节（level: '##' 或 '###'）；标题行剔除首尾装饰 */
export function splitByHeading(md: string, level: '##' | '###'): MdSection[] {
  const re = new RegExp(`^${level}(?!#)\\s*(.+?)\\s*$`);
  const lines = md.split(/\r?\n/);
  const out: MdSection[] = [];
  let cur: MdSection | null = null;
  for (const line of lines) {
    const m = re.exec(line);
    if (m) {
      if (cur) out.push(cur);
      cur = { title: m[1].trim(), body: '' };
    } else if (cur) {
      cur.body += `${line}\n`;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** 「N.标题」编号节（disaster.md：1.地震 / 2.水災 …） */
export function numberedSections(md: string): Array<MdSection & { no: number }> {
  const lines = md.split(/\r?\n/);
  const out: Array<MdSection & { no: number }> = [];
  let cur: (MdSection & { no: number }) | null = null;
  for (const line of lines) {
    const m = /^\s*(\d+)\s*[.、]\s*(\S.*)$/.exec(line);
    // 表格行/分隔行里的数字不算节标题
    if (m && !line.includes('|')) {
      if (cur) out.push(cur);
      cur = { no: Number(m[1]), title: m[2].trim(), body: '' };
    } else if (cur) {
      cur.body += `${line}\n`;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** 去 HTML 标签与锚点残留 */
export function stripHtml(s: string): string {
  return s
    .replace(/<details[\s\S]*?<\/details>/gi, '')
    .replace(/<a\s+name=[^>]*>\s*<\/a>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ');
}

/** 提取文本中的 URL（linkify 用） */
export function splitLinks(s: string): Array<{ text: string; href?: string }> {
  const re = /(https?:\/\/[^\s　）)]+)/g;
  const parts: Array<{ text: string; href?: string }> = [];
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) parts.push({ text: s.slice(last, m.index) });
    parts.push({ text: m[1], href: m[1] });
    last = m.index + m[1].length;
  }
  if (last < s.length) parts.push({ text: s.slice(last) });
  return parts;
}

/** 段落切分（连续非空行为一段，剔除空段） */
export function paragraphs(s: string): string[] {
  return s
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, '\n').trim())
    .filter(Boolean);
}
