/**
 * 《周易》通行本六十四卦：卦辞 + 三百八十四爻辞（含乾「用九」、坤「用六」）。
 *
 * 数据源：Chinese Text Project (ctext.org) 公版经文 API，仅取核心经文（卦辞/爻辞），
 * 不含彖传/象传/文言等十翼注释。由 scripts/gen_yijing.py 生成，勿手改；
 * 重新生成：python scripts/gen_yijing.py（王制序，卦符 ䷀–䷿ 逐卦核验）。
 *
 * 用途：AI 导出时为盘面/皇极/流卦/命法出现的每个卦与动爻附上经文原文，
 * 抑制 LLM 背诵爻辞时的错位串卦（反幻觉）。
 */

export interface YaoCi {
  /** 爻题，如「初九」「用九」 */
  name: string;
  /** 爻辞原文 */
  text: string;
}

export interface Hexagram {
  /** 王制序 1..64 */
  num: number;
  /** 繁体卦名（与 GUA_64 一致） */
  name: string;
  /** 简体卦名 */
  nameSimp: string;
  /** 卦符 ䷀..䷿ */
  symbol: string;
  /** 卦辞（不含卦名前缀） */
  guaCi: string;
  /** 爻辞（乾/坤为 7 条，含用九/用六；其余 6 条） */
  yao: YaoCi[];
}

