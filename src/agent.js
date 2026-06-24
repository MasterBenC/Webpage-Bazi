export const AGENT_VERSION = 'chenyao-bazi-v1';

export const CHENYAO_SYSTEM_PROMPT = `
你是宸垚老师，一位温柔、务实、表达清楚的女性八字咨询师。

表达方式：
- 像有经验的邻家姐姐面对面聊天，亲切、平缓、直接。
- 使用短句和大白话。专业术语出现后，马上用普通话解释。
- 先回答用户最关心的结论，再说明依据，不绕弯、不故作高深。
- 不说教、不恐吓、不制造焦虑，不使用销售话术。

分析规则：
1. 只能使用系统提供的结构化命盘，不得自行猜测四柱、十神、大运或流年。
2. 默认顺序：命盘事实 → 原局基础 → 当前大运 → 相关流年 → 现实建议。
3. 根据问题选择重点。事业、姻缘、财运、家庭与健康倾向应使用不同分析路径。
4. 不使用单个神煞、单个五行或“缺什么补什么”直接下结论。
5. 信息不足或流派规则不明确时，先说明缺少什么，不强行判断。
6. 区分确定的排盘数据、命理解释和现实建议。

边界：
- 不使用“注定、绝对、一定会、必有大灾”等确定性措辞。
- 不预测生死、疾病诊断、赌博输赢或金融产品涨跌。
- 命理解读仅用于传统文化与个人探索，不替代医疗、法律和投资判断。
`.trim();

export function buildChartContext(chart, form) {
  return {
    rules: {
      yearBoundary: '立春交接时刻',
      monthBoundary: '节气精确交接时刻',
      dayBoundary: '真太阳时23:00换日',
      luckDirection: '阳男阴女顺行，阴男阳女逆行',
      startLuck: '三天折合一岁',
      solarTime: '经度修正加均时差',
    },
    birth: {
      gender: form.gender,
      calendar: form.calendar,
      date: form.date,
      clockTime: form.time,
      location: form.location,
      longitude: chart.location.longitude,
      latitude: chart.location.latitude,
    },
    solarTimeAudit: {
      longitudeCorrectionMinutes: chart.longitudeMinutes,
      equationOfTimeMinutes: chart.eotMinutes,
      trueSolarTime: chart.trueDate.toISOString(),
    },
    originalChart: {
      pillars: chart.pillars,
      dayMaster: chart.dayMaster,
      dayElement: chart.dayElement,
      hiddenStems: chart.hiddenStems,
      twelveGrowthStages: chart.twelveGrowthStages,
      nayin: chart.nayin,
    },
    selectedContext: {
      currentDaYun: chart.luck?.currentDaYun || null,
      selectedDaYun: chart.selectedDaYun || chart.luck?.currentDaYun || null,
      selectedLiuNian: chart.selectedLiuNian || chart.luck?.currentLiuNian || null,
      startLuck: chart.luck?.start || null,
      forward: chart.luck?.forward ?? null,
    },
  };
}

export async function requestAgentReply({ chart, form, messages, question, onChunk }) {
  const payload = {
    version: AGENT_VERSION,
    systemPromptId: AGENT_VERSION,
    chart: buildChartContext(chart, form),
    conversation: messages.slice(-12),
    question,
    responsePreferences: {
      language: 'zh-CN',
      structure: ['先说重点', '判断依据', '大运流年', '行动建议'],
      tone: '温柔、直接、务实、大白话',
    },
  };

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Agent API unavailable: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Agent API returned no stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let message = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    message += chunk;
    onChunk?.(message);
  }

  if (!message.trim()) throw new Error('Agent API returned no message');
  return message;
}

export function buildDemoReply(question, chart) {
  return `先说重点：这个问题要结合原局、当前大运和具体流年来看，不能只看一个字。

你是${chart.dayMaster}${chart.dayElement}日主。接下来我会围绕“${question}”，先把命盘里的确定信息讲清楚，再看哪些年份会把这件事引动起来。

目前这是演示回复。接入后端模型后，会由宸垚老师人设、结构化命盘和专业知识库共同生成完整解读。`;
}
