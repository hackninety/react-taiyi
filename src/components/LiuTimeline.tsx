import type { LiuData, LiuStep } from '../taiyi/pan';

/**
 * 流卦運多期时间轴（五计式）：流年12期 / 流月12期 / 流日15期 / 流時12辰 / 流分10期。
 * 数据由 App 统一请求（/api/taiyi/liu 直调上游 apps/hex_timeline 推法）并同时并入 AI 导出；
 * 首期即起局时刻本身（高亮「今」），横向滑动查看未来。
 */

export type LiuState =
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

export function LiuTimeline({ state, unavailableNote }: {
  state: LiuState;
  unavailableNote?: string | null;
}) {
  return (
    <section className="card liu-wrap">
      <h3>
        流卦運（五計多期）
        <span className="pan-tag">上游 hex_timeline 推法直出 · 首期為起局時刻 · ← 滑動查看未來 →</span>
      </h3>
      {state.phase === 'idle' && (
        <p className="pan-note">{unavailableNote ?? '流卦運由 kintaiyi 后端推算，后端可用时显示。'}</p>
      )}
      {state.phase === 'loading' && <p className="pan-note">流卦運推算中…</p>}
      {state.phase === 'err' && <p className="pan-note err">流卦運载入失败：{state.reason}</p>}
      {state.phase === 'ok' && ORDER.map((k) => <Strip key={k} name={k} steps={state.liu[k] ?? []} />)}
    </section>
  );
}
