# 飞书自动同步接入

2026-10-19 已完成实际读取验证（8 条发布记录、47 条 CRM 记录），应用“祝越的智能助手”已获两份文档只读权限。每日北京时间 12:00（UTC 04:00）同步开关已开启；首次 GitHub Pages 部署仍在等待，尚未完成上线验证。GitHub Actions 校验成功后才会部署，网站在新部署成功前继续保留旧版本。

## 一次性配置

1. 在飞书自建应用中申请多维表格读取权限并发布生效；将应用添加为这两份多维表格的可阅读协作者。只需读取权限，不需要写入原表。
2. 在 https://github.com/yueee315/Kol-/settings/secrets/actions 添加 Repository secrets：
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
   不要放入聊天、公开源码、Actions variables 或网页 JavaScript。
3. 仓库 Settings → Pages → Build and deployment → Source 改为 **GitHub Actions**。
4. Actions → **Sync Feishu and deploy Pages** → Run workflow，验证读取、部署成功，并在网站核对人数、脚本链接、排期和最近同步时间。
5. 在 Settings → Secrets and variables → Actions → Variables 配置 `FEISHU_SYNC_ENABLED=true` 可启用每日定时任务及代码更新后的重新部署。当前开关已启用；首次上线仍需核对部署结果。

## 同步范围

- 发布表：Astra-agency 的指定表和视图，包含账号、平台、机构、日期、脚本、价格、权益、交付状态与发布链接。
- CRM：指定达人资产视图的现有字段白名单。`背景与备注` 不读取、不上传，页面显示“备注请查看飞书原表”，避免把收款资料自动公开。新增字段需人工决定是否纳入。
- KOL/KOC 规则不变：有报价或机构为 Youdao MRP 的达人归为 KOL，其余归为内部建联 KOC。
- 发布效果不在此次自动同步范围，保留真实采集时间，新增发布链接显示“尚未采集”。
- 网站的汇总、金额、完成率、分组、逾期提醒自动根据当次快照计算。

## 失败与维护

API 失败、分页异常、必要列缺失、重复达人名称、空表或超过半数记录消失会停止本次发布，网站保留最近成功版本。GitHub Actions 展示失败原因与执行状态；不会将原始记录、密钥或内部备注打印进日志。

定时任务是每天 12 点开始排队，GitHub 可能延迟执行，部署还需要几分钟；不是飞书修改后立即推送。公开仓库长期无活动时，GitHub 可能停用定时任务，需在 Actions 页面重新启用。可随时使用 Run workflow 手动补同步。

部署包仅包含六个网站文件，原始 API 响应不落盘、不进入公开仓库。自动同步数据发布至 Pages，仓库 data.js/crm-data.js 保留手动基线，排查时以网站“最近同步”时间和 Actions 结果为准。

停止定时同步：将 `FEISHU_SYNC_ENABLED` 设为 `false`。这会保留当前线上版本。

## 本地验证

```sh
node --test scripts/sync-feishu.test.mjs
node --check app.js
```

凭证已通过环境变量注入时，可执行 `node scripts/sync-feishu.mjs`，输出目录 `_site/`。不要以 shell 明文参数传递密钥。只有成功构建才允许上传部署包。

官方参考：[飞书列出记录](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/list)、[GitHub 自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
