import { useEffect, useMemo, useState } from 'react';
import {
  calculateTaiyi, calculateMingfa, calculateHuangji, loadStarsData, findStars, starsLoaded,
  applyTrueSolarTime, browserTimeZone, browserTzOffsetMinutes, tzAutoLocation, CN_TZ_OFFSET_MINUTES,
  formatGregorianYearCn, TAIYI_MIN_YEAR, TAIYI_MAX_YEAR, buildRemoteResult,
} from './taiyi';
import { loadExamples, matchExamples } from './lib/examples';
import type { ExampleRow } from './lib/examples';
import { usePersistentState } from './lib/persist';
import type { HuangjiInfo, MingfaResult, Sex, SolarTimeInfo, TaiyiInput, TaiyiResult } from './taiyi';
import { findLongitude } from './lib/cities';
import {
  fetchRemoteChart, compareRemote, panSvgUrl,
  getApiBase, getDataSource, saveDataSource,
} from './taiyi/remote';
import type { DataSource } from './taiyi/remote';
import { fetchPan, fetchLife } from './taiyi/pan';
import { PanCards } from './components/PanCards';
import type { PanState } from './components/PanCards';
import { TongyunExtra, GuiyunExtra, WuzhenExtra } from './components/PanExtras';
import { LiuTimeline } from './components/LiuTimeline';
import { LifeCards } from './components/LifeCards';
import type { LifeState } from './components/LifeCards';
import { DocsView } from './components/DocsPages';
import { InputPanel } from './components/InputPanel';
import type { InquirySetting, ResidenceSetting, SolarTimeSetting } from './components/InputPanel';
import { fetchLiu } from './taiyi/pan';
import type { LiuState } from './components/LiuTimeline';
import { Board } from './components/Board';
import { CircularBoard } from './components/CircularBoard';
import { SourceBar } from './components/SourceBar';
import type { RemoteState } from './components/SourceBar';
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

type View = 'pan' | 'guide' | 'history' | 'disaster' | 'books' | 'tutorial' | 'updates';

const VIEW_TABS: Array<[View, string]> = [
  ['pan', '☰ 排盘'],
  ['guide', '✎ 使用说明'],
  ['history', '📜 局數史例'],
  ['disaster', '🔥 災異統計'],
  ['books', '📚 古籍書目'],
  ['tutorial', '🚀 看盤要領'],
  ['updates', '🆕 上游更新'],
];

