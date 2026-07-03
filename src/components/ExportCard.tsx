import { useMemo } from 'react';
import type { ExportPayload } from '../taiyi';
import { toJSONText, toMarkdown } from '../taiyi';
import { generateAIPrompt } from '../lib/prompt';
import { useToast } from './Toast';

interface Props {
  payload: ExportPayload;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportCard({ payload }: Props) {
  const toast = useToast();
  const json = useMemo(() => toJSONText(payload), [payload]);

  const stamp = () => {
    const { year, month, day, hour, minute } = payload.result.input;
    const p = (n: number, w = 2) => String(n).padStart(w, '0');
    return `taiyi-${p(year, 4)}${p(month)}${p(day)}-${p(hour)}${p(minute)}`;
  };

  const doCopy = async (text: string, okMsg: string) => {
    if (await copyText(text)) toast(okMsg);
    else toast('复制失败，请改用下载按钮', 'error');
  };

  return (
    <section className="card export-card glow-gold">
      <div className="export-head">
        <h3>☖ 数据导出 · AI 分析</h3>
        <span className="ready-badge">✧ 已备好投喂 AI</span>
      </div>
      <div className="export-grid">
        <button type="button" className="btn-outline" onClick={() => { download(`${stamp()}.json`, json, 'application/json'); toast('JSON 文件已下载'); }}>
          ⤓ 导出 JSON 文件
        </button>
        <button type="button" className="btn-outline" onClick={() => doCopy(json, 'JSON 已复制到剪贴板')}>
          ⧉ 复制 JSON
        </button>
        <button type="button" className="btn-outline" onClick={() => doCopy(toMarkdown(payload), 'Markdown 已复制到剪贴板')}>
          ⧉ 复制 Markdown
        </button>
        <button type="button" className="btn-outline" onClick={() => { download(`${stamp()}.md`, toMarkdown(payload), 'text/markdown'); toast('Markdown 文件已下载'); }}>
          ⤓ 下载 .md
        </button>
        <button
          type="button"
          className="btn-crimson"
          onClick={() => doCopy(generateAIPrompt(payload), 'AI 分析 Prompt 已复制！粘贴给 ChatGPT / Claude 即可')}
        >
          ✦ 一键复制 AI Prompt
        </button>
      </div>
      <div className="json-preview">
        <pre>{json.slice(0, 2000)}{json.length > 2000 ? '\n…' : ''}</pre>
      </div>
    </section>
  );
}
