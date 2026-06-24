import { calculateChart } from '../src/bazi.js';

const cases = [
  {
    name: '问真案例41',
    form: { gender: 'female', calendar: 'solar', date: '1993-02-11', time: '17:00', location: '陕西省 西安市 新城区' },
    pillars: ['癸酉', '甲寅', '癸亥', '庚申'],
    start: [7, 4, 28],
  },
  {
    name: '默认客户',
    form: { gender: 'male', calendar: 'solar', date: '1990-05-18', time: '12:30', location: '浙江省 杭州市 西湖区' },
    pillars: ['庚午', '辛巳', '癸未', '戊午'],
    start: [6, 3, 1],
  },
];

for (const item of cases) {
  const chart = calculateChart(item.form);
  const actualPillars = chart.pillars.map((pillar) => pillar.value);
  const actualStart = [chart.luck.start.year, chart.luck.start.month, chart.luck.start.day];
  if (JSON.stringify(actualPillars) !== JSON.stringify(item.pillars)) {
    throw new Error(`${item.name} pillars mismatch: ${actualPillars.join(' ')}`);
  }
  if (JSON.stringify(actualStart) !== JSON.stringify(item.start)) {
    throw new Error(`${item.name} start luck mismatch: ${actualStart.join('/')}`);
  }
  console.log(`PASS ${item.name}: ${actualPillars.join(' ')}，起运 ${actualStart.join('/')}`);
}
