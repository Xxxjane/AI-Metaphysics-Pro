import React, { useState, useRef, useEffect } from 'react';
import { 
  LoaderCircle, Sword, Brush, ShieldCheck, ChevronLeft, Printer, Share2, 
  RefreshCw, Send, MessageSquareText, History, X, Compass, Activity, Fingerprint, Trash2
} from 'lucide-react';

// ==========================================
// 1. 核心配置区 (开源化改造重点)
// ==========================================
// 默认使用本地 8000 端口。部署到生产环境时，请修改此处的地址
// 例如：const API_BASE_URL = 'https://api.yourdomain.com';
const API_BASE_URL = 'http://127.0.0.1:8000';

// --- 全量省市数据 (由用户自行补充完整) ---
const PROVINCE_DATA = {
  "北京市": ["平谷", "密云", "通县", "顺义", "怀柔", "北京", "大兴", "昌平", "房山", "延庆", "东城", "西城", "朝阳", "丰台", "石景山", "海淀", "门头沟", "通州"],
  "天津市": ["宁河", "蓟县", "宝坻", "天津", "武清", "静海", "和平", "河东", "河西", "南开", "河北", "红桥", "东丽", "西青", "津南", "北辰", "滨海新", "蓟州"],
  "上海市": ["南汇", "川沙", "宝山", "上海", "奉贤", "崇明", "松江", "嘉定", "金山", "青浦", "黄浦", "徐汇", "长宁", "静安", "普陀", "虹口", "杨浦", "闵行", "浦东新"],
  "重庆市": ["巫山", "巫溪", "奉节", "秀山", "云阳", "黔江", "西阳", "武隆", "城口", "开县", "万州", "彭水", "石柱", "忠县", "梁平", "丰都", "涪陵", "垫江", "南川", "南桐", "长寿", "綦江", "重庆", "合川", "潼南", "荣昌", "壁山", "万盛", "铜梁", "永川", "大足", "渝中", "大渡口", "江北", "沙坪坝", "九龙坡", "南岸", "北碚", "渝北", "巴南", "江津", "璧山", "开州", "酉阳土家族苗族自治"],
  "河北省": ["秦皇岛", "抚宁", "昌黎", "青龙", "乐亭", "卢龙", "滦县", "迁安", "平泉", "滦南", "唐海", "宽城", "迁西", "丰润", "丰南", "唐山", "遵化", "承德", "玉田", "海兴", "围场", "隆化", "滦平", "兴隆", "黄骅", "盐山", "孟村", "三河", "香河", "大厂", "沧州", "青县", "廊坊", "南皮", "安次", "丰宁", "大城", "泊头", "东光", "永清", "文安", "霸县", "吴桥", "固安", "交河", "景县", "阜城", "献县", "雄县", "任丘", "河间", "涿县", "故城", "武强", "安新", "武邑", "容城", "新城", "肃宁", "赤城", "高阳", "定兴", "饶阳", "枣强", "衡水", "涞水", "沽源", "清河", "徐水", "蠡县", "冀县", "深县", "怀来", "临西", "安平", "易县", "保定", "清苑", "博野", "满城", "馆陶", "南官", "安国", "崇礼", "新河", "深泽", "涿鹿", "丘县", "束鹿", "望都", "广宗", "大名", "完县", "威县", "晋县", "巨鹿", "宣化", "平乡", "唐县", "无极", "魏县", "广平", "曲周", "宁普", "张口", "藁城", "肥乡", "赵县", "隆尧", "万全", "南和", "张北", "曲阳", "成安", "任县", "柏乡", "涞源", "新乐", "栾城", "临漳", "康保", "高邑", "正定", "行唐", "蔚县", "沙河", "元氏", "临城", "内丘", "永年", "石家庄", "邢台", "邯郸", "怀安", "灵寿", "磁县", "赞皇", "平山", "武安", "阜平", "阳原", "井陉", "获鹿", "定县", "尚义", "鸡泽", "涉县", "辛集", "晋州", "滦州", "邱县", "宁晋", "南宫", "顺平", "涿州", "定州", "高碑店", "沧县", "霸州", "深州", "雄安新"],
  "山东省": ["荣成", "威海", "文登", "牟平", "乳山", "烟台", "福山", "海阳", "栖霞", "蓬莱", "长岛", "莱阳", "莱西", "黄县", "即墨", "崂山", "招远", "青岛", "胶县", "平度", "胶南", "掖县", "高密", "日照", "诸城", "昌邑", "潍县", "五莲", "安丘", "潍坊", "昌乐", "莒南", "莒县", "临沭", "寿光", "沂水", "垦利", "临朐", "东营", "沂南", "高都", "广饶", "青州", "临沂", "郯城", "利津", "沂源", "沾化", "桓台", "博兴", "淄博", "滨州", "邹平", "新泰", "新汶", "莱芜", "高青", "平邑", "阳信", "无棣", "枣庄", "章丘", "庆云", "惠民", "泗水", "乐陵", "济阳", "滕县", "商河", "泰安", "微山", "历城", "济南", "曲阜", "邹县", "临邑", "兖州", "宁津", "宁阳", "齐河", "肥城", "长清", "禹城", "鱼台", "济宁", "陵县", "汶上", "平阴", "平原", "嘉祥", "金乡", "东平", "德州", "茌平", "高唐", "东阿", "梁山", "巨野", "武城", "单县", "夏津", "聊城", "郓城", "成武", "阳谷", "临清", "莘县", "定陶", "曹县", "鄄城", "冠县", "菏泽", "东明", "胶州", "滕州", "龙口", "莱州", "邹城", "莒县", "兰陵"],
  "浙江省": ["嵊泗", "普陀", "岱山", "定海", "象山", "镇海", "宁波", "鄞县", "椒江", "宁海", "奉化", "三门", "温岭", "黄岩", "慈溪", "玉环", "余姚", "临海", "洞头", "天台", "平湖", "乐清", "海盐", "嘉善", "新昌", "上虞", "嵊县", "嘉兴", "仙居", "海宁", "永嘉", "瓯海", "温州", "瑞安", "缙云", "绍兴", "平阳", "桐乡", "苍南", "余杭", "萧山", "诸暨", "东阳", "杭州", "湖州", "文成", "德清", "义乌", "永康", "富阳", "丽水", "长兴", "浦江", "武义", "临安", "泰顺", "安吉", "桐庐", "金华", "云和", "兰溪", "松阳", "建德", "遂昌", "龙泉", "庆元", "淳安", "衢州", "江山", "常山", "开化", "永嘉", "龙港", "嵊州", "磐安", "龙游", "庆元", "景宁畲族自治"],
  "四川省": ["通江", "百沙", "万源", "开江", "宜汉", "达县", "大竹", "平昌", "渠县", "邻水", "南江", "华云", "巴中", "广安", "营山", "蓬安", "岳池", "仪陇", "旺苍", "武胜", "南充", "南部", "阆中", "苍溪", "广元", "西充", "古蔺", "合江", "蓬溪", "遂宁", "泸县", "剑阁", "叙水", "泸州", "纳溪", "盐亭", "射洪", "安岳", "隆昌", "青川", "梓潼", "三台", "兴文", "江安", "内江", "乐至", "富顺", "南溪", "双流", "长宁", "资中", "琪县", "绵阳", "威远", "江油", "中江", "资阳", "宜宾", "简阳", "筠连", "高县", "平武", "北川", "安县", "德阳", "金堂", "广汉", "南坪", "绵竹", "什邡", "屏由", "新都", "仁寿", "井研", "成都", "沐川", "彭县", "犍为", "茂汶", "郫县", "彭山", "青神", "眉山", "温江", "新津", "乐由", "崇庆", "雷波", "汶川", "松潘", "灌县", "夹江", "大邑", "丹棱", "马边", "峨眉", "邛崃", "洪雅", "蒲江", "峨边", "金阳", "理县", "美姑", "金口", "名山", "雅安", "黑水", "若尔盖", "芦山", "宝兴", "昭觉", "荣经", "布拖", "天全", "宁南", "甘洛", "汉源", "红原", "会东", "普格", "越西", "喜德", "石棉", "小金", "西昌", "泸定", "马尔康", "会理", "冕宁", "来易", "德昌", "金川", "康定", "丹巴", "阿坝", "盐边", "九龙", "盐源", "木里", "道孚", "雅江", "壤塘", "炉霍", "色达", "稻城", "新龙", "理塘", "甘孜", "乡城", "得荣", "巴塘", "白玉", "德格", "石渠", "都江堰", "彭州", "崇州", "荣县", "米易", "叙永", "大英", "珙县", "屏山", "华蓥", "宣汉", "荥经", "茂县", "九寨沟"],
  "河南省": ["永城", "夏邑", "虞城", "台前", "固始", "商丘", "鹿邑", "范县", "商城", "淮滨", "宁陵", "柘城", "南乐", "郸城", "民权", "清丰", "沈丘", "睢县", "潢川", "濮阳", "新蔡", "光山", "项城", "淮阳", "内黄", "太康", "新县", "兰考", "杞县", "息县", "长垣", "周口", "平舆", "商水", "浚县", "罗山", "滑县", "西华", "通许", "扶沟", "正阳", "安阳", "开封", "汝南", "汤阴", "上蔡", "延津", "尉氏", "鄢县", "淇县", "鹤壁", "信阳", "汲县", "封丘", "驻马店", "确山", "漯河", "西平", "中牟", "鄾城", "遂平", "原阳", "临颖", "新乡", "林县", "许昌", "长葛", "辉县", "新郑", "郑州", "获嘉", "舞阳", "禹县", "襄城", "修武", "桐柏", "武陟", "密县", "荥阳", "叶县", "泌阳", "平顶山", "焦作", "郏县", "温贺", "博爱", "宝丰", "登封", "方城", "巩县", "社旗", "沁阳", "鲁山", "唐河", "临汝", "偃师", "孟县", "济源", "南阳", "汝阳", "洛阳", "伊川", "孟津", "南召", "新野", "镇平", "宜阳", "新安", "邓县", "嵩县", "义马", "内乡", "渑池", "洛宁", "栾川", "西峡", "淅川", "陕县", "三门峡", "卢氏", "灵宝", "巩义", "新密", "舞钢", "汝州", "林州", "卫辉", "温县", "孟州", "鄢陵", "禹州", "临颍", "邓州"],
  "辽宁省": ["桓仁", "新宾", "清原", "宽甸", "西丰", "丹东", "东沟", "昌图", "凤城", "开原", "抚顺", "铁岭", "本溪", "铁法", "沈阳", "法库", "灯塔", "康平", "岫岩", "辽阳", "庄河", "鞍山", "新民", "海城", "辽中", "长海", "彰武", "台安", "盖县", "营口", "黑山", "大洼", "盘山", "复县", "新金", "北镇", "金县", "阜新", "大连", "锦县", "义县", "锦州", "锦西", "北票", "兴城", "朝阳", "绥中", "建昌", "建平", "凌源", "瓦房店", "东港", "凌海", "盖州", "大石桥", "调兵山", "喀喇沁左翼蒙古族自治", "葫芦岛"],
  "江苏省": ["启东", "如东", "海门", "太仓", "南通", "昆山", "常熟", "吴江", "吴县", "苏州", "如皋", "沙洲", "海安", "大丰", "东台", "无锡", "射阳", "江阴", "靖江", "泰县", "盐城", "泰兴", "武进", "常州", "泰州", "滨海", "宜兴", "兴化", "扬中", "阜宁", "建湖", "响水", "金坛", "江都", "丹阳", "溧阳", "高邮", "镇江", "丹徒", "邗江", "扬州", "灌南", "宝应", "涟水", "灌云", "连云港", "句容", "仪征", "淮安", "赣榆", "淮阴", "金湖", "清江", "溧水", "高淳", "洪泽", "江宁", "六合", "沭阳", "南京", "东海", "泗阳", "江浦", "新沂", "宿迁", "泗洪", "盱眙", "邳县", "睢宁", "铜山", "徐州", "沛县", "丰县", "邳州", "张家港"],
  "香港澳门台湾": ["宜兰", "基隆", "台北", "桃园", "新竹", "台中", "高雄", "台南", "香港", "澳门", "新北", "苗栗", "彰化", "南投", "云林", "嘉义", "屏东", "花莲", "台东", "澎湖", "连江"],
  "安徽省": ["广德", "郎溪", "天长", "宁国", "宣城", "绩溪", "旌德", "当涂", "马鞍山", "来安", "歙县", "泾县", "芜湖", "和县", "南陵", "滁州", "屯溪", "全椒", "繁昌", "休宁", "太平", "含山", "嘉山", "黟县", "泗县", "巢湖", "五河", "巢县", "青阳", "铜陵", "无为", "祁门", "定远", "吴壁", "贵池", "石台", "肥东", "凤阳", "蚌埠", "固镇", "庐江", "合肥", "纵阳", "怀远", "长丰", "肥西", "安庆", "东至", "淮南", "宿州", "宿县", "桐城", "舒城", "萧县", "寿县", "淮北", "濉溪", "毫县", "凤台", "蒙城", "潜山", "六安", "岳西", "砀山", "霍山", "太湖", "霍丘", "颖上", "涡阳", "利辛", "宿松", "金寨", "阜阳", "太和", "阜南", "界首", "临泉", "枞阳", "明光", "颍上", "灵璧", "霍邱", "旌德"],
  "吉林省": ["珲春", "图们", "汪清", "延吉", "和龙", "安图", "敦化", "长白", "蛟河", "抚松", "舒兰", "九台", "靖宇", "桦甸", "永吉", "吉林", "榆树", "浑江", "集安", "磐石", "辉南", "通化", "柳河", "双阳", "德惠", "海龙", "东丰", "长春", "伊通", "农安", "辽源", "怀德", "扶余", "四平", "梨树", "大安", "乾安", "长岭", "双辽", "通榆", "白城", "洮安", "公主岭", "东辽", "梅河口", "临江", "前郭尔罗斯蒙古族自治", "镇赉", "洮南", "龙井"],
  "福建省": ["福鼎", "霞浦", "柘荣", "平潭", "福安", "罗源", "连江", "长乐", "宁德", "寿宁", "福清", "周宁", "福州", "闽侯", "莆田", "屏南", "永泰", "闽清", "政和", "惠安", "松溪", "吉田", "仙游", "泉州", "晋江", "浦城", "南安", "金门", "建瓯", "永春", "德化", "安溪", "龙溪", "南平", "同安", "南平", "厦门", "崇安", "大田", "顺昌", "龙海", "沙县", "长泰", "三明", "漳浦", "华安", "邵武", "将乐", "东山", "漳平", "永安", "漳州", "南靖", "云霄", "光泽", "平和", "明溪", "诏安", "泰宁", "龙岩", "建宁", "清流", "永定", "连城", "宁化", "上杭", "长汀", "武平", "尤溪", "石狮", "武夷山", "古田"],
  "山西省": ["灵丘", "天镇", "阳高", "昔阳", "浑源", "平定", "阳泉", "和顺", "平顺", "黎城", "孟县", "左权", "五台", "大同", "繁峙", "陵川", "广灵", "壶关", "潞城", "应县", "寿阳", "怀仁", "长治", "襄垣", "代县", "榆社", "定襄", "高平", "长子", "屯留", "武乡", "晋城", "山阴", "榆次", "忻县", "原平", "沁县", "左云", "阳曲", "太谷", "太原", "朔县", "阳城", "祁县", "右玉", "清徐", "沁源", "宁武", "安泽", "平遥", "神池", "沁水", "交城", "平鲁", "文水", "静乐", "古县", "介休", "浮山", "五寨", "孝义", "娄烦", "灵石", "汾阳", "霍县", "翼城", "洪洞", "垣曲", "岚县", "绛县", "岢岚", "汾西", "临汾", "偏关", "侯马", "襄汾", "曲沃", "方由", "夏县", "兴县", "新绛", "交口", "闻喜", "平陆", "河曲", "中阳", "离石", "保德", "蒲县", "運城", "稷山", "临县", "柳林", "万荣", "石楼", "乡宁", "临猗", "大宁", "河津", "芮城", "吉县", "永和", "永济", "古交", "盂县", "泽州", "隰县", "霍州", "方山"],
  "湖北省": ["黄梅", "英山", "广济", "罗川", "蕲春", "浠水", "阳新", "黄石", "麻城", "黄冈", "鄂城", "新洲", "红安", "通山", "黄陂", "武昌", "武汉", "咸宁", "大悟", "崇阳", "汉阳", "孝感", "嘉鱼", "蒲圻", "应山", "通城", "云梦", "安陆", "应城", "汉川", "广水", "随州", "京山", "监利", "钟祥", "石首", "沙市", "荆门", "江陵", "襄樊", "宜昌", "十堰", "大冶", "郧西", "竹山", "竹溪", "房县", "丹江口", "远安", "兴山", "秭归", "长阳土家族自治", "五峰土家族自治", "宜都", "当阳", "枝江", "南漳", "谷城", "保康", "老河口", "枣阳", "宜城", "沙洋", "孝昌", "公安", "洪湖", "松滋", "团风", "罗田", "武穴", "赤壁", "随县", "恩施", "利川", "建始", "巴东", "宣恩", "咸丰", "来凤", "鹤峰", "仙桃", "潜江", "天门", "神农架"],
  "黑龙江省": ["抚远", "饶河", "虎林", "同江", "宝清", "富锦", "密山", "摧滨", "双鸭山", "摧芬河", "集贤", "东宁", "鸡东", "鸡西", "萝北", "七台河", "桦川", "桦南", "勃利", "穆棱", "佳木斯", "鹤岗", "林口", "嘉荫", "汤源", "牡丹江", "依兰", "宁安", "海林", "伊春", "方正", "通河", "逊克", "延寿", "铁力", "木兰", "尚志", "黑河", "爱辉", "庆安", "孙吴", "宾县", "巴彦", "五常", "绥棱", "绥化", "海伦", "阿城", "通北", "哈尔滨", "呼玛", "呼兰", "望奎", "北安", "双城", "兰西", "克东", "德都", "青岗", "拜泉", "肇东", "明水", "克山", "安达", "依安", "肇州", "嫩江", "肇源", "大庆", "林甸", "讷河", "塔河", "杜尔伯特", "富裕", "加格达奇", "齐齐哈尔", "甘南", "泰来", "龙江", "漠河", "友谊", "汤旺", "丰林", "大箐山", "南岔", "五大连池", "青冈"],
  "广东省": ["南澳", "饶平", "澄海", "大埔", "汕头", "潮安", "潮州", "潮阳", "揭阳", "惠来", "丰顺", "蕉岭", "普宁", "梅县", "梅州", "平远", "陆丰", "揭西", "兴宁", "五华", "海丰", "龙川", "紫金", "和平", "惠东", "河源", "连平", "惠州", "惠阳", "南雄", "博罗", "龙门", "新丰", "翁源", "始兴", "深圳", "宝安", "增城", "东莞", "仁化", "韶关", "曲江", "从化", "佛冈", "珠海", "英德", "中山", "番禺", "乐昌", "斗门", "顺德", "广州", "花县", "南海", "佛山", "江门", "新会", "清远", "鹤山", "三水", "台山", "高明", "开平", "阳山", "招庆", "高要", "广宁", "连县", "恩平", "连南", "新兴", "怀集", "连山", "云浮", "阳江", "阳春", "德庆", "罗定", "郁南", "封开", "电白", "信宜", "茂名", "高州", "吴川", "化州", "湛江", "廉江", "遂溪", "徐闻", "海康", "雷州", "乳源瑶族自治县", "陆河", "东源", "阳西", "连州", "石碣", "石龙", "茶山", "石排", "企石", "横沥", "桥头", "谢岗", "东坑", "常平", "寮步", "樟木头", "大朗", "黄江", "清溪", "塘厦", "凤岗", "大岭山", "长安", "虎门", "厚街", "沙田", "道滘", "洪梅", "麻涌", "望牛墩", "中堂", "高埗", "松山湖", "黄圃", "东凤", "古镇", "沙溪", "坦洲", "港口", "三角", "横栏", "南头", "阜沙", "三乡", "板芙", "大涌", "神湾", "小榄"],
  "江西省": ["玉山", "广丰", "上饶", "婺源", "铅山", "横峰", "德兴", "弋阳", "景德镇", "贵溪", "乐平", "万年", "资溪", "鹰潭", "黎川", "余江", "金溪", "于干", "波阳", "南城", "东乡", "彭泽", "南丰", "抚州", "石城", "广昌", "临川", "进贤", "湖口", "宜黄", "都昌", "崇仁", "星子", "瑞金", "宁都", "九江", "南昌", "乐安", "永修", "新建", "会昌", "德安", "丰城", "瑞昌", "寻乌", "安义", "清江", "永丰", "安远", "新干", "于都", "奉新", "高安", "靖安", "兴国", "峡江", "吉水", "武宁", "定南", "吉安", "信丰", "新余", "赣州", "上高", "泰和", "龙南", "宜丰", "万安", "南康", "分宜", "安福", "上犹", "修永", "全南", "遂川", "万载", "宜春", "铜鼓", "大余", "崇义", "永新", "井冈山", "赣县", "宁冈", "莲花", "萍乡", "浮梁", "上栗", "芦溪", "修水", "共青城", "庐山", "樟树", "余干", "鄱阳"],
  "内蒙古自治区": ["莫力达瓦达斡尔族自治旗", "鄂伦春自治旗", "阿荣旗", "科尔沁左翼中旗", "布特哈旗", "科尔沁左翼后旗", "通辽", "乌兰浩特", "科尔沁右翼前旗", "库伦旗", "额尔古纳左旗", "突泉", "科尔沁右翼中旗", "开鲁", "扎鲁特旗", "喜桂图旗", "奈曼旗", "额尔古纳右旗", "阿鲁科尔沁旗", "敖汉旗", "鄂温克族自治旗", "海拉尔", "陈巴尔虎旗", "巴林左旗", "宁城", "翁牛特旗", "赤峰", "喀喇沁旗", "巴林右旗", "新巴尔虎右旗", "林西", "西乌珠穆沁旗", "克什克腾旗", "满洲里", "东乌珠穆沁旗", "新巴尔虎左旗", "多伦", "阿巴哈纳尔旗", "正蓝旗", "太仆寺旗", "正镶白旗", "阿巴嘎旗", "化德", "兴和", "镶黄旗", "苏尼特左旗", "商都", "察哈尔右翼前旗", "丰镇", "察哈尔右翼后旗", "集宁", "苏尼特右旗", "察哈尔右翼中旗", "卓资", "凉城", "二连浩特", "和林格尔", "四子王旗", "清水河", "呼和浩特", "武川", "托克托", "上默特左旗", "准格尔旗", "上默特右旗", "达尔罕茂明安联合旗", "固阳", "达拉特旗", "包头", "伊克昭盟", "东胜县", "伊金霍洛旗", "乌审旗", "杭锦旗", "乌拉特前旗", "乌拉特后旗", "乌拉特中旗", "五原", "鄂托克旗", "鄂托克前旗", "临河", "杭锦后旗", "磴口", "乌海", "阿拉善左旗", "阿拉善右旗", "额济纳旗"],
  "湖南省": ["宜章", "桂东", "酃县", "汝城", "浏阳", "平江", "茶陵", "醴陵", "临湘", "资兴", "攸县", "安仁", "株洲", "永兴", "岳阳", "汨罗", "郴州", "长沙", "郴县", "衡东", "湘潭", "湘阴", "衡山", "耒阳", "望城", "桂阳", "衡南", "衡阳", "华容", "临武", "宁乡", "湘乡", "南县", "常宁", "沅江", "嘉禾", "益阳", "新田", "双峰", "蓝山", "安乡", "祁东", "桃江", "汉寿", "娄底", "宁远", "津市", "祁阳", "江华", "澧县", "邵东", "常德", "涟源", "双牌", "临澧", "零陵", "永州", "道县", "邵阳", "桃源", "新邵", "冷水江", "石门", "江永", "新化", "东安", "安化", "慈利", "隆回", "新宁", "泸溪", "武冈", "溆浦", "洞口", "大庸", "沅陵", "城步", "辰溪", "桑植", "黔阳", "绥宁", "洪江", "怀化", "古丈", "永顺", "麻阳", "芷江", "通道", "吉首", "会同", "靖县", "保靖", "花垣", "凤凰", "龙山", "新晃", "炎陵", "韶山", "汨罗", "中方", "靖州苗族侗族自治"],
  "新疆维吾尔自治区": ["伊吾", "哈密", "巴里坤", "青河", "木垒", "鄯善", "奇台", "富蕴", "吐鲁番", "吉木萨尔", "托克逊", "阿勒泰", "阜康", "乌鲁木齐", "米泉", "福海", "昌吉", "布尔津", "呼图壁", "和硕", "焉耆", "博湖", "哈巴河", "和静", "尉梨", "玛纳斯", "库尔勒", "石河子", "吉木乃", "沙湾", "和布克赛尔", "奎屯", "伊犁", "克拉玛依", "乌苏", "轮台", "额敏", "托里", "新源", "库车", "塔城", "裕民", "精河", "沙雅", "民丰", "新和", "尼勒克", "巩留", "博乐", "拜城", "特克斯", "于田", "伊宁", "察布察尔", "昭苏", "温泉", "霍城", "策勒", "阿瓦提", "阿克苏", "温宿", "洛浦", "和田", "墨玉", "乌什", "柯平", "巴楚", "阿合奇", "皮山", "麦盖提", "叶城", "泽普", "莎车", "枷师", "乐普湖", "英吉沙", "阿图什", "疏勒", "咯什", "阿克陶", "疏附", "塔什库尔干", "乌恰", "阿拉山口", "若羌", "且末", "喀什", "岳普湖", "伽师", "霍尔果斯", "阿拉尔", "图木舒克", "五家渠", "北屯", "铁门关", "双河", "可克达拉", "昆玉", "胡杨河", "新星", "白杨"],
  "贵州省": ["铜仁", "天柱", "万山", "松桃", "锦屏", "黎平", "玉屏", "从江", "江口", "岑巩", "三穗", "剑河", "榕江", "沿河", "镇远", "印江", "台江", "师阡", "思南", "德江", "施秉", "雷山", "凯里", "黄平", "余庆", "荔波", "务川", "三都", "丹寨", "凤冈", "道真", "麻江", "平塘", "独山", "都匀", "福泉", "湄潭", "正安", "贵定", "绥阳", "龙里", "开阳", "遵义", "桐梓", "罗甸", "息烽", "贵阳", "惠水", "修文", "清镇", "长顺", "仁怀", "平坝", "金沙", "习水", "望谟", "紫云", "黔西", "安顺", "册亭", "织金", "普定", "镇宁", "赤水", "贞丰", "关岭", "大方", "安龙", "六枝", "钠雍", "毕节", "晴龙", "兴仁", "普安", "兴义", "水城", "六盘水", "赫章", "盘县", "威宁", "盘州", "纳雍", "石阡", "晴隆", "册亨"],
  "云南省": ["富宁", "广南", "威信", "镇雄", "麻栗坡", "西畴", "陆良", "马关", "永富", "砚山", "罗平", "盐津", "富源", "文山", "丘北", "宣威", "彝良", "河口", "绥江", "师宗", "大关", "沽益", "曲靖", "泸西", "昭通", "屏边", "永善", "马龙", "鲁甸", "弥勒", "蒙自", "会泽", "寻甸", "金平", "路南", "开远", "宜良", "嵩明", "华宁", "巧家", "澄江", "元阳", "呈贡", "建水", "通海", "江川", "昆明", "晋宁", "玉溪", "富民", "石屏", "禄劝", "安宁", "个旧", "红河", "绿春", "峨山", "武定", "易门", "元江", "新平", "江城", "元谋", "黑江", "永仁", "双柏", "牟定", "勐腊", "楚雄", "大姚", "南华", "华坪", "姚安", "普洱", "普洱", "镇沅", "景东", "宁蒗", "景洪", "永胜", "景谷", "祥云", "宾川", "弥渡", "南涧", "勐海", "巍山", "丽江", "下关", "大理", "鹤庆", "云县", "临沦", "漾濞", "澜沦", "洱源", "凤庆", "剑川", "双江", "中甸", "昌宁", "孟连", "永平", "西盟", "耿马", "云龙", "兰坪", "维西", "永德", "沧源", "保由", "施甸", "镇康", "碧江", "德钦", "福贡", "泸水", "龙陵", "贡山", "潞西", "腾冲", "梁河", "町", "陇川", "盈江", "瑞丽", "石林彝族自治", "水富", "玉龙纳西族自治", "宁洱哈尼族彝族自治", "墨江哈尼族自治", "澜沧拉祜族自治", "芒市", "香格里拉"],
  "西藏自治区": ["芒康", "贡觉", "左贡", "察雅", "察隅", "昌都", "八宿", "类乌齐", "洛隆", "波密", "丁青", "墨脱", "边坝", "林芝", "米林", "巴青", "索县", "比如", "嘉黎", "工布江达", "朗县", "加查", "隆子", "聂荣", "曲松", "那曲", "桑日", "错那", "墨竹工卡", "乃东", "安多", "穷结", "措美", "达孜", "扎囊", "林周", "拉萨", "当雄", "贡嘎", "堆龙德庆", "洛扎", "曲水", "浪卡子", "尼木", "班戈", "仁布", "康马", "江孜", "江达", "白朗", "南木林", "亚东", "日喀则", "申扎", "岗巴", "谢通门", "萨迦", "定结", "拉孜", "昂仁", "定日", "聂拉木", "萨嘎", "吉隆", "措勤", "仲巴", "改则", "普兰", "革吉", "噶尔", "扎达", "日上", "琼结", "尼玛", "双湖", "札达", "日土"],
  "广西壮族自治区": ["贺县", "梧州", "钟山", "苍梧", "灌阳", "全州", "岑溪", "藤县", "恭城", "昭平", "资源", "兴安", "平乐", "蒙山", "容县", "平南", "荔浦", "灵川", "北流", "桂林", "富川", "陆川", "临桂", "金秀", "玉林", "桂平", "龙胜", "博白", "永福", "鹿寨", "象州", "武宣", "贵县", "三江", "浦北", "柳州", "融安", "柳江", "灵山", "来宾", "融水", "柳城", "合浦", "横县", "北海", "罗城", "合山", "宾阳", "忻城", "宜山", "钦州", "上林", "邕宁", "防城", "南宁", "武鸣", "环江", "马山", "都安", "河池", "上思", "扶绥", "隆安", "平果", "南丹", "崇左", "东兰", "巴马", "大新", "天峨", "天等", "田东", "宁明", "凤山", "田阳", "龙州", "凭祥", "百色", "德保", "乐业", "凌云", "靖西", "田林", "那坡", "隆林", "西林", "横州", "阳朔", "苍梧", "东兴", "兴业", "大化瑶族自治", "武宣"],
  "甘肃省": ["庄宁", "合水", "华池", "宁县", "庆阳", "灵台", "泾川", "环县", "镇源", "崇信", "平凉", "华亭", "两当", "张家川", "清水", "徽县", "庄浪", "静宁", "成县", "秦安", "天水", "康县", "甘谷", "西和", "通渭", "礼县", "会宁", "武都", "武山", "景远", "文县", "陇西", "定西", "顺县", "宕昌", "舟曲", "渭源", "榆中", "景泰", "岷县", "皋兰", "临洮", "兰州", "康乐", "广河", "卓尼", "东乡", "临潭", "永靖", "和政", "永登", "迭部", "临夏", "民勤", "古浪", "积石山", "天祝", "武威", "碌曲", "下河", "玛曲", "永昌", "山丹", "民乐", "张掖", "临泽", "高台", "肃南", "金塔", "酒泉", "玉门", "安西", "肃北", "敦煌", "阿克塞", "瓜州", "庆城", "正宁", "镇原", "合作", "夏河"],
  "青海省": ["民和", "循化", "乐都", "化隆", "平安", "同仁", "尖扎", "互助", "西宁", "大通", "河南", "门源", "湟中", "泽库", "贵德", "久治", "湟源", "海晏", "贵南", "班玛", "同德", "共和", "玛沁", "祁连", "刚察", "兴海", "甘德", "达日", "天峻", "乌兰", "玛多", "都兰", "称多", "玉树", "囊谦", "治多", "曲麻菜", "杂多", "格尔木", "德令哈", "茫崖市", "大柴旦"],
  "宁夏回族自治区": ["盐池", "陶乐", "平罗", "石嘴山", "贺兰", "灵武", "泾源", "固原", "银川", "永宁", "吴忠", "隆德", "青铜峡", "同心", "西吉", "中宁", "海原", "中卫", "彭阳"],
  "海南省": ["文昌", "琼海", "万宁", "海口", "琼山", "定安", "屯昌", "陵水", "澄迈", "琼中", "保亭", "临高", "儋县", "崖县", "白沙", "三亚", "乐东", "昌江", "东方", "西沙群岛", "南沙群岛", "中沙群岛的岛礁及其海域", "那大", "和庆", "南丰", "大成", "雅星", "兰洋", "光村", "木棠", "海头", "峨蔓", "王五", "白马井", "中和", "排浦", "东成", "新州", "华南热作学院", "五指山"],
  "陕西省": ["府谷", "商南", "吴堡", "神木", "佳县", "韩城", "丹凤", "潼关", "绥德", "米脂", "延川", "清涧", "洛南", "宜川", "合阳", "华阴", "白河", "子洲", "延长", "商县", "人荔", "成城", "山阳", "黄龙", "华县", "榆林", "子长", "白水", "蒲城", "镇坪", "渭南", "延安", "洛川", "甘泉", "平利", "富县", "旬阳", "安寨", "蓝田", "横山", "黄陵", "临潼", "富平", "镇安", "柞水", "铜川", "宜君", "高陵", "安康", "耀县", "长安", "西安", "三原", "岚皋", "泾阳", "靖边", "志丹", "咸阳", "户县", "淳化", "紫阳", "汉阴", "兴平", "礼泉", "旬邑", "宁陕", "石泉", "乾县", "武功", "吴旗", "周至", "永寿", "彬县", "汉中", "佛坪", "镇巴", "扶风", "长武", "麟游", "西乡", "眉县", "岐山", "定边", "洋县", "凤翔", "城固", "太白", "宝鸡", "千阳", "留坝", "南郑", "陇县", "勉县", "凤县", "宁强", "略阳", "彬州", "大荔", "澄城", "吴起"]
};

