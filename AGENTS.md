# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Product structure

- Customer destinations: AI 咨询、我的命盘、咨询记录、命理学堂.
- Administrator destinations: 经营概览、客户档案、专业排盘、对话管理、提示词与知识库、系统设置.
- Product now has two surfaces: customer `/` and administrator `/admin`.
- Customer navigation must never expose other customers, internal notes, professional case management, prompts, API/model settings, or operational metrics.
- Administrator combines proprietor and super-admin responsibilities for the current small team.
- Admin access must be enforced by server-side session checks; hiding frontend navigation is not sufficient.
- Persistent product data uses the local SQLite database at `data/chenyao.sqlite`; never replace database-backed customer, conversation, prompt, knowledge, or overview data with hard-coded demo arrays.
- Customer identity is currently an HttpOnly anonymous browser cookie until phone/WeChat login is implemented.
- Administrator credentials are stored as a salted scrypt hash in SQLite; never expose or move the password hash to frontend code.
- Both customer-side and administrator-created charts must use the shared `src/bazi.js` calculation module so the two surfaces cannot drift.
- Administrator-created customer records collect public identity/contact fields separately from the immutable birth inputs used for chart calculation.
- Preserve the existing cinnabar / earth / gold palette and refined Chinese editorial styling.
- Professional chart information should follow the density and hierarchy of WenZhen Bazi references, while avoiding direct visual cloning.
- User-facing explanations should remain plain-language, gentle, practical, and structurally rigorous.
- Never simplify or silently change the locked calculation rules: Li Chun year boundary, exact Jie Qi month boundary, true-solar-time 23:00 day change, traditional luck direction, and three days per year.
