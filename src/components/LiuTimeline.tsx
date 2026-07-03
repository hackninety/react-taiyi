import { useEffect, useState } from 'react';
import { fetchLiu } from '../taiyi/pan';
import type { LiuData, LiuStep } from '../taiyi/pan';
import type { TaiyiInput } from '../taiyi';

/**
 * 流卦運多期时间轴（五计式）：流年12期 / 流月12期 / 流日15期 / 流時12辰 / 流分10期。
 * 数据由后端 /api/taiyi/liu 直调上游 apps/hex_timeline 推法（命法卦链 + 干支序动爻），
 * 首期即起局时刻本身（高亮「今」），横向滑动查看未来。
 */

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ok'; liu: LiuData }
  | { phase: 'err'; reason: string };

const ORDER: Array<keyof LiuData> = ['流年', '流月', '流日', '流時', '流分'];

function Strip({ name, steps }: { name: string; steps: LiuStep[] }) {
  return (
    <div className="liu-row">
      <span className="liu-name">{name}</span>
      <div className="liu-strip">
        {steps.map((s, i) => (
          <div key={`${s.label}-${i}`} className={`liu-chip ${i === 0 ? 'now' : ''}`}
            title={`${s.label}${s.sub ? ` ${s.sub}` : ''} · ${s.卦}${s.爻名}`}>
            <em>{s.label}{s.sub ? `·${s.sub}` : ''}</em>
            <b>{s.卦符} {s.卦}</b>
            <span>{s.爻名}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiuTimeline({ input, apiBase, enabled, unavailableNote }: {
  input: TaiyiInput;
  apiBase: string;
  /** 后端可用时才请求 */
  enabled: boolean;
  unavailableNote?: string | null;
}) {
  const [state, setState] = useState<State>({ phase: 'idle' });

  useEffect(() => {
    if (!enabled) { setState({ phase: 'idle' }); return; }
    let active = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    setState({ phase: 'loading' });
    fetchLiu(input, apiBase, ctrl.signal)
      .then((resp) => { if (active) setState({ phase: 'ok', liu: resp.liu }); })
      .catch((e: unknown) => {
        if (!active) return;
        setState({
          phase: 'err',
          reason: ctrl.signal.aborted ? '请求超时' : e instanceof Error ? e.message : String(e),
        });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
  }, [enabled, input, apiBase]);

  return (
    <section className="card liu-wrap">
      <h3>
        流卦運（五計多期）
        <span className="pan-tag">上游 hex_timeline 推法直出 · 首期為起局時刻 · ← 滑動查看未來 →</span>
      </h3>
      {!enabled && <p className="pan-note">{unavailableNote ?? '流卦運由 kintaiyi 后端推算，后端可用时显示。'}</p>}
      {state.phase === 'loading' && <p className="pan-note">流卦運推算中…</p>}
      {state.phase === 'err' && <p className="pan-note err">流卦運载入失败：{state.reason}</p>}
      {state.phase === 'ok' && ORDER.map((k) => <Strip key={k} name={k} steps={state.liu[k] ?? []} />)}
    </section>
  );
}
