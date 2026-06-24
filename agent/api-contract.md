# `/api/chat` 接口约定

前端发送 `POST /api/chat`：

```json
{
  "version": "chenyao-bazi-v1",
  "systemPromptId": "chenyao-bazi-v1",
  "chart": {
    "rules": {},
    "birth": {},
    "solarTimeAudit": {},
    "originalChart": {},
    "selectedContext": {}
  },
  "conversation": [],
  "question": "未来三年的事业发展如何？",
  "responsePreferences": {}
}
```

后端以 `text/plain` 流式返回正文。前端读取每个文本片段并即时更新同一条消息。

前端在接口不存在或请求失败时自动使用演示回复，因此可以先开发页面，再接入任意兼容大模型。

生产环境要求：

- API Key 仅存放在服务端环境变量。
- 服务端加载系统提示词，不接受前端传入任意 system prompt。
- 服务端重新校验命盘对象，不信任浏览器直接提交的数据。
- 保存提示词版本、模型版本、命盘快照和回答记录，便于审计与回归测试。
