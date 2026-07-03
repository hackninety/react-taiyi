import type { AcumYear, JiStyle, Sex, TaiyiInput } from '../taiyi';
import { JI_NAME, METHOD_NAME } from '../taiyi';

interface Props {
  value: TaiyiInput;
  onChange: (v: TaiyiInput) => void;
  sex: Sex;
  onSexChange: (s: Sex) => void;
  showMingfa: boolean;
  onShowMingfaChange: (v: boolean) => void;
  showTenjing: boolean;
  onShowTenjingChange: (v: boolean) => void;
  tenjingLoading: boolean;
}

export function InputPanel({
  value, onChange, sex, onSexChange,
  showMingfa, onShowMingfaChange,
  showTenjing, onShowTenjingChange, tenjingLoading,
}: Props) {
  const set = (patch: Partial<TaiyiInput>) => onChange({ ...value, ...patch });

  const dateStr = `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
  const timeStr = `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;

  return (
    <section className="input-panel">
      <div className="field">
        <label htmlFor="date">公历日期</label>
        <input
          id="date"
          type="date"
          value={dateStr}
          min="0600-01-01"
          max="9999-12-31"
          onChange={(ev) => {
            const [y, m, d] = ev.target.value.split('-').map(Number);
            if (y && m && d) set({ year: y, month: m, day: d });
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="time">时间</label>
        <input
          id="time"
          type="time"
          value={timeStr}
          onChange={(ev) => {
            const [h, min] = ev.target.value.split(':').map(Number);
            if (!Number.isNaN(h) && !Number.isNaN(min)) set({ hour: h, minute: min });
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="jistyle">计式</label>
        <select
          id="jistyle"
          value={value.jiStyle}
          onChange={(ev) => set({ jiStyle: Number(ev.target.value) as JiStyle })}
        >
          {([0, 1, 2, 3, 4] as const).map((s) => (
            <option key={s} value={s}>{JI_NAME[s]}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="method">积年法</label>
        <select
          id="method"
          value={value.acumYear}
          onChange={(ev) => set({ acumYear: Number(ev.target.value) as AcumYear })}
        >
          {([0, 1, 2, 3] as const).map((s) => (
            <option key={s} value={s}>{METHOD_NAME[s]}</option>
          ))}
        </select>
      </div>
      <button
        className="now-btn"
        type="button"
        onClick={() => {
          const now = new Date();
          set({
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            hour: now.getHours(),
            minute: now.getMinutes(),
          });
        }}
      >
        此刻
      </button>

      <div className="toggles">
        <label className="toggle">
          <input
            type="checkbox"
            checked={showTenjing}
            onChange={(ev) => onShowTenjingChange(ev.target.checked)}
          />
          十精{tenjingLoading ? '（加载中…）' : ''}
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showMingfa}
            onChange={(ev) => onShowMingfaChange(ev.target.checked)}
          />
          命法
        </label>
        {showMingfa && (
          <select
            aria-label="性别"
            value={sex}
            onChange={(ev) => onSexChange(ev.target.value as Sex)}
          >
            <option value="男">男命</option>
            <option value="女">女命</option>
          </select>
        )}
      </div>
    </section>
  );
}
