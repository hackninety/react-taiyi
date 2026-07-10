import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PanData } from '../taiyi/pan';
import { PAN_GROUPS } from '../taiyi/pan';

/**
 * kintaiyi 全解释盘渲染：上游 pan() 中文键直出，通用递归渲染器 + 主题分组卡。
 * 值形态（经后端 JSON 安全化）：str / number / list / 嵌套 dict（≤3 层）。
 * 分组以卡片列出，点击弹出模态框（背景模糊、点击背景关闭）展示全文——
 * 避免长释文/JSON 在网格列内被截断。模态框壳层（GroupModalCards）供命法卷二十卡复用。
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

export function PanValue({ v, depth = 0 }: { v: unknown; depth?: number }) {
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

export interface ModalGroup {
  title: string;
  note?: string;
  content: React.ReactNode;
}

/** 分组按钮卡 + 点击弹出模态框（ESC/点击背景关闭、滚动锁定）。resetKey 变化时关闭遗留弹窗。 */
export function GroupModalCards({ groups, resetKey }: { groups: ModalGroup[]; resetKey?: unknown }) {
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  // 数据换代（重新排盘）时关闭遗留模态框，避免旧弹窗随新数据到达自动重弹
  useEffect(() => { setOpenTitle(null); }, [resetKey]);

  const active = openTitle ? groups.find((x) => x.title === openTitle) ?? null : null;
  // 稳定字符串依赖（active 每次渲染都是新对象）：分组消失时也会切回 null 从而解锁
  const activeTitle = active ? active.title : null;

  // 打开时：ESC 关闭 + 锁定背景滚动
  useEffect(() => {
    if (!activeTitle) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenTitle(null); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [activeTitle]);

  return (
    <>
      <div className="pan-groups">
        {groups.map((g) => (
          <button
            key={g.title}
            type="button"
            className="pan-group"
            onClick={() => setOpenTitle(g.title)}
          >
            <span className="pan-group-title">{g.title}</span>
            {g.note && <em>{g.note}</em>}
          </button>
        ))}
      </div>
      {active && createPortal(
        <div
          className="pan-modal-backdrop"
          onClick={() => setOpenTitle(null)}
          role="presentation"
        >
          <div
            className="pan-modal"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pan-modal-head">
              <span className="pan-modal-title">{active.title}</span>
              {active.note && <em>{active.note}</em>}
            </div>
            <div className="pan-body">{active.content}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
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
  /** 分组增强插件（按组标题挂载，渲染于组内容顶部）：統運时间轴/軌運轴/五陣八陣图等 */
  extras?: Record<string, React.ReactNode>;
}

export function PanCards({ state, unavailableNote, extras }: Props) {
  const data: PanData | null = state.phase === 'ok' ? state.data : null;

  // 仅列出有内容的分组
  const groups: ModalGroup[] = data
    ? PAN_GROUPS
      .map((g) => ({ g, present: g.keys.filter((k) => !isEmpty(data[k])) }))
      .filter((x) => x.present.length > 0)
      .map(({ g, present }) => ({
        title: g.title,
        note: g.note,
        content: (
          <>
            {extras?.[g.title]}
            {present.map((k) => (
              <div key={k} className="pan-item">
                {(present.length > 1 || k !== g.title) && <h4>{k}</h4>}
                <PanValue v={data[k]} />
              </div>
            ))}
          </>
        ),
      }))
    : [];

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
      {state.phase === 'ok' && <GroupModalCards groups={groups} resetKey={data} />}
    </section>
  );
}
