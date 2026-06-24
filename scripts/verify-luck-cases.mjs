import lunarPackage from 'lunar-javascript';

const { Solar } = lunarPackage;

const cases = [
  {
    id: '问真案例6',
    gender: 1,
    trueSolarTime: [1992, 8, 7, 20, 29, 14],
    expected: [10, 3, 14, 2],
    toleranceHours: 0,
  },
  {
    id: '问真案例49',
    gender: 0,
    trueSolarTime: [2014, 1, 14, 14, 36, 59],
    expected: [6, 10, 17, 4],
    toleranceHours: 2,
  },
  {
    id: '问真案例41',
    gender: 0,
    trueSolarTime: [1993, 2, 11, 16, 1, 37],
    expected: [7, 4, 28, 9],
    toleranceHours: 1,
  },
  {
    id: '问真示例黄先生',
    gender: 1,
    trueSolarTime: [1991, 10, 21, 11, 31, 7],
    expected: [4, 1, 12, 12],
    toleranceHours: 0,
  },
];

let failed = false;

for (const item of cases) {
  const eightChar = Solar.fromYmdHms(...item.trueSolarTime).getLunar().getEightChar();
  eightChar.setSect(1);
  const yun = eightChar.getYun(item.gender, 2);
  const actual = [
    yun.getStartYear(),
    yun.getStartMonth(),
    yun.getStartDay(),
    yun.getStartHour(),
  ];
  const firstThreeMatch = actual.slice(0, 3).every((value, index) => value === item.expected[index]);
  const hourDiff = Math.abs(actual[3] - item.expected[3]);
  const pass = firstThreeMatch && hourDiff <= item.toleranceHours;
  failed ||= !pass;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${item.id}: ${actual.join('/')}，预期 ${item.expected.join('/')}`);
}

if (failed) process.exitCode = 1;
