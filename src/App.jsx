import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Buildings,
  CalendarBlank,
  CaretDown,
  ChatCircleDots,
  Check,
  Clock,
  Compass,
  Heart,
  House,
  Image,
  Info,
  Key,
  ListBullets,
  MapPin,
  MagnifyingGlass,
  Moon,
  NotePencil,
  PaperPlaneRight,
  Paperclip,
  Plus,
  Quotes,
  SealCheck,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Star,
  Trash,
  TrendUp,
  User,
  UsersThree,
  GearSix,
} from '@phosphor-icons/react';
import { buildChartContext, buildDemoReply, requestAgentReply } from './agent.js';
import { calculateChart, LOCATIONS } from './bazi.js';

const SAMPLE_CONVERSATIONS = [
  { title: '宸垚老师', note: '你的日主为丙火，生于巳月…', time: '10:24', active: true },
  { title: '流年运势 · 2026 丙午', note: '从事业与选择看今年的节奏', time: '昨天' },
  { title: '事业发展方向咨询', note: '结合原局与当前大运分析', time: '2 天前' },
  { title: '姻缘与感情趋势', note: '关系模式与适合的沟通方式', time: '3 天前' },
];

const QUICK_QUESTIONS = [
  { label: '看日主', icon: Sparkle, question: '请先分析我的日主特点和整体格局。' },
  { label: '问事业', icon: Briefcase, question: '结合当前大运和未来三年流年，分析我的事业方向。' },
  { label: '问姻缘', icon: Heart, question: '请结合原局、大运和流年，看看我的姻缘与关系模式。' },
  { label: '看流年', icon: CalendarBlank, question: '请重点分析我 2026 年的流年机会与注意事项。' },
];

const RECORD_CASES = [
  { name: '当前命盘', gender: '男', birth: '1990年5月18日', pillars: ['庚午', '辛巳', '癸未', '戊午'], tag: '本人', updated: '刚刚' },
  { name: '案例 06', gender: '男', birth: '1992年8月7日', pillars: ['壬申', '戊申', '乙卯', '丙戌'], tag: '事业', updated: '昨天' },
  { name: '案例 41', gender: '女', birth: '1993年2月11日', pillars: ['癸酉', '甲寅', '癸亥', '庚申'], tag: '姻缘', updated: '3天前' },
  { name: '案例 49', gender: '女', birth: '2014年1月14日', pillars: ['癸巳', '乙丑', '乙酉', '癸未'], tag: '学业', updated: '1周前' },
  { name: '案例 18', gender: '女', birth: '1992年6月4日', pillars: ['壬申', '乙巳', '辛亥', '丁酉'], tag: '流年', updated: '2周前' },
  { name: '案例 29', gender: '女', birth: '1993年2月11日', pillars: ['癸酉', '甲寅', '癸亥', '壬子'], tag: '家庭', updated: '1个月前' },
];

const ACADEMY_ARTICLES = [
  { id: 1, category: '入门', title: '八字到底在看什么？先认识四柱与日主', excerpt: '不背术语，先把年、月、日、时四柱和“日主”讲明白。', duration: '6 分钟', level: '零基础', featured: true },
  { id: 2, category: '排盘', title: '为什么出生地会影响排盘？', excerpt: '经度差和均时差，怎样共同修正为真太阳时。', duration: '8 分钟', level: '基础' },
  { id: 3, category: '大运', title: '大运和流年，分别管什么？', excerpt: '大运像十年环境，流年像当年的具体天气。', duration: '7 分钟', level: '基础' },
  { id: 4, category: '十神', title: '十神不是好坏标签', excerpt: '比肩、财星、官杀、印星和食伤，要放回命局关系里看。', duration: '10 分钟', level: '进阶' },
  { id: 5, category: '案例', title: '看事业时，为什么不能只找财星？', excerpt: '用一个完整案例拆解行业、岗位和节奏的判断顺序。', duration: '12 分钟', level: '案例' },
  { id: 6, category: '案例', title: '看姻缘，先看关系模式再看年份', excerpt: '先理解自己如何进入关系，再寻找容易被引动的阶段。', duration: '11 分钟', level: '案例' },
];

const ELEMENT_COLORS = {
  木: '#2e9b68',
  火: '#d85549',
  土: '#b2783f',
  金: '#c59a2f',
  水: '#3488c8',
};

