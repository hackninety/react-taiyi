# 太乙神数排盘（react-taiyi）

汇集 GitHub 开源太乙神数项目算法的 React + TypeScript 排盘应用。支持
**年计 / 月计 / 日计 / 时计 / 分计**五种计式与**太乙统宗 / 太乙金镜 /
太乙淘金歌 / 太乙局**四种积年流派，输出十六神式盘、主客定算三将、
格局（掩迫关囚击格对提挟执提四郭固四郭杜）、八门、神煞与值年卦。

扩展功能：

- **太乙命法**：命法积数、三才数、十二命宫（男女顺逆）、阳九/百六行限、
  受气干支、出身卦与流年卦链（年月日时分）
- **十精入宿**：七曜（日月辰星太白荧惑岁星填星）落位上盘
  （懒加载 kintaiyi 预计算表 `public/data/stars_data.json`，约 3MB）
- **真太阳时**：省/市/区三级选择出生地，按东经 120° 基准每度 4 分钟校正起局时间
  （城市经度表与校正规则参照姊妹项目 react-8char）
- **皇极经世历**（可切换流派）：任一起局年份给出邵雍元会运世坐标
  （一元 129,600 年 = 12 会 × 30 运 × 12 世 × 30 年，元起于公元前 67017 年）
  与逐层值卦：会辟卦、运卦（主卦变爻）、世卦、十年卦、岁卦、月日时卦；
  岁卦支持**黄畿**（运卦→经卦→挨六十卦次）与**祝泌**（先天六十卦序平推）两派切换并互注对照。
  算法与验证锚点（1984=鼎 … 2026=同人 等 17 例）移植自姊妹项目 react-yhys
- **一键导出**：复制/下载 JSON 与 Markdown，附**一键复制 AI Prompt**
  （内置太乙分析框架提示词 + 全量排盘 JSON，粘贴给 ChatGPT / Claude 即可分析）

## 算法来源

| 项目 | 用途 |
|---|---|
| [kentang2017/kintaiyi](https://github.com/kentang2017/kintaiyi)（MIT） | 主要移植蓝本：积年积算、七十二局表、十六神、主客定算三将、格局、八门、神煞；并作为黄金用例参考实现 |
| [wlhyl/taiyipython](https://github.com/wlhyl/taiyipython) | 推导式算法交叉验证（金镜积年、十六神盘循环累加求算、三基/五福起例） |
| [hhszzzz/taibu](https://github.com/hhszzzz/taibu) | 工程架构参考（domain 分层）；其“太乙”为九星简化视角，未采用 |
| [dglijin-oss/taiyi-skill](https://github.com/dglijin-oss/taiyi-skill) | 格局解读规则参考 |

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
  types.ts, utils.ts, index.ts
src/components/     # InputPanel / Board（5×5 十六神式盘）/ ResultPanel
scripts/            # 黄金用例生成器（Python）
tests/              # vitest 对照测试
```

## 已知边界与有意偏离

- **支持公元 600–9999 年**：604/1000/1582 年黄金用例验证通过（积日按
  1582-10-15 儒略/格里历切换，与 sxtwl 一致）。公元前日期不支持——kintaiyi
  经 sxtwl 使用中国古历表，lunar-typescript 无对应数据，汉初实测农历日期不符
- 分计为 kintaiyi 实验性公式的忠实移植
- 部分神煞（大游/小游/三风等）原实现存在历史争议写法，按参考实现原样移植以保证可对照性
- **与参考实现的有意偏离**（均有依据，黄金测试已注明处理方式）：
  1. 节气日交接时刻**之前**的节气判定：kintaiyi `get_before_jieqi_start_date`
     自 `day.before(15)` 继续回扫会跳过上一节气（如 1984-02-04 12:00 报小寒，
     天文上应为大寒），本项目按正确天文语义实现；fixtures 采样避开该窗口
  2. 「日计 × 太乙局」组合：kintaiyi 以浮点数作列表下标必然崩溃，本项目正常出盘
  3. 格局增补「四郭杜」（采自 taiyipython，kintaiyi 未收录），对照测试中单独过滤
- 命法解读文本（taiyi_life_dict 歌诀释义）与运筹博弈分析未移植，属内容层，可按需增补

仅供术数文化研究。
