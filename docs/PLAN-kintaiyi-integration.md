# 计划：直接引用 kintaiyi 作为「权威排盘源」+ 圆盘/方盘双渲染

> 本文档为**规划稿**，供下一次对话执行。当前对话不落地实现。
> 目标回应：`能否直接引用 kintaiyi 全部内容，随它实时更新而同步；并在其上扩展（皇极经世历、圆盘+方盘双渲染）；若需 Python 后端则设计前后端排盘。`

---

## 0. 结论先行（TL;DR）

1. **不能把 kintaiyi 直接 import 进浏览器**：它是 Python 包且依赖 **sxtwl（C++ 原生扩展）**、cn2an、bidict。浏览器里没有 CPython。
2. **也不能跑在 Cloudflare Worker**：Worker 的 Python 运行时（Pyodide 系）不支持 sxtwl 这类原生 C++ 扩展。Worker 只能当**边缘缓存 / 反向代理**，真正的排盘计算必须在**全功能 CPython 主机**上。
3. 真正「直接用 kintaiyi 的代码并随上游同步」只有两条路：
   - ✅ **Python API 后端（推荐）**：在**你的 docker 服务器**上用 FastAPI 包一层 kintaiyi，React 前端按需 HTTP 调用。`git pull`/bump kintaiyi 版本即同步上游。
   - ⚠️ **Pyodide 浏览器内运行**：sxtwl 无现成 wasm 轮子，需自行 emscripten 编译，风险高——列为可选 spike，**不作主路径**。
4. **推荐混合架构**：现有**本地 TS 引擎**（已逐字段对照 kintaiyi 验证，375 用例）继续作为**默认离线路径**；新增可选「**kintaiyi 权威后端**」数据源——选中时由后端返回与上游精确一致、自动同步的盘面 + kintaiyi 原生圆盘。二者共存、可切换、后端不可用时优雅降级。
5. **圆盘**：建议前端 **SVG 自绘**（可交互、主题统一、随数据更新），后端 **matplotlib PNG** 作为对照/兜底。**方盘保留**（现有 5×5 十六神式盘）。
6. **皇极经世历**：保持前端 `yhys-core` 叠加，与选哪个数据源无关。

---

## 1. 可行性判定（关键约束，务必先认清）

| 事项 | 结论 | 依据 |
|---|---|---|
| kintaiyi 是否可编程调用 | ✅ 干净可导入 | `scripts/gen_fixtures.py` 已实证：`from kintaiyi import kintaiyi as kt; t = kt.Taiyi(y,mo,d,h,mi)`，方法齐全（`accnum/kook/ty/skyeyes/sf/se/jigod/…/命法群`），返回 dict/标量，天然可 JSON 化 |
| 依赖 | sxtwl(C++)、cn2an、bidict | 同上文件头注 |
| 浏览器直接 import | ❌ | 无 CPython、sxtwl 是原生扩展 |
| CF Worker 运行 kintaiyi | ❌（计算层）；✅（仅代理/缓存） | Workers-Python 不支持 sxtwl 原生扩展 |
| Pyodide(wasm) in-browser | ⚠️ 高风险 | sxtwl 需自编 emscripten wheel，无现成方案 |
| docker 全 CPython | ✅ | `pip install sxtwl cn2an bidict` + kintaiyi |
| 许可 | MIT，可商用/二次分发 | kintaiyi LICENSE |

**核心澄清给用户**：`用 CF Worker 或 docker` 里，**CF Worker 这条不成立**（跑不动 sxtwl）。可行的是 **docker（你的服务器）**；CF 只能放在前面做 CDN/缓存/HTTPS 反代。

---

## 2. 目标架构

```
┌────────────────────────── 浏览器（React 前端，静态托管，可 CF Pages/你的 Nginx）──────────────────────────┐
│  InputPanel ──► 数据源开关：  [本地 TS 引擎(默认,离线,已验证)]  或  [kintaiyi 权威后端(精确,需联网)]         │
│                                    │                                          │                            │
│                             calculateTaiyi(TS)                        fetch POST /api/taiyi                 │
│                                    └──────────────┬───────────────────────────┘                            │
│                                        统一 TaiyiResult 形状                                                │
│                          ┌─────────────┴─────────────┐                                                     │
│                     <Board 方盘>                 <CircularBoard 圆盘 SVG>   （可并排/切换）                  │
│                          └──────────── + 皇极经世历(yhys-core，前端计算，叠加) ─────────────┘                │
└───────────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                                 │ HTTPS JSON（仅"权威后端"模式）
┌────────────────────────────────────────────────┴───────────────────────────────────────────────────────┐
│  你的 docker 服务器：FastAPI(uvicorn) ── 直接 import kintaiyi（pin 某 commit）── sxtwl/cn2an/bidict         │
│  端点：/api/taiyi  /api/taiyi/mingfa  /api/taiyi/plot.png  /api/health  /api/version                       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 后端设计（`taiyi-api`）

- **位置**：本仓新增 `server/` 目录（或独立仓 `taiyi-api`——见§8 决策）。
- **kintaiyi 固定引用（同步上游的关键）**：
  - `requirements.txt`：`git+https://github.com/kentang2017/kintaiyi@<pinned-sha>`（或 git submodule 挂 `server/vendor/kintaiyi`）。**bump SHA = 同步上游**，可复现、可回滚。