const FOLLOWUP_LABELS = {
  new: '新客户',
  following: '跟进中',
  waiting: '待反馈',
  completed: '已完成',
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatOffset(minutes) {
  const sign = minutes >= 0 ? '+' : '−';
  const absolute = Math.abs(minutes);
  return `${sign}${Math.floor(absolute)}分${pad(Math.round((absolute % 1) * 60))}秒`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function elementForChar(char) {
  const elements = {
    甲: '木', 乙: '木', 寅: '木', 卯: '木',
    丙: '火', 丁: '火', 巳: '火', 午: '火',
    戊: '土', 己: '土', 辰: '土', 戌: '土', 丑: '土', 未: '土',
    庚: '金', 辛: '金', 申: '金', 酉: '金',
    壬: '水', 癸: '水', 亥: '水', 子: '水',
  };
  return elements[char] || '土';
}

function getElementStats(chart) {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  chart.pillars.forEach(({ value }) => {
    [...value].forEach((char) => { counts[elementForChar(char)] += 1; });
  });
  return Object.entries(counts).map(([name, count]) => ({
    name,
    count,
    percent: Math.max(8, (count / 8) * 100),
  }));
}

function LandingPage({ onStart, onAcademy }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span>宸<br />垚</span>
          <div><strong>宸垚命馆</strong><small>八字 AI 咨询</small></div>
        </button>
        <nav>
          <button onClick={() => scrollTo('method')}>排盘方法</button>
          <button onClick={() => scrollTo('host')}>主理人</button>
          <button onClick={() => scrollTo('process')}>咨询流程</button>
          <button onClick={onAcademy}>命理学堂</button>
        </nav>
        <button className="primary-small" onClick={onStart}>开始排盘</button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="eyebrow">明势定根 · 顺时而行</p>
            <h1>先把时间校准，<br />再把问题讲明白。</h1>
            <p className="landing-lead">严格真太阳时排盘，结合原局、大运与流年，由宸垚老师的专业方法与 AI 对话能力，为你拆解真正关心的事业、关系与人生节奏。</p>
            <div className="landing-hero-actions">
              <button className="landing-primary" onClick={onStart}>填写出生信息 <ArrowRight /></button>
              <button className="landing-secondary" onClick={() => scrollTo('method')}>了解排盘方法</button>
            </div>
            <div className="landing-proof">
              <span><SealCheck /> 真太阳时校正</span>
              <span><ShieldCheck /> 隐私分端管理</span>
              <span><ChatCircleDots /> DeepSeek 对话</span>
            </div>
          </div>
          <div className="landing-hero-visual">
            <img className="hero-mountain" src="/assets/warm-mountains.png" alt="朱砂暖金山水" />
            <div className="hero-host-card">
              <img src="/assets/host-portrait-chenyao.png" alt="宸垚老师" />
              <div><small>主理人</small><strong>宸垚老师</strong><span>温柔直白 · 内行严谨</span></div>
            </div>
            <div className="hero-chart-card"><span>日主</span><strong>癸</strong><i>水</i><p>先看月令与通根<br />再论大运与流年</p></div>
          </div>
        </section>

        <section className="landing-trust">
          <p>不是“缺什么补什么”，也不是一句话定吉凶</p>
          <div><span>立春换年</span><span>节气定月</span><span>23:00 换日</span><span>三天折一岁</span><span>大运流年联看</span></div>
        </section>

        <section className="landing-section method-section" id="method">
          <div className="landing-section-heading">
            <p className="eyebrow">我们的判断顺序</p>
            <h2>排得准，是所有解读的起点</h2>
            <p>把排盘事实、命理解释和现实建议分开，避免用单个字、单个神煞直接下结论。</p>
          </div>
          <div className="method-grid">
            <article><span>01</span><Clock /><h3>校准时间</h3><p>根据出生地经度和当日均时差，将北京时间换算为严格真太阳时。</p></article>
            <article><span>02</span><CalendarBlank /><h3>建立命盘</h3><p>年柱按立春、月柱按节气交接、真太阳时 23:00 换日。</p></article>
            <article><span>03</span><TrendUp /><h3>进入运年</h3><p>先看原局长期结构，再进入十年大运和逐年流年的现实节奏。</p></article>
            <article><span>04</span><ChatCircleDots /><h3>围绕问题回答</h3><p>不堆术语，从你最关心的事业、关系或选择出发，把依据讲清楚。</p></article>
          </div>
        </section>

        <section className="landing-section host-section" id="host">
          <div className="host-showcase-image"><img src="/assets/host-portrait-chenyao.png" alt="宸垚老师中式主理人形象" /></div>
          <div className="host-showcase-copy">
            <p className="eyebrow">主理人 · 宸垚老师</p>
            <h2>专业判断可以严谨，表达不必高高在上</h2>
            <p>以八字原局为根，以大运流年为时间线。先说你真正需要知道的重点，再用普通人听得懂的话解释依据。</p>
            <div className="host-values">
              <span><Check /> 不恐吓、不制造焦虑</span>
              <span><Check /> 不用单一五行草率定论</span>
              <span><Check /> 信息不足时明确说明</span>
              <span><Check /> 最后落回现实选择与行动</span>
            </div>
            <blockquote><Quotes />“命理不是替你做决定，而是帮助你看清当下的位置、节奏和选择。”</blockquote>
          </div>
        </section>

        <section className="landing-section process-section" id="process">
          <div className="landing-section-heading">
            <p className="eyebrow">咨询流程</p>
            <h2>四步完成一次清晰的命盘沟通</h2>
          </div>
          <div className="process-line">
            {[['填写信息', '出生日期、时间、地区'], ['真太阳时', '自动完成时间校正'], ['查看摘要', '确认四柱与当前运年'], ['开始咨询', '围绕具体问题展开']].map(([title, note], index) => <div key={title}><span>{index + 1}</span><h3>{title}</h3><p>{note}</p></div>)}
          </div>
          <button className="landing-primary center-cta" onClick={onStart}>现在开始排盘 <ArrowRight /></button>
        </section>

        <section className="landing-section boundary-section">
          <div><ShieldCheck /><h2>有边界，才有可信度</h2></div>
          <p>命理解读用于传统文化与个人探索，不替代医疗、法律或投资判断；不预测生死，不制造确定性恐惧，不承诺结果。</p>
        </section>
      </main>

      <footer className="landing-footer">
        <div><strong>宸垚命馆</strong><p>先定时，后论命。以理为本，以人为先。</p></div>
        <div><button onClick={onStart}>开始排盘</button><button onClick={onAcademy}>命理学堂</button><a href="/admin">管理端</a></div>
        <small>© 2026 宸垚命馆 · 命理解读仅作传统文化与个人探索参考</small>
      </footer>
    </div>
  );
}

function Intake({ form, setForm, chart, onComplete, onOpenPage, onHome }) {
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState('');
  const proceed = () => {
    if (!form.date || !form.time || !form.location) return setFormError('请完整填写出生日期、时间和地区。');
    if (!accepted) return setFormError('请先阅读并同意隐私与使用说明。');
    setFormError('');
    onComplete();
  };
  const openProtected = (page) => {
    if (!accepted) return setFormError('查看个人命盘或记录前，请先同意隐私与使用说明。');
    setFormError('');
    onOpenPage(page);
  };
  return (
    <div className="intake-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-main">宸垚命馆</span>
          <span className="brand-divider" />
          <span>八字 AI 咨询</span>
        </div>
        <nav>
          <button onClick={onHome}>首页</button>
          <button onClick={() => openProtected('report')}>我的命盘</button>
          <button onClick={() => openProtected('history')}>咨询记录</button>
          <button onClick={() => onOpenPage('academy')}>命理学堂</button>
          <button className="primary-small" onClick={proceed}>我的咨询</button>
        </nav>
      </header>

      <main className="intake-main">
        <aside className="stepper">
          {['出生信息', '真太阳时', '四柱命盘', '选择所问'].map((step, index) => (
            <div className={`step ${index === 0 ? 'active' : ''}`} key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
              {index < 3 && <i />}
            </div>
          ))}
        </aside>

        <section className="chart-form">
          <div className="hero-band">
            <div className="hero-copy">
              <p className="eyebrow">明势定根，顺时而行</p>
              <h1>先定时，后论命</h1>
              <p>以严格真太阳时校正，为每一次解读建立可靠起点。</p>
            </div>
            <img src="/assets/warm-mountains.png" alt="朱砂暖金山水" />
          </div>

          <div className="form-grid">
            <Field label="性别">
              <Segmented
                value={form.gender}
                options={[['male', '男'], ['female', '女']]}
                onChange={(gender) => setForm({ ...form, gender })}
              />
            </Field>
            <Field label="历法">
              <Segmented
                value={form.calendar}
                options={[['solar', '公历'], ['lunar', '农历']]}
                onChange={(calendar) => setForm({ ...form, calendar })}
              />
            </Field>
            <Field label="出生日期">
              <div className="input-wrap"><CalendarBlank /><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </Field>
            <Field label="出生时间" helper="精确到分钟">
              <div className="input-wrap"><Clock /><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            </Field>
            <Field label="出生地" helper="用于经度与时区校正" wide>
              <div className="input-wrap">
                <MapPin />
                <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                  {Object.keys(LOCATIONS).map((location) => <option key={location}>{location}</option>)}
                </select>
                <CaretDown />
              </div>
            </Field>
          </div>

          <section className="solar-audit">
            <div className="section-title"><h2>真太阳时校正</h2><Info /></div>
            <div className="time-equation">
              <TimeUnit label="北京时间" value={formatTime(chart.inputDate)} />
              <b>+</b>
              <TimeUnit label="经度差" value={formatOffset(chart.longitudeMinutes)} note={`东经 ${chart.location.longitude.toFixed(2)}°`} />
              <b>+</b>
              <TimeUnit label="均时差" value={formatOffset(chart.eotMinutes)} note="当日方程" />
              <b>=</b>
              <TimeUnit label="真太阳时" value={formatTime(chart.trueDate)} emphasis />
            </div>
            <div className="rule-note"><Clock /> 每日真太阳时 23:00 为日界线；如校正跨越时辰或日期，系统将醒目标注。</div>
          </section>

          <ChartPreview chart={chart} />

          <div className="intake-actions">
            <div className="intake-consent">
              <label><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>我已阅读并同意出生资料用于排盘与本次咨询，理解命理解读仅作传统文化参考。</span></label>
              {formError && <p className="intake-error">{formError}</p>}
            </div>
            <button className="primary" onClick={proceed}>载入命盘，开始咨询 <ArrowRight /></button>
          </div>
        </section>

        <aside className="host-panel">
          <div className="host-profile">
            <img src="/assets/host-portrait-chenyao.png" alt="宸垚老师" />
            <div>
              <p className="eyebrow">主理人</p>
              <h2>宸垚老师</h2>
              <p>八字命理研究者 · 十余年实践经验</p>
            </div>
          </div>
          <p className="host-intro">以理为本，以人为先。先把时间校准，再结合原局、大运与流年回答真正关心的问题。</p>
          <div className="preview-chat">
            <Message avatar text="你好，我是宸垚。请先填写出生信息，我会为你校时排盘，再一起看你关心的问题。" />
            <Message mine text="我想重点了解未来三年的事业发展。" />
            <Message avatar text="明白。排盘完成后，我会结合原局、当前大运与逐年流年，为你拆解机会与节奏。" />
          </div>
          <p className="suggestion-title">你可以这样问</p>
          <div className="question-grid">
            {QUICK_QUESTIONS.map(({ label, icon: Icon }) => (
              <button key={label} onClick={onComplete}><Icon /><span>{label}</span></button>
            ))}
          </div>
          <button className="chat-entry" onClick={proceed}>进入咨询 <ArrowRight /></button>
        </aside>
      </main>
    </div>
  );
}

function UtilityRail({ activePage, onNavigate, onBack }) {
  const items = [
    ['chat', 'AI 咨询', ChatCircleDots],
    ['report', '我的命盘', CalendarBlank],
    ['history', '咨询记录', ListBullets],
    ['academy', '命理学堂', BookOpen],
  ];
  return (
    <aside className="utility-rail">
      <div className="seal-logo">宸<br />垚</div>
      {items.map(([key, label, Icon]) => (
        <button
          aria-label={label}
          className={activePage === key ? 'active' : ''}
          key={key}
          onClick={() => onNavigate(key)}
          title={label}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
      <button className="rail-bottom" onClick={onBack} title="返回出生信息"><ArrowLeft /><span>返回</span></button>
    </aside>
  );
}

function CustomerReportPage({ chart, form, onNavigate }) {
  const stats = getElementStats(chart);
  const current = chart.luck.currentDaYun;
  const year = chart.luck.currentLiuNian;
  return (
    <main className="portal-page customer-report">
      <PageHeader
        eyebrow="我的命盘"
        title={`${chart.dayMaster}${chart.dayElement}日主 · 个人命盘摘要`}
        description="用容易理解的方式展示核心信息，专业判断由宸垚老师结合问题展开。"
        actions={<button className="primary" onClick={() => onNavigate('chat')}><ChatCircleDots /> 带着命盘去咨询</button>}
      />
      <section className="customer-chart-hero">
        <div className="customer-pillars">
          {chart.pillars.map((pillar) => <div key={pillar.label}><span>{pillar.label}</span><strong style={{ color: ELEMENT_COLORS[elementForChar(pillar.value[0])] }}>{pillar.value[0]}</strong><strong style={{ color: ELEMENT_COLORS[elementForChar(pillar.value[1])] }}>{pillar.value[1]}</strong><small>{pillar.shiShen}</small></div>)}
        </div>
        <div className="customer-birth">
          <SealCheck />
          <div><strong>真太阳时已校正</strong><p>{form.date} {formatTime(chart.trueDate)} · {form.location}</p></div>
        </div>
      </section>
      <div className="customer-report-grid">
        <section className="insight-card">
          <div className="section-title"><h2>先认识你的日主</h2><Sparkle /></div>
          <p className="customer-lead">你的日主是<strong>{chart.dayMaster}{chart.dayElement}</strong>。日主代表分析命盘时的核心参照，但不能单独决定性格和运势。</p>
          <ul className="plain-points">
            <li>先看出生月份带来的季节气候。</li>
            <li>再看有没有根、有无同类支持。</li>
            <li>最后结合大运流年看现实节奏。</li>
          </ul>
        </section>
        <section className="insight-card">
          <div className="section-title"><h2>五行分布</h2><span>原局明字</span></div>
          <div className="element-chips">{stats.map((item) => <span key={item.name} style={{ borderColor: ELEMENT_COLORS[item.name], color: ELEMENT_COLORS[item.name] }}><b>{item.name}</b>{item.count}</span>)}</div>
          <p className="card-note">五行数量只是观察入口，不等于喜忌，也不代表缺少某一项就要直接补足。</p>
        </section>
        <section className="insight-card current-luck-card">
          <p className="eyebrow">当前十年环境</p>
          <h2>{current?.ganZhi}大运</h2>
          <strong>{current?.startYear}—{current?.endYear}</strong>
          <p>{current?.shiShen} · {current?.startAge}—{current?.endAge}岁</p>
        </section>
        <section className="insight-card current-year-card">
          <p className="eyebrow">当前流年</p>
          <h2>{year?.year} · {year?.ganZhi}</h2>
          <p>{year?.shiShen} · 虚岁 {year?.age} 岁</p>
          <button className="ghost-button" onClick={() => onNavigate('chat')}>问问这一年 <ArrowRight /></button>
        </section>
      </div>
      <section className="customer-boundary"><Info /><p><strong>怎么看这份摘要？</strong>命盘是传统文化分析工具，不是确定命运的判决书。具体问题需要把原局、大运、流年和现实处境放在一起讨论。</p></section>
    </main>
  );
}

function CustomerHistoryPage({ onNavigate }) {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/me/conversations')
      .then((response) => response.ok ? response.json() : [])
      .then(setHistories)
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="portal-page customer-history">
      <PageHeader eyebrow="我的咨询" title="咨询记录" description="这里只展示当前用户自己的对话，不包含其他客户或内部笔记。" actions={<button className="primary" onClick={() => onNavigate('chat')}><Plus /> 发起新咨询</button>} />
      <section className="history-list">
        {histories.map((item, index) => <button key={item.id} onClick={() => onNavigate('chat')}><span className="history-icon">{index === 0 ? <TrendUp /> : index === 1 ? <Briefcase /> : <Heart />}</span><div><strong>{item.title}</strong><p>{item.lastMessage || '咨询已创建'}</p></div><time>{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</time><ArrowRight /></button>)}
        {!loading && histories.length === 0 && <div className="empty-state"><ChatCircleDots /><h3>还没有咨询记录</h3><p>发起第一次咨询后，对话会自动保存在这里。</p></div>}
      </section>
      <div className="customer-privacy-note"><ShieldCheck /><span>咨询内容仅供本人查看；管理人员仅在提供服务和排查问题时按权限访问。</span></div>
    </main>
  );
}

function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

function ProfessionalChartPage({ chart, form, onNavigate }) {
  const [tab, setTab] = useState('basic');
  const [selectedYear, setSelectedYear] = useState(chart.luck.currentLiuNian?.year || new Date().getFullYear());
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const selectedDaYun = chart.luck.daYun.find((item) => selectedYear >= item.startYear && selectedYear <= item.endYear)
    || chart.luck.currentDaYun;
  const selectedLiuNian = selectedDaYun?.liuNian.find((item) => item.year === selectedYear)
    || selectedDaYun?.liuNian[0];
  const stats = getElementStats(chart);
  const rows = [
    ['主星', ...chart.pillars.map((item) => item.shiShen)],
    ['天干', ...chart.pillars.map((item) => item.value[0])],
    ['地支', ...chart.pillars.map((item) => item.value[1])],
    ['藏干', ...chart.hiddenStems.map((item) => Array.isArray(item) ? item.join(' · ') : item)],
    ['星运', ...chart.twelveGrowthStages],
    ['纳音', ...chart.nayin],
  ];

  return (
    <main className="portal-page chart-page">
      <PageHeader
        eyebrow="专业命盘"
        title="问真八字"
        description="严格真太阳时排盘，逐层查看原局、大运与流年。"
        actions={<><button className="ghost-button" onClick={() => onNavigate('records')}><ListBullets /> 保存到记录</button><button className="primary" onClick={() => onNavigate('chat')}><ChatCircleDots /> 问宸垚老师</button></>}
      />

      <section className="chart-person-card">
        <div className="zodiac-mark">{form.gender === 'male' ? '乾' : '坤'}</div>
        <div>
          <p className="eyebrow">当前命盘 · {form.gender === 'male' ? '乾造' : '坤造'}</p>
          <h2>{form.date} · {formatTime(chart.trueDate)} 真太阳时</h2>
          <p>{form.location}　东经 {chart.location.longitude.toFixed(2)}°　日主 {chart.dayMaster}{chart.dayElement}</p>
        </div>
        <div className="chart-audit-badge"><SealCheck /> 已校正<br /><span>23:00 换日</span></div>
      </section>

      <nav className="content-tabs">
        {[['basic', '基础排盘'], ['detail', '专业细盘'], ['luck', '大运流年'], ['notes', '断事笔记']].map(([key, label]) => (
          <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      {tab === 'basic' && (
        <section className="chart-table-card">
          <div className="chart-table-head"><span>日期</span>{chart.pillars.map((pillar) => <strong key={pillar.label}>{pillar.label}</strong>)}</div>
          {rows.map((row, rowIndex) => (
            <div className={`chart-table-row ${rowIndex === 1 || rowIndex === 2 ? 'major' : ''}`} key={row[0]}>
              {row.map((cell, index) => {
                const element = index > 0 && (rowIndex === 1 || rowIndex === 2) ? elementForChar(cell) : null;
                return index === 0
                  ? <span key={`${row[0]}-${index}`}>{cell}</span>
                  : <strong style={element ? { color: ELEMENT_COLORS[element] } : undefined} key={`${row[0]}-${index}`}>{cell || '—'}</strong>;
              })}
            </div>
          ))}
          <div className="chart-rule-bar"><Info /> 年柱按立春、月柱按节气交接时刻、真太阳时 23:00 换日。</div>
        </section>
      )}

      {tab === 'detail' && (
        <div className="detail-grid">
          <section className="insight-card">
            <div className="section-title"><h2>五行结构</h2><span>按八个明字统计</span></div>
            <div className="element-bars">
              {stats.map((item) => <div key={item.name}><span style={{ color: ELEMENT_COLORS[item.name] }}>{item.name}</span><i><b style={{ width: `${item.percent}%`, background: ELEMENT_COLORS[item.name] }} /></i><strong>{item.count}</strong></div>)}
            </div>
            <p className="card-note">这里只展示原局明字分布，不直接用“缺什么补什么”下结论。</p>
          </section>
          <section className="insight-card">
            <div className="section-title"><h2>结构观察</h2><Sparkle /></div>
            <ul className="observation-list">
              <li><strong>日主</strong><span>{chart.dayMaster}{chart.dayElement}，先结合月令与通根判断强弱。</span></li>
              <li><strong>月令</strong><span>{chart.pillars[1].value}月，决定命局季节与主要气势。</span></li>
              <li><strong>当前运</strong><span>{chart.luck.currentDaYun?.ganZhi}大运，需与原局共同分析。</span></li>
            </ul>
          </section>
          <section className="insight-card span-two">
            <div className="section-title"><h2>四柱关系速览</h2><span>供咨询定位使用</span></div>
            <div className="relation-cards">
              {chart.pillars.map((pillar, index) => <div key={pillar.label}><small>{pillar.label}</small><strong>{pillar.value}</strong><span>{pillar.shiShen}</span><p>{index === 0 ? '早年、家族环境' : index === 1 ? '成长与事业环境' : index === 2 ? '自身与亲密关系' : '晚景、行动与子女'}</p></div>)}
            </div>
          </section>
        </div>
      )}

      {tab === 'luck' && (
        <div className="luck-page-grid">
          <section className="insight-card span-two">
            <div className="section-title"><h2>大运排布</h2><span>{chart.luck.forward ? '顺行' : '逆行'} · {chart.luck.start.year}年{chart.luck.start.month}月{chart.luck.start.day}天起运</span></div>
            <div className="dayun-timeline">
              {chart.luck.daYun.map((item) => (
                <button className={item.index === selectedDaYun?.index ? 'active' : ''} key={item.index} onClick={() => setSelectedYear(item.startYear)}>
                  <small>{item.startYear}</small><strong>{item.ganZhi}</strong><span>{item.startAge}—{item.endAge}岁</span><em>{item.shiShen}</em>
                </button>
              ))}
            </div>
          </section>
          <section className="insight-card luck-focus">
            <p className="eyebrow">当前选择</p>
            <h2>{selectedDaYun?.ganZhi}大运</h2>
            <strong>{selectedDaYun?.startYear}—{selectedDaYun?.endYear}</strong>
            <p>{selectedDaYun?.shiShen || '—'} · {selectedDaYun?.startAge}—{selectedDaYun?.endAge}岁</p>
            <button className="primary" onClick={() => onNavigate('chat')}>带着这步运去咨询 <ArrowRight /></button>
          </section>
          <section className="insight-card">
            <div className="section-title"><h2>逐年流年</h2><span>{selectedLiuNian?.year} {selectedLiuNian?.ganZhi}</span></div>
            <div className="large-year-picker">
              {selectedDaYun?.liuNian.map((item) => <button className={item.year === selectedYear ? 'active' : ''} key={item.year} onClick={() => setSelectedYear(item.year)}><small>{item.year}</small><strong>{item.ganZhi}</strong><span>{item.shiShen}</span></button>)}
            </div>
          </section>
        </div>
      )}

      {tab === 'notes' && (
        <section className="notes-card">
          <div className="section-title"><h2>断事笔记</h2><span>{saved ? '已保存' : '仅保存在当前浏览器'}</span></div>
          <textarea value={note} onChange={(event) => { setNote(event.target.value); setSaved(false); }} placeholder="记录应期、反馈与后续需要验证的判断。建议把命盘事实、推断和现实反馈分开写。" />
          <div className="note-prompts"><button onClick={() => setNote(`${note}命盘事实：\n`)}>命盘事实</button><button onClick={() => setNote(`${note}判断依据：\n`)}>判断依据</button><button onClick={() => setNote(`${note}现实反馈：\n`)}>现实反馈</button></div>
          <button className="primary note-save" onClick={() => setSaved(true)}><NotePencil /> 保存笔记</button>
        </section>
      )}
    </main>
  );
}

function RecordsPage({ chart, form, onNavigate, records, onSaved, onCreatedChart }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const cases = (records || []).map((item) => ({
    ...item,
    genderLabel: item.gender === 'male' ? '男' : item.gender === 'female' ? '女' : '未填',
    birthLabel: item.birthDate || '待补充',
    pillarValues: (item.pillars || []).map((pillar) => typeof pillar === 'string' ? pillar : pillar.value),
    updatedLabel: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('zh-CN') : '刚刚',
  }));
  const visibleCases = cases.filter((item) => (
    (filter === 'all' || item.followupStatus === filter)
    && `${item.name}${item.phone}${item.birthLabel}${item.location}${(item.tags || []).join('')}`.includes(query.trim())
  ));

  function openCustomer(item) {
    setSelectedId(item.id);
    setDraft({
      name: item.name,
      phone: item.phone || '',
      tags: (item.tags || []).join('、'),
      followupStatus: item.followupStatus || 'new',
      adminNote: item.adminNote || '',
    });
    setNotice('');
  }

  async function saveCustomer() {
    if (!selectedId || !draft) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch(`/api/admin/customers/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          tags: draft.tags.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '保存失败');
      setNotice('客户资料已保存');
      onSaved?.();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  const selected = cases.find((item) => item.id === selectedId);
  return (
    <main className="portal-page customer-records-page">
      <PageHeader eyebrow="客户管理" title="客户档案" description="补全客户身份、联系方式、标签与跟进记录。" actions={<button className="primary" onClick={() => setCreating(true)}><Plus /> 新建客户</button>} />
      <section className="records-toolbar">
        <div className="portal-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、手机号、地区或标签" /></div>
        <div className="filter-pills">{[['all', '全部'], ['new', '新客户'], ['following', '跟进中'], ['waiting', '待反馈'], ['completed', '已完成']].map(([key, label]) => <button className={filter === key ? 'active' : ''} key={key} onClick={() => setFilter(key)}>{label}</button>)}</div>
      </section>
      <div className="records-summary"><span><strong>{cases.length}</strong> 个客户</span><span><strong>{cases.filter((item) => item.followupStatus === 'following').length}</strong> 个跟进中</span><span><strong>{cases.filter((item) => !item.phone).length}</strong> 条待补联系方式</span></div>
      <div className="customer-record-layout">
        <section className="record-list">
          {visibleCases.map((item) => (
            <button className={`record-row ${selectedId === item.id ? 'active' : ''}`} key={item.id} onClick={() => openCustomer(item)}>
              <span className="record-avatar"><User /></span>
              <div className="record-name"><strong>{item.name}</strong><span>{item.genderLabel} · {item.birthLabel}{item.phone ? ` · ${item.phone}` : ''}</span></div>
              <div className="mini-pillars">{item.pillarValues.length ? item.pillarValues.map((pillar, index) => <span key={`${pillar}-${index}`}><b style={{ color: ELEMENT_COLORS[elementForChar(pillar[0])] }}>{pillar[0]}</b><b style={{ color: ELEMENT_COLORS[elementForChar(pillar[1])] }}>{pillar[1]}</b></span>) : <small>尚未排盘</small>}</div>
              <span className={`followup-tag ${item.followupStatus}`}>{FOLLOWUP_LABELS[item.followupStatus] || '新客户'}</span>
              <time>{item.updatedLabel}</time>
              <ArrowRight />
            </button>
          ))}
          {!visibleCases.length && <div className="empty-state"><MagnifyingGlass /><h3>没有找到匹配客户</h3><p>换一个关键词或跟进状态试试。</p></div>}
        </section>
        <aside className="customer-editor">
          {selected && draft ? <>
            <header><div><p className="eyebrow">客户详情</p><h2>{selected.name}</h2></div><button className="ghost-button" onClick={() => onNavigate('conversations')}>查看咨询</button></header>
            <div className="customer-meta"><span>{selected.genderLabel}</span><span>{selected.birthLabel}</span><span>{selected.location || '地区待补充'}</span></div>
            <label><span>客户姓名</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label><span>手机号</span><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="用于后续联系" /></label>
            <label><span>跟进状态</span><select value={draft.followupStatus} onChange={(event) => setDraft({ ...draft, followupStatus: event.target.value })}>{Object.entries(FOLLOWUP_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label><span>客户标签</span><input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="事业、姻缘、重点客户" /><small>多个标签用顿号或逗号分隔</small></label>
            <label><span>内部备注</span><textarea value={draft.adminNote} onChange={(event) => setDraft({ ...draft, adminNote: event.target.value })} placeholder="记录客户需求、反馈与下一步跟进安排" /></label>
            {notice && <div className="editor-notice"><Check /> {notice}</div>}
            <button className="primary editor-save" disabled={saving} onClick={saveCustomer}><Check /> {saving ? '保存中…' : '保存客户资料'}</button>
          </> : <div className="editor-empty"><UsersThree /><h3>选择一位客户</h3><p>点击左侧客户，可补充联系方式、标签、状态和内部备注。</p></div>}
        </aside>
      </div>
      {creating && <NewCustomerModal onClose={() => setCreating(false)} onCreated={(result) => {
        setCreating(false);
        onSaved?.();
        onCreatedChart?.(result);
      }} />}
    </main>
  );
}

function NewCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: 'female',
    calendar: 'solar',
    date: '1990-01-01',
    time: '12:00',
    location: '浙江省 杭州市 西湖区',
    tags: '',
    followupStatus: 'new',
    adminNote: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '新建失败');
      onCreated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="new-customer-modal" onSubmit={submit}>
        <header><div><p className="eyebrow">代客建档</p><h2>新建客户并排盘</h2><p>保存后会自动完成真太阳时校正、四柱和大运计算。</p></div><button type="button" className="modal-close" onClick={onClose}>×</button></header>
        <div className="new-customer-grid">
          <label className="wide"><span>客户姓名</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="请输入姓名或称呼" /></label>
          <label><span>手机号</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="选填" /></label>
          <label><span>性别</span><select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="male">男</option><option value="female">女</option></select></label>
          <label><span>出生日期（公历）</span><input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label><span>出生时间</span><input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
          <label className="wide"><span>出生地区</span><select value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })}>{Object.keys(LOCATIONS).map((location) => <option key={location}>{location}</option>)}</select></label>
          <label><span>跟进状态</span><select value={form.followupStatus} onChange={(event) => setForm({ ...form, followupStatus: event.target.value })}>{Object.entries(FOLLOWUP_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          <label><span>客户标签</span><input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="事业、姻缘" /></label>
          <label className="wide"><span>内部备注</span><textarea value={form.adminNote} onChange={(event) => setForm({ ...form, adminNote: event.target.value })} placeholder="记录客户需求或资料来源" /></label>
        </div>
        <div className="new-customer-rule"><SealCheck /> 按立春换年、节气定月、真太阳时 23:00 换日、三天折一岁排盘。</div>
        {error && <div className="auth-error">{error}</div>}
        <footer><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary" disabled={saving}><CalendarBlank /> {saving ? '正在排盘…' : '保存并排盘'}</button></footer>
      </form>
    </div>
  );
}

function AcademyPage() {
  const [category, setCategory] = useState('全部');
  const [selected, setSelected] = useState(ACADEMY_ARTICLES[0]);
  const [reading, setReading] = useState(false);
  const categories = ['全部', '入门', '排盘', '十神', '大运', '案例'];
  const visible = ACADEMY_ARTICLES.filter((item) => category === '全部' || item.category === category);
  return (
    <main className="portal-page academy-page">
      <PageHeader eyebrow="宸垚学堂" title="把命理讲成听得懂的话" description="从排盘规则到案例推演，先建立正确的判断顺序。" />
      <section className="academy-feature">
        <div>
          <span className="article-badge">本周必读</span>
          <h2>{selected.title}</h2>
          <p>{selected.excerpt}</p>
          <div><span>{selected.duration}</span><span>{selected.level}</span></div>
          <button className="primary" onClick={() => setReading(true)}>开始阅读 <ArrowRight /></button>
        </div>
        <img src="/assets/warm-mountains.png" alt="暖金山水" />
      </section>
      {reading && (
        <section className="reader-panel">
          <header><div><span className="article-badge">{selected.category}</span><h2>{selected.title}</h2></div><button className="ghost-button" onClick={() => setReading(false)}>收起正文</button></header>
          <p className="reader-lead">{selected.excerpt}</p>
          <div className="reader-body">
            <p>先说重点：八字分析不是看到一个字就下结论，而是先确认排盘，再看各部分之间的关系。</p>
            <h3>第一步，先把事实层分清</h3>
            <p>出生时间、出生地、真太阳时和四柱属于排盘事实。日主、月令、透干与通根，是进入分析时的基础信息。</p>
            <h3>第二步，再看结构与节奏</h3>
            <p>原局回答的是长期结构，大运代表十年环境，流年则把某些主题在具体年份引动起来。三层要一起看，才不容易把话说满。</p>
            <blockquote>宸垚老师提醒：术语只是沟通工具。真正有用的解读，最后一定要落回现实选择和行动节奏。</blockquote>
          </div>
        </section>
      )}
      <nav className="category-tabs">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</nav>
      <section className="article-grid">
        {visible.map((article, index) => (
          <button className={selected.id === article.id ? 'article-card active' : 'article-card'} key={article.id} onClick={() => { setSelected(article); setReading(false); }}>
            <span className="article-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="article-badge">{article.category}</span>
            <h3>{article.title}</h3>
            <p>{article.excerpt}</p>
            <footer><span>{article.duration} · {article.level}</span><ArrowRight /></footer>
          </button>
        ))}
      </section>
    </main>
  );
}

function SettingsPage({ chart }) {
  const [preferences, setPreferences] = useState({ solar: true, animation: true, memory: false, dark: false });
  const [status, setStatus] = useState('');
  const toggle = (key) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  const exportChart = () => {
    const blob = new Blob([JSON.stringify(chart, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `chenyao-bazi-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('命盘数据已导出');
  };
  return (
    <main className="portal-page settings-page">
      <PageHeader eyebrow="偏好与安全" title="系统设置" description="排盘算法为项目级规则，展示与隐私选项可按需要调整。" />
      {status && <div className="settings-status"><Check /> {status}</div>}
      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-title"><ShieldCheck /><div><h2>排盘规则</h2><p>当前项目锁定规则，不随单次咨询改变。</p></div></div>
          <div className="rule-list">
            <DataRow label="年柱边界" value="立春交接时刻" />
            <DataRow label="月柱边界" value="节气精确交接" />
            <DataRow label="换日规则" value="真太阳时 23:00" />
            <DataRow label="大运顺逆" value="阳男阴女顺，阴男阳女逆" />
            <DataRow label="起运换算" value="三天折合一岁" />
          </div>
        </section>
        <section className="settings-card">
          <div className="settings-card-title"><Sparkle /><div><h2>AI 服务</h2><p>宸垚老师对话模型的连接状态。</p></div></div>
          <div className="provider-card"><span className="provider-dot" /><div><strong>DeepSeek</strong><p>模型已连接 · 流式回复</p></div><SealCheck /></div>
          <p className="card-note">API Key 只保存在服务端环境变量中，不会发送到浏览器。</p>
        </section>
        <section className="settings-card">
          <div className="settings-card-title"><SlidersHorizontal /><div><h2>使用偏好</h2><p>调整页面展示与对话体验。</p></div></div>
          <SettingToggle label="显示真太阳时校正过程" note="保留经度差与均时差审计信息" value={preferences.solar} onChange={() => toggle('solar')} />
          <SettingToggle label="流式文字动画" note="边生成边显示宸垚老师的回复" value={preferences.animation} onChange={() => toggle('animation')} />
          <SettingToggle label="记忆最近咨询主题" note="仅保存在当前浏览器" value={preferences.memory} onChange={() => toggle('memory')} />
          <SettingToggle label="深色模式" note="深色视觉将在后续版本完善" value={preferences.dark} onChange={() => toggle('dark')} icon={<Moon />} />
        </section>
        <section className="settings-card">
          <div className="settings-card-title"><ShieldCheck /><div><h2>数据与隐私</h2><p>管理本地命盘与咨询数据。</p></div></div>
          <div className="privacy-actions">
            <button className="ghost-button" onClick={exportChart}><NotePencil /> 导出当前命盘</button>
            <button className="danger-button" onClick={() => setStatus('演示数据已清理，当前命盘保留')}><Trash /> 清理咨询记录</button>
          </div>
          <p className="card-note">命理解读仅作传统文化与个人探索参考，不替代医疗、法律或投资建议。</p>
        </section>
      </div>
    </main>
  );
}

function SettingToggle({ label, note, value, onChange, icon }) {
  return <button className="setting-toggle" onClick={onChange}><span className="setting-icon">{icon}</span><span><strong>{label}</strong><small>{note}</small></span><i className={value ? 'active' : ''}><b /></i></button>;
}

function Consultation({ chart, form, onBack, initialPage = 'chat' }) {
  const [activePage, setActivePage] = useState(initialPage);
  const [customerConversations, setCustomerConversations] = useState([]);
  const [selectedYear, setSelectedYear] = useState(
    chart.luck.currentLiuNian?.year || new Date().getFullYear(),
  );
  const selectedDaYun = chart.luck.daYun.find((item) => (
    selectedYear >= item.startYear && selectedYear <= item.endYear
  )) || chart.luck.currentDaYun;
  const selectedLiuNian = selectedDaYun?.liuNian.find((item) => item.year === selectedYear)
    || selectedDaYun?.liuNian[0];
  const agentChart = { ...chart, selectedDaYun, selectedLiuNian };
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `你好，我是宸垚老师。命盘已按真太阳时载入。你的日主为${chart.dayMaster}${chart.dayElement}，可以先从日主特点开始，也可以直接问事业、姻缘或具体流年。` },
    { role: 'user', text: '先帮我看看整体格局和日主强弱。' },
    { role: 'assistant', text: `从当前命盘看，你以${chart.dayMaster}${chart.dayElement}为日主。解读时我会先看月令与通根，再结合透干、制化和寒暖燥湿；之后再进入大运、流年，避免只凭单一五行下结论。你更想先看事业路径，还是关系与姻缘？` },
  ]);
  const [typing, setTyping] = useState(false);

  function loadCustomerConversations() {
    fetch('/api/me/conversations')
      .then((response) => response.ok ? response.json() : [])
      .then(setCustomerConversations)
      .catch(() => {});
  }

  useEffect(() => { loadCustomerConversations(); }, []);

  async function send(text = input) {
    const value = text.trim();
    if (!value || typing) return;
    const conversation = [...messages, { role: 'user', text: value }];
    setMessages(conversation);
    setInput('');
    setTyping(true);
    const streamingIndex = conversation.length;
    let streamStarted = false;
    try {
      const reply = await requestAgentReply({
        chart: agentChart,
        form,
        messages: conversation,
        question: value,
        onChunk: (partial) => {
          streamStarted = true;
          setTyping(false);
          setMessages((current) => {
            if (current.length <= streamingIndex) {
              return [...current, { role: 'assistant', text: partial, streaming: true }];
            }
            return current.map((message, index) => (
              index === streamingIndex ? { ...message, text: partial } : message
            ));
          });
        },
      });
      setMessages((current) => {
        if (current.length <= streamingIndex) return [...current, { role: 'assistant', text: reply }];
        return current.map((message, index) => (
          index === streamingIndex ? { role: 'assistant', text: reply } : message
        ));
      });
      loadCustomerConversations();
    } catch {
      setMessages((current) => {
        const fallback = { role: 'assistant', text: buildDemoReply(value, agentChart) };
        if (!streamStarted || current.length <= streamingIndex) return [...conversation, fallback];
        return current.map((message, index) => (index === streamingIndex ? fallback : message));
      });
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="consult-shell">
      <UtilityRail activePage={activePage} onNavigate={setActivePage} onBack={onBack} />
      {activePage === 'chat' ? <>
      <aside className="conversation-list">
        <div className="search-row">
          <div className="search-box">搜索对话</div>
          <button><Plus /></button>
        </div>
        <div className="tabs"><span className="active">全部</span><span>置顶</span><span>今天</span></div>
        <div className="conversation-items">
          {customerConversations.map((item, index) => (
            <button className={index === 0 ? 'active' : ''} key={item.id}>
              {index === 0 ? <img src="/assets/host-portrait-chenyao.png" alt="" /> : <span className="conversation-icon"><ChatCircleDots /></span>}
              <div><strong>{item.title}</strong><p>{item.lastMessage || '咨询已创建'}</p></div>
              <time>{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</time>
            </button>
          ))}
          {!customerConversations.length && <div className="conversation-empty">发送第一条问题后，咨询记录会显示在这里。</div>}
        </div>
        <button className="new-chat"><Plus /> 新建对话</button>
      </aside>

      <main className="chat-workspace">
        <header className="chat-header">
          <div className="host-mini"><img src="/assets/host-portrait-chenyao.png" alt="" /><div><h1>宸垚老师 <span>在线</span></h1><p>AI 命理顾问 · <Check /> 命盘已载入</p></div></div>
          <div className="header-actions"><button>对话记录</button><button><Star /> 收藏</button></div>
        </header>

        <section className="message-stream">
          {messages.map((message, index) => (
            <Message key={`${message.role}-${index}`} avatar={message.role === 'assistant'} mine={message.role === 'user'} text={message.text} />
          ))}
          {typing && <Message avatar text="正在结合命盘与主理人知识库分析…" typing />}
        </section>

        <section className="composer-area">
          <div className="quick-row">
            {QUICK_QUESTIONS.map(({ label, icon: Icon, question }) => (
              <button key={label} onClick={() => send(question)}><Icon /> {label}</button>
            ))}
          </div>
          <div className="composer">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }} placeholder="输入你的问题，Shift + Enter 换行，Enter 发送" />
            <div className="composer-tools"><button><Image /></button><button><Paperclip /></button><button className="send" onClick={() => send()}><PaperPlaneRight /> 发送</button></div>
          </div>
          <p className="disclaimer">命理解读仅作传统文化与个人探索参考，不替代医疗、法律或投资建议。</p>
        </section>
      </main>

      <aside className="chart-drawer">
        <header><h2>命盘信息</h2><button>收起 <CaretDown /></button></header>
        <DrawerSection title="出生信息">
          <DataRow label="公历" value={`${form.date} ${form.time}`} />
          <DataRow label="性别" value={form.gender === 'male' ? '男' : '女'} />
          <DataRow label="出生地" value={form.location} />
        </DrawerSection>
        <DrawerSection title="时间校正">
          <DataRow label="经度校正" value={formatOffset(chart.longitudeMinutes)} />
          <DataRow label="均时差校正" value={formatOffset(chart.eotMinutes)} />
          <DataRow label="真太阳时" value={formatTime(chart.trueDate)} emphasis />
        </DrawerSection>
        <DrawerSection title="四柱八字">
          <div className="drawer-pillars">
            {chart.pillars.map((pillar) => <div key={pillar.label}><span>{pillar.label}</span><strong>{pillar.value[0]}</strong><strong>{pillar.value[1]}</strong><small>{pillar.shiShen}</small></div>)}
          </div>
        </DrawerSection>
        <DrawerSection title="起运与大运">
          <DataRow label="顺逆" value={chart.luck.forward ? '顺行' : '逆行'} />
          <DataRow
            label="起运"
            value={`${chart.luck.start.year}年${chart.luck.start.month}月${chart.luck.start.day}天${chart.luck.start.hour}时`}
          />
          <p className="luck-title">{selectedDaYun.ganZhi}运 <span>{selectedDaYun.startYear}—{selectedDaYun.endYear}</span></p>
          <DataRow label="大运十神" value={selectedDaYun.shiShen || '—'} />
          <DataRow label="年龄区间" value={`${selectedDaYun.startAge}—${selectedDaYun.endAge}岁`} />
          <div className="progress">
            <span style={{ width: `${Math.max(4, Math.min(100, ((selectedYear - selectedDaYun.startYear + 1) / 10) * 100))}%` }} />
          </div>
        </DrawerSection>
        <DrawerSection title={`流年 · ${selectedLiuNian.year} ${selectedLiuNian.ganZhi}`}>
          <DataRow label="流年十神" value={selectedLiuNian.shiShen || '—'} />
          <DataRow label="虚岁" value={`${selectedLiuNian.age}岁`} />
          <div className="year-picker">
            {selectedDaYun.liuNian.map((item) => (
              <button
                className={item.year === selectedYear ? 'active' : ''}
                key={item.year}
                onClick={() => setSelectedYear(item.year)}
              >
                <span>{item.year}</span>
                <strong>{item.ganZhi}</strong>
              </button>
            ))}
          </div>
        </DrawerSection>
        <p className="drawer-footnote">所有时间均为严格真太阳时 · 23:00 换日</p>
      </aside>
      </> : activePage === 'report'
        ? <CustomerReportPage chart={chart} form={form} onNavigate={setActivePage} />
        : activePage === 'history'
          ? <CustomerHistoryPage onNavigate={setActivePage} />
          : activePage === 'academy'
            ? <AcademyPage />
            : <CustomerReportPage chart={chart} form={form} onNavigate={setActivePage} />}
    </div>
  );
}

function Field({ label, helper, wide, children }) {
  return <label className={wide ? 'field wide' : 'field'}><span>{label} {helper && <small>{helper}</small>}</span>{children}</label>;
}

function Segmented({ value, options, onChange }) {
  return <div className="segmented">{options.map(([key, label]) => <button className={value === key ? 'active' : ''} key={key} onClick={() => onChange(key)}>{label}</button>)}</div>;
}

function TimeUnit({ label, value, note, emphasis }) {
  return <div className={emphasis ? 'time-unit emphasis' : 'time-unit'}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

function ChartPreview({ chart }) {
  return (
    <section className="chart-preview">
      <div className="section-title"><h2>四柱命盘</h2><span>已按真太阳时校正</span></div>
      <div className="pillar-grid">
        {chart.pillars.map((pillar) => (
          <div key={pillar.label}>
            <span>{pillar.label}</span>
            <strong>{pillar.value[0]}</strong>
            <strong className={pillar.label === '日柱' ? 'accent' : ''}>{pillar.value[1]}</strong>
            <small>{pillar.shiShen}</small>
          </div>
        ))}
      </div>
      <div className="luck-strip">
        <span>大运排盘</span>
        {chart.luck.daYun.slice(0, 6).map((item) => (
          <button className={item.index === chart.luck.currentDaYun?.index ? 'active' : ''} key={item.index}>
            {item.startYear} {item.ganZhi}
          </button>
        ))}
      </div>
    </section>
  );
}

function Message({ text, avatar, mine, typing }) {
  return (
    <div className={`message ${mine ? 'mine' : ''}`}>
      {avatar && <img src="/assets/host-portrait-chenyao.png" alt="" />}
      <div><p>{text}</p>{typing && <span className="typing"><i /><i /><i /></span>}<time>{mine ? '10:27' : '10:26'}</time></div>
    </div>
  );
}

function DrawerSection({ title, children }) {
  return <section className="drawer-section"><h3>{title}</h3>{children}</section>;
}

function DataRow({ label, value, emphasis }) {
  return <div className="data-row"><span>{label}</span><strong className={emphasis ? 'emphasis' : ''}>{value}</strong></div>;
}

const ADMIN_NAV = [
  ['overview', '经营概览', House],
  ['records', '客户档案', UsersThree],
  ['chart', '专业排盘', CalendarBlank],
  ['conversations', '对话管理', ChatCircleDots],
  ['knowledge', '提示词与知识库', BookOpen],
  ['settings', '系统设置', GearSix],
];

function AdminOverviewPage({ overview, customers, onNavigate }) {
  const metrics = [
    ['客户档案', overview.customers, '较上周 +3', UsersThree],
    ['累计咨询', overview.consultations, '本周 8 次', ChatCircleDots],
    ['今日活跃', overview.activeToday, '2 个待回复', TrendUp],
    ['AI 回复', overview.aiReplies, '本月用量', Sparkle],
  ];
  return (
    <main className="admin-content">
      <PageHeader eyebrow="管理中心" title="经营概览" description="客户、咨询和内容状态集中在一个工作台。" actions={<button className="primary" onClick={() => onNavigate('records')}><Plus /> 新建客户命盘</button>} />
      <section className="admin-metrics">
        {metrics.map(([label, value, note, Icon]) => <div key={label}><span><Icon /></span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></div>)}
      </section>
      <div className="admin-overview-grid">
        <section className="admin-card">
          <div className="section-title"><h2>待处理事项</h2><span>今日</span></div>
          <div className="task-list">
            <button onClick={() => onNavigate('conversations')}><i className="urgent" /><div><strong>2 条咨询等待人工确认</strong><p>AI 已生成初稿，需要主理人复核</p></div><ArrowRight /></button>
            <button onClick={() => onNavigate('records')}><i /><div><strong>3 个客户待补充出生信息</strong><p>缺少出生地或精确时间</p></div><ArrowRight /></button>
            <button onClick={() => onNavigate('knowledge')}><i /><div><strong>知识库有 1 条草稿</strong><p>「大运流年基础解释」尚未发布</p></div><ArrowRight /></button>
          </div>
        </section>
        <section className="admin-card">
          <div className="section-title"><h2>服务状态</h2><SealCheck /></div>
          <div className="service-status"><span className="provider-dot" /><div><strong>{overview.provider} · {overview.model}</strong><p>服务正常，流式回复已启用</p></div></div>
          <DataRow label="排盘引擎" value="lunar-javascript" />
          <DataRow label="真太阳时规则" value="已锁定" emphasis />
          <DataRow label="管理员会话" value="12 小时有效" />
        </section>
        <section className="admin-card span-two">
          <div className="section-title"><h2>最近客户动态</h2><button className="text-button" onClick={() => onNavigate('records')}>查看全部</button></div>
          <div className="recent-customer-table">
            {customers.slice(0, 4).map((item) => <button key={item.id} onClick={() => onNavigate('records')}><span className="record-avatar"><User /></span><strong>{item.name}</strong><span>{item.birthDate || '待补资料'}</span><span>{item.conversationCount || 0} 次咨询</span><time>{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</time><ArrowRight /></button>)}
            {!customers.length && <div className="empty-state"><UsersThree /><h3>暂无客户数据</h3><p>对客端完成排盘后会自动出现在这里。</p></div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminConversationsPage({ conversations, onRefresh }) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id || null);
  const [current, setCurrent] = useState(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!selectedId && conversations[0]?.id) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);
  useEffect(() => {
    if (!selectedId) return setCurrent(null);
    fetch(`/api/admin/conversations/${selectedId}`)
      .then((response) => response.ok ? response.json() : null)
      .then((value) => {
        setCurrent(value);
        setNote(value?.internalNote || '');
      });
  }, [selectedId]);
  async function updateReview(reviewStatus) {
    if (!current) return;
    const response = await fetch(`/api/admin/conversations/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewStatus, internalNote: note }),
    });
    if (response.ok) {
      setCurrent(await response.json());
      onRefresh?.();
    }
  }
  return (
    <main className="admin-content">
      <PageHeader eyebrow="服务质检" title="对话管理" description="查看 AI 回复、人工复核并处理客户咨询。" />
      <div className="admin-conversation-layout">
        <aside className="admin-thread-list">
          <div className="portal-search"><MagnifyingGlass /><input placeholder="搜索客户或主题" /></div>
          {conversations.map((item) => <button className={selectedId === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}><span className="record-avatar"><User /></span><div><strong>{item.customerName}</strong><p>{item.topic}</p></div><time>{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</time><em>{item.reviewStatus}</em></button>)}
        </aside>
        {current ? <section className="admin-thread-view">
          <header><div><h2>{current.customerName}</h2><p>{current.topic} · {current.birthDate || '出生资料待补充'}</p></div><span className="review-badge">{current.reviewStatus}</span></header>
          <div className="admin-message-area">
            {current.messages.map((message) => <Message key={message.id} mine={message.role === 'user'} avatar={message.role === 'assistant'} text={message.content} />)}
          </div>
          <div className="review-box"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="复核意见与内部备注" /><div><button className="ghost-button" onClick={() => updateReview('needs_revision')}>退回修改</button><button className="primary" onClick={() => updateReview('approved')}><Check /> 确认通过</button></div></div>
        </section> : <section className="admin-thread-view empty-state"><ChatCircleDots /><h3>暂无真实咨询</h3><p>客户在对客端发送问题后，对话会自动进入这里。</p></section>}
        <aside className="admin-customer-context">
          <h3>客户信息</h3>
          <DataRow label="客户" value={current?.customerName || '—'} />
          <DataRow label="出生日期" value={current?.birthDate || '待补充'} />
          <DataRow label="所在地" value={current?.location || '待补充'} />
          <h3>内部备注</h3>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="仅管理员可见" />
        </aside>
      </div>
    </main>
  );
}

function AdminKnowledgePage({ promptData, documents, onSaved }) {
  const [tab, setTab] = useState('prompt');
  const [saved, setSaved] = useState(false);
  const [prompt, setPrompt] = useState(promptData.current?.content || '');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  useEffect(() => setPrompt(promptData.current?.content || ''), [promptData.current?.id]);
  async function saveCurrentPrompt() {
    const response = await fetch('/api/admin/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: prompt }),
    });
    if (response.ok) {
      setSaved(true);
      onSaved?.();
    }
  }
  async function createDocument() {
    const response = await fetch('/api/admin/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: documentTitle, content: documentContent, status: 'draft' }),
    });
    if (response.ok) {
      setDocumentTitle('');
      setDocumentContent('');
      onSaved?.();
    }
  }
  return (
    <main className="admin-content">
      <PageHeader eyebrow="AI 内容中枢" title="提示词与知识库" description="管理宸垚老师的人设、回答规则和专业资料。" actions={<button className="primary" onClick={saveCurrentPrompt}><Check /> 保存新版本</button>} />
      {saved && <div className="settings-status"><Check /> 当前版本已保存</div>}
      <nav className="content-tabs">
        {[['prompt', '主理人人设'], ['rules', '回答规则'], ['library', '知识库文档'], ['versions', '版本记录']].map(([key, label]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>)}
      </nav>
      {tab === 'prompt' && <div className="knowledge-editor"><section><label>系统提示词</label><textarea value={prompt} onChange={(event) => { setPrompt(event.target.value); setSaved(false); }} /><p>{prompt.length} 个字符 · 对所有新对话生效</p></section><aside><h3>人设摘要</h3><span>温柔邻家姐姐</span><span>大白话表达</span><span>先结论后依据</span><span>不制造焦虑</span><h3>禁止项</h3><p>不预测生死、疾病诊断、赌博输赢或金融产品涨跌。</p></aside></div>}
      {tab === 'rules' && <section className="rule-management">{['只使用结构化命盘，不自行猜测四柱', '原局事实 → 当前大运 → 相关流年 → 现实建议', '信息不足时明确说明，不强行判断', '区分排盘数据、命理解释和现实建议'].map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p><button><NotePencil /></button></div>)}</section>}
      {tab === 'library' && <div className="library-workspace"><section className="library-list">{documents.map((item) => <div key={item.id}><BookOpen /><div><strong>{item.title}</strong><p>{item.status} · {new Date(item.updatedAt).toLocaleDateString('zh-CN')}</p></div><button className="ghost-button">编辑</button></div>)}{!documents.length && <div className="empty-state"><BookOpen /><h3>还没有知识库文档</h3><p>在右侧创建第一份专业资料。</p></div>}</section><aside className="library-create"><h3>新建文档</h3><input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} placeholder="文档标题" /><textarea value={documentContent} onChange={(event) => setDocumentContent(event.target.value)} placeholder="输入知识内容，后续将用于检索增强" /><button className="primary" disabled={!documentTitle.trim()} onClick={createDocument}><Plus /> 保存草稿</button></aside></div>}
      {tab === 'versions' && <section className="version-list">{promptData.versions.map((item, index) => <div key={item.id}><strong>v{item.version}</strong><p>{item.name}</p><time>{index === 0 ? '当前版本 · ' : ''}{new Date(item.createdAt).toLocaleDateString('zh-CN')}</time></div>)}</section>}
    </main>
  );
}

function AdminLogin({ configured, onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!configured && password !== confirm) return setError('两次密码输入不一致');
    setBusy(true);
    setError('');
    try {
      const response = await fetch(configured ? '/api/admin/login' : '/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '操作失败');
      onAuthenticated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-art"><img src="/assets/host-portrait-chenyao.png" alt="宸垚老师" /><div><p className="eyebrow">宸垚命馆</p><h1>内部管理中心</h1><p>客户档案、专业排盘、对话复核与 AI 知识配置。</p></div></div>
      <form className="admin-auth-card" onSubmit={submit}>
        <span className="auth-icon"><Key /></span>
        <p className="eyebrow">{configured ? '管理员登录' : '首次使用'}</p>
        <h2>{configured ? '欢迎回来' : '创建管理员密码'}</h2>
        <p>{configured ? '请输入管理端密码继续。' : '密码由服务端加密保存，至少 8 位。'}</p>
        <label><span>管理密码</span><input type="password" minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" /></label>
        {!configured && <label><span>确认密码</span><input type="password" minLength="8" required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="再次输入" /></label>}
        {error && <div className="auth-error">{error}</div>}
        <button className="primary auth-submit" disabled={busy}>{busy ? '处理中…' : configured ? '进入管理中心' : '创建并进入'}</button>
        <a href="/">返回对客端</a>
      </form>
    </div>
  );
}

function AdminApp({ chart, form }) {
  const [session, setSession] = useState({ loading: true, configured: false, authenticated: false });
  const [page, setPage] = useState('overview');
  const [overview, setOverview] = useState({ customers: 0, consultations: 0, activeToday: 0, aiReplies: 0, provider: 'DeepSeek', model: '—' });
  const [customers, setCustomers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [promptData, setPromptData] = useState({ current: null, versions: [] });
  const [documents, setDocuments] = useState([]);
  const [activeChart, setActiveChart] = useState(chart);
  const [activeForm, setActiveForm] = useState(form);

  async function refreshAdminData() {
    const [overviewResponse, customersResponse, conversationsResponse, promptsResponse, documentsResponse] = await Promise.all([
      fetch('/api/admin/overview'),
      fetch('/api/admin/customers'),
      fetch('/api/admin/conversations'),
      fetch('/api/admin/prompts'),
      fetch('/api/admin/knowledge'),
    ]);
    if (overviewResponse.ok) setOverview(await overviewResponse.json());
    if (customersResponse.ok) setCustomers(await customersResponse.json());
    if (conversationsResponse.ok) setConversations(await conversationsResponse.json());
    if (promptsResponse.ok) setPromptData(await promptsResponse.json());
    if (documentsResponse.ok) setDocuments(await documentsResponse.json());
  }

  async function checkSession() {
    try {
      const response = await fetch('/api/admin/session');
      const data = await response.json();
      setSession({ loading: false, ...data });
      if (data.authenticated) await refreshAdminData();
    } catch {
      setSession({ loading: false, configured: false, authenticated: false, error: true });
    }
  }

  useEffect(() => { checkSession(); }, []);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setSession((current) => ({ ...current, authenticated: false, configured: true }));
  }

  if (session.loading) return <div className="admin-loading"><Sparkle /> 正在载入管理中心…</div>;
  if (!session.authenticated) return <AdminLogin configured={session.configured} onAuthenticated={checkSession} />;

  const navigate = (target) => setPage(target === 'chat' ? 'conversations' : target);
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/"><span>宸<br />垚</span><div><strong>宸垚命馆</strong><small>管理中心</small></div></a>
        <nav>{ADMIN_NAV.map(([key, label, Icon]) => <button className={page === key ? 'active' : ''} key={key} onClick={() => setPage(key)}><Icon /><span>{label}</span></button>)}</nav>
        <div className="admin-profile"><img src="/assets/host-portrait-chenyao.png" alt="" /><div><strong>宸垚老师</strong><span>管理员</span></div><button aria-label="退出管理端" onClick={logout}><SignOut /></button></div>
      </aside>
      {page === 'overview'
        ? <AdminOverviewPage overview={overview} customers={customers} onNavigate={navigate} />
        : page === 'records'
          ? <div className="admin-page-wrap"><RecordsPage chart={activeChart} form={activeForm} records={customers} onNavigate={navigate} onSaved={refreshAdminData} onCreatedChart={(result) => {
            setActiveChart(result.chart);
            setActiveForm(result.form);
            setPage('chart');
          }} /></div>
          : page === 'chart'
            ? <div className="admin-page-wrap"><ProfessionalChartPage chart={activeChart} form={activeForm} onNavigate={navigate} /></div>
            : page === 'conversations'
              ? <AdminConversationsPage conversations={conversations} onRefresh={refreshAdminData} />
              : page === 'knowledge'
                ? <AdminKnowledgePage promptData={promptData} documents={documents} onSaved={refreshAdminData} />
                : <div className="admin-page-wrap"><SettingsPage chart={activeChart} /></div>}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [workspacePage, setWorkspacePage] = useState('chat');
  const [form, setForm] = useState({
    gender: 'male',
    calendar: 'solar',
    date: '1990-05-18',
    time: '12:30',
    location: '浙江省 杭州市 西湖区',
  });
  const chart = useMemo(() => calculateChart(form), [form]);
  const openWorkspace = async (page = 'chat') => {
    try {
      await fetch('/api/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth: {
            gender: form.gender,
            calendar: form.calendar,
            date: form.date,
            clockTime: form.time,
            location: form.location,
            longitude: chart.location.longitude,
            latitude: chart.location.latitude,
          },
          chart: buildChartContext(chart, form),
        }),
      });
    } catch {
      // The consultation can still open when local persistence is temporarily unavailable.
    }
    setWorkspacePage(page);
    setScreen('workspace');
  };

  if (window.location.pathname.startsWith('/admin')) return <AdminApp chart={chart} form={form} />;

  if (screen === 'landing') {
    return <LandingPage onStart={() => setScreen('intake')} onAcademy={() => {
      setWorkspacePage('academy');
      setScreen('workspace');
    }} />;
  }
  if (screen === 'intake') {
    return <Intake
      form={form}
      setForm={setForm}
      chart={chart}
      onComplete={() => openWorkspace('chat')}
      onOpenPage={openWorkspace}
      onHome={() => setScreen('landing')}
    />;
  }
  return <Consultation form={form} chart={chart} initialPage={workspacePage} onBack={() => setScreen('intake')} />;
}
