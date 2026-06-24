import {
  addMessage,
  database,
  getConversation,
  getOrCreateActiveConversation,
  getOverview,
  listConversations,
  listCustomers,
  listKnowledgeDocuments,
  saveCustomerProfile,
  saveKnowledgeDocument,
  savePrompt,
  updateCustomer,
} from '../server/database.mjs';

const testId = `test-${Date.now()}`;
database.exec('BEGIN');

try {
  const customer = saveCustomerProfile(testId, {
    gender: 'female',
    calendar: 'solar',
    date: '1993-02-11',
    clockTime: '17:00',
    location: '陕西省 西安市 新城区',
    longitude: 108.96,
    latitude: 34.27,
  }, {
    originalChart: {
      pillars: [
        { label: '年柱', value: '癸酉' },
        { label: '月柱', value: '甲寅' },
        { label: '日柱', value: '癸亥' },
        { label: '时柱', value: '庚申' },
      ],
      dayMaster: '癸',
    },
    solarTimeAudit: { trueSolarTime: '1993-02-11T16:01:00.000Z' },
  });

  if (!customer?.id || customer.pillars.length !== 4) throw new Error('customer/chart persistence failed');
  const updatedCustomer = updateCustomer(customer.id, {
    name: '测试客户',
    phone: '13800138000',
    tags: ['事业', '重点'],
    followupStatus: 'following',
    adminNote: '下周回访',
  });
  if (updatedCustomer.phone !== '13800138000' || updatedCustomer.followupStatus !== 'following' || updatedCustomer.tags.length !== 2) {
    throw new Error('customer management fields failed');
  }

  const conversation = getOrCreateActiveConversation(customer.id, '测试事业问题');
  addMessage(conversation.id, 'user', '测试事业问题');
  addMessage(conversation.id, 'assistant', '这是数据库回写测试。');

  const detail = getConversation(conversation.id);
  if (detail?.messages.length !== 2) throw new Error('message persistence failed');

  const customers = listCustomers().filter((item) => item.publicId === testId);
  const conversations = listConversations({ customerId: customer.id });
  if (customers.length !== 1 || conversations.length !== 1) throw new Error('database query failed');

  const prompt = savePrompt({ key: `test-${testId}`, content: '这是一个长度足够的数据库提示词版本测试内容。' });
  if (prompt.version !== 1) throw new Error('prompt version persistence failed');
  saveKnowledgeDocument({ title: '数据库知识文档测试', content: '测试内容' });
  if (!listKnowledgeDocuments().some((item) => item.title === '数据库知识文档测试')) throw new Error('knowledge document persistence failed');

  const overview = getOverview();
  if (overview.customers < 1 || overview.consultations < 1 || overview.aiReplies < 1) throw new Error('overview aggregation failed');

  console.log('PASS database schema, profile, chart, conversation, message, prompt, knowledge and overview');
} finally {
  database.exec('ROLLBACK');
}
