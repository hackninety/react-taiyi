import type { AcumYear, JiStyle, Sex, TaiyiInput } from '../taiyi';
import {
  JI_NAME, METHOD_NAME,
  TAIYI_MAX_YEAR, HUANGJI_MIN_YEAR, HUANGJI_MAX_YEAR, GULI_MIN_YEAR,
} from '../taiyi';
import { PROVINCES } from '../lib/cities';

const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.trunc(v)));

/** 常居住地（不参与推算，仅随 AI 导出提供地域参照；自由填写，可为任意地名） */
export interface ResidenceSetting {
  enabled: boolean;
  text: string;
}

export interface SolarTimeSetting {
  enabled: boolean;
  /** 定位模式：当前时区（自动）或手动选择城市 */
  mode: 'auto' | 'city';
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
  solar: SolarTimeSetting;
  onSolarChange: (s: SolarTimeSetting) => void;
  /** 校正说明文本（生效时显示） */
  solarHint?: string | null;
  residence: ResidenceSetting;
  onResidenceChange: (r: ResidenceSetting) => void;
}

export function InputPanel({
  value, onChange, sex, onSexChange,
  showMingfa, onShowMingfaChange,
  showTenjing, onShowTenjingChange, tenjingLoading,
  showHuangji, onShowHuangjiChange,
  solar, onSolarChange, solarHint, residence, onResidenceChange,
}: Props) {
  const set = (patch: Partial<TaiyiInput>) => onChange({ ...value, ...patch });

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
      <div className="input-card-head">输入起局时间 · 五计式 × 四积年流派 · 后端优先 · 可切本地引擎离线</div>
      <div className="input-panel">
        {/* 年月日数字输入：默认支持公元前 6000（上游 sxtwl 古历范围）；勾选皇极解锁一元全跨度 */}
        <div className="field">
          <label htmlFor="hj-year">
            公历年·月·日{showHuangji ? '（皇极全跨度）' : '（负数=公元前，天文纪年）'}
          </label>
          <div className="ymd-inputs">
            <input
              id="hj-year"
              type="number"
              className="ymd-year"
              value={value.year}
              min={showHuangji ? HUANGJI_MIN_YEAR : GULI_MIN_YEAR}
              max={showHuangji ? HUANGJI_MAX_YEAR : TAIYI_MAX_YEAR}
              title={showHuangji
                ? '公元前 67016 — 公元 62583（负数为公元前，0 = 公元前 1 年）'
                : '公元前 6000 — 公元 9999（负数为公元前，0 = 公元前 1 年；600 前盘面用上游 sxtwl 古历）'}
              onChange={(ev) => {
                const y = Number(ev.target.value);
                if (ev.target.value !== '' && Number.isFinite(y)) {
                  set({
                    year: showHuangji
                      ? clampInt(y, HUANGJI_MIN_YEAR, HUANGJI_MAX_YEAR)
                      : clampInt(y, GULI_MIN_YEAR, TAIYI_MAX_YEAR),
                  });
                }
              }}
            />
            <span className="ymd-sep">年</span>
            <input
              type="number"
              className="ymd-md"
              aria-label="月"
              value={value.month}
              min={1}
              max={12}
              onChange={(ev) => {
                const m = Number(ev.target.value);
                if (ev.target.value !== '' && Number.isFinite(m)) set({ month: clampInt(m, 1, 12) });
              }}
            />
            <span className="ymd-sep">月</span>
            <input
              type="number"
              className="ymd-md"
              aria-label="日"
              value={value.day}
              min={1}
              max={31}
              onChange={(ev) => {
                const d = Number(ev.target.value);
                if (ev.target.value !== '' && Number.isFinite(d)) set({ day: clampInt(d, 1, 31) });
              }}
            />
            <span className="ymd-sep">日</span>
          </div>
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
              onChange={(ev) => {
                const checked = ev.target.checked;
                onShowHuangjiChange(checked);
                // 退出皇极全跨度时，把年份拉回上游古历可算区间（公元前 6000 — 9999）
                if (!checked && (value.year < GULI_MIN_YEAR || value.year > TAIYI_MAX_YEAR)) {
                  set({ year: clampInt(value.year, GULI_MIN_YEAR, TAIYI_MAX_YEAR) });
                }
              }}
            />
            皇极
          </label>
          {showHuangji && <span className="school-badge ok">黄畿派 · 已校订原文</span>}
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
            <select
              aria-label="定位方式"
              value={solar.mode}
              onChange={(ev) => onSolarChange({ ...solar, mode: ev.target.value as 'auto' | 'city' })}
            >
              <option value="auto">当前时区（自动）</option>
              <option value="city">选择城市（中国）</option>
            </select>
            {solar.mode === 'city' && (
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
              </>
            )}
            {solarHint && <span className="solar-hint">{solarHint}</span>}
          </>
        ) : (
          <span className="solar-hint dim">不校正（按浏览器本地时间起局）</span>
        )}
      </div>

      {/* 常居住地：不参与推算，随导出提供给 AI 作命盘人事断的地域参照 */}
      <div className="solar-row">
        <label className="toggle">
          <input
            type="checkbox"
            checked={residence.enabled}
            onChange={(ev) => onResidenceChange({ ...residence, enabled: ev.target.checked })}
          />
          常居住地（供 AI 命盘参考）
        </label>
        {residence.enabled ? (
          <input
            className="residence-input"
            type="text"
            value={residence.text}
            placeholder="如：广东省深圳市南山区 / 东京都 / 美国加州湾区"
            maxLength={60}
            aria-label="常居住地"
            onChange={(ev) => onResidenceChange({ ...residence, text: ev.target.value })}
          />
        ) : (
          <span className="solar-hint dim">未设置（仅影响 AI 导出内容，不影响盘面）</span>
        )}
      </div>
    </section>
  );
}
