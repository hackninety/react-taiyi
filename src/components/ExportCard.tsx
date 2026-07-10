import { useMemo, useState } from 'react';
import type { ExportPayload } from '../taiyi';
import { toJSONText, toMarkdown } from '../taiyi';
import { generateAIPrompt } from '../lib/prompt';
import { KNOWLEDGE_APPENDIX } from '../lib/knowledge';
import { useToast } from './Toast';

interface Props {
  payload: ExportPayload;
}

type Tier = 'full' | 'lite';

/** 精简档：剔除两大上游釋文 blob（kintaiyi 全解釋盘 ~88KB、命法卷二十 ~27KB），
 * 保留 result/mingfa/huangji/mishuText/yijingRefs/liuTimelines/史例 等结构化断事钩子，
 * 供小上下文模型使用。 */
function stripHeavy(p: ExportPayload): ExportPayload {
  return { ...p, kintaiyiPan: null, kintaiyiLife: null };
}

/** 粗略 token 估算（CJK≈0.6、其余≈0.3 token/字符；仅量级参考，实际因模型分词而异） */
function estimateTokens(s: string): number {
  let cjk = 0;
  let other = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if ((c >= 0x3400 && c <= 0x9fff) || (c >= 0x4dc0 && c <= 0x4dff) || (c >= 0xf900 && c <= 0xfaff)) cjk++;
    else other++;
  }
  return Math.round(cjk * 0.6 + other * 0.3);
}

function fmtBytes(n: number): string {
  return n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
}

function fmtTokens(n: number): string {
  return n >= 1000 ? `~${(n / 1000).toFixed(1)}k tokens` : `~${n} tokens`;
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
  const [tier, setTier] = useState<Tier>('full');
  // 附判读规则速查：给不熟太乙术语的通用模型兜底（仅影响 AI Prompt）
  const [withRules, setWithRules] = useState(false);

  const effective = useMemo(() => (tier === 'lite' ? stripHeavy(payload) : payload), [tier, payload]);
  const json = useMemo(() => toJSONText(effective), [effective]);

  const buildPrompt = () => {
    const base = generateAIPrompt(effective);
    return withRules ? `${base}\n\n${KNOWLEDGE_APPENDIX}` : base;
  };

  // 两档体积对照（字节 + 估算 token），供选择
  const sizes = useMemo(() => {
    const enc = new TextEncoder();
    const full = toJSONText(payload);
    const lite = toJSONText(stripHeavy(payload));
    return {
      full: { bytes: enc.encode(full).length, tokens: estimateTokens(full) },
      lite: { bytes: enc.encode(lite).length, tokens: estimateTokens(lite) },
    };
  }, [payload]);

  const hasHeavy = Boolean(
    (payload.kintaiyiPan && Object.keys(payload.kintaiyiPan).length)
    || (payload.kintaiyiLife && Object.keys(payload.kintaiyiLife).length),
  );

  const stamp = () => {
    const src = payload.result?.input ?? payload.huangjiOnlyInput;
    if (!src) return 'taiyi-export';
    const { year, month, day, hour, minute } = src;
    const p = (n: number, w = 2) => String(n).padStart(w, '0');
    const prefix = payload.result ? 'taiyi' : 'huangji';
    const yearPart = year < 0 ? `BC${String(1 - year).padStart(4, '0')}` : p(year, 4);
    const suffix = tier === 'lite' ? '-lite' : '';
    return `${prefix}-${yearPart}${p(month)}${p(day)}-${p(hour)}${p(minute)}${suffix}`;
  };

  const doCopy = async (text: string, okMsg: string) => {
    if (await copyText(text)) toast(okMsg);
    else toast('复制失败，请改用下载按钮', 'error');
  };

  const cur = sizes[tier];

  return (
    <section className="card export-card glow-gold">
      <div className="export-head">
        <h3>☖ 数据导出 · AI 分析</h3>
        <span className="ready-badge">✧ 已备好投喂 AI</span>
      </div>

      {hasHeavy && (
        <div className="export-tier">
          <div className="tier-seg" role="tablist" aria-label="导出详略">
            <button
              type="button"
              role="tab"
              aria-selected={tier === 'full'}
              className={tier === 'full' ? 'active' : ''}
              onClick={() => setTier('full')}
            >
              完整 <em>{fmtBytes(sizes.full.bytes)} · {fmtTokens(sizes.full.tokens)}</em>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tier === 'lite'}
              className={tier === 'lite' ? 'active' : ''}
              onClick={() => setTier('lite')}
            >
              精简 <em>{fmtBytes(sizes.lite.bytes)} · {fmtTokens(sizes.lite.tokens)}</em>
            </button>
          </div>
          <p className="tier-note">
            {tier === 'full'
              ? '完整含 kintaiyi 全解釋盘与命法卷二十全部釋文，信息最全；上下文较小的模型可能超限。'
              : '精简已剔除两大上游釋文长文（全解釋盘 / 命法卷二十），保留局断、命法、皇极、周易经文、流卦等结构化钩子，适配小上下文模型。'}
          </p>
        </div>
      )}
      {!hasHeavy && (
        <p className="tier-note single">本次导出 {fmtBytes(cur.bytes)} · {fmtTokens(cur.tokens)}（未含大段上游釋文，无需精简）。</p>
      )}

      <div className="export-grid">
        <button type="button" className="btn-outline" onClick={() => { download(`${stamp()}.json`, json, 'application/json'); toast('JSON 文件已下载'); }}>
          ⤓ 导出 JSON 文件
        </button>
        <button type="button" className="btn-outline" onClick={() => doCopy(json, 'JSON 已复制到剪贴板')}>
          ⧉ 复制 JSON
        </button>
        <button type="button" className="btn-outline" onClick={() => doCopy(toMarkdown(effective), 'Markdown 已复制到剪贴板')}>
          ⧉ 复制 Markdown
        </button>
        <button type="button" className="btn-outline" onClick={() => { download(`${stamp()}.md`, toMarkdown(effective), 'text/markdown'); toast('Markdown 文件已下载'); }}>
          ⤓ 下载 .md
        </button>
        <button
          type="button"
          className="btn-crimson"
          onClick={() => doCopy(buildPrompt(), 'AI 分析 Prompt 已复制！粘贴给 ChatGPT / Claude 即可')}
        >
          ✦ 一键复制 AI Prompt
        </button>
      </div>
      <label className="rules-toggle">
        <input type="checkbox" checked={withRules} onChange={(e) => setWithRules(e.target.checked)} />
        AI Prompt 附「判读规则速查」（十六神/算数属性/格局条件/八门神煞通则，供不熟太乙术语的通用模型兜底）
      </label>
      <div className="json-preview">
        <pre>{json.slice(0, 2000)}{json.length > 2000 ? '\n…' : ''}</pre>
      </div>
    </section>
  );
}
