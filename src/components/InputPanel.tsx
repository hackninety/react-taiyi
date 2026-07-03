import type { AcumYear, HuangjiSchool, JiStyle, Sex, TaiyiInput } from '../taiyi';
import { JI_NAME, METHOD_NAME } from '../taiyi';
import { PROVINCES } from '../lib/cities';

export interface SolarTimeSetting {
  enabled: boolean;
  province: string;
  city: string;
  district: string;
}

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
  showHuangji: boolean;
  onShowHuangjiChange: (v: boolean) => void;
  huangjiSchool: HuangjiSchool;
  onHuangjiSchoolChange: (s: HuangjiSchool) => void;
  solar: SolarTimeSetting;
  onSolarChange: (s: SolarTimeSetting) => void;
  /** 校正说明文本（生效时显示） */
  solarHint?: string | null;
}

export function InputPanel({
  value, onChange, sex, onSexChange,
  showMingfa, onShowMingfaChange,
  showTenjing, onShowTenjingChange, tenjingLoading,
  showHuangji, onShowHuangjiChange, huangjiSchool, onHuangjiSchoolChange,
  solar, onSolarChange, solarHint,
}: Props) {
  const set = (patch: Partial<TaiyiInput>) => onChange({ ...value, ...patch });

  const dateStr = `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
  const timeStr = `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;

  const currentProvince = PROVINCES.find((p) => p.name === solar.province);
  const cityList = currentProvince?.cities ?? [];
  const currentCity = cityList.find((c) => c.name === solar.city);
  const districtList = currentCity?.districts ?? [];

  const changeProvince = (name: string) => {
    const p = PROVINCES.find((x) => x.name === name);
    const firstCity = p?.cities[0];
    onSolarChange({
      ...solar,
      province: name,
      city: firstCity?.name ?? '',
      district: firstCity?.districts[0]?.name ?? '',
    });
  };

  const changeCity = (name: string) => {
    const c = currentProvince?.cities.find((x) => x.name === name);
    onSolarChange({ ...solar, city: name, district: c?.districts[0]?.name ?? '' });
  };

  return (
    <section className="input-card">
      <div className="input-card-head">输入起局时间 · 五计式 × 四积年流派 · 数据全在本地计算</div>
      <div className="input-panel">
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
          ✦ 此刻
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
          <label className="toggle">
            <input
              type="checkbox"
              checked={showHuangji}
              onChange={(ev) => onShowHuangjiChange(ev.target.checked)}
            />
            皇极
          </label>
          {showHuangji && (
            <select
              aria-label="皇极流派"
              value={huangjiSchool}
              onChange={(ev) => onHuangjiSchoolChange(ev.target.value as HuangjiSchool)}
            >
              <option value="黄畿">黄畿派</option>
              <option value="祝泌">祝泌派</option>
            </select>
          )}
        </div>
      </div>

      <div className="solar-row">
        <label className="toggle">
          <input
            type="checkbox"
            checked={solar.enabled}
            onChange={(ev) => onSolarChange({ ...solar, enabled: ev.target.checked })}
          />
          真太阳时（所在地经度校正）
        </label>
        {solar.enabled ? (
          <>
            <select aria-label="省份" value={solar.province} onChange={(ev) => changeProvince(ev.target.value)}>
              {PROVINCES.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            <select aria-label="城市" value={solar.city} onChange={(ev) => changeCity(ev.target.value)}>
              {cityList.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select aria-label="区县" value={solar.district} onChange={(ev) => onSolarChange({ ...solar, district: ev.target.value })}>
              {districtList.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
            {solarHint && <span className="solar-hint">{solarHint}</span>}
          </>
        ) : (
          <span className="solar-hint dim">不校正（北京时间 UTC+8）</span>
        )}
      </div>
    </section>
  );
}