export default function App() {
  const [view, setView] = useState<View>('pan');
  // 起局输入项持久化：刷新后恢复上次排盘（派生结果由输入重算，见 lib/persist）
  const [input, setInput] = usePersistentState<TaiyiInput>('input', defaultInput);
  const [sex, setSex] = usePersistentState<Sex>('sex', '男');
  const [showMingfa, setShowMingfa] = usePersistentState('showMingfa', false);
  const [showTenjing, setShowTenjing] = usePersistentState('showTenjing', false);
  const [tenjingReady, setTenjingReady] = useState(false);
  const [tenjingError, setTenjingError] = useState<string | null>(null);
  const [showHuangji, setShowHuangji] = usePersistentState('showHuangji', false);
  // kintaiyi 权威后端（后端优先，不可用自动回退本地并提示）
  const [dataSource, setDataSource] = useState<DataSource>(getDataSource);
  // API 地址只读展示（可经 VITE_TAIYI_API / localStorage 配置，界面不提供编辑）
  const [apiBase] = useState<string>(getApiBase);
  const [remote, setRemote] = useState<RemoteState>({ phase: 'off' });
  const [pan, setPan] = useState<PanState>({ phase: 'idle' });
  // 上游古歷盘（600 前、未勾选皇极时后端直出整张盘）
  const [guli, setGuli] = useState<
    | { phase: 'idle' } | { phase: 'loading' }
    | { phase: 'ok'; result: TaiyiResult; ref: string }
    | { phase: 'err'; reason: string }
  >({ phase: 'idle' });
  // 局數史例命中（该年份的史载纪事，展示并入 AI 导出）
  const [historyMatches, setHistoryMatches] = useState<ExampleRow[]>([]);
  // 流卦運多期（提升到 App：时间轴显示 + 并入 AI 导出）
  const [liu, setLiu] = useState<LiuState>({ phase: 'idle' });
  // 命法卷二十扩展（taiyi_life 直出：十提金賦/十二宮星斷等釋文）：展示 + 并入 AI 导出
  const [life, setLife] = useState<LifeState>({ phase: 'idle' });
  // 常居住地（不参与推算，随导出供 AI 作命盘人事断的地域参照；自由填写）
  const [residence, setResidence] = usePersistentState<ResidenceSetting>('residence', { enabled: false, text: '' });
  // 所占何事（不参与推算，随导出注入 AI Prompt 定制分析聚焦）
  const [inquiry, setInquiry] = usePersistentState<InquirySetting>('inquiry', { enabled: false, topic: '事占', text: '' });
  const [boardView, setBoardView] = usePersistentState<'both' | 'square' | 'circle'>('boardView', 'both');
  const [solar, setSolar] = usePersistentState<SolarTimeSetting>('solar', {
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
    // 未校正时也带上浏览器时区信息（供导出标注输入时间的解释口径）
    const browserTz = {
      timezone: browserTimeZone(),
      tzOffsetMinutes: browserTzOffsetMinutes(input.year, input.month, input.day, input.hour, input.minute),
    };
    if (!solar.enabled || !taiyiInRange) return { effectiveInput: input, solarInfo: { applied: false, ...browserTz } };
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
      timezone = '中国标准时间';
    }
    if (lng === undefined) return { effectiveInput: input, solarInfo: { applied: false, ...browserTz } };
    // 输入时间按所选地点民用时区解释（排盘惯例：生辰即当地钟表时间）——
    // 城市模式：中国城市恒 UTC+8；自动模式：地点=浏览器时区代表城市，用浏览器时区
    const tzOffset = solar.mode === 'auto' ? browserTz.tzOffsetMinutes : CN_TZ_OFFSET_MINUTES;
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

  // 上游古歷模式：未勾选皇极的 600 前年份，盘面由后端 kintaiyi/sxtwl 古历直出（demo 同款）；
  // 勾选皇极则盘面用皇极拟推口径（本地引擎）
  const guliMode = !taiyiInRange && !showHuangji;
  // 后端年份约定为「公元前直记」（无 0 年）；600–9999 时恒等
  const remoteInput = useMemo<TaiyiInput>(
    () => ({ ...effectiveInput, year: effectiveInput.year <= 0 ? effectiveInput.year - 1 : effectiveInput.year }),
    [effectiveInput],
  );

  // 本地盘：标准范围用黄金验证历法，范围外用皇极拟推（古历模式下作为回退与即时渲染）
  const { result: localResult, error } = useMemo<{ result: TaiyiResult | null; error: string | null }>(() => {
    try {
      return {
        result: calculateTaiyi(effectiveInput, taiyiInRange ? 'standard' : 'huangji'),
        error: null,
      };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [effectiveInput, taiyiInRange]);

  // 命法依赖标准历法（节气积日/流年虚岁），仅在标准范围内提供
  const mingfa = useMemo<MingfaResult | null>(() => {
    if (!showMingfa || !localResult || !taiyiInRange) return null;
    try {
      return calculateMingfa(effectiveInput, sex);
    } catch {
      return null;
    }
  }, [effectiveInput, sex, showMingfa, localResult, taiyiInRange]);

  const planets = useMemo(() => {
    if (!showTenjing || !tenjingReady) return null;
    return findStars(effectiveInput.year, effectiveInput.month, effectiveInput.day);
  }, [showTenjing, tenjingReady, effectiveInput.year, effectiveInput.month, effectiveInput.day]);

  // 皇极经世历：恒显示（与盘面历法无关；勾选「皇极」仅决定范围外盘面是否用拟推口径）。
  // 月/日/时卦按公历日期（冬至换岁）逐层推演，与太乙盘四柱脱钩
  const { huangji, huangjiError } = useMemo<{ huangji: HuangjiInfo | null; huangjiError: string | null }>(() => {
    try {
      const source = { month: effectiveInput.month, day: effectiveInput.day, hour: effectiveInput.hour };
      return { huangji: calculateHuangji(effectiveInput.year, source), huangjiError: null };
    } catch (e) {
      return { huangji: null, huangjiError: e instanceof Error ? e.message : String(e) };
    }
  }, [effectiveInput]);

  // 后端优先（600–9999）：请求 kintaiyi 权威后端并与本地引擎逐字段对照；失败自动回退本地
  useEffect(() => {
    if (dataSource !== 'remote' || !localResult || !taiyiInRange) {
      setRemote({ phase: 'off' });
      return;
    }
    let active = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    setRemote({ phase: 'checking' });
    fetchRemoteChart(remoteInput, apiBase, ctrl.signal)
      .then((resp) => {
        if (!active) return;
        setRemote({ phase: 'ok', ref: resp.ref, diffs: compareRemote(localResult, resp.chart) });
      })
      .catch((e: unknown) => {
        if (!active) return;
        const reason = ctrl.signal.aborted ? '请求超时' : e instanceof Error ? e.message : String(e);
        setRemote({ phase: 'fallback', reason });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
  }, [dataSource, apiBase, remoteInput, localResult, taiyiInRange]);

  // 上游古歷盘（600 前、未勾选皇极）：chart + pan 双请求，装配整张 TaiyiResult
  useEffect(() => {
    if (!guliMode || dataSource !== 'remote') {
      setGuli({ phase: 'idle' });
      return;
    }
    let active = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    setGuli({ phase: 'loading' });
    setPan({ phase: 'loading' });
    Promise.all([
      fetchRemoteChart(remoteInput, apiBase, ctrl.signal),
      fetchPan(remoteInput, apiBase, true, ctrl.signal),
    ])
      .then(([c, p]) => {
        if (!active) return;
        setGuli({ phase: 'ok', result: buildRemoteResult(effectiveInput, c.chart, p.pan), ref: c.ref });
        setPan({ phase: 'ok', data: p.pan, ref: p.ref });
      })
      .catch((e: unknown) => {
        if (!active) return;
        const reason = ctrl.signal.aborted ? '请求超时' : e instanceof Error ? e.message : String(e);
        setGuli({ phase: 'err', reason });
        setPan({ phase: 'err', reason });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guliMode, dataSource, remoteInput, apiBase]);

  // 全解释盘（kintaiyi pan()，含博弈）：600–9999 由对照成功触发；古歷模式在上方一并请求
  useEffect(() => {
    if (guliMode) return; // 古歷模式的 pan 由古歷 effect 管理
    if (remote.phase !== 'ok') {
      setPan({ phase: 'idle' });
      return;
    }
    let active = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000); // 首次未缓存需数秒
    setPan({ phase: 'loading' });
    fetchPan(remoteInput, apiBase, true, ctrl.signal)
      .then((resp) => { if (active) setPan({ phase: 'ok', data: resp.pan, ref: resp.ref }); })
      .catch((e: unknown) => {
        if (!active) return;
        const reason = ctrl.signal.aborted ? '请求超时' : e instanceof Error ? e.message : String(e);
        setPan({ phase: 'err', reason });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote.phase === 'ok', guliMode, remoteInput, apiBase]);

  // 展示盘：古歷模式后端装配成功用上游古歷盘，否则本地（标准/拟推回退）
  const result = guliMode && guli.phase === 'ok' && guli.result ? guli.result : localResult;

  // 史例對照：排盘年份命中局數史例即展示并入 AI 导出（数据源为后端 docs）
  useEffect(() => {
    if (!result || dataSource !== 'remote') { setHistoryMatches([]); return; }
    let active = true;
    loadExamples(apiBase)
      .then((rows) => { if (active) setHistoryMatches(matchExamples(rows, effectiveInput.year)); })
      .catch(() => { if (active) setHistoryMatches([]); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(result), dataSource, apiBase, effectiveInput.year]);

  const remoteOk = taiyiInRange ? remote.phase === 'ok' : guli.phase === 'ok';

  // 流卦運多期：后端可用且年份 ≥ 公元 1（上游 hex_timeline 依 Python datetime）
  useEffect(() => {
    const enabled = dataSource === 'remote' && remoteOk && remoteInput.year >= 1;
    if (!enabled) { setLiu({ phase: 'idle' }); return; }
    let active = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    setLiu({ phase: 'loading' });
    fetchLiu(remoteInput, apiBase, ctrl.signal)
      .then((resp) => { if (active) setLiu({ phase: 'ok', liu: resp.liu }); })
      .catch((e: unknown) => {
        if (!active) return;
        setLiu({
          phase: 'err',
          reason: ctrl.signal.aborted ? '请求超时' : e instanceof Error ? e.message : String(e),
        });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
  }, [dataSource, remoteOk, remoteInput, apiBase]);
  // 命法卷二十扩展：命法勾选且后端可用时请求（标准范围内；命法本身不支持范围外）
  useEffect(() => {
    const enabled = dataSource === 'remote' && remoteOk && taiyiInRange && showMingfa;
    if (!enabled) { setLife({ phase: 'idle' }); return; }
    let active = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    setLife({ phase: 'loading' });
    fetchLife(remoteInput, sex, apiBase, ctrl.signal)
      .then((resp) => { if (active) setLife({ phase: 'ok', life: resp.life }); })
      .catch((e: unknown) => {
        if (!active) return;
        setLife({
          phase: 'err',
          reason: ctrl.signal.aborted ? '请求超时' : e instanceof Error ? e.message : String(e),
        });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
  }, [dataSource, remoteOk, taiyiInRange, showMingfa, remoteInput, sex, apiBase]);

  const circularUrl = remoteOk ? panSvgUrl(remoteInput, apiBase, Boolean(planets)) : null;
  const circularNote = dataSource === 'local'
    ? '当前为「仅本地引擎」模式，切换数据源后显示'
    : (taiyiInRange ? remote.phase === 'fallback' : guli.phase === 'err') ? '后端不可用，暂无法渲染（方盘不受影响）'
    : (taiyiInRange ? remote.phase === 'checking' : guli.phase === 'loading') ? '后端连接中…'
    : !taiyiInRange && showHuangji ? '皇极拟推口径盘面由本地引擎渲染，圆盘需后端（取消勾选「皇极」即用上游古历出圆盘）' : undefined;

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
            三式之首 · 年月日时分五计式
          </p>
          <nav className="view-tabs">
            {VIEW_TABS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={view === k ? 'active' : ''}
                onClick={() => { setView(k); window.scrollTo(0, 0); }}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {view === 'guide' && <GuidePage />}
        {(view === 'history' || view === 'disaster' || view === 'books' || view === 'tutorial' || view === 'updates') && (
          <DocsView
            view={view}
            apiBase={apiBase}
            onPickYear={(y) => {
              // 600 前年份默认即走上游 sxtwl 古历盘面（demo 同款），无需勾选皇极
              setInput({ ...input, year: y });
              setView('pan');
              window.scrollTo(0, 0);
            }}
          />
        )}

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
          solar={solar}
          onSolarChange={setSolar}
          solarHint={solarHint}
          residence={residence}
          onResidenceChange={setResidence}
          inquiry={inquiry}
          onInquiryChange={setInquiry}
        />

        {error && <div className="error">排盘失败：{error}</div>}
        {huangjiError && <div className="error">皇极推算失败：{huangjiError}</div>}
        {tenjingError && <div className="error">十精数据加载失败：{tenjingError}</div>}

        {!taiyiInRange && (
          <div className="info-banner">
            当前年份 {formatGregorianYearCn(input.year)} 超出本地标准历法范围（公元 {TAIYI_MIN_YEAR}–{TAIYI_MAX_YEAR}）。
            {showHuangji
              ? '盘面采用「皇极历法拟推口径」（本地引擎）：四柱按纯干支算术＋天文节气推得（拟推格里历），农历为节气月建拟推，属现代拟推、非古历考据；取消勾选「皇极」即改用上游 sxtwl 古历盘面。'
              : '盘面采用上游 kintaiyi/sxtwl 中国古历表（后端直出，与上游 demo 公元前排盘同款）；勾选「皇极」可改用皇极历法拟推口径并解锁一元全跨度（公元前 67016 — 公元 62583）。'}
          </div>
        )}

        {result && (
          <SourceBar
            dataSource={dataSource}
            onDataSourceChange={(v) => { setDataSource(v); saveDataSource(v); }}
            apiBase={apiBase}
            remote={remote}
            chipOverride={!taiyiInRange ? (
              showHuangji
                ? { cls: 'off', text: '皇极拟推口径盘面（本地引擎）——范围外后端对照不适用' }
                : dataSource === 'local'
                  ? { cls: 'off', text: '仅本地模式：600 前盘面走皇极拟推口径（切「后端优先」即用上游古历）' }
                  : guli.phase === 'ok'
                    ? { cls: 'ok', text: `上游古歷（sxtwl）盘面 · kintaiyi 直出 · 上游 ${guli.ref.slice(0, 7)}` }
                    : guli.phase === 'loading'
                      ? { cls: 'checking', text: '上游古歷盘面加载中…（暂以皇极拟推口径显示）' }
                      : guli.phase === 'err'
                        ? { cls: 'err', text: `后端不可用（${guli.reason}），已回退皇极拟推口径盘面` }
                        : null
            ) : null}
          />
        )}

        {result && (
          <>
            <div className="board-tabs" role="tablist" aria-label="盘面视图">
              {([['both', '双盘'], ['square', '方盘'], ['circle', '圆盘']] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={boardView === k ? 'active' : ''}
                  onClick={() => setBoardView(k)}
                >
                  {label}
                </button>
              ))}
            </div>
            <main className="content">
              <div className="board-col">
                {boardView !== 'circle' && <Board result={result} planets={planets} />}
                {boardView !== 'square' && <CircularBoard url={circularUrl} note={circularNote} />}
              </div>
              <div className="result-panel">
                {huangji && <HuangjiPanel info={huangji} />}
                {mingfa && <MingfaPanel mingfa={mingfa} />}
                <ResultPanel result={result} solarInfo={solarInfo} />
              </div>
            </main>
            {(taiyiInRange || guliMode) && (
              <LiuTimeline
                state={liu}
                unavailableNote={
                  remoteInput.year < 1
                    ? '公元前不支持流卦運多期时步（上游 hex_timeline 依 Python datetime，年份下限公元 1 年）。'
                    : dataSource === 'local'
                      ? '「仅本地引擎」模式下不加载——切换数据源后显示。'
                      : (taiyiInRange ? remote.phase === 'fallback' : guli.phase === 'err')
                        ? 'kintaiyi 后端不可用，流卦運暂无法推算。' : null
                }
              />
            )}
            {(taiyiInRange || guliMode) && (
              <PanCards
                state={pan}
                extras={pan.phase === 'ok' ? {
                  '統運（卷十二）': (
                    <TongyunExtra
                      vol12={(pan.data['卷十二'] ?? {}) as Record<string, unknown>}
                      input={effectiveInput}
                      apiBase={apiBase}
                    />
                  ),
                  '軌運（卷九）': (
                    <GuiyunExtra vol9={(pan.data['卷九'] ?? {}) as Record<string, unknown>} />
                  ),
                  '軍事': (
                    <WuzhenExtra junshi={(pan.data['軍事應用'] ?? {}) as Record<string, unknown>} />
                  ),
                } : undefined}
                unavailableNote={
                  dataSource === 'local'
                    ? '「仅本地引擎」模式下不加载——全解釋由 kintaiyi 后端直出，切换数据源后显示。'
                    : (taiyiInRange ? remote.phase === 'fallback' : guli.phase === 'err')
                      ? 'kintaiyi 后端不可用，全解釋暂无法加载（盘面与导出不受影响）。'
                      : null
                }
              />
            )}
            {taiyiInRange && showMingfa && <LifeCards state={life} />}
            {historyMatches.length > 0 && (
              <section className="card hx-match">
                <h3>
                  局數史例對照
                  <span className="pan-tag">该年份见于上游史例库 · 已并入 AI 导出可与盘面互证</span>
                </h3>
                {historyMatches.map((m, i) => (
                  <div key={`${m.year}-${i}`} className="hx-example">
                    <div className="hx-example-head">
                      <strong>{m.year < 0 ? `公元前 ${-m.year} 年` : `公元 ${m.year} 年`}</strong>
                      <span>史載局數：{m.kook}</span>
                      <span>出處：{m.source}</span>
                    </div>
                    <p className="pan-text">{m.event}</p>
                  </div>
                ))}
              </section>
            )}
            <ExportCard
              payload={{
                result, mingfa, planets, solarTime: solarInfo, huangji,
                kintaiyiPan: pan.phase === 'ok' ? pan.data : null,
                kintaiyiLife: life.phase === 'ok' ? life.life : null,
                historyExamples: historyMatches.length ? historyMatches : null,
                liuTimelines: liu.phase === 'ok' ? liu.liu : null,
                residence: residence.enabled && residence.text.trim()
                  ? { text: residence.text.trim() }
                  : null,
                inquiry: inquiry.enabled
                  ? { topic: inquiry.topic, ...(inquiry.text.trim() ? { text: inquiry.text.trim() } : {}) }
                  : null,
              }}
            />
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
                inquiry: inquiry.enabled
                  ? { topic: inquiry.topic, ...(inquiry.text.trim() ? { text: inquiry.text.trim() } : {}) }
                  : null,
              }}
            />
          </>
        )}
        </div>

        <footer className="app-footer">
          算法参照 <a href="https://github.com/kentang2017/kintaiyi" target="_blank" rel="noreferrer">kentang2017/kintaiyi</a>（MIT）；
          历法由 lunar-typescript 提供。仅供术数文化研究。
        </footer>
      </div>
    </ToastProvider>
  );
}
