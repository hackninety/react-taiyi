import { useEffect, useMemo, useState } from 'react';
import {
  calculateTaiyi, calculateMingfa, calculateHuangji, loadStarsData, findStars, starsLoaded,
  applyTrueSolarTime, browserTzOffsetMinutes, tzAutoLocation,
  formatGregorianYearCn, TAIYI_MIN_YEAR, TAIYI_MAX_YEAR,
} from './taiyi';
import type { HuangjiInfo, HuangjiSchool, MingfaResult, Sex, SolarTimeInfo, TaiyiInput, TaiyiResult } from './taiyi';
import { findLongitude } from './lib/cities';
import { InputPanel } from './components/InputPanel';
import type { SolarTimeSetting } from './components/InputPanel';
import { Board } from './components/Board';
import { ResultPanel } from './components/ResultPanel';
import { MingfaPanel } from './components/MingfaPanel';
import { HuangjiPanel } from './components/HuangjiPanel';
import { ExportCard } from './components/ExportCard';
import { GuidePage } from './components/GuidePage';
import { ToastProvider } from './components/Toast';

function formatUtcOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

function defaultInput(): TaiyiInput {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    jiStyle: 3,
    acumYear: 0,
  };
}

export default function App() {
  const [view, setView] = useState<'pan' | 'guide'>('pan');
  const [input, setInput] = useState<TaiyiInput>(defaultInput);
  const [sex, setSex] = useState<Sex>('男');
  const [showMingfa, setShowMingfa] = useState(false);
  const [showTenjing, setShowTenjing] = useState(false);
  const [tenjingReady, setTenjingReady] = useState(false);
  const [tenjingError, setTenjingError] = useState<string | null>(null);
  const [showHuangji, setShowHuangji] = useState(false);
  const [huangjiSchool, setHuangjiSchool] = useState<HuangjiSchool>('黄畿');
  const [solar, setSolar] = useState<SolarTimeSetting>({
    enabled: false,
    mode: 'auto',
    province: '北京',
    city: '北京',
    district: '市区',
  });

  useEffect(() => {
    if (!showTenjing || starsLoaded()) return;
    let cancelled = false;
    loadStarsData()
      .then(() => { if (!cancelled) { setTenjingReady(true); setTenjingError(null); } })
      .catch((e: unknown) => {
        if (!cancelled) setTenjingError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [showTenjing]);

  // 太乙历法验证范围；范围外（皇极全跨度模式）只推皇极经世历
  const taiyiInRange = input.year >= TAIYI_MIN_YEAR && input.year <= TAIYI_MAX_YEAR;

  // 真太阳时校正后的实际排盘输入（范围外无太乙盘，分钟级校正无意义，跳过）
  const { effectiveInput, solarInfo } = useMemo<{
    effectiveInput: TaiyiInput;
    solarInfo: SolarTimeInfo;
  }>(() => {
    if (!solar.enabled || !taiyiInRange) return { effectiveInput: input, solarInfo: { applied: false } };
    let lng: number | undefined;
    let place: string;
    let timezone: string | undefined;
    if (solar.mode === 'auto') {
      const auto = tzAutoLocation(input.year, input.month, input.day, input.hour, input.minute);
      lng = auto.longitude;
      place = auto.label;
      timezone = auto.timezone;
    } else {
      lng = findLongitude(solar.province, solar.city, solar.district);
      place = solar.district === '市区' ? solar.city : `${solar.city}·${solar.district}`;
    }
    if (lng === undefined) return { effectiveInput: input, solarInfo: { applied: false } };
    // 输入时间按浏览器本地时区解释：校正量 = 经度×4 − 本地时区偏移
    const tzOffset = browserTzOffsetMinutes(input.year, input.month, input.day, input.hour, input.minute);
    const adjusted = applyTrueSolarTime(input.year, input.month, input.day, input.hour, input.minute, lng, tzOffset);
    return {
      effectiveInput: { ...input, ...adjusted },
      solarInfo: {
        applied: true,
        place,
        longitude: lng,
        timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        tzOffsetMinutes: tzOffset,
        offsetMinutes: adjusted.offsetMinutes,
        adjusted: {
          year: adjusted.year, month: adjusted.month, day: adjusted.day,
          hour: adjusted.hour, minute: adjusted.minute,
        },
      },
    };
  }, [input, solar, taiyiInRange]);

  // 标准范围内用黄金验证历法；范围外且开皇极时，以皇极拟推历法排整盘
  const { result, error } = useMemo<{ result: TaiyiResult | null; error: string | null }>(() => {
    if (!taiyiInRange && !showHuangji) return { result: null, error: null };
    try {
      return {
        result: calculateTaiyi(effectiveInput, taiyiInRange ? 'standard' : 'huangji'),
        error: null,
      };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [effectiveInput, taiyiInRange, showHuangji]);

  // 命法依赖标准历法（节气积日/流年虚岁），仅在标准范围内提供
  const mingfa = useMemo<MingfaResult | null>(() => {
    if (!showMingfa || !result || !taiyiInRange) return null;
    try {
      return calculateMingfa(effectiveInput, sex);
    } catch {
      return null;
    }
  }, [effectiveInput, sex, showMingfa, result, taiyiInRange]);

  const planets = useMemo(() => {
    if (!showTenjing || !tenjingReady) return null;
    return findStars(effectiveInput.year, effectiveInput.month, effectiveInput.day);
  }, [showTenjing, tenjingReady, effectiveInput.year, effectiveInput.month, effectiveInput.day]);

  // 皇极经世历：范围内以太乙四柱起月日时卦；范围外（全跨度）以公历日期起
  const { huangji, huangjiError } = useMemo<{ huangji: HuangjiInfo | null; huangjiError: string | null }>(() => {
    if (!showHuangji) return { huangji: null, huangjiError: null };
    try {
      const source = result
        ? { monthGz: result.ganzhi[1], dayGz: result.ganzhi[2], hourBranch: result.ganzhi[3][1] }
        : { month: effectiveInput.month, day: effectiveInput.day, hour: effectiveInput.hour };
      return { huangji: calculateHuangji(effectiveInput.year, huangjiSchool, source), huangjiError: null };
    } catch (e) {
      return { huangji: null, huangjiError: e instanceof Error ? e.message : String(e) };
    }
  }, [showHuangji, huangjiSchool, effectiveInput, result]);

  const solarHint = solarInfo.applied
    ? `${solarInfo.place}（${formatUtcOffset(solarInfo.tzOffsetMinutes!)}）${solarInfo.offsetMinutes! >= 0 ? '+' : ''}${solarInfo.offsetMinutes} 分钟 → ${String(solarInfo.adjusted!.hour).padStart(2, '0')}:${String(solarInfo.adjusted!.minute).padStart(2, '0')} 起局`
    : null;

  return (
    <ToastProvider>
      <div className="app">
        <div className="bg-ornament" aria-hidden="true" />
        <header className="app-header">
          <h1>太乙神数</h1>
          <p className="subtitle">
            三式之首 · 年月日时分五计式 · 算法汇集自开源项目 kintaiyi / taiyipython
          </p>
          <nav className="view-tabs">
            <button
              type="button"
              className={view === 'pan' ? 'active' : ''}
              onClick={() => { setView('pan'); window.scrollTo(0, 0); }}
            >
              ☰ 排盘
            </button>
            <button
              type="button"
              className={view === 'guide' ? 'active' : ''}
              onClick={() => { setView('guide'); window.scrollTo(0, 0); }}
            >
              ✎ 使用说明
            </button>
          </nav>
        </header>

        {view === 'guide' && <GuidePage />}

        <div style={{ display: view === 'pan' ? 'contents' : 'none' }}>
        <InputPanel
          value={input}
          onChange={setInput}
          sex={sex}
          onSexChange={setSex}
          showMingfa={showMingfa}
          onShowMingfaChange={setShowMingfa}
          showTenjing={showTenjing}
          onShowTenjingChange={setShowTenjing}
          tenjingLoading={showTenjing && !tenjingReady && !tenjingError}
          showHuangji={showHuangji}
          onShowHuangjiChange={setShowHuangji}
          huangjiSchool={huangjiSchool}
          onHuangjiSchoolChange={setHuangjiSchool}
          solar={solar}
          onSolarChange={setSolar}
          solarHint={solarHint}
        />

        {error && <div className="error">排盘失败：{error}</div>}
        {huangjiError && <div className="error">皇极推算失败：{huangjiError}</div>}
        {tenjingError && <div className="error">十精数据加载失败：{tenjingError}</div>}

        {!taiyiInRange && (
          <div className="info-banner">
            当前年份 {formatGregorianYearCn(input.year)} 超出太乙历法验证范围（公元 {TAIYI_MIN_YEAR}–{TAIYI_MAX_YEAR}）。
            {showHuangji
              ? '太乙盘已切换为「皇极历法拟推口径」：四柱按纯干支算术＋天文节气推得（拟推格里历），农历为节气月建拟推，属现代拟推、非古历考据；元会运世照常推算。'
              : '请勾选「皇极」以按皇极历法拟推口径出盘（一元全跨度：公元前 67016 — 公元 62583），或将年份改回范围内。'}
          </div>
        )}

        {result && (
          <>
            <main className="content">
              <Board result={result} planets={planets} />
              <div className="result-panel">
                {huangji && <HuangjiPanel info={huangji} />}
                {mingfa && <MingfaPanel mingfa={mingfa} />}
                <ResultPanel result={result} solarInfo={solarInfo} />
              </div>
            </main>
            <ExportCard payload={{ result, mingfa, planets, solarTime: solarInfo, huangji }} />
          </>
        )}

        {!result && huangji && (
          <>
            <main className="content-single">
              <HuangjiPanel info={huangji} />
            </main>
            <ExportCard
              payload={{
                result: null,
                huangji,
                huangjiOnlyInput: {
                  year: input.year, month: input.month, day: input.day,
                  hour: input.hour, minute: input.minute,
                },
              }}
            />
          </>
        )}
        </div>

        <footer className="app-footer">
          算法参照 <a href="https://github.com/kentang2017/kintaiyi" target="_blank" rel="noreferrer">kentang2017/kintaiyi</a>（MIT）
          与 <a href="https://github.com/wlhyl/taiyipython" target="_blank" rel="noreferrer">wlhyl/taiyipython</a>；
          历法由 lunar-typescript 提供。仅供术数文化研究。
        </footer>
      </div>
    </ToastProvider>
  );
}
