/* ============================================
 * 六爻装卦引擎 liuyao.js
 * 输入：6爻数值(6老阴 7少阳 8少阴 9老阳，自下而上) + 日柱干支
 * 输出：卦名/六亲/世应/六神/动爻/变卦
 * 体系：京房纳甲（《增删卜易》传统体系）
 * ============================================ */

const LY_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const LY_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ZHI_WUXING = ['水','土','木','木','土','火','火','土','金','金','土','水'];
const ZHI_YINYANG = ['阴','阴','阳','阴','阳','阳','阴','阴','阳','阴','阳','阳']; // 子丑寅卯辰巳午未申酉戌亥

/* 纳甲表：卦 → [内卦三爻地支(自下而上), 外卦三爻地支] */
const NAJIA = {
  '乾': [['子','寅','辰'],['午','申','戌']],
  '坤': [['未','巳','卯'],['丑','亥','酉']],
  '震': [['子','寅','辰'],['午','申','戌']],
  '巽': [['丑','亥','酉'],['未','巳','卯']],
  '坎': [['寅','辰','午'],['申','戌','子']],
  '离': [['卯','丑','亥'],['酉','未','巳']],
  '艮': [['辰','午','申'],['戌','子','寅']],
  '兑': [['巳','卯','丑'],['亥','酉','未']],
};

/* 八宫卦表：每宫8卦（本宫、一世..五世、游魂、归魂） */
const GONG_8 = [
  ['乾为天','天风姤','天山遁','天地否','风地观','山地剥','火地晋','火天大有'], //乾宫
  ['坎为水','水泽节','水雷屯','水火既济','泽火革','雷火丰','地火明夷','地水师'], //坎宫
  ['艮为山','山火贲','山天大畜','山泽损','火泽睽','天泽履','风泽中孚','风山渐'], //艮宫
  ['震为雷','雷地豫','雷水解','雷风恒','地风升','水风井','泽风大过','泽雷随'], //震宫
  ['巽为风','风天小畜','风火家人','风雷益','天雷无妄','火雷噬嗑','山雷颐','山风蛊'], //巽宫
  ['离为火','火山旅','火风鼎','火水未济','山水蒙','风水涣','天水讼','天火同人'], //离宫
  ['坤为地','地雷复','地泽临','地天泰','雷天大壮','泽天夬','水天需','水地比'], //坤宫
  ['兑为泽','泽水困','泽地萃','泽山咸','水山蹇','地山谦','雷山小过','雷泽归妹'], //兑宫
];

/* 八卦编码：三爻二进制（bit0=初爻，从下到上）
   乾111=7 兑011=3 离101=5 震001=1 巽110=6 坎010=2 艮100=4 坤000=0 */
const BA_GUA_NAME = { 7:'乾', 3:'兑', 5:'离', 1:'震', 6:'巽', 2:'坎', 4:'艮', 0:'坤' };
/* 编码 → 64卦表索引（表顺序：坤艮坎巽震离兑乾） */
const CODE_TO_IDX = { 0:0, 4:1, 2:2, 6:3, 1:4, 5:5, 3:6, 7:7 };

/* 64卦表：行=下卦 列=上卦（坤艮坎巽震离兑乾） */
const GUA_64 = [
  ['坤为地','山地剥','水地比','风地观','雷地豫','火地晋','泽地萃','天地否'],
  ['地山谦','艮为山','水山蹇','风山渐','雷山小过','火山旅','泽山咸','天山遁'],
  ['地水师','山水蒙','坎为水','风水涣','雷水解','火水未济','泽水困','天水讼'],
  ['地风升','山风蛊','水风井','巽为风','雷风恒','火风鼎','泽风大过','天风姤'],
  ['地雷复','山雷颐','水雷屯','风雷益','震为雷','火雷噬嗑','泽雷随','天雷无妄'],
  ['地火明夷','山火贲','水火既济','风火家人','雷火丰','离为火','泽火革','天火同人'],
  ['地泽临','山泽损','水泽节','风泽中孚','雷泽归妹','火泽睽','兑为泽','天泽履'],
  ['地天泰','山天大畜','水天需','风天小畜','雷天大壮','火天大有','泽天夬','乾为天'],
];

/* 六神：按日干起（甲乙青龙 丙丁朱雀 戊勾陈 己腾蛇 庚辛白虎 壬癸玄武），自初爻往上 */
const LIUSHEN = ['青龙','朱雀','勾陈','腾蛇','白虎','玄武'];
function liuShenOf(dayGanIdx) {
  const starts = { 0:0, 1:0, 2:1, 3:1, 4:2, 5:3, 6:4, 7:4, 8:5, 9:5 };
  const s = starts[dayGanIdx];
  return [0,1,2,3,4,5].map(i => LIUSHEN[(s + i) % 6]);
}