const HEXAGRAMS: Hexagram[] = [
  { num: 1, name: "乾", nameSimp: "乾", symbol: "䷀", guaCi: "元亨，利貞。", yao: [{ name: "初九", text: "潛龍，勿用。" }, { name: "九二", text: "見龍在田，利見大人。" }, { name: "九三", text: "君子終日乾乾，夕惕若，厲，无咎。" }, { name: "九四", text: "或躍在淵，无咎。" }, { name: "九五", text: "飛龍在天，利見大人。" }, { name: "上九", text: "亢龍有悔。" }, { name: "用九", text: "見群龍无首，吉。" }] },
  { num: 2, name: "坤", nameSimp: "坤", symbol: "䷁", guaCi: "元亨，利牝馬之貞。君子有攸往，先迷後得主，利西南得朋，東北喪朋。安貞，吉。", yao: [{ name: "初六", text: "履霜，堅冰至。" }, { name: "六二", text: "直，方，大，不習无不利。" }, { name: "六三", text: "含章可貞。或從王事，无成有終。" }, { name: "六四", text: "括囊；无咎，无譽。" }, { name: "六五", text: "黃裳，元吉。" }, { name: "上六", text: "龍戰于野，其血玄黃。" }, { name: "用六", text: "利永貞。" }] },
  { num: 3, name: "屯", nameSimp: "屯", symbol: "䷂", guaCi: "元亨，利貞，勿用有攸往，利建侯。", yao: [{ name: "初九", text: "磐桓；利居貞，利建侯。" }, { name: "六二", text: "屯如邅如，乘馬班如。匪寇婚媾，女子貞不字，十年乃字。" }, { name: "六三", text: "即鹿无虞，惟入于林中，君子幾不如舍，往吝。" }, { name: "六四", text: "乘馬班如，求婚媾，往吉，无不利。" }, { name: "九五", text: "屯其膏，小貞吉，大貞凶。" }, { name: "上六", text: "乘馬班如，泣血漣如。" }] },
  { num: 4, name: "蒙", nameSimp: "蒙", symbol: "䷃", guaCi: "亨。匪我求童蒙，童蒙求我。初筮告，再三瀆，瀆則不告。利貞。", yao: [{ name: "初六", text: "發蒙，利用刑人，用說桎梏，以往吝。" }, { name: "九二", text: "包蒙吉；納婦吉；子克家。" }, { name: "六三", text: "勿用取女；見金夫，不有躬，无攸利。" }, { name: "六四", text: "困蒙，吝。" }, { name: "六五", text: "童蒙，吉。" }, { name: "上九", text: "擊蒙；不利為寇，利禦寇。" }] },
  { num: 5, name: "需", nameSimp: "需", symbol: "䷄", guaCi: "有孚，光亨，貞吉。利涉大川。", yao: [{ name: "初九", text: "需于郊。利用恆，无咎。" }, { name: "九二", text: "需于沙。小有言，終吉。" }, { name: "九三", text: "需于泥，致寇至。" }, { name: "六四", text: "需于血，出自穴。" }, { name: "九五", text: "需于酒食，貞吉。" }, { name: "上六", text: "入于穴，有不速之客三人來，敬之終吉。" }] },
  { num: 6, name: "訟", nameSimp: "讼", symbol: "䷅", guaCi: "有孚，窒。惕中吉。終凶。利見大人，不利涉大川。", yao: [{ name: "初六", text: "不永所事，小有言，終吉。" }, { name: "九二", text: "不克訟，歸而逋，其邑人三百戶，无眚。" }, { name: "六三", text: "食舊德，貞厲，終吉，或從王事，无成。" }, { name: "九四", text: "不克訟，復即命渝，安貞吉。" }, { name: "九五", text: "訟元吉。" }, { name: "上九", text: "或錫之鞶帶，終朝三褫之。" }] },
  { num: 7, name: "師", nameSimp: "师", symbol: "䷆", guaCi: "貞，丈人，吉无咎。", yao: [{ name: "初六", text: "師出以律，否臧凶。" }, { name: "九二", text: "在師中吉，无咎，王三錫命。" }, { name: "六三", text: "師或輿尸，凶。" }, { name: "六四", text: "師左次，无咎。" }, { name: "六五", text: "田有禽，利執言，无咎。長子帥師，弟子輿尸，貞凶。" }, { name: "上六", text: "大君有命，開國承家，小人勿用。" }] },
  { num: 8, name: "比", nameSimp: "比", symbol: "䷇", guaCi: "吉。原筮元永貞，无咎。不寧方來，後夫凶。", yao: [{ name: "初六", text: "有孚，比之，无咎。有孚盈缶，終來有它吉。" }, { name: "六二", text: "比之自內，貞吉。" }, { name: "六三", text: "比之匪人。" }, { name: "六四", text: "外比之，貞吉。" }, { name: "九五", text: "顯比，王用三驅，失前禽。邑人不誡，吉。" }, { name: "上六", text: "比之无首，凶。" }] },
  { num: 9, name: "小畜", nameSimp: "小畜", symbol: "䷈", guaCi: "亨。密雲不雨，自我西郊。", yao: [{ name: "初九", text: "復自道，何其咎，吉。" }, { name: "九二", text: "牽復，吉。" }, { name: "九三", text: "輿說輻，夫妻反目。" }, { name: "六四", text: "有孚，血去惕出，无咎。" }, { name: "九五", text: "有孚攣如，富以其鄰。" }, { name: "上九", text: "既雨既處，尚德載，婦貞厲。月幾望，君子征凶。" }] },
  { num: 10, name: "履", nameSimp: "履", symbol: "䷉", guaCi: "履虎尾，不咥人，亨。", yao: [{ name: "初九", text: "素履，往无咎。" }, { name: "九二", text: "履道坦坦，幽人貞吉。" }, { name: "六三", text: "眇能視，跛能履，履虎尾，咥人，凶。武人為于大君。" }, { name: "九四", text: "履虎尾，愬愬，終吉。" }, { name: "九五", text: "夬履，貞厲。" }, { name: "上九", text: "視履考祥，其旋元吉。" }] },
  { num: 11, name: "泰", nameSimp: "泰", symbol: "䷊", guaCi: "小往大來，吉亨。", yao: [{ name: "初九", text: "拔茅茹，以其彙，征吉。" }, { name: "九二", text: "包荒，用馮河，不遐遺，朋亡，得尚于中行。" }, { name: "九三", text: "无平不陂，无往不復，艱貞无咎。勿恤其孚，于食有福。" }, { name: "六四", text: "翩翩，不富，以其鄰，不戒以孚。" }, { name: "六五", text: "帝乙歸妹，以祉元吉。" }, { name: "上六", text: "城復于隍，勿用師。自邑告命，貞吝。" }] },
  { num: 12, name: "否", nameSimp: "否", symbol: "䷋", guaCi: "否之匪人，不利君子貞，大往小來。", yao: [{ name: "初六", text: "拔茅茹，以其彙，貞吉亨。" }, { name: "六二", text: "包承。小人吉，大人否，亨。" }, { name: "六三", text: "包羞。" }, { name: "九四", text: "有命，无咎，疇離祉。" }, { name: "九五", text: "休否，大人吉。其亡其亡，繫于苞桑。" }, { name: "上九", text: "傾否，先否後喜。" }] },
  { num: 13, name: "同人", nameSimp: "同人", symbol: "䷌", guaCi: "同人于野，亨。利涉大川，利君子貞。", yao: [{ name: "初九", text: "同人于門，无咎。" }, { name: "六二", text: "同人于宗，吝。" }, { name: "九三", text: "伏戎于莽，升其高陵，三歲不興。" }, { name: "九四", text: "乘其墉，弗克攻，吉。" }, { name: "九五", text: "同人，先號咷而後笑。大師克相遇。" }, { name: "上九", text: "同人于郊，无悔。" }] },
  { num: 14, name: "大有", nameSimp: "大有", symbol: "䷍", guaCi: "元亨。", yao: [{ name: "初九", text: "无交害，匪咎，艱則无咎。" }, { name: "九二", text: "大車以載，有攸往，无咎。" }, { name: "九三", text: "公用亨于天子，小人弗克。" }, { name: "九四", text: "匪其彭，无咎。" }, { name: "六五", text: "厥孚交如，威如；吉。" }, { name: "上九", text: "自天祐之，吉无不利。" }] },
  { num: 15, name: "謙", nameSimp: "谦", symbol: "䷎", guaCi: "亨，君子有終。", yao: [{ name: "初六", text: "謙謙君子，用涉大川，吉。" }, { name: "六二", text: "鳴謙，貞吉。" }, { name: "九三", text: "勞謙，君子有終，吉。" }, { name: "六四", text: "无不利，撝謙。" }, { name: "六五", text: "不富，以其鄰，利用侵伐，无不利。" }, { name: "上六", text: "鳴謙，利用行師，征邑國。" }] },
  { num: 16, name: "豫", nameSimp: "豫", symbol: "䷏", guaCi: "利建侯，行師。", yao: [{ name: "初六", text: "鳴豫，凶。" }, { name: "六二", text: "介于石，不終日，貞吉。" }, { name: "六三", text: "盱豫，悔。遲有悔。" }, { name: "九四", text: "由豫，大有得。勿疑。朋盍簪。" }, { name: "六五", text: "貞疾，恆不死。" }, { name: "上六", text: "冥豫，成有渝，无咎。" }] },
  { num: 17, name: "隨", nameSimp: "随", symbol: "䷐", guaCi: "元亨利貞，无咎。", yao: [{ name: "初九", text: "官有渝，貞吉。出門交有功。" }, { name: "六二", text: "系小子，失丈夫。" }, { name: "六三", text: "系丈夫，失小子。隨有求得，利居貞。" }, { name: "九四", text: "隨有獲，貞凶。有孚在道，以明，何咎。" }, { name: "九五", text: "孚于嘉，吉。" }, { name: "上六", text: "拘系之，乃從維之。王用亨于西山。" }] },
  { num: 18, name: "蠱", nameSimp: "蛊", symbol: "䷑", guaCi: "元亨，利涉大川。先甲三日，後甲三日。", yao: [{ name: "初六", text: "幹父之蠱，有子，考无咎，厲終吉。" }, { name: "九二", text: "幹母之蠱，不可貞。" }, { name: "九三", text: "幹父之蠱，小有悔，无大咎。" }, { name: "六四", text: "裕父之蠱，往見吝。" }, { name: "六五", text: "幹父之蠱，用譽。" }, { name: "上九", text: "不事王侯，高尚其事。" }] },
  { num: 19, name: "臨", nameSimp: "临", symbol: "䷒", guaCi: "元，亨，利，貞。至于八月有凶。", yao: [{ name: "初九", text: "咸臨，貞吉。" }, { name: "九二", text: "咸臨，吉无不利。" }, { name: "六三", text: "甘臨，无攸利。既憂之，无咎。" }, { name: "六四", text: "至臨，无咎。" }, { name: "六五", text: "知臨，大君之宜，吉。" }, { name: "上六", text: "敦臨，吉无咎。" }] },
  { num: 20, name: "觀", nameSimp: "观", symbol: "䷓", guaCi: "盥而不薦，有孚顒若。", yao: [{ name: "初六", text: "童觀，小人无咎，君子吝。" }, { name: "六二", text: "闚觀，利女貞。" }, { name: "六三", text: "觀我生，進退。" }, { name: "六四", text: "觀國之光，利用賓于王。" }, { name: "九五", text: "觀我生，君子无咎。" }, { name: "上九", text: "觀其生，君子无咎。" }] },
  { num: 21, name: "噬嗑", nameSimp: "噬嗑", symbol: "䷔", guaCi: "亨。利用獄。", yao: [{ name: "初九", text: "屨校滅趾，无咎。" }, { name: "六二", text: "噬膚滅鼻，无咎。" }, { name: "六三", text: "噬臘肉，遇毒；小吝，无咎。" }, { name: "九四", text: "噬乾胏，得金矢，利艱貞，吉。" }, { name: "六五", text: "噬乾肉，得黃金，貞厲，无咎。" }, { name: "上九", text: "何校滅耳，凶。" }] },
  { num: 22, name: "賁", nameSimp: "贲", symbol: "䷕", guaCi: "亨。小利有攸往。", yao: [{ name: "初九", text: "賁其趾，舍車而徒。" }, { name: "六二", text: "賁其須。" }, { name: "九三", text: "賁如濡如，永貞吉。" }, { name: "六四", text: "賁如皤如，白馬翰如，匪寇婚媾。" }, { name: "六五", text: "賁于丘園，束帛戔戔，吝，終吉。" }, { name: "上九", text: "白賁，无咎。" }] },
  { num: 23, name: "剝", nameSimp: "剥", symbol: "䷖", guaCi: "不利有攸往。", yao: [{ name: "初六", text: "剝床以足，蔑貞凶。" }, { name: "六二", text: "剝床以辨，蔑貞凶。" }, { name: "六三", text: "剝之，无咎。" }, { name: "六四", text: "剝床以膚，凶。" }, { name: "六五", text: "貫魚，以宮人寵，无不利。" }, { name: "上九", text: "碩果不食，君子得輿，小人剝廬。" }] },
  { num: 24, name: "復", nameSimp: "复", symbol: "䷗", guaCi: "亨。出入无疾，朋來无咎。反復其道，七日來復，利有攸往。", yao: [{ name: "初九", text: "不遠復，无祗悔，元吉。" }, { name: "六二", text: "休復，吉。" }, { name: "六三", text: "頻復，厲无咎。" }, { name: "六四", text: "中行獨復。" }, { name: "六五", text: "敦復，无悔。" }, { name: "上六", text: "迷復，凶，有災眚。用行師，終有大敗，以其國君，凶；至于十年，不克征。" }] },
  { num: 25, name: "无妄", nameSimp: "无妄", symbol: "䷘", guaCi: "元亨，利貞。其匪正有眚，不利有攸往。", yao: [{ name: "初九", text: "无妄，往吉。" }, { name: "六二", text: "不耕獲，不菑畬，則利有攸往。" }, { name: "六三", text: "无妄之災，或繫之牛，行人之得，邑人之災。" }, { name: "九四", text: "可貞，无咎。" }, { name: "九五", text: "无妄之疾，勿藥有喜。" }, { name: "上九", text: "无妄，行有眚，无攸利。" }] },
  { num: 26, name: "大畜", nameSimp: "大畜", symbol: "䷙", guaCi: "利貞，不家食吉，利涉大川。", yao: [{ name: "初九", text: "有厲利已。" }, { name: "九二", text: "輿說輹。" }, { name: "九三", text: "良馬逐，利艱貞。曰閑輿衛，利有攸往。" }, { name: "六四", text: "童牛之牿，元吉。" }, { name: "六五", text: "豶豕之牙，吉。" }, { name: "上九", text: "何天之衢，亨。" }] },
  { num: 27, name: "頤", nameSimp: "颐", symbol: "䷚", guaCi: "貞吉。觀頤，自求口實。", yao: [{ name: "初九", text: "舍爾靈龜，觀我朵頤，凶。" }, { name: "六二", text: "顛頤，拂經，于丘頤，征凶。" }, { name: "六三", text: "拂頤，貞凶，十年勿用，无攸利。" }, { name: "六四", text: "顛頤，吉，虎視眈眈，其欲逐逐，无咎。" }, { name: "六五", text: "拂經，居貞吉，不可涉大川。" }, { name: "上九", text: "由頤，厲吉，利涉大川。" }] },
  { num: 28, name: "大過", nameSimp: "大过", symbol: "䷛", guaCi: "棟橈，利有攸往，亨。", yao: [{ name: "初六", text: "藉用白茅，无咎。" }, { name: "九二", text: "枯楊生稊，老夫得其女妻，无不利。" }, { name: "九三", text: "棟橈，凶。" }, { name: "九四", text: "棟隆，吉；有它吝。" }, { name: "九五", text: "枯楊生華，老婦得士夫，无咎无譽。" }, { name: "上六", text: "過涉滅頂，凶，无咎。" }] },
  { num: 29, name: "坎", nameSimp: "坎", symbol: "䷜", guaCi: "習坎，有孚，維心亨，行有尚。", yao: [{ name: "初六", text: "習坎，入于坎窞，凶。" }, { name: "九二", text: "坎有險，求小得。" }, { name: "六三", text: "來之坎坎，險且枕，入于坎窞，勿用。" }, { name: "六四", text: "樽酒簋貳，用缶，納約自牖，終无咎。" }, { name: "九五", text: "坎不盈，祗既平，无咎。" }, { name: "上六", text: "係用徽纆，寘于叢棘，三歲不得，凶。" }] },
  { num: 30, name: "離", nameSimp: "离", symbol: "䷝", guaCi: "利貞，亨。畜牝牛，吉。", yao: [{ name: "初九", text: "履錯然，敬之无咎。" }, { name: "六二", text: "黃離，元吉。" }, { name: "九三", text: "日昃之離，不鼓缶而歌，則大耋之嗟，凶。" }, { name: "九四", text: "突如其來如，焚如，死如，棄如。" }, { name: "六五", text: "出涕沱若，戚嗟若，吉。" }, { name: "上九", text: "王用出征，有嘉折首，獲匪其醜，无咎。" }] },
  { num: 31, name: "咸", nameSimp: "咸", symbol: "䷞", guaCi: "亨，利貞，取女吉。", yao: [{ name: "初六", text: "咸其拇。" }, { name: "六二", text: "咸其腓，凶，居吉。" }, { name: "九三", text: "咸其股，執其隨，往吝。" }, { name: "九四", text: "貞吉，悔亡，憧憧往來，朋從爾思。" }, { name: "九五", text: "咸其脢，无悔。" }, { name: "上六", text: "咸其輔頰舌。" }] },
  { num: 32, name: "恆", nameSimp: "恒", symbol: "䷟", guaCi: "亨，无咎，利貞，利有攸往。", yao: [{ name: "初六", text: "浚恆，貞凶，无攸利。" }, { name: "九二", text: "悔亡。" }, { name: "九三", text: "不恆其德，或承之羞，貞吝。" }, { name: "九四", text: "田无禽。" }, { name: "六五", text: "恆其德，貞，婦人吉，夫子凶。" }, { name: "上六", text: "振恆，凶。" }] },
  { num: 33, name: "遯", nameSimp: "遁", symbol: "䷠", guaCi: "亨，小利貞。", yao: [{ name: "初六", text: "遯尾，厲，勿用有攸往。" }, { name: "六二", text: "執之用黃牛之革，莫之勝說。" }, { name: "九三", text: "係遯，有疾厲，畜臣妾吉。" }, { name: "九四", text: "好遯，君子吉，小人否。" }, { name: "九五", text: "嘉遯，貞吉。" }, { name: "上九", text: "肥遯，无不利。" }] },
  { num: 34, name: "大壯", nameSimp: "大壮", symbol: "䷡", guaCi: "利貞。", yao: [{ name: "初九", text: "壯于趾，征凶，有孚。" }, { name: "九二", text: "貞吉。" }, { name: "九三", text: "小人用壯，君子用罔，貞厲。羝羊觸藩，羸其角。" }, { name: "九四", text: "貞吉悔亡，藩決不羸，壯于大輿之輹。" }, { name: "六五", text: "喪羊于易，无悔。" }, { name: "上六", text: "羝羊觸藩，不能退，不能遂，无攸利，艱則吉。" }] },
  { num: 35, name: "晉", nameSimp: "晋", symbol: "䷢", guaCi: "康侯用錫馬蕃庶，晝日三接。", yao: [{ name: "初六", text: "晉如，摧如，貞吉。罔孚，裕无咎。" }, { name: "六二", text: "晉如，愁如，貞吉。受茲介福，于其王母。" }, { name: "六三", text: "眾允，悔亡。" }, { name: "九四", text: "晉如碩鼠，貞厲。" }, { name: "六五", text: "悔亡，失得勿恤，往吉，无不利。" }, { name: "上九", text: "晉其角，維用伐邑，厲吉无咎，貞吝。" }] },
  { num: 36, name: "明夷", nameSimp: "明夷", symbol: "䷣", guaCi: "利艱貞。", yao: [{ name: "初九", text: "明夷于飛，垂其翼。君子于行，三日不食，有攸往，主人有言。" }, { name: "六二", text: "明夷，夷于左股，用拯馬壯，吉。" }, { name: "九三", text: "明夷于南狩，得其大首，不可疾貞。" }, { name: "六四", text: "入于左腹，獲明夷之心，出于門庭。" }, { name: "六五", text: "箕子之明夷，利貞。" }, { name: "上六", text: "不明晦，初登于天，後入于地。" }] },
  { num: 37, name: "家人", nameSimp: "家人", symbol: "䷤", guaCi: "利女貞。", yao: [{ name: "初九", text: "閑有家，悔亡。" }, { name: "六二", text: "无攸遂，在中饋，貞吉。" }, { name: "九三", text: "家人嗃嗃，悔厲吉；婦子嘻嘻，終吝。" }, { name: "六四", text: "富家，大吉。" }, { name: "九五", text: "王假有家，勿恤，往吉。" }, { name: "上九", text: "有孚威如，終吉。" }] },
  { num: 38, name: "睽", nameSimp: "睽", symbol: "䷥", guaCi: "小事吉。", yao: [{ name: "初九", text: "悔亡，喪馬勿逐，自復；見惡人无咎。" }, { name: "九二", text: "遇主于巷，无咎。" }, { name: "六三", text: "見輿曳，其牛掣，其人天且劓，无初有終。" }, { name: "九四", text: "睽孤，遇元夫，交孚，厲无咎。" }, { name: "六五", text: "悔亡，厥宗噬膚，往何咎。" }, { name: "上九", text: "睽孤，見豕負塗，載鬼一車，先張之弧，後說之弧，匪寇婚媾，往遇雨則吉。" }] },
  { num: 39, name: "蹇", nameSimp: "蹇", symbol: "䷦", guaCi: "利西南，不利東北；利見大人，貞吉。", yao: [{ name: "初六", text: "往蹇，來譽。" }, { name: "六二", text: "王臣蹇蹇，匪躬之故。" }, { name: "九三", text: "往蹇來反。" }, { name: "六四", text: "往蹇來連。" }, { name: "九五", text: "大蹇朋來。" }, { name: "上六", text: "往蹇來碩，吉；利見大人。" }] },
  { num: 40, name: "解", nameSimp: "解", symbol: "䷧", guaCi: "利西南，无所往，其來復吉。有攸往，夙吉。", yao: [{ name: "初六", text: "无咎。" }, { name: "九二", text: "田獲三狐，得黃矢，貞吉。" }, { name: "六三", text: "負且乘，致寇至，貞吝。" }, { name: "九四", text: "解而拇，朋至斯孚。" }, { name: "六五", text: "君子維有解，吉；有孚于小人。" }, { name: "上六", text: "公用射隼于高墉之上，獲之，无不利。" }] },
  { num: 41, name: "損", nameSimp: "损", symbol: "䷨", guaCi: "有孚，元吉，无咎，可貞，利有攸往。曷之用，二簋可用享。", yao: [{ name: "初九", text: "巳事遄往，无咎，酌損之。" }, { name: "九二", text: "利貞，征凶，弗損，益之。" }, { name: "六三", text: "三人行，則損一人；一人行，則得其友。" }, { name: "六四", text: "損其疾，使遄有喜，无咎。" }, { name: "六五", text: "或益之，十朋之龜弗克違，元吉。" }, { name: "上九", text: "弗損益之，无咎，貞吉，有攸往，得臣无家。" }] },
  { num: 42, name: "益", nameSimp: "益", symbol: "䷩", guaCi: "利有攸往，利涉大川。", yao: [{ name: "初九", text: "利用為大作，元吉，无咎。" }, { name: "六二", text: "或益之，十朋之龜弗克違，永貞吉。王用享于帝，吉。" }, { name: "六三", text: "益之用凶事，无咎。有孚中行，告公用圭。" }, { name: "六四", text: "中行，告公從。利用為依遷國。" }, { name: "九五", text: "有孚惠心，勿問元吉。有孚惠我德。" }, { name: "上九", text: "莫益之，或擊之，立心勿恆，凶。" }] },
  { num: 43, name: "夬", nameSimp: "夬", symbol: "䷪", guaCi: "揚于王庭，孚號，有厲，告自邑，不利即戎，利有攸往。", yao: [{ name: "初九", text: "壯于前趾，往不勝為咎。" }, { name: "九二", text: "惕號，莫夜有戎，勿恤。" }, { name: "九三", text: "壯于頄，有凶。君子夬夬，獨行，遇雨，若濡，有慍，无咎。" }, { name: "九四", text: "臀无膚，其行次且。牽羊悔亡，聞言不信。" }, { name: "九五", text: "莧陸夬夬，中行无咎。" }, { name: "上六", text: "无號，終有凶。" }] },
  { num: 44, name: "姤", nameSimp: "姤", symbol: "䷫", guaCi: "女壯，勿用取女。", yao: [{ name: "初六", text: "繫于金柅，貞吉，有攸往，見凶，羸豕孚蹢躅。" }, { name: "九二", text: "包有魚，无咎，不利賓。" }, { name: "九三", text: "臀无膚，其行次且，厲，无大咎。" }, { name: "九四", text: "包无魚，起凶。" }, { name: "九五", text: "以杞包瓜，含章，有隕自天。" }, { name: "上九", text: "姤其角，吝，无咎。" }] },
  { num: 45, name: "萃", nameSimp: "萃", symbol: "䷬", guaCi: "亨。王假有廟，利見大人，亨，利貞。用大牲吉，利有攸往。", yao: [{ name: "初六", text: "有孚不終，乃亂乃萃，若號一握為笑，勿恤，往无咎。" }, { name: "六二", text: "引吉，无咎，孚乃利用禴。" }, { name: "六三", text: "萃如，嗟如，无攸利，往无咎，小吝。" }, { name: "九四", text: "大吉，无咎。" }, { name: "九五", text: "萃有位，无咎。匪孚，元永貞，悔亡。" }, { name: "上六", text: "齎咨涕洟，无咎。" }] },
  { num: 46, name: "升", nameSimp: "升", symbol: "䷭", guaCi: "元亨，用見大人，勿恤，南征吉。", yao: [{ name: "初六", text: "允升，大吉。" }, { name: "九二", text: "孚乃利用禴，无咎。" }, { name: "九三", text: "升虛邑。" }, { name: "六四", text: "王用亨于岐山，吉无咎。" }, { name: "六五", text: "貞吉，升階。" }, { name: "上六", text: "冥升，利于不息之貞。" }] },
  { num: 47, name: "困", nameSimp: "困", symbol: "䷮", guaCi: "亨，貞，大人吉，无咎，有言不信。", yao: [{ name: "初六", text: "臀困于株木，入于幽谷，三歲不覿。" }, { name: "九二", text: "困于酒食，朱紱方來，利用享祀，征凶，无咎。" }, { name: "六三", text: "困于石，據于蒺蔾，入于其宮，不見其妻，凶。" }, { name: "九四", text: "來徐徐，困于金車，吝，有終。" }, { name: "九五", text: "劓刖，困于赤紱，乃徐有說，利用祭祀。" }, { name: "上六", text: "困于葛藟，于臲卼，曰動悔。有悔，征吉。" }] },
  { num: 48, name: "井", nameSimp: "井", symbol: "䷯", guaCi: "改邑不改井，无喪无得，往來井井。汔至，亦未繘井，羸其瓶，凶。", yao: [{ name: "初六", text: "井泥不食，舊井无禽。" }, { name: "九二", text: "井谷射鮒，瓮敝漏。" }, { name: "九三", text: "井渫不食，為我心惻，可用汲，王明，並受其福。" }, { name: "六四", text: "井甃，无咎。" }, { name: "九五", text: "井冽，寒泉食。" }, { name: "上六", text: "井收勿幕，有孚元吉。" }] },
  { num: 49, name: "革", nameSimp: "革", symbol: "䷰", guaCi: "巳日乃孚，元亨利貞，悔亡。", yao: [{ name: "初九", text: "鞏用黃牛之革。" }, { name: "六二", text: "巳日乃革之，征吉，无咎。" }, { name: "九三", text: "征凶，貞厲，革言三就，有孚。" }, { name: "九四", text: "悔亡，有孚改命，吉。" }, { name: "九五", text: "大人虎變，未占有孚。" }, { name: "上六", text: "君子豹變，小人革面，征凶，居貞吉。" }] },
  { num: 50, name: "鼎", nameSimp: "鼎", symbol: "䷱", guaCi: "元吉，亨。", yao: [{ name: "初六", text: "鼎顛趾，利出否，得妾以其子，无咎。" }, { name: "九二", text: "鼎有實，我仇有疾，不我能即，吉。" }, { name: "九三", text: "鼎耳革，其行塞，雉膏不食，方雨虧悔，終吉。" }, { name: "九四", text: "鼎折足，覆公餗，其形渥，凶。" }, { name: "六五", text: "鼎黃耳，金鉉，利貞。" }, { name: "上九", text: "鼎玉鉉，大吉，无不利。" }] },
  { num: 51, name: "震", nameSimp: "震", symbol: "䷲", guaCi: "亨。震來虩虩，笑言啞啞。震驚百里，不喪匕鬯。", yao: [{ name: "初九", text: "震來虩虩，後笑言啞啞，吉。" }, { name: "六二", text: "震來厲，億喪貝，躋于九陵，勿逐，七日得。" }, { name: "六三", text: "震蘇蘇，震行无眚。" }, { name: "九四", text: "震遂泥。" }, { name: "六五", text: "震往來厲，億无喪，有事。" }, { name: "上六", text: "震索索，視矍矍，征凶。震不于其躬，于其鄰，无咎。婚媾有言。" }] },
  { num: 52, name: "艮", nameSimp: "艮", symbol: "䷳", guaCi: "艮其背，不獲其身，行其庭，不見其人，无咎。", yao: [{ name: "初六", text: "艮其趾，无咎，利永貞。" }, { name: "六二", text: "艮其腓，不拯其隨，其心不快。" }, { name: "九三", text: "艮其限，列其夤，厲薰心。" }, { name: "六四", text: "艮其身，无咎。" }, { name: "六五", text: "艮其輔，言有序，悔亡。" }, { name: "上九", text: "敦艮，吉。" }] },
  { num: 53, name: "漸", nameSimp: "渐", symbol: "䷴", guaCi: "女歸吉，利貞。", yao: [{ name: "初六", text: "鴻漸于干，小子厲，有言，无咎。" }, { name: "六二", text: "鴻漸于磐，飲食衎衎，吉。" }, { name: "九三", text: "鴻漸于陸，夫征不復，婦孕不育，凶；利禦寇。" }, { name: "六四", text: "鴻漸于木，或得其桷，无咎。" }, { name: "九五", text: "鴻漸于陵，婦三歲不孕，終莫之勝，吉。" }, { name: "上九", text: "鴻漸于陸，其羽可用為儀，吉。" }] },
  { num: 54, name: "歸妹", nameSimp: "归妹", symbol: "䷵", guaCi: "征凶，无攸利。", yao: [{ name: "初九", text: "歸妹以娣，跛能履，征吉。" }, { name: "九二", text: "眇能視，利幽人之貞。" }, { name: "六三", text: "歸妹以須，反歸以娣。" }, { name: "九四", text: "歸妹愆期，遲歸有時。" }, { name: "六五", text: "帝乙歸妹，其君之袂，不如其娣之袂良，月幾望，吉。" }, { name: "上六", text: "女承筐无實，士刲羊无血，无攸利。" }] },
  { num: 55, name: "豐", nameSimp: "丰", symbol: "䷶", guaCi: "亨，王假之，勿憂，宜日中。", yao: [{ name: "初九", text: "遇其配主，雖旬无咎，往有尚。" }, { name: "六二", text: "豐其蔀，日中見斗，往得疑疾，有孚發若，吉。" }, { name: "九三", text: "豐其沛，日中見沬，折其右肱，无咎。" }, { name: "九四", text: "豐其蔀，日中見斗，遇其夷主，吉。" }, { name: "六五", text: "來章，有慶譽，吉。" }, { name: "上六", text: "豐其屋，蔀其家，闚其戶，闃其无人，三歲不覿，凶。" }] },
  { num: 56, name: "旅", nameSimp: "旅", symbol: "䷷", guaCi: "小亨，旅貞吉。", yao: [{ name: "初六", text: "旅瑣瑣，斯其所取災。" }, { name: "六二", text: "旅即次，懷其資，得童僕貞。" }, { name: "九三", text: "旅焚其次，喪其童僕，貞厲。" }, { name: "九四", text: "旅于處，得其資斧，我心不快。" }, { name: "六五", text: "射雉一矢亡，終以譽命。" }, { name: "上九", text: "鳥焚其巢，旅人先笑後號咷。喪牛于易，凶。" }] },
  { num: 57, name: "巽", nameSimp: "巽", symbol: "䷸", guaCi: "小亨，利攸往，利見大人。", yao: [{ name: "初六", text: "進退，利武人之貞。" }, { name: "九二", text: "巽在床下，用史巫紛若，吉，无咎。" }, { name: "九三", text: "頻巽，吝。" }, { name: "六四", text: "悔亡，田獲三品。" }, { name: "九五", text: "貞吉悔亡，无不利。无初有終，先庚三日，後庚三日，吉。" }, { name: "上九", text: "巽在床下，喪其資斧，貞凶。" }] },
  { num: 58, name: "兌", nameSimp: "兑", symbol: "䷹", guaCi: "亨，利貞。", yao: [{ name: "初九", text: "和兌，吉。" }, { name: "九二", text: "孚兌，吉，悔亡。" }, { name: "六三", text: "來兌，凶。" }, { name: "九四", text: "商兌，未寧，介疾有喜。" }, { name: "九五", text: "孚于剝，有厲。" }, { name: "上六", text: "引兌。" }] },
  { num: 59, name: "渙", nameSimp: "涣", symbol: "䷺", guaCi: "亨。王假有廟，利涉大川，利貞。", yao: [{ name: "初六", text: "用拯馬壯，吉。" }, { name: "九二", text: "渙奔其机，悔亡。" }, { name: "六三", text: "渙其躬，无悔。" }, { name: "六四", text: "渙其群，元吉。渙有丘，匪夷所思。" }, { name: "九五", text: "渙汗其大號，渙王居，无咎。" }, { name: "上九", text: "渙其血，去逖出，无咎。" }] },
  { num: 60, name: "節", nameSimp: "节", symbol: "䷻", guaCi: "亨。苦節，不可貞。", yao: [{ name: "初九", text: "不出戶庭，无咎。" }, { name: "九二", text: "不出門庭，凶。" }, { name: "六三", text: "不節若，則嗟若，无咎。" }, { name: "六四", text: "安節，亨。" }, { name: "九五", text: "甘節，吉；往有尚。" }, { name: "上六", text: "苦節，貞凶，悔亡。" }] },
  { num: 61, name: "中孚", nameSimp: "中孚", symbol: "䷼", guaCi: "豚魚吉，利涉大川，利貞。", yao: [{ name: "初九", text: "虞吉，有它不燕。" }, { name: "九二", text: "鳴鶴在陰，其子和之，我有好爵，吾與爾靡之。" }, { name: "六三", text: "得敵，或鼓或罷，或泣或歌。" }, { name: "六四", text: "月幾望，馬匹亡，无咎。" }, { name: "九五", text: "有孚攣如，无咎。" }, { name: "上九", text: "翰音登于天，貞凶。" }] },
  { num: 62, name: "小過", nameSimp: "小过", symbol: "䷽", guaCi: "亨，利貞，可小事，不可大事。飛鳥遺之音，不宜上，宜下，大吉。", yao: [{ name: "初六", text: "飛鳥以凶。" }, { name: "六二", text: "過其祖，遇其妣；不及其君，遇其臣；无咎。" }, { name: "九三", text: "弗過防之，從或戕之，凶。" }, { name: "九四", text: "无咎，弗過遇之。往厲必戒，勿用永貞。" }, { name: "六五", text: "密雲不雨，自我西郊，公弋取彼在穴。" }, { name: "上六", text: "弗遇過之，飛鳥離之，凶，是謂災眚。" }] },
  { num: 63, name: "既濟", nameSimp: "既济", symbol: "䷾", guaCi: "亨，小利貞，初吉終亂。", yao: [{ name: "初九", text: "曳其輪，濡其尾，无咎。" }, { name: "六二", text: "婦喪其茀，勿逐，七日得。" }, { name: "九三", text: "高宗伐鬼方，三年克之，小人勿用。" }, { name: "六四", text: "繻有衣袽，終日戒。" }, { name: "九五", text: "東鄰殺牛，不如西鄰之禴祭，實受其福。" }, { name: "上六", text: "濡其首，厲。" }] },
  { num: 64, name: "未濟", nameSimp: "未济", symbol: "䷿", guaCi: "亨，小狐汔濟，濡其尾，无攸利。", yao: [{ name: "初六", text: "濡其尾，吝。" }, { name: "九二", text: "曳其輪，貞吉。" }, { name: "六三", text: "未濟，征凶，利涉大川。" }, { name: "九四", text: "貞吉，悔亡，震用伐鬼方，三年有賞于大國。" }, { name: "六五", text: "貞吉，无悔，君子之光，有孚，吉。" }, { name: "上九", text: "有孚于飲酒，无咎，濡其首，有孚失是。" }] },
];