- **序列化器 `serialize_chart(t, ji, acum)`**：直接复用 `scripts/gen_fixtures.py` 已定型的字段集（干支五柱/农历/节气/积数/局式/落宫/文昌/始击/定目/计神合神/主客定算三将/君臣民基/四神/直符飞符/诸神煞/八门/格局/纪元/五子元局/阳九百六/值年日时卦 + 命法群）。该文件本质上已是一个"全字段导出器"，抽成函数即可复用。
- **端点**：
  - `POST /api/taiyi` ← `{year,month,day,hour,minute,ji,acum}` → 完整盘 JSON。
  - `POST /api/taiyi/mingfa` ← `{…,sex,asOf}` → 命法 JSON。
  - `GET  /api/taiyi/plot.png?...` → kintaiyi 原生 matplotlib **圆盘 PNG**（可选；docker 内需装**中文字体**，否则中文豆腐块）。
  - `GET  /api/health`、`GET /api/version`（回传 `kintaiyi` commit，前端标注"权威源版本"）。
- **健壮性**：输入校验（年月日范围、ji∈0..4、acum∈0..3）；`try/except` 兜住 kintaiyi 参考实现已知崩溃组合（如"日计×太乙局"的 round() 下标、jq 回扫），返回结构化错误码，供前端回落本地 TS。
- **交付物**：`server/app.py`、`serialize.py`、`requirements.txt`、`Dockerfile`、`docker-compose.yml`（uvicorn + 健康检查）、CORS 白名单、`README`。

---

## 4. 前端改造（本仓 react-taiyi）

- **数据源抽象**：新增 `TaiyiSource` 接口，两实现：
  - `localEngine`：现 `calculateTaiyi()`（离线/即时/已验证，默认）。
  - `remoteKintaiyi`：`fetch(/api/taiyi)` + **adapter** 把后端 JSON 映射到现有 `TaiyiResult` 类型（Board/ResultPanel/export 无需大改）。
- **数据源开关**：设置项 `本地 TS（默认）` | `kintaiyi 权威后端`；后端不可用/超时自动降级本地并 toast 提示。前端顶部标注两源版本（"本地TS 对齐 kintaiyi@<sha>"）。
- **圆盘渲染 `<CircularBoard>`（新）**：React SVG，用与方盘**同一份 `TaiyiResult`** 画九宫圆盘（十六神环、三将、落宫、格局标注、内外盘旋向）。
  - 视觉参照 kintaiyi 圆盘布局；先出一版，再打磨。
  - 可选"后端 PNG 模式"：`<img src=/api/taiyi/plot.png>` 作对照/兜底。
  - 视图切换：方盘 / 圆盘 / 双列并排。
- **皇极经世历**：不变（前端 yhys-core），叠加在任一数据源之上（本次对话刚把月/日/时卦改为黄畿岁卦逐层纯正推法，已就绪）。

---

## 5. 同步与防漂移（正面回应"实时更新我们也同步更新"）

1. **后端**：kintaiyi pin SHA，bump 即"直接用它最新的真实代码"——这是**真正的实时同步**。
2. **本地 TS 引擎** = **漂移探测器**：CI 定期 `pip install` 最新 kintaiyi → 跑 `gen_fixtures.py` 重生成 `golden.json` → 跑 `vitest`。上游若改了量化语义，测试红灯即提醒同步 TS 端。→ 现有黄金用例框架升级为"上游变更报警器"。
3. 前端展示两源版本号，一致性一目了然。

---

## 6. 分阶段实施（下一对话按序执行）

- **P0 后端骨架**：FastAPI + `serialize_chart` + `/api/taiyi` + Dockerfile；本地 `curl` 输出与 `tests/fixtures/golden.json` 逐字段核对（同一时间点/ji/acum 必须一致）。
- **P1 前端数据源开关 + remote adapter**：方盘先跑通远程源，与本地源结果一致性校验。
- **P2 圆盘 `<CircularBoard>` SVG**（先接本地源）：实现方盘/圆盘双渲染。
- **P3 后端补 `/mingfa` + `/plot.png`（中文字体）+ 版本标注 + 降级链路**。
- **P4 部署与运维**：docker-compose 上你的服务器，Nginx/CF 反代 + HTTPS + CORS；CI 漂移检测；更新 README/说明页。

---

## 7. 风险 / 待办 / 已知坑

- sxtwl 在 docker 需能 `pip` 装（一般 OK，必要时基础镜像加 `build-essential`）。
- kintaiyi 输出含中文键（`"文"/"數"`）与嵌套 dict → JSON key 字符串化（`gen_fixtures.py` 已如此处理）。
- kintaiyi 参考实现**已知缺陷**（`jq` 节气交接前回扫、`日计×太乙局` round 崩、分计实验公式）——后端兜底 + 前端遇崩溃组合回落本地 TS。见本仓 README「已知边界与有意偏离」。
- matplotlib 圆盘中文字体：docker 镜像需装（如 Noto Sans CJK）。
- 圆盘十六神/三将精确摆位需一版视觉打磨。
- CF Worker 只能缓存/代理，**不能算盘**（再次强调）。

---

## 8. 执行前需你拍板的决策

1. **后端放哪**：本仓 `server/` 子目录（同仓好联动）**vs** 独立仓 `taiyi-api`（部署解耦）？
2. **圆盘走法**：前端 SVG 自绘（推荐，可交互/主题统一）**vs** 后端 matplotlib PNG 优先（快、静态、与 kintaiyi 像素级一致）？
3. **默认数据源**：本地 TS（推荐，离线即用）**vs** 后端优先（精确但依赖联网）？
4. **部署形态**：docker-compose 单机 + Nginx/CF 反代 + HTTPS 即可？后端是否需要鉴权（防公网滥用）？

> 建议缺省：本仓 `server/` + 前端 SVG 圆盘为主/PNG 兜底 + 默认本地 TS + docker-compose 单机反代。若认可，下次对话可直接从 P0 开跑。
