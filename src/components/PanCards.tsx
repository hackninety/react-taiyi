import type { PanData } from '../taiyi/pan';
import { PAN_GROUPS } from '../taiyi/pan';

/**
 * kintaiyi 全解释盘渲染：上游 pan() 中文键直出，通用递归渲染器 + 主题分组卡。
 * 值形态（经后端 JSON 安全化）：str / number / list / 嵌套 dict（≤3 层）。
 */

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0 || v.every(isEmpty);
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

function isScalar(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

function PanValue({ v, depth = 0 }: { v: unknown; depth?: number }) {
  if (isEmpty(v)) return <span className="pan-empty">—</span>;
  if (isScalar(v)) {
    const s = String(v);
    // 长文按段落断行（上游释文常以句号/分号连排）
    if (s.length > 60) return <p className="pan-text">{s}</p>;
    return <span className="pan-scalar">{s}</span>;
  }
  if (Array.isArray(v)) {
    if (v.every(isScalar)) return <span className="pan-scalar">{v.map(String).join('、')}</span>;
    return (
      <ul className="pan-list">
        {v.map((x, i) => <li key={i}><PanValue v={x} depth={depth + 1} /></li>)}
      </ul>
    );
  }
  const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => !isEmpty(x));
  if (entries.length === 0) return <span className="pan-empty">—</span>;
  if (depth >= 3) return <p className="pan-text">{JSON.stringify(v)}</p>;
  return (
    <table className="pan-kv">
      <tbody>
        {entries.map(([k, x]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td><PanValue v={x} depth={depth + 1} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type PanState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ok'; data: PanData; ref: string }
  | { phase: 'err'; reason: string };

interface Props {
  state: PanState;
  /** 数据源为「仅本地」或后端回退时的说明 */
  unavailableNote?: string | null;
}

export function PanCards({ state, unavailableNote }: Props) {
  return (
    <section className="card pan-wrap">
      <h3>
        kintaiyi 全解釋
        <span className="pan-tag">《太乙統宗寶鑑》諸卷 · 上游直出 · 隨上游更新</span>
      </h3>
      {unavailableNote && <p className="pan-note">{unavailableNote}</p>}
      {state.phase === 'loading' && <p className="pan-note">解釋內容載入中…（首次計算約數秒）</p>}
      {state.phase === 'err' && (
        <p className="pan-note err">解釋內容載入失敗：{state.reason}（盤面與導出不受影響）</p>
      )}
      {state.phase === 'ok' && (
        <div className="pan-groups">
          {PAN_GROUPS.map((g) => {
            const present = g.keys.filter((k) => !isEmpty(state.data[k]));
            if (present.length === 0) return null;
            return (
              <details key={g.title} className="pan-group">
                <summary>
                  {g.title}
                  <em>{g.note}</em>
                </summary>
                <div className="pan-body">
                  {present.map((k) => (
                    <div key={k} className="pan-item">
                      {(present.length > 1 || k !== g.title) && <h4>{k}</h4>}
                      <PanValue v={state.data[k]} />
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