/* 装卦主函数：coins=[6|7|8|9] 自下而上；dayGan/dayZhi 为日柱干支索引 */
function zhuangGua(coins, dayGanIdx, dayZhiIdx) {
  if (!coins || coins.length !== 6) throw new Error('需要 6 个爻');
  // 上下卦编码
  const lowCode = ((coins[0] === 7 || coins[0] === 9 ? 1 : 0)) |
                  ((coins[1] === 7 || coins[1] === 9 ? 1 : 0) << 1) |
                  ((coins[2] === 7 || coins[2] === 9 ? 1 : 0) << 2);
  const highCode = ((coins[3] === 7 || coins[3] === 9 ? 1 : 0)) |
                   ((coins[4] === 7 || coins[4] === 9 ? 1 : 0) << 1) |
                   ((coins[5] === 7 || coins[5] === 9 ? 1 : 0) << 2);
  const lowName = BA_GUA_NAME[lowCode];
  const highName = BA_GUA_NAME[highCode];
  const guaNameFull = GUA_64[CODE_TO_IDX[lowCode]][CODE_TO_IDX[highCode]];

  // 找八宫位置（世应）
  let gong = 0, pos = -1;
  for (let g = 0; g < 8; g++) {
    const idx = GONG_8[g].indexOf(guaNameFull);
    if (idx >= 0) { gong = g; pos = idx; break; }
  }
  let shi = 6, ying = 3;
  if (pos >= 0) {
    if (pos === 0) shi = 6;
    else if (pos === 6) shi = 4;
    else if (pos === 7) shi = 3;
    else shi = pos;
    ying = shi + 3 > 6 ? shi - 3 : shi + 3;
  }
  const gongName = GONG_8[gong][0].slice(0, 1) + '宫'; // 如"乾宫"

  // 纳甲装地支 + 六亲（六爻六亲不分正偏：父母/兄弟/子孙/妻财/官鬼）
  const dayGanWX = Math.floor(dayGanIdx / 2); // 0木1火2土3金4水
  const zhis = [...NAJIA[highName][0], ...NAJIA[highName][1]]; // 从初爻到上爻
  const liuShen = liuShenOf(dayGanIdx);
  const lines = [];
  for (let i = 0; i < 6; i++) {
    const zhi = LY_ZHI.indexOf(zhis[i]);
    const zhiWX = ZHI_WUXING[zhi];
    const wxIdx = ['木','火','土','金','水'].indexOf(zhiWX);
    // 六亲：生我=父母 我生=子孙 克我=官鬼 我克=妻财 同我=兄弟
    let qin = '';
    if (wxIdx === dayGanWX) qin = '兄弟';
    else if ((dayGanWX + 1) % 5 === wxIdx) qin = '子孙';      // 我生
    else if ((dayGanWX + 4) % 5 === wxIdx) qin = '父母';      // 生我
    else if ((dayGanWX + 2) % 5 === wxIdx) qin = '妻财';      // 我克
    else qin = '官鬼';                                        // 克我
    const bian = (coins[i] === 6 || coins[i] === 9);
    lines.push({
      idx: i + 1,
      zhi: zhis[i],
      qin,
      shi: (i + 1) === shi,
      ying: (i + 1) === ying,
      liuShen: liuShen[i],
      bian,
      val: coins[i],
    });
  }

  // 变卦
  let bianGuaName = null;
  if (coins.some(c => c === 6 || c === 9)) {
    const b = v => {
      const isYang = (v === 7 || v === 9);
      return (v === 6 || v === 9) ? (1 - isYang) : isYang;
    };
    const lc = b(coins[0]) | (b(coins[1]) << 1) | (b(coins[2]) << 2);
    const hc = b(coins[3]) | (b(coins[4]) << 1) | (b(coins[5]) << 2);
    bianGuaName = GUA_64[CODE_TO_IDX[lc]][CODE_TO_IDX[hc]];
  }

  return { guaName: guaNameFull, gongName, shi, ying, lines, bianGuaName, lowName, highName };
}

/* 用神选取（按问题类型） */
function yongShenFor(questionType, dayGanIdx) {
  const map = {
    '感情': '官鬼',       // 女测婚看官鬼（男测看妻财，简化按官鬼/妻财都给）
    '事业': '官鬼',
    '财运': '妻财',
    '学业': '父母',
    '健康': '子孙',
    '出行': '子孙',
    '其他': '世爻',
  };
  return map[questionType] || '世爻';
}
