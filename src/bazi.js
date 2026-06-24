import lunarPackage from 'lunar-javascript';

const { Solar, LunarUtil } = lunarPackage;

export const LOCATIONS = {
  '浙江省 杭州市 西湖区': { longitude: 120.16, latitude: 30.25 },
  '北京市 朝阳区': { longitude: 116.48, latitude: 39.92 },
  '河北省 石家庄市 长安区': { longitude: 114.54, latitude: 38.04 },
  '浙江省 台州市 临海市': { longitude: 121.14, latitude: 28.86 },
  '陕西省 西安市 碑林区': { longitude: 108.93, latitude: 34.23 },
  '陕西省 西安市 新城区': { longitude: 108.96, latitude: 34.27 },
  '上海市 徐汇区': { longitude: 121.44, latitude: 31.19 },
  '广东省 深圳市 南山区': { longitude: 113.93, latitude: 22.53 },
  '四川省 成都市 锦江区': { longitude: 104.08, latitude: 30.66 },
};

const STEM_ELEMENT = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

function equationOfTime(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  const b = (2 * Math.PI * (day - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function getShiShen(dayMaster, ganZhi) {
  return LunarUtil.SHI_SHEN[`${dayMaster}${ganZhi?.[0]}`] || '';
}

function serializeDaYun(daYun, dayMaster) {
  const ganZhi = daYun.getGanZhi();
  return {
    index: daYun.getIndex(),
    ganZhi,
    shiShen: getShiShen(dayMaster, ganZhi),
    startYear: daYun.getStartYear(),
    endYear: daYun.getEndYear(),
    startAge: daYun.getStartAge(),
    endAge: daYun.getEndAge(),
    liuNian: daYun.getLiuNian().map((item) => ({
      year: item.getYear(),
      age: item.getAge(),
      ganZhi: item.getGanZhi(),
      shiShen: getShiShen(dayMaster, item.getGanZhi()),
    })),
  };
}

export function calculateChart(form) {
  const location = LOCATIONS[form.location] || LOCATIONS['浙江省 杭州市 西湖区'];
  if (!form.date || !form.time || !location) throw new Error('出生资料不完整');
  const [year, month, day] = form.date.split('-').map(Number);
  const [hour, minute] = form.time.split(':').map(Number);
  const inputDate = new Date(year, month - 1, day, hour, minute, 0);
  if (Number.isNaN(inputDate.getTime())) throw new Error('出生日期或时间无效');
  const longitudeMinutes = (location.longitude - 120) * 4;
  const eotMinutes = equationOfTime(inputDate);
  const trueDate = new Date(inputDate.getTime() + (longitudeMinutes + eotMinutes) * 60000);
  const solar = Solar.fromYmdHms(
    trueDate.getFullYear(),
    trueDate.getMonth() + 1,
    trueDate.getDate(),
    trueDate.getHours(),
    trueDate.getMinutes(),
    0,
  );
  const eightChar = solar.getLunar().getEightChar();
  eightChar.setSect(1);
  const pillars = [
    { label: '年柱', value: eightChar.getYear(), shiShen: eightChar.getYearShiShenGan() },
    { label: '月柱', value: eightChar.getMonth(), shiShen: eightChar.getMonthShiShenGan() },
    { label: '日柱', value: eightChar.getDay(), shiShen: '日主' },
    { label: '时柱', value: eightChar.getTime(), shiShen: eightChar.getTimeShiShenGan() },
  ];
  const dayMaster = pillars[2].value[0];
  const yun = eightChar.getYun(form.gender === 'male' ? 1 : 0, 2);
  const daYun = yun.getDaYun(10)
    .filter((item) => item.getIndex() > 0)
    .map((item) => serializeDaYun(item, dayMaster));
  const currentYear = new Date().getFullYear();
  const currentDaYun = daYun.find((item) => currentYear >= item.startYear && currentYear <= item.endYear) || daYun[0];
  const currentLiuNian = currentDaYun?.liuNian.find((item) => item.year === currentYear) || currentDaYun?.liuNian[0];
  return {
    location,
    inputDate,
    trueDate,
    longitudeMinutes,
    eotMinutes,
    pillars,
    dayMaster,
    dayElement: STEM_ELEMENT[dayMaster] || '火',
    hiddenStems: [eightChar.getYearHideGan(), eightChar.getMonthHideGan(), eightChar.getDayHideGan(), eightChar.getTimeHideGan()],
    twelveGrowthStages: [eightChar.getYearDiShi(), eightChar.getMonthDiShi(), eightChar.getDayDiShi(), eightChar.getTimeDiShi()],
    nayin: [eightChar.getYearNaYin(), eightChar.getMonthNaYin(), eightChar.getDayNaYin(), eightChar.getTimeNaYin()],
    luck: {
      forward: yun.isForward(),
      start: {
        year: yun.getStartYear(),
        month: yun.getStartMonth(),
        day: yun.getStartDay(),
        hour: yun.getStartHour(),
        solar: yun.getStartSolar().toYmdHms(),
      },
      daYun,
      currentDaYun,
      currentLiuNian,
    },
  };
}
