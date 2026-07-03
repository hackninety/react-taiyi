import { useRef, useState } from 'react';
import type { ExportPayload } from '../taiyi';
import { toJSONText, toMarkdown } from '../taiyi';

interface Props {
  payload: ExportPayload;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 剪贴板 API 不可用时退回 textarea 方案
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function download(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportBar({ payload }: Props) {
  const [copied, setCopied] = useState<'json' | 'md' | 'fail' | null>(null);
  const timer = useRef<number>();

  const flash = (kind: 'json' | 'md' | 'fail') => {
    setCopied(kind);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1600);
  };

  const stamp = () => {
    const { year, month, day, hour, minute } = payload.result.input;
    const p = (n: number, w = 2) => String(n).padStart(w, '0');
    return `taiyi-${p(year, 4)}${p(month)}${p(day)}-${p(hour)}${p(minute)}`;
  };

  return (
    <div className="export-bar">
      <span className="export-label">导出</span>
      <button
        type="button"
        onClick={async () => { flash(await copyText(toJSONText(payload)) ? 'json' : 'fail'); }}
      >
        {copied === 'json' ? '✓ 已复制' : '复制 JSON'}
      </button>
      <button
        type="button"
        onClick={async () => { flash(await copyText(toMarkdown(payload)) ? 'md' : 'fail'); }}
      >
        {copied === 'md' ? '✓ 已复制' : '复制 Markdown'}
      </button>
      {copied === 'fail' && <span className="export-fail">复制失败，请用下载按钮</span>}
      <button type="button" onClick={() => download(`${stamp()}.json`, toJSONText(payload), 'application/json')}>
        下载 .json
      </button>
      <button type="button" onClick={() => download(`${stamp()}.md`, toMarkdown(payload), 'text/markdown')}>
        下载 .md
      </button>
    </div>
  );
}