/** 卦名（繁/简）与卦符 → 卦 的查表（键含繁体名、简体名、卦符） */
const INDEX: Record<string, Hexagram> = {};
for (const h of HEXAGRAMS) {
  INDEX[h.name] = h;
  INDEX[h.nameSimp] = h;
  INDEX[h.symbol] = h;
}

export const YIJING_HEXAGRAMS = HEXAGRAMS;

/**
 * 按卦名或卦符取卦（容错：剥离卦符、空白、括注，繁简通吃）。
 * 接受如「乾」「乾䷀」「䷀乾」「乾卦」等形态；查无返回 null。
 */
// 卦名异体字归一（無→无：卦25「无妄」经文用「无」，而 yhys 皇极卦名用繁体「無」）
const normalizeGua = (s: string): string => s.replace(/無/g, "\u65E0");

export function getHexagram(input: string | null | undefined): Hexagram | null {
  if (!input) return null;
  // 先试卦符直查
  for (const ch of input) {
    if (INDEX[ch] && ch >= "\u4DC0" && ch <= "\u4DFF") return INDEX[ch];
  }
  // 剥离非卦名字符（卦符/空白/标点/英数），保留 CJK 表意文字，并异体归一
  const cjk = normalizeGua(input.replace(/[^\u3400-\u9FFF]/g, ""));
  if (INDEX[cjk]) return INDEX[cjk];
  // 退化：去掉尾「卦」字再试
  const noGua = cjk.replace(/卦$/, "");
  if (INDEX[noGua]) return INDEX[noGua];
  // 两字卦名内含（如输入含多余字）
  for (const h of HEXAGRAMS) {
    if (cjk.includes(h.name) || cjk.includes(h.nameSimp)) return h;
  }
  return null;
}

/** 取指定卦的某爻辞（爻题如「初九」「六三」「用九」）；查无返回 null。 */
export function getYaoCi(hexName: string, yaoName: string): YaoCi | null {
  const h = getHexagram(hexName);
  if (!h) return null;
  return h.yao.find((y) => y.name === yaoName) ?? null;
}