const FOCUS_AREAS = [
  { id: '整体人生', label: '天命格局' }, { id: '事业发展', label: '青云之路' }, 
  { id: '感情婚姻', label: '红鸾星动' }, { id: '财运规划', label: '金盈利禄' }, 
  { id: '流年运势', label: '岁时轮转' },
];

const LOADING_TEXTS = [
  "校准时空位标...", 
  "链接玄图底层...", 
  "检索命理数据...", 
  "三大专家会诊中...",
  "首席监稿官整合中...",
  "天机解算中..."
];

// --- 视觉组件：太初星历仪 ---
const StarInstrument = () => (
  <div className="relative w-full max-w-lg aspect-square flex items-center justify-center scale-90 lg:scale-100">
    <div className="absolute inset-0 border border-white/[0.05] rounded-full" />
    <div className="absolute inset-6 border border-white/[0.03] rounded-full animate-[spin_60s_linear_infinite]" />
    <div className="relative w-[80%] h-[80%] flex items-center justify-center animate-[spin_120s_linear_infinite]">
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <circle cx="200" cy="200" r="180" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="4 4" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
          <g key={deg} transform={`rotate(${deg} 200 200)`}>
            <line x1="200" y1="20" x2="200" y2="40" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
            <text x="200" y="15" fill="white" fillOpacity="0.1" fontSize="8" textAnchor="middle" fontFamily="monospace">{deg}°</text>
          </g>
        ))}
        <g className="animate-[pulse_4s_infinite]">
          <path d="M200,80 L210,200 L190,200 Z" fill="white" fillOpacity="0.6" />
          <circle cx="200" cy="200" r="8" fill="#050505" stroke="white" strokeWidth="2" strokeOpacity="0.8" />
          <circle cx="200" cy="200" r="3" fill="white" />
        </g>
      </svg>
    </div>
  </div>
);

