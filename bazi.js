/* ============================================
 * 八字排盘引擎 bazi.js
 * 农历转换(1900-2049) + 节气 + 四柱 + 十神 + 藏干 + 纳音 + 大运 + 流年
 * 算法：经典万年历算法（公历基准 1900-01-01 甲戌日）
 * ============================================ */

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const WUXING_GAN = ['木','木','火','火','土','土','金','金','水','水'];
const WUXING_ZHI = ['水','土','木','木','土','火','火','土','金','金','土','水'];

/* ---------- 农历数据 1900-2049 ---------- */
const lunarInfo = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2, //1900-1909
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977, //1910-1919
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970, //1920-1929
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950, //1930-1939
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557, //1940-1949
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0, //1950-1959
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0, //1960-1969
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6, //1970-1979
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570, //1980-1989
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0, //1990-1999
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5, //2000-2009
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930, //2010-2019
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530, //2020-2029
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45, //2030-2039
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0, //2040-2049
];
const GANZHI60 = (() => {
  const a = [];
  for (let i = 0; i < 60; i++) a.push(GAN[i % 10] + ZHI[i % 12]);
  return a;
})();
const NAYIN = [
  '海中金','炉中火','大林木','路旁土','剑锋金','山头火','涧下水','城头土','白蜡金','杨柳木',
  '泉中水','屋上土','霹雳火','松柏木','长流水','沙中金','山下火','平地木','壁上土','金箔金',
  '覆灯火','天河水','大驿土','钗钏金','桑柘木','大溪水','沙中土','天上火','石榴木','大海水',
];
const CANG_GAN = [
  ['癸'],['己','癸','辛'],['甲','丙','戊'],['乙'],['戊','乙','癸'],['丙','戊','庚'],
  ['丁','己'],['己','丁','乙'],['庚','壬','戊'],['辛'],['戊','辛','丁'],['壬','甲'],
];
/* 天干十神：行=日干 列=其他天干（甲乙丙丁戊己庚辛壬癸） */
const SHISHEN = [
  ['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'], //甲
  ['劫财','比肩','伤官','食神','正财','偏财','正官','七杀','正印','偏印'], //乙
  ['偏印','正印','比肩','劫财','食神','伤官','偏财','正财','七杀','正官'], //丙
  ['正印','偏印','劫财','比肩','伤官','食神','正财','偏财','正官','七杀'], //丁
  ['七杀','正官','偏印','正印','比肩','劫财','食神','伤官','偏财','正财'], //戊
  ['正官','七杀','正印','偏印','劫财','比肩','伤官','食神','正财','偏财'], //己
  ['偏财','正财','七杀','正官','偏印','正印','比肩','劫财','食神','伤官'], //庚
  ['正财','偏财','正官','七杀','正印','偏印','劫财','比肩','伤官','食神'], //辛
  ['食神','伤官','偏财','正财','七杀','正官','偏印','正印','比肩','劫财'], //壬
  ['伤官','食神','正财','偏财','正官','七杀','正印','偏印','劫财','比肩'], //癸
];
/* 节气表（经典算法）：n=0小寒 1大寒 2立春 3雨水 4惊蛰 5春分 6清明 7谷雨 8立夏 9小满 10芒种 11夏至 12小暑 13大暑 14立秋 15处暑 16白露 17秋分 18寒露 19霜降 20立冬 21小雪 22大雪 23冬至 */
const sTermInfo = [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758];
const JIE_NAMES = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];

