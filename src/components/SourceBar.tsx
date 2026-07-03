import type { DataSource, FieldDiff } from '../taiyi/remote';

/** 远程数据源状态（App 维护） */
export type RemoteState =
  | { phase: 'off' }                                  // 仅本地 / 太乙范围外
  | { phase: 'checking' }
  | { phase: 'ok'; ref: string; diffs: FieldDiff[] }  // diffs 空 = 逐字段一致
  | { phase: 'fallback'; reason: string };

interface Props {
  dataSource: DataSource;
  onDataSourceChange: (v: DataSource) => void;
  apiBase: string;
  remote: RemoteState;
  /** 太乙范围外（皇极拟推口径仅本地引擎支持） */
  outOfRange: boolean;
}

export function SourceBar({
  dataSource, onDataSourceChange, apiBase, remote, outOfRange,
}: Props) {
  const realDiffs = remote.phase === 'ok' ? remote.diffs.filter((d) => !d.known) : [];
  const knownDiffs = remote.phase === 'ok' ? remote.diffs.filter((d) => d.known) : [];

  let chip: { cls: string; text: string } | null = null;
  if (dataSource === 'local') {
    chip = { cls: 'off', text: '仅本地 TS 引擎（已对照 kintaiyi 黄金用例逐字段验证）' };
  } else if (outOfRange) {
    chip = { cls: 'off', text: '范围外「皇极历法拟推口径」仅本地引擎支持，后端对照不适用' };
  } else if (remote.phase === 'checking') {
    chip = { cls: 'checking', text: 'kintaiyi 后端校验中…' };
  } else if (remote.phase === 'ok') {
    chip = realDiffs.length
      ? { cls: 'warn', text: `⚠ 上游 kintaiyi 与本地引擎有 ${realDiffs.length} 处差异（上游或已更新，须复核）` }
      : { cls: 'ok', text: `后端与本地引擎逐字段一致 · 上游 ${remote.ref.slice(0, 7)}` };
  } else if (remote.phase === 'fallback') {
    chip = { cls: 'err', text: `kintaiyi 后端不可用，已自动回退本地引擎（${remote.reason}）` };
  }

  return (
    <div className="source-bar">
      <label className="src-label">
        数据源
        <select
          value={dataSource}
          onChange={(ev) => onDataSourceChange(ev.target.value as DataSource)}
        >
          <option value="remote">后端优先</option>
          <option value="local">仅本地引擎</option>
        </select>
      </label>
      {dataSource === 'remote' && (
        <input
          className="api-input"
          value={apiBase}
          readOnly
          spellCheck={false}
          aria-label="API 地址"
          title={apiBase}
        />
      )}
      {chip && <span className={`src-chip ${chip.cls}`}>{chip.text}</span>}
      {remote.phase === 'ok' && remote.diffs.length > 0 && (
        <details className="src-diffs" open={realDiffs.length > 0}>
          <summary>差异明细（{remote.diffs.length}）</summary>
          <table>
            <thead><tr><th>字段</th><th>本地引擎</th><th>kintaiyi 后端</th><th>说明</th></tr></thead>
            <tbody>
              {[...realDiffs, ...knownDiffs].map((d) => (
                <tr key={d.field} className={d.known ? 'known' : 'drift'}>
                  <td>{d.field}</td>
                  <td>{d.local}</td>
                  <td>{d.remote}</td>
                  <td>{d.known ?? '疑似上游更新——以后端为准复核并同步本地引擎'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