// --- 判词精准渲染引擎 ---
const DestinyFormatter = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n').filter(l => l.trim() !== '');

  const renderLine = (line, idx) => {
    // 1. 识别模块标题 ###
    if (line.startsWith('###')) {
      return (
        <div key={idx} className="relative py-6 mt-12 mb-8 group">
          <div className="absolute top-0 left-0 w-16 h-1.5 bg-red-900 group-hover:w-full transition-all duration-1000" />
          <h3 className="text-4xl font-black tracking-tighter text-neutral-900 uppercase leading-tight">
            {line.replace(/###/g, '').trim()}
          </h3>
        </div>
      );
    }
    // 2. 识别专业剖析块 【 】
    if (line.includes('【') && line.includes('】')) {
       return (
         <h4 key={idx} className="text-xl font-bold text-red-950 flex items-center gap-3 mt-10 mb-6 bg-red-50/50 p-4 border-l-4 border-red-900 shadow-sm">
           {line.trim()}
         </h4>
       );
    }
    // 3. 处理加粗重点 **文字**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const content = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-neutral-950 font-black px-1.5 py-0.5 bg-yellow-100/60 rounded-sm mx-0.5">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return <p key={idx} className="text-lg text-justify leading-[2.6] text-neutral-800 opacity-90 indent-[2.3em] mb-8 whitespace-pre-wrap">{content}</p>;
  };

  return <div className="report-content-flow animate-in fade-in duration-1000">{lines.map((l, i) => renderLine(l, i))}</div>;
};

export default function App() {
  const [view, setView] = useState('input');
  const [loading, setLoading] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '', gender: '坤 (女)', birth_date: '', birth_time: '',
    province: '北京市', city: '北京', focus_area: '整体人生'
  });

  // 历史记录深度加载
  useEffect(() => {
    const saved = localStorage.getItem('xt_history_v_final_ultra');
    if (saved) setHistoryList(JSON.parse(saved));
  }, []);

  // 加载动画轮播逻辑
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => {
        setLoadingIdx(prev => (prev + 1) % LOADING_TEXTS.length);
      }, 2500);
    } else {
      setLoadingIdx(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen, chatLoading]);

  const saveToHistory = (data, currentForm) => {
    const record = { 
        id: Date.now(), 
        time: new Date().toLocaleString(), 
        formData: {...currentForm}, 
        result: data 
    };
    const newList = [record, ...historyList].slice(0, 10);
    setHistoryList(newList);
    localStorage.setItem('xt_history_v_final_ultra', JSON.stringify(newList));
  };

  const deleteHistory = (e, id) => {
    e.stopPropagation();
    const filtered = historyList.filter(h => h.id !== id);
    setHistoryList(filtered);
    localStorage.setItem('xt_history_v_final_ultra', JSON.stringify(filtered));
  };

  const loadHistory = (h) => {
    setResult(h.result);
    setFormData(h.formData);
    setMessages([{ role: 'model', content: `卷轴重开。针对这份此前由“首席监稿官”整合的报告，您想进一步深挖哪些细节？` }]);
    setView('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // 2. 核心网络请求：主分析接口
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const dateParts = formData.birth_date.split('-');
      const timeParts = formData.birth_time.split(':');
      const payload = {
        ...formData,
        year: parseInt(dateParts[0]), month: parseInt(dateParts[1]), day: parseInt(dateParts[2]),
        hours: parseInt(timeParts[0]), minute: parseInt(timeParts[1])
      };
      
      // 使用动态的环境变量 API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/analyze_pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
      saveToHistory(data, formData);
      setMessages([{ role: 'model', content: `报告已整合完毕。您可以在此针对报告中的“时空指引”、“性格深耕”或“能量画像”细节具体追问。` }]);
      setView('result');
    } catch (err) {
      console.error("API Call Failed:", err);
      setError("天机解算受阻，请确保后端服务正常开启，并检查网络连接。");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. 核心网络请求：茶寮追问接口
  // ==========================================
  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      // 使用动态的环境变量 API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/chat_pro`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg, history: messages,
          raw_data: result.raw_data || {}, report_context: result.report
        }),
      });
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err) {
      console.error("Chat API Call Failed:", err);
      setMessages(prev => [...prev, { role: 'model', content: "信号受扰，请稍后再试或检查后端服务。" }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-serif transition-all duration-1000 ${view === 'input' ? 'bg-[#050505] text-stone-300' : 'bg-[#f8f7f2] text-stone-900'}`}>
      {/* 极简网格背景 */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px'}} />

      {/* --- 第一幕：输入界面 --- */}
      {view === 'input' && (
        <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex flex-col lg:flex-row items-center px-10 py-16 gap-16">
          <div className="w-full lg:w-[45%] space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000">
            <header className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 flex items-center justify-center border border-white/10 rotate-45"><Activity size={24} className="text-white -rotate-45" /></div>
                <h1 className="text-5xl font-black tracking-[0.5em] text-white uppercase">玄图</h1>
              </div>
              <p className="text-[10px] text-white/20 tracking-[1em] uppercase pl-20 font-mono italic">AI Metaphysics Intelligence Lab</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
               <div className="grid grid-cols-2 gap-10 border-b border-white/5 pb-10">
                  <div className="border-b border-white/10 pb-2 focus-within:border-white/40 transition-all">
                    <label className="text-[8px] text-white/20 tracking-widest block mb-1 uppercase font-mono">Subject Name</label>
                    <input type="text" required placeholder="归海客" className="bg-transparent w-full outline-none text-xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="border-b border-white/10 pb-2">
                    <label className="text-[8px] text-white/20 tracking-widest block mb-1 uppercase font-mono">Gender</label>
                    <select className="bg-transparent w-full outline-none text-xl font-bold appearance-none cursor-pointer" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                        <option className="bg-black text-white">坤 (女)</option>
                        <option className="bg-black text-white">乾 (男)</option>
                    </select>
                  </div>
                  <div className="col-span-2 border-b border-white/10 pb-2">
                    <label className="text-[8px] text-white/20 tracking-widest block mb-1 uppercase font-mono">Time Origin</label>
                    <div className="flex gap-6">
                        <input type="date" required className="bg-transparent flex-1 outline-none text-xl invert opacity-60" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
                        <input type="time" required className="bg-transparent w-32 outline-none text-xl invert opacity-60" value={formData.birth_time} onChange={e => setFormData({...formData, birth_time: e.target.value})} />
                    </div>
                  </div>
                  <div className="col-span-2 border-b border-white/10 pb-2">
                    <label className="text-[8px] text-white/20 tracking-widest block mb-1 uppercase font-mono">Space Origin</label>
                    <div className="flex gap-6">
                      <select className="bg-transparent flex-1 outline-none text-xl font-bold appearance-none" value={formData.province} onChange={e => {
                          const newProv = e.target.value;
                          setFormData({...formData, province: newProv, city: PROVINCE_DATA[newProv]?.[0] || ''})
                      }}>
                        {Object.keys(PROVINCE_DATA).map(p => <option key={p} className="bg-black text-white">{p}</option>)}
                      </select>
                      <select className="bg-transparent flex-1 outline-none text-xl font-bold appearance-none" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}>
                        {PROVINCE_DATA[formData.province]?.map(c => <option key={c} className="bg-black text-white">{c}</option>)}
                      </select>
                    </div>
                  </div>
               </div>
               
               <button type="submit" disabled={loading} className="w-full h-24 bg-white text-black font-black text-xl tracking-[1em] hover:bg-stone-200 transition-all flex items-center justify-center gap-4 group active:scale-[0.98]">
                {loading ? <LoaderCircle className="animate-spin" /> : <Fingerprint className="group-hover:scale-110 transition-transform" />}
                {loading ? LOADING_TEXTS[loadingIdx] : "初始化生命解析"}
              </button>
              {error && <div className="text-red-500 text-[10px] text-center tracking-widest font-mono uppercase font-bold">{error}</div>}
            </form>

            {/* 历史记录列表 */}
            {historyList.length > 0 && (
                <div className="space-y-4 pt-8 animate-in fade-in duration-1000">
                    <div className="flex items-center gap-4 text-[10px] text-white/10 tracking-[1em] uppercase font-bold"><History size={12}/> 历往卷轴</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {historyList.map(h => (
                            <div key={h.id} onClick={() => loadHistory(h)} className="p-4 border border-white/5 bg-white/[0.01] hover:bg-white/5 cursor-pointer flex justify-between items-center transition-all group">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-white/30 group-hover:text-white/80 transition-colors uppercase">{h.formData.name} / {h.formData.focus_area.slice(0,2)}</span>
                                    <span className="text-[8px] text-white/10 font-mono italic mt-1">{h.time}</span>
                                </div>
                                <button onClick={(e) => deleteHistory(e, h.id)} className="p-2 opacity-0 group-hover:opacity-30 hover:!opacity-100 transition-all text-white">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
          <div className="lg:w-[55%] flex justify-center animate-in fade-in zoom-in duration-1000"><StarInstrument /></div>
        </div>
      )}

      {/* --- 第二幕：报告界面 --- */}
      {view === 'result' && result && (
        <div className="relative z-10 animate-in fade-in duration-1000">
          <nav className="fixed top-0 inset-x-0 h-20 px-10 flex items-center justify-between bg-white/70 backdrop-blur-3xl border-b border-black/5 z-[100] print:hidden">
            <button onClick={() => setView('input')} className="flex items-center gap-2 text-neutral-400 hover:text-black transition-colors font-black uppercase text-[10px] tracking-[0.2em]">
              <ChevronLeft size={16} /> Close Record
            </button>
            <div className="flex items-center gap-8">
              <button onClick={() => window.print()} className="p-3 hover:bg-black/5 rounded-full transition-all text-stone-400 hover:text-black"><Printer size={18}/></button>
              <div className="h-8 w-px bg-black/10" />
              <button onClick={() => setChatOpen(true)} className="flex items-center gap-3 px-8 py-3 bg-red-950 text-white shadow-2xl hover:bg-black transition-all font-black text-[10px] tracking-[0.3em] uppercase">
                <MessageSquareText size={16} /> Consultation
              </button>
            </div>
          </nav>

          <main className="max-w-5xl mx-auto pt-40 pb-48 px-12">
            <header className="border-b-4 border-neutral-900 pb-12 mb-20 flex justify-between items-end">
                <div className="space-y-4">
                  <div className="text-red-900 font-black tracking-[1em] text-[10px] uppercase">Official Archive Integration</div>
                  <h2 className="text-7xl font-black italic tracking-tighter uppercase leading-tight">宿命判词整合版</h2>
                </div>
                <div className="text-right">
                    <div className="text-[8px] font-mono text-neutral-300 tracking-widest uppercase mb-1">Xuan Tu Lab Principal</div>
                    <div className="text-5xl font-black italic opacity-5 select-none tracking-tighter">CONFIDENTIAL</div>
                </div>
            </header>

            <div className="grid grid-cols-4 gap-12 mb-20 animate-in fade-in duration-1000 delay-300">
              <div className="space-y-2">
                <p className="text-[8px] text-neutral-300 font-black tracking-widest uppercase">Subject</p>
                <p className="text-2xl font-black">{formData.name}</p>
              </div>
              <div className="space-y-2 border-l border-black/5 pl-8">
                <p className="text-[8px] text-neutral-300 font-black tracking-widest uppercase">Dimension</p>
                <p className="text-2xl font-black">{formData.focus_area}</p>
              </div>
              <div className="space-y-2 border-l border-black/5 pl-8">
                <p className="text-[8px] text-neutral-300 font-black tracking-widest uppercase">Engine</p>
                <p className="text-2xl font-black">Flash 3.1 Pro</p>
              </div>
              <div className="space-y-2 border-l border-black/5 pl-8">
                <p className="text-[8px] text-neutral-300 font-black tracking-widest uppercase">Timestamp</p>
                <p className="text-2xl font-black">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <article className="border border-black/[0.08] p-20 shadow-2xl bg-white relative overflow-hidden">
              <div className="absolute top-20 right-10 text-[18rem] font-black text-black/[0.01] select-none pointer-events-none -rotate-6 uppercase">Archive</div>
              
              {/* 首字下沉 */}
              <span className="text-[180px] font-black text-red-900 leading-[0.7] float-left mr-16 select-none drop-shadow-sm">{result.report.trim().charAt(0)}</span>
              <DestinyFormatter text={result.report.trim().slice(1)} />
              
              <div className="mt-48 flex justify-between items-end border-t-2 border-black/5 pt-12">
                <div className="space-y-1">
                    <div className="text-[8px] font-mono text-neutral-300 uppercase tracking-widest">Authorized Signature</div>
                    <div className="text-sm font-black italic tracking-widest uppercase">Xuan Tu Intelligence Protocol</div>
                </div>
                <div className="w-44 h-44 border-4 border-red-900/20 p-2 flex items-center justify-center rotate-3">
                  <div className="w-full h-full border border-red-900/10 flex items-center justify-center text-red-900 font-black text-center text-[10px] leading-relaxed tracking-widest uppercase">
                    玄图实验室<br/>首席监稿官<br/>核准留存
                  </div>
                </div>
              </div>
            </article>
          </main>

          {/* 深夜茶寮：侧滑式全屏对话 */}
          <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[190] transition-opacity duration-500 ${chatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setChatOpen(false)} />
          <aside className={`fixed inset-y-0 right-0 w-full lg:w-[600px] bg-white shadow-2xl z-[200] transform transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-8 bg-red-950 text-white flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-red-500/30 flex items-center justify-center"><MessageSquareText size={18} className="text-red-500" /></div>
                <div><span className="font-black text-xs tracking-[0.3em] uppercase block">Consultation Room</span><span className="text-[8px] text-red-500/50 uppercase tracking-widest font-mono font-bold">Neural Link Active</span></div>
              </div>
              <button onClick={() => setChatOpen(false)} className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-all border border-white/5"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 bg-[#fdfbf7] space-y-10 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[90%] p-6 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-none border border-black' : 'bg-white text-stone-800 border border-black/[0.08] relative'}`}>
                    {msg.role === 'model' && <div className="absolute top-0 left-0 w-1.5 h-full bg-red-900" />}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && <div className="px-6 py-4 bg-white border border-black/[0.05] text-[10px] text-stone-400 animate-pulse tracking-[0.2em] uppercase font-mono italic">Computing Neural Synthesis...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-8 border-t border-black/5 bg-white">
               <div className="flex gap-4">
                  <input type="text" placeholder="向首席监稿官具体追问细节..." className="flex-1 bg-stone-100 p-5 outline-none text-sm border border-transparent focus:border-red-900/20 transition-all font-serif" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                  <button onClick={handleSendMessage} disabled={chatLoading || !chatInput.trim()} className="w-16 h-16 bg-red-950 text-white flex items-center justify-center hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-20"><Send size={20} /></button>
               </div>
               <p className="mt-4 text-[8px] text-stone-300 font-mono uppercase tracking-widest text-center">Session encrypted & processed via Flash 3.1</p>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        @import url('https://gs.jurieo.com/gemini/fonts-googleapis/css2?family=Noto+Serif+SC:wght@400;700;900&display=swap');
        body { font-family: 'Noto Serif SC', serif; margin: 0; overflow-x: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e5e5; }
        @media print { .print\\:hidden { display: none !important; } body { background: white !important; } main { width: 100% !important; max-width: 100% !important; margin: 0 !important; } }
      `}</style>
    </div>
  );
}