function sTerm(y, n) {
  // 返回当年第 n 个节气的 {month, day}
  const offDate = new Date((31556925974.7 * (y - 1900) + sTermInfo[n] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
  return { month: offDate.getUTCMonth() + 1, day: offDate.getUTCDate() };
}
function lYearDays(y) { let s = 348; for (let i = 0x8000; i > 0x8; i >>= 1) s += (lunarInfo[y - 1900] & i) ? 1 : 0; return s + leapDays(y); }
function leapMonthOf(y) { return lunarInfo[y - 1900] & 0xf; }
function leapDays(y) { return leapMonthOf(y) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function monthDays(y, m) { return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29; }

/* 公历转农历 */
function solarToLunar(y, m, d) {
  let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
  let temp = 0, i;
  for (i = 1900; i < 2050 && offset > 0; i++) { temp = lYearDays(i); offset -= temp; }
  if (offset < 0) { offset += temp; i--; }
  const year = i;
  const leap = leapMonthOf(year);
  let isLeap = false;
  for (i = 1; i < 13 && offset > 0; i++) {
    if (leap > 0 && i === (leap + 1) && !isLeap) { --i; isLeap = true; temp = leapDays(year); }
    else { temp = monthDays(year, i); }
    if (isLeap && i === (leap + 1)) isLeap = false;
    offset -= temp;
  }
  if (offset === 0 && leap > 0 && i === leap + 1) { if (isLeap) isLeap = false; else { isLeap = true; --i; } }
  if (offset < 0) { offset += temp; --i; }
  return { year, month: i, day: offset + 1, isLeap };
}

/* 日柱：天数差 mod 60，基准 1900-01-01 = 甲戌(idx 10) */
function dayGanzhiIndex(y, m, d) {
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000);
  return ((days + 10) % 60 + 60) % 60;
}

/* 年柱：立春为界 */
function yearGanzhiIndex(y, m, d) {
  const lc = sTerm(y, 2); // 立春
  let gzYear = y;
  if (m < lc.month || (m === lc.month && d < lc.day)) gzYear = y - 1;
  return ((gzYear - 4) % 60 + 60) % 60;
}

/* 月柱：12 节为界。立春(寅)惊蛰(卯)清明(辰)立夏(巳)芒种(午)小暑(未)立秋(申)白露(酉)寒露(戌)立冬(亥)大雪(子)小寒(丑) */
function monthPillar(y, m, d, yearGzIdx) {
  // 五虎遁：甲己丙首 乙庚戊头 丙辛庚上 丁壬壬行 戊癸甲求；月序=从寅月起第几月（寅0卯1...丑11）
  const firstMonthGan = ((yearGzIdx % 10) % 5) * 2 + 2;
  const monthGanOf = mz => (firstMonthGan + (mz - 2 + 12) % 12) % 10;
  const J = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // 立春→大雪（公历2/4~12/7）
  // 小寒前（1月初）→ 上一年丑月
  const xh = sTerm(y, 0);
  if (m < xh.month || (m === xh.month && d < xh.day)) {
    return { gan: monthGanOf(1), zhi: 1, jie: '上一年小寒（约' + (y - 1) + '年1月6日）前' };
  }
  let last = -1;
  for (let k = 0; k < 11; k++) {
    const t = sTerm(y, J[k]);
    if (m > t.month || (m === t.month && d >= t.day)) last = k;
  }
  if (last >= 0) {
    const monthZhi = (last + 2) % 12; // 立春=寅(2) 大雪=子(0)
    const t = sTerm(y, J[last]);
    return { gan: monthGanOf(monthZhi), zhi: monthZhi, jie: t.month + '月' + t.day + '日' };
  }
  // 小寒后（丑月）
  return { gan: monthGanOf(1), zhi: 1, jie: xh.month + '月' + xh.day + '日' };
}

/* 时柱：五鼠遁 */
function hourPillar(dayGan, hour) {
  let zhi = Math.floor((hour + 1) / 2) % 12;
  const gan = ((dayGan % 5) * 2 + zhi) % 10;
  return { gan, zhi };
}

/* ============ 真太阳时校正（盲派历法） ============
 * 输入北京时间（钟表时）→ 按出生地经度 + 均时差校正为真太阳时
 * 公式：地方平太阳时 = 北京时 + (经度-120°)*4分钟；真太阳时 = 地方平太阳时 + 均时差
 */
function equationOfTime(y, m, d) {
  const start = Date.UTC(y, 0, 1);
  const N = Math.round((Date.UTC(y, m - 1, d) - start) / 86400000) + 1;
  const B = (2 * Math.PI * (N - 81)) / 364;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // 分钟
}
/* 校正出生钟表时间 → 真太阳时(小时,浮点)。返回 {solar, shiftDays}
 * solar>=23 → 日柱进一日（子初换日）；<0 → 前一日 */
function trueSolarHour(y, m, d, hour, minute, lngE) {
  const lng = (typeof lngE === 'number' && isFinite(lngE)) ? lngE : 120;
  const min = (typeof minute === 'number' && isFinite(minute)) ? minute : 30;
  const localMean = hour + min / 60 + (lng - 120) * 4 / 60; // 地方平太阳时
  let solar = localMean + equationOfTime(y, m, d) / 60;     // + 均时差 = 真太阳时
  let shiftDays = 0;
  if (solar >= 24) { solar -= 24; shiftDays = 1; }
  else if (solar < 0) { solar += 24; shiftDays = -1; }
  if (solar >= 23) shiftDays = 1; // 晚子时 23 点后日柱按次日
  return { solar, shiftDays };
}

/* 盲派交运时刻（换运时间各不同，生年纳音来确定） */
const JIAOYUN_BY_WUXING = {
  '金': '金命交运处暑日，处暑当日申时整',
  '木': '木命交运在大寒，大寒当日寅时中',
  '水': '水命交运冬至前，之前三天亥时定',
  '火': '火命交运清明前，之前三天午时中',
  '土': '土命交运芒种后，之后九天辰时定',
};
function jiaoYunText(nayinName) {
  if (!nayinName) return '';
  const wx = nayinName.slice(-1); // 纳音末字即五行（屋上土→土）
  return JIAOYUN_BY_WUXING[wx] || '';
}

/* 大运：阳年男/阴年女顺排，从月柱起；起运=出生到最近节天数÷3 */
function dayun(y, m, d, hour, gender, yearGzIdx, monthGan, monthZhi) {
  const yang = yearGzIdx % 2 === 0; // 甲丙戊庚壬=阳
  const shun = (yang && gender === 'male') || (!yang && gender === 'female');
  const J = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  const birth = Date.UTC(y, m - 1, d, hour);
  let targetMs = null;
  if (shun) {
    // 下一个节：当年立春→大雪，均在前则次年小寒
    let found = false;
    for (let k = 0; k < 11; k++) {
      const t = sTerm(y, J[k]);
      const tm = Date.UTC(y, t.month - 1, t.day, 2);
      if (tm > birth) { targetMs = tm; found = true; break; }
    }
    if (!found) {
      const t = sTerm(y + 1, 0); // 次年小寒
      targetMs = Date.UTC(y + 1, t.month - 1, t.day, 2);
    }
  } else {
    // 上一个节：当年立春→大雪，以及当年小寒
    let lastMs = null;
    for (let k = 0; k < 11; k++) {
      const t = sTerm(y, J[k]);
      const tm = Date.UTC(y, t.month - 1, t.day, 2);
      if (tm <= birth) lastMs = tm;
    }
    const xh = sTerm(y, 0);
    const xhMs = Date.UTC(y, xh.month - 1, xh.day, 2);
    if (xhMs <= birth) lastMs = Math.max(lastMs || 0, xhMs);
    if (lastMs === null) {
      const t = sTerm(y - 1, 0); // 上一年小寒
      lastMs = Date.UTC(y - 1, t.month - 1, t.day, 2);
    }
    targetMs = lastMs;
  }
  const diffDays = Math.abs(targetMs - birth) / 86400000;
  const qiYunYears = Math.floor(diffDays / 3);
  const qiYunMonths = Math.round((diffDays % 3) * 4);
  // 大运干支：月柱起顺/逆推
  const list = [];
  let g = monthGan, z = monthZhi;
  const step = shun ? 1 : -1;
  for (let i = 0; i < 8; i++) {
    g = ((g + step) % 10 + 10) % 10;
    z = ((z + step) % 12 + 12) % 12;
    list.push(GAN[g] + ZHI[z]);
  }
  // 交运虚岁与公历年（与主流专业排盘一致）
  // 实岁起运 = diffDays/3 年（如 5.58 年 ≈ 5年7个月）
  // 交运落在出生后的第 ceil(实岁) 个年头 → 交运公历年 ≈ 出生年 + ceil(diffDays/3)
  //   例：2007-07-22 生，5.58 年后 ≈ 2013-02 → 交运年 2013 = 2007 + 6
  // 虚岁 = 交运公历年 - 出生年 + 1（2007 生 → 2013 年虚岁 7）
  const qyFloat = diffDays / 3;
  const jiaoYunYear = y + Math.ceil(qyFloat - 1e-9);
  const jiaoYunXuSui = jiaoYunYear - y + 1;
  return { shun, qiYunYears, qiYunMonths, list, diffDays: Math.round(diffDays * 10) / 10, jiaoYunXuSui, jiaoYunYear };
}

/* 十神工具 */
function ssGan(dayGanIdx, otherGanIdx) { return SHISHEN[dayGanIdx][otherGanIdx]; }
function ssZhi(dayGanIdx, zhiIdx) {
  // 地支本气五行+阴阳 → 六亲
  const zhiGan = CANG_GAN[zhiIdx][0];
  return ssGan(dayGanIdx, GAN.indexOf(zhiGan));
}
function nayinOf(gzIdx) { return NAYIN[Math.floor(gzIdx / 2)]; }

/* ============ 主函数：排盘 ============
 * paiPan(y, m, d, hour, gender, opt)
 * opt: { minute?: 分钟, lngE?: 东经经度, useSolar?: 是否启用真太阳时校正 }
 *   - 不传 opt 或 opt.useSolar !== true：保持原算法（钟表时间直接排，23点后日柱进一日）
 *   - 启用后：先按出生地经度+均时差校正为真太阳时，再用校正时刻定时辰/换日（盲派历法）
 */
function paiPan(y, m, d, hour, gender, opt) {
  if (y < 1900 || y > 2049) throw new Error('请选择 1900-2049 年之间的出生日期');
  const useSolar = !!(opt && opt.useSolar);
  const minute = (opt && typeof opt.minute === 'number' && isFinite(opt.minute)) ? opt.minute : 0;
  const lngE = (opt && typeof opt.lngE === 'number' && isFinite(opt.lngE)) ? opt.lngE : 120;

  // 校正出生时刻 → 真太阳时
  let solarH = hour, dayShift = 0, solarNote = '';
  if (useSolar) {
    const t = trueSolarHour(y, m, d, hour, minute, lngE);
    solarH = t.solar;
    dayShift = t.shiftDays;
    const corrMin = Math.round((solarH - hour - minute / 60) * 60);
    solarNote = '按出生地东经' + lngE + '°' + (minute ? ' ' + String(minute).padStart(2, '0') + '分' : '') + '真太阳时校正：' + solarHStr(solarH);
  }

  // 排盘用日期（换日：晚子时23点后 / 真太阳时跨日 → 日柱按次日）
  let dayY = y, dayM = m, dayD = d;
  if (useSolar) {
    if (dayShift !== 0) {
      const nd = new Date(Date.UTC(y, m - 1, d + dayShift));
      dayY = nd.getUTCFullYear(); dayM = nd.getUTCMonth() + 1; dayD = nd.getUTCDate();
    }
  } else if (hour >= 23) {
    const nd = new Date(Date.UTC(y, m - 1, d + 1));
    dayY = nd.getUTCFullYear(); dayM = nd.getUTCMonth() + 1; dayD = nd.getUTCDate();
  }
  const dayIdx = dayGanzhiIndex(dayY, dayM, dayD);
  const dayGan = dayIdx % 10, dayZhi = dayIdx % 12;
  const yearIdx = yearGanzhiIndex(dayY, dayM, dayD);
  const yearGan = yearIdx % 10;
  const mp = monthPillar(dayY, dayM, dayD, yearIdx);
  const hp = hourPillar(dayGan, solarH);
  const lunar = solarToLunar(y, m, d);

  const pillars = [
    { name: '年柱', gan: yearIdx % 10, zhi: yearIdx % 12, gz: GANZHI60[yearIdx], nayin: nayinOf(yearIdx), ssGan: ssGan(dayGan, yearIdx % 10), ssZhi: ssZhi(dayGan, yearIdx % 12) },
    { name: '月柱', gan: mp.gan, zhi: mp.zhi, gz: GAN[mp.gan] + ZHI[mp.zhi], nayin: nayinOf((mp.gan * 12 + mp.zhi) % 60), ssGan: ssGan(dayGan, mp.gan), ssZhi: ssZhi(dayGan, mp.zhi) },
    { name: '日柱', gan: dayGan, zhi: dayZhi, gz: GANZHI60[dayIdx], nayin: nayinOf(dayIdx), ssGan: '日主', ssZhi: ssZhi(dayGan, dayZhi) },
    { name: '时柱', gan: hp.gan, zhi: hp.zhi, gz: GAN[hp.gan] + ZHI[hp.zhi], nayin: nayinOf((hp.gan * 12 + hp.zhi) % 60), ssGan: ssGan(dayGan, hp.gan), ssZhi: ssZhi(dayGan, hp.zhi) },
  ];
  const dy = dayun(dayY, dayM, dayD, solarH, gender, yearIdx, mp.gan, mp.zhi);

  // 流年（当前年份，立春界）
  const now = new Date();
  const liuNianIdx = yearGanzhiIndex(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const lnGan = liuNianIdx % 10, lnZhi = liuNianIdx % 12;
  const liuNian = {
    gz: GANZHI60[liuNianIdx],
    ssGan: ssGan(dayGan, lnGan),
    ssZhi: ssZhi(dayGan, lnZhi),
    year: now.getFullYear(),
  };

  return {
    solar: `${y}年${m}月${d}日 ${String(hour).padStart(2, '0')}时`,
    solarNote,
    lunar: `农历${lunar.year}年${lunar.isLeap ? '闰' : ''}${lunar.month}月${lunar.day}日`,
    gender: gender === 'male' ? '男' : '女',
    dayMaster: GAN[dayGan],
    dayMasterWuxing: WUXING_GAN[dayGan],
    dayZhi,
    pillars,
    dayun: dy,
    liuNian,
    hourZhiName: ZHI[hp.zhi],
  };
}

/* 真太阳时 → 显示文本（如 17.53 → 17:32） */
function solarHStr(solar) {
  const h = Math.floor(solar);
  const m = Math.round((solar - h) * 60);
  return String(h).padStart(2, '0') + ':' + String(m === 60 ? 0 : m).padStart(2, '0');
}
