# 太乙神数排盘（react-taiyi）

基于开源权威实现 [kentang2017/kintaiyi](https://github.com/kentang2017/kintaiyi)（MIT）的
React + TypeScript 前后端排盘应用。支持
**年计 / 月计 / 日计 / 时计 / 分计**五种计式与**太乙统宗 / 太乙金镜 /
太乙淘金歌 / 太乙局**四种积年流派，输出十六神式盘、主客定算三将、
格局（掩迫关囚击格对提挟执提四郭固四郭杜）、八门、神煞与值年卦。

AI 可直接使用[统一远程 MCP](#在-ai-中使用统一远程-mcp)，输入起局时间后排盘；需要本项目的经典原文与 kintaiyi 释文时，连接下方[太乙专用 MCP](#太乙专用-mcp本机-14-个工具)。两者的工具、输入参数和历法范围分别说明。

扩展功能：

- **太乙命法**：命法积数、三才数、十二命宫（男女顺逆）、阳九/百六行限、
  受气干支、出身卦与流年卦链（年月日时分）
- **十精入宿**：七曜（日月辰星太白荧惑岁星填星）落位上盘
  （懒加载 kintaiyi 预计算表 `public/data/stars_data.json`，约 3MB）
- **真太阳时**：输入时间按**所选地点民用时区**解释（排盘惯例：生辰即当地钟表时间，
  与操作者所在浏览器时区无关），校正量 = 经度×4 分钟 − 解释时区偏移。
  「选择城市（中国省/市/区三级）」恒按中国标准时间 UTC+8（如东京操作选潮州 6:10 → −13 分 → 5:57）；
  「当前时区（自动）」按浏览器时区取代表城市，两口径自洽；时区/经度/校正量全程标注并随导出
- **常居住地**（可选，自由填写）：命主长期生活地（任意地名，如「广东省深圳市南山区」「东京都」），
  不参与排盘，随 AI 导出提供人事断的方位地缘参照
- **皇极经世历**（黄畿派，**一元全跨度**）：任一起局年份给出邵雍元会运世坐标
  （一元 129,600 年 = 12 会 × 30 运 × 12 世 × 30 年，元起于公元前 67017 年）
  与逐层值卦：会辟卦、运卦（主卦变爻）、世卦、十年卦、岁卦，以及岁以下的
  **月经卦（60 日/双月）、旬纬卦（10 日/旬）、日卦、时经卦（2 时辰）**——
  子年卦取黄畿「岁卦逐层变爻·挨卦」纯正推法（岁卦→月经卦→旬纬卦→日卦→时经卦），
  皇极以**冬至换岁**定位岁内天数（1–360）后逐层取卦；
  岁卦采用**黄畿**派（运卦→经卦→挨六十卦次，已对照原文校验）；
  祝泌派（先天六十卦序平推）暂未对照《皇极经世书解》原文，**已关闭不用**。
  勾选「皇极」即解锁年份输入至**天文纪年 -67016 — 62583**（0 = 公元前 1 年，-1 = 公元前 2 年）：
  600–9999 内两盘互参；范围外**整张太乙盘改用「皇极历法拟推口径」照常推算**
  （四柱纯干支算术＋天文节气、拟推格里历，农历为节气月建拟推，盘面与导出显著标注），
  经 1582 年后共同区间与标准口径逐字段同盘的交叉验证；
  公元前推算经文献锚点验证（尧甲辰=随、孔子庚戌=履，年柱自洽甲辰/庚戌）。
  算法**直接引用**开源库 [`yhys-core`](https://github.com/hackninety/react-yhys)
  （`npm i github:hackninety/react-yhys`），随上游更新而更新
- **kintaiyi 权威后端（后端优先 · 自动回退）**：默认调用
  [python-taiyi](https://github.com/hackninety/python-taiyi) API——后端直接运行上游
  kentang2017/kintaiyi 源码（pin SHA，升级即同步），返回结果与本地 TS 引擎**逐字段对照**：
  一致则标注「✓ 逐字段一致」，不一致则醒目列出差异（上游漂移报警）；
  后端不可用/超时/已知崩溃组合自动回退本地引擎并明显提示。数据源与 API 地址可在盘面上方切换
- **方盘 + 圆盘双渲染**：本地 5×5 十六神方盘之外，同参数并列展示
  **kintaiyi 原生 drawsvg 圆盘**（由后端渲染 SVG，随上游样式实时更新），双盘/方盘/圆盘可切换
- **kintaiyi 全解釋（《太乙統宗寶鑑》诸卷直出）**：后端透传上游 `pan()` 全量输出（97 键），
  16 个主题分组卡——值宿断事、断法解释（三门五将/主客/胜负/风云飞鸟/雷公临津狮子白云猛虎白龙回军诸占）、
  明所主术、釋格局全文、九星贵神（三旗行宫/九宫贵神/太乙九星/文昌九星）、五運六氣与五音、
  **統運（卷十二：統運入卦/十二運立成/入爻禍福/流年直卦/歷史入爻/災厄首尾/變卦納甲）**、
  **卦象（卷十三：統運卦象/卦象總述與動爻辭全文）**、行支編年（卷十四）、分野（卷八）、
  軌運（卷九）、州國災變（卷十一）、十精雲氣（卷十八）、军事三卷（战略/五陣八陣应用/占断+神將所主）、
  金函玉鏡，以及**運籌博弈分析**（Nash 均衡对照古法主客相关）；
  全部随上游更新，并整体并入结构化导出（`kintaiyiPan` 字段）供 AI 引用释文；
  統運卡带**六爻年段时间轴、觀象期十二月直事轴与任意年統運查詢**，軌運卡带大小遊內外卦年段轴，
  軍事卡带**五陣置旗+八陣 SVG 示意图**
- **流卦運五計多期时间轴**：流年 12 期 / 流月 12 期 / 流日 15 期 / 流時 12 辰 / 流分 10 期
  横向滑动（首期即起局时刻），后端 `/api/taiyi/liu` **直调上游 apps/hex_timeline 推法**
  （命法卦链＋干支序动爻，时辰跨日/闰日细节用上游原逻辑），守卫测试以黄金用例命法卦链同刻互证。
  网页导出默认不附多期时间轴，须勾选附带；流卦相位不能当作规范年卦
- **命法卷二十扩展卡**（勾选命法且后端可用时）：上游 `taiyi_life()` 直出——安命安身宮、
  飛祿飛馬黑符、**十提金賦、十二宮星斷、雙星同宮論、諸星上中下三等**与卷二十全篇
- **五个上游文档页**（导航新增）：📜 局數史例（67 例交互年表，一键用该年起局、公元前自动切换皇极全跨度）、
  🔥 災異統計、📚 古籍書目（按朝代分组）、🚀 看盤要領（使用步骤+六篇要義）、🆕 上游更新日誌——
  数据经 `/api/docs/*` 直读 kintaiyi 仓库 `docs/*.md`，随上游更新
- **《太乙秘書》本局斷辭**：七十二陽局/陰局全 144 局经典总断（利主利客、出军方位、阵法旗色、
  云气、伏兵时辰），静态移植自 kintaiyi `taiyimishu`（本地模式亦可用），盘面成卡并入 AI 导出 `mishuText`
- **命法卷二十釋文**（勾选命法且后端可用时）：`taiyi_life()` 直出的十提金賦、十二宮星斷、雙星同宮論、
  諸星三等等釋文，除页面展示外整体并入 AI 导出 `kintaiyiLife`（命理人事断的第一手釋文）
- **周易经文附录（反幻觉）**：为盘面值卦/命法卦链/皇极各层（含变爻）/流卦动爻出现之卦附上
  《周易》通行本**卦辞与本盘动爻的爻辞**（`yijingRefs` 字段），源自 Chinese Text Project 公版经文
  （`scripts/gen_yijing.py` 生成，卦符逐卦核验）。不再附入每卦全部六爻，未收录的爻辞须另查原文；
  皇极爻位已归一为实际爻名，便于精确对应
- **所占何事**（可选）：占类（事占/命占/年运/军事/择时/通用）+ 问题文本，不参与排盘，
  注入 AI Prompt 使分析按占类聚焦
- **AI 导出（TOON 格式）**：下载 [TOON](https://github.com/toon-format/toon)（面向 LLM 的紧凑
  结构化格式，语义等价 JSON、字段路径一致）与 Markdown，
  均在开头附 `meta`（口径明细，重点标注太乙积年流派与皇极岁卦流派，防止多流派数据混用；
  并澄清諸釋文皆統宗一系、不随积年流派切换）与 `analysisContext`（程序预先归集的断事要点，含卦爻辞须知）；
  另有**一键复制 AI Prompt**（内嵌 TOON 命盘），也可直接复制 Markdown 分析资料；提示词引导 AI 先读 meta 锁流派、
  先誊「盘面事实清单」再分析，含「应期推断」专节与分析后自检段（反幻觉工程），
  可选附「判读规则速查」；导出分**完整/精简**两档，按钮内实时显示体积，勾选规则或流卦时同步更新。
  《秘書》断辞全文只保留一处，十精与星将分列、行限按年龄段逐行列出；不附导出时间戳，避免与起局时间混淆

## 在 AI 中使用统一远程 MCP

在支持 MCP 的 AI 客户端中连接 **`https://mcp.0x7c.cc/mcp`**，协议选 **Streamable HTTP**，认证选 **无认证**；不需要下载本仓库或提供 MCP 访问令牌。

```powershell
# Codex
codex mcp add paipan-common-remote --url https://mcp.0x7c.cc/mcp
codex mcp list
```

```powershell
# Claude Code（当前用户的所有项目可用）
claude mcp add --transport http --scope user paipan-common-remote https://mcp.0x7c.cc/mcp
claude mcp get paipan-common-remote
```

参见 [Codex 官方 MCP 文档](https://learn.chatgpt.com/docs/extend/mcp)与 [Claude Code 官方 MCP 文档](https://code.claude.com/docs/en/mcp)。保存后重连 MCP 或重新打开会话，让 AI 调用 `system_catalog` 确认连接。已使用本机 `paipan-common` 的用户可继续使用，通常与远程连接二选一，不必重复添加。

统一服务提供 `system_catalog`、`chart_calculate`、`prepare_reading`、`corpus_list`、`corpus_search`、`corpus_read` 六个工具，共十类排盘；本项目相关系统为：

| 系统 | 必需输入 | 统一服务范围 |
|---|---|---|
| `taiyi` 太乙起局 | `eventTime`：公历日期、时分、明确时区 | `jiStyle` 0–4（年/月/日/时/分计），`acumYear` 0–3（统宗/金镜/淘金歌/太乙局）；`calendarMode` 默认标准历法，皇极拟推须显式选择 |
| `taiyi_mingfa` 太乙命法 | `birth`：出生日期、时分、时区、性别；另给 `queryTime` | 求测瞬间转换到出生地时区后计算；可按目录启用出生地点校正 |
| `huangji` 皇极经世 | `eventTime` | 已校订黄畿派 |

统一接口只接受公元 0001–9999，太乙标准历法与命法进一步限制为 600–9999；标准历法还拒绝 1582-10-05 至 14、9999-12-31 及晚子换日进入这些日期的输入。太乙皇极拟推须明确选择 `calendarMode: "huangji"`，不会自动切换。这些是统一服务的边界，不代表网页与下方专用工具的范围。

复制给 AI 的事件示例：

> 先调用 system_catalog，确认 taiyi 参数。按公历 2026 年 10 月 29 日 14:30、固定 UTC+8（+08:00）、不启用真太阳时，以太乙统宗时计和 standard 历法起普通事件盘，关注主客。使用 prepare_reading，先列盘面事实再解释。若本系统没有 common 文库，请如实说明，不要编造经典命中。

对应 `prepare_reading` 参数：

```json
{
  "eventTime": {
    "date": "2026-10-29",
    "time": "14:30",
    "timezone": "+08:00",
    "trueSolarTime": false
  },
  "systems": ["taiyi"],
  "options": {
    "taiyi": { "jiStyle": 3, "acumYear": 0, "calendarMode": "standard" }
  },
  "question": "主客"
}
```

命法示例可指定：男性，公历 1990-05-17 10:30、固定 +08:00 出生，查询 2026-10-29 12:00、固定 +08:00 的太乙命法，不启用地点校正。让 AI 使用 `systems: ["taiyi_mingfa"]`，完整填写 `birth` 和 `queryTime`。普通事件不需要额外询问生日、性别。

时辰与时区不能猜。启用地点校正才提供经度；统一服务将它放在 `eventTime` 或 `birth` 中，`queryTime` 不接受经度/校正开关。太乙采用**经度平太阳时**，不含均时差。统一服务目前没有 `taiyi` / `taiyi_mingfa` / `huangji` 对应的 common 文库；下方专用工具所带典籍与后端释文未自动加入统一服务。两套服务都由 AI 客户端承担最终推理。

## 太乙专用 MCP（本机 14 个工具）

仓库内建 [MCP](https://modelcontextprotocol.io)（Model Context Protocol）server（`mcp/`），把本地引擎与
kintaiyi 后端封装为 **14 个工具**，供 Claude Code / Claude Desktop 等 AI 多轮调用推理——从「一次性投喂
数据」升级为「排盘 → 查局断辞 → 按需取釋文 → 史例互证 → 应期推断」的工具循环
（工具结果统一 [TOON](https://github.com/toon-format/toon) 格式，省约 1/3 token；server instructions 已向 AI 说明语法）：

| 工具 | 说明 |
|---|---|
| `taiyi_chart` | **排盘主入口**（本地引擎）：meta 口径 / analysisContext 要点 / 盘面 / 《太乙秘書》局断 / 周易经文附录；可选命法（sex）与真太阳时（经度） |
| `taiyi_mingfa` / `huangji_calendar` | 太乙命法（本地）；皇极经世历（一元全跨度，本地，黄畿派） |
| `taiyi_mishu` / `yijing_text` / `taiyi_tenjing` / `taiyi_knowledge` | 《太乙秘書》144 局断辞 / 周易卦爻辞原文 / 十精七曜落位 / 判读规则速查（全本地、零网络） |
| `taiyi_classics` | 经典原文库（本地）：《太乙金鏡式經》（唐·王希明，四庫全書本）提要+全十卷——金镜流派第一手经典；目录 / 取卷（分段）/ 全书检索 |
| `kintaiyi_pan` / `kintaiyi_life` | 后端透传《統宗寶鑑》诸卷 97 键 / 命法卷二十 59 键——**不带 keys 先返回键目录（含体积），再按 keys 取键**，防上下文爆量 |
| `kintaiyi_liu` / `taiyi_history_examples` / `kintaiyi_docs` / `taiyi_status` | 流卦運多期 / 局數史例（67 例） / 上游文档（query 行过滤） / 引擎与后端状态 |

先在本仓库执行 `npm ci` 安装依赖。在本仓库使用 Claude Code 时，可按客户端提示启用 `.mcp.json`；其他项目或全局注册可使用本机依赖的绝对路径（以下为 Windows 示例，其他机器替换实际目录，按所用客户端选择一条）：

```powershell
codex mcp add taiyi -- node D:/WWW/react-taiyi/node_modules/tsx/dist/cli.mjs D:/WWW/react-taiyi/mcp/main.ts
claude mcp add --transport stdio --scope user taiyi -- node D:/WWW/react-taiyi/node_modules/tsx/dist/cli.mjs D:/WWW/react-taiyi/mcp/main.ts
```

环境变量 `TAIYI_API` 覆盖后端地址（默认 `https://taiyi-api.0x7c.cc`）。
年份约定：工具输入均为**天文纪年**（0 = 公元前 1 年）；皇极范围为 -67016..62583。专用 `taiyi_chart` 超出标准范围时会自动标注并切换皇极拟推，与统一服务须显式选择的规则不同。协议级测试见 `tests/mcp.test.ts`。

本机 `taiyi_chart` 的地点校正使用 `trueSolarLongitude` 与 `tzOffsetMinutes`（后者缺省 480），并未提供统一 MCP 的 IANA `timezone` 解析；跨时区输入须先确认当地偏移。独立 `taiyi_mingfa` 工具当前未开放地点校正和 `queryTime`，流卦基准采用运行机器的当前日期；需要指定求测时刻时使用统一 MCP 的 `taiyi_mingfa` 系统。

给 AI 的专用工具示例：

> 使用 taiyi 本机 MCP，以公历 2026 年 10 月 29 日 14:30 的 UTC+8 钟表时间起太乙统宗时计盘，不启用地点校正。先调用 taiyi_chart，读取 meta 锁定口径，再查 taiyi_mishu 和 yijing_text；需要金镜原文时用 taiyi_classics，需后端释文时先取 kintaiyi_pan 的键目录，再按 keys 读取。引用盘面与原文后再分析，不要把不同流派的断辞混用。

## 算法来源

| 项目 | 用途 |
|---|---|
| [kentang2017/kintaiyi](https://github.com/kentang2017/kintaiyi)（MIT） | 主要移植蓝本：积年积算、七十二局表、十六神、主客定算三将、格局、八门、神煞；并作为黄金用例参考实现。经 [python-taiyi](https://github.com/hackninety/python-taiyi) 后端**直接运行其源码**（后端优先数据源 + 原生圆盘 SVG），随上游更新。另移植其 `taiyimishu`（《太乙秘書》144 局断辞，见 `scripts/gen_mishu.py`） |
| [Chinese Text Project (ctext.org)](https://ctext.org/book-of-changes) | 《周易》通行本卦辞/爻辞公版经文源（`scripts/gen_yijing.py` 抓取生成 `src/taiyi/yijing.ts`，卦符逐卦核验；用于 AI 导出经文附录反幻觉） |
| [维基文库](https://zh.wikisource.org/wiki/太乙金鏡式經_(四庫全書本)) | 《太乙金鏡式經》（唐·王希明，四庫全書本）公版全文（`scripts/gen_jinjing.py` 生成 `mcp/data/jinjing.json`，供 MCP 工具 `taiyi_classics`；金镜流派第一手经典） |
| [hhszzzz/taibu](https://github.com/hhszzzz/taibu) | 工程架构参考（domain 分层）；其“太乙”为九星简化视角，未采用 |
| [dglijin-oss/taiyi-skill](https://github.com/dglijin-oss/taiyi-skill) | 格局解读规则参考 |
| [yhys-core / react-yhys](https://github.com/hackninety/react-yhys)（姊妹项目，git 依赖引用） | 皇极经世历：元会运世层级、先天六十卦序、黄畿派岁卦（已校订原文；祝泌派未校订、已关闭），及黄畿岁以下月经/旬纬/日/时经卦（岁卦逐层变爻·挨卦，`getSolarTerm().huangji.dayOfYear` 冬至换岁定位）。作为 npm 包直接引用，随上游更新 |
| react-8char（姊妹项目） | 真太阳时城市经度表与视觉风格 |

历法（干支 / 节气 / 农历）由 [lunar-typescript](https://github.com/6tail/lunar-typescript) 提供，
对应 Python 侧 kintaiyi 使用的 sxtwl。

## 开发

```bash
npm install
npm run dev     # 开发服务器
npm test        # 运行测试（含黄金用例对照，如已生成）
npm run build   # 生产构建
```

## 黄金用例验证

TS 引擎逐字段对照 kintaiyi（Python 参考实现）的输出：

```bash
# 1. 克隆参考实现并安装依赖
git clone https://github.com/kentang2017/kintaiyi
pip install sxtwl cn2an bidict

# 2. 生成用例（14 个抽样时间 × 5 计式 × 4 流派）
python scripts/gen_fixtures.py <kintaiyi>/src/kintaiyi

# 3. 对照测试
npm test
```

对照字段覆盖：干支五柱、农历、节气、积数、局式、太乙落宫、文昌、始击、
定目、计神合神、主客定算与三将、君臣民基、四神天乙地乙直符飞符、
天皇天时五行帝符太尊五福三风五风八风飞鸟大游小游、八门、格局键、
纪元、五子元局、阳九百六、值年/日/时卦。

## 结构

```
src/taiyi/          # 排盘引擎（纯 TS，不依赖 React）
  constants.ts      #   七十二局表、十六神、纪元表等常数
  calendar.ts       #   lunar-typescript 历法适配（干支五柱/节气/农历）
  engine.ts         #   推算管线（积算 → 局式 → 落位 → 算将 → 格局 → 布盘）
  mishu.ts          #   《太乙秘書》144 局断辞（gen_mishu.py 生成）
  yijing.ts         #   《周易》64 卦卦辞+384 爻辞（gen_yijing.py 自 ctext 生成）
  export.ts         #   AI 导出（meta / analysisContext / TOON / JSON / Markdown，含经文附录）
  types.ts, utils.ts, index.ts
src/lib/            # prompt.ts（AI 提示词）、knowledge.ts（判读规则速查）等
src/components/     # InputPanel / Board（5×5 十六神式盘）/ ResultPanel / ExportCard
mcp/                # MCP server（tools.ts 工具逻辑 / server.ts 协议接线 / main.ts stdio 入口）
scripts/            # 生成器：gen_fixtures.py（黄金用例）/ verify_examples.py（局數史例）
                    #        gen_mishu.py（太乙秘書）/ gen_yijing.py（周易经文）
tests/              # vitest 对照测试
```

## 已知边界与有意偏离

- **太乙主盘标准历法范围公元 600–9999 年**：604/1000/1582 年黄金用例验证通过（积日按
  1582-10-15 儒略/格里历切换，与 sxtwl 一致）；本地标准层所依 lunar-typescript 无上古历表
- **公元前 6000 — 公元 599 默认走「上游古歷」**（未勾选皇极）：整张盘由后端直出
  kintaiyi/sxtwl **中国古历表**口径（与上游 demo 公元前排盘同款同源；装配器
  `remoteResult.ts` 经黄金用例逐字段守卫），皇极经世历卡恒显；后端不可用自动回退拟推并提示。
  流卦運多期不支持公元前（上游 hex_timeline 依 Python datetime，下限公元 1 年）
- **勾选「皇极」= 盘面改用「皇极历法拟推口径」并解锁一元全跨度**（天文纪年 -67016 — 62583）：
  四柱按纯干支算术＋天文节气推得（拟推格里历），农历为节气月建拟推，属现代拟推、非古历考据。
  验证锚点：该口径在 1582 年后与标准口径逐字段同盘（交叉验证锁定）；
  **公元前年计局数与年柱已同上游 kintaiyi 经 67 条局數史例逐行对照一致**
  （`scripts/verify_examples.py` 生成基准，`tests/examples.test.ts` 锁定；
  农历为拟推月建、与古历朔望月不同，不在对照范围）
- **局數史例對照**：排盘年份命中上游史例库（67 例）时，盘面底部自动展示该年史载纪事
  并并入 AI 导出（`historyExamples` 字段 + `analysisContext.史例參照`），供断局互证
- 分计为 kintaiyi 实验性公式的忠实移植
- 部分神煞（大游/小游/三风等）原实现存在历史争议写法，按参考实现原样移植以保证可对照性
- **与参考实现的有意偏离**（均有依据，黄金测试已注明处理方式）：
  1. 节气日交接时刻**之前**的节气判定：kintaiyi `get_before_jieqi_start_date`
     自 `day.before(15)` 继续回扫会跳过上一节气（如 1984-02-04 12:00 报小寒，
     天文上应为大寒），本项目按正确天文语义实现；fixtures 采样避开该窗口
  2. 「日计 × 太乙局」组合：kintaiyi 以浮点数作列表下标必然崩溃，本项目正常出盘
  3. 格局增补「四郭杜」（本项目依《太乙统宗宝鉴》四郭之义增补，kintaiyi 未收录），对照测试中单独过滤
- 命法卷二十歌诀释义（`taiyi_life()` 十提金賦/十二宮星斷等）与运筹博弈分析（Nash 均衡）
  经后端直出并并入 AI 导出（`kintaiyiLife` / `kintaiyiPan.運籌博弈分析`）；仍缺项见上游
  《古籍未納入內容分析》——呂基太乙（卷六）、卷五內外輔相/將帥賢否、卷七大遊凶筭等，属内容层，可按需增补

仅供术数文化研究。
