# Astra-agency · KOL 发布看板

Astra-agency 的 KOL 合作和发布进度看板，使用原生 HTML、CSS、JavaScript，无需安装依赖或构建。

## 在线网站

GitHub Pages 看板：[打开网站](https://yueee315.github.io/Kol-/)。

原 Sites 站点：https://astra-agency-kol-board.chenjiaxuechen22.chatgpt.site ，保留原有访问权限；GitHub 中的修改不会自动同步至该 Sites 站点。

## 功能

- 发布总览、交付完成率、逾期跟进与待确认排期。
- 按交付状态分组的进度看板。
- KOL 明细、脚本链接、发布链接及合作详情。
- 达人资产库的全部 47 位达人、12 个字段，以及 2 位仅发布表达人；共 49 位，可筛选达人状态、机构和平台。
- 机构、平台、状态筛选和关键词搜索。
- 导出当前筛选结果为 CSV。

## 数据说明

数据快照日期为 **2026-10-16**，未接入飞书自动同步。

- `data.js`：Astra-agency 的 8 位 KOL 及合作、排期、脚本和发布信息。
- `crm-data.js`：达人资产库全部 47 位达人的资料；其中 6 位关联现有发布表。Pro AE、Sorin 仅见于发布表，合并展示后共 49 位。
- 资产库新增 41 位达人，不计入 Astra-agency 的 8 条交付记录统计。
- 主页链接优先使用资产库有效地址，缺失时补用发布表；不推测占位符链接。
- 收款账户信息未包含在公开数据中，请在飞书原表查看。
- 未填写字段与未匹配记录分别标注；下单价格的币种在源表中未注明。
- 本仓库与 GitHub Pages 网站已按所有者确认设为公开。

## 本地运行

在仓库目录执行：

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 http://127.0.0.1:4173 。

## 文件

| 文件 | 用途 |
| --- | --- |
| `index.html` | 页面结构 |
| `styles.css` | 样式与响应式布局 |
| `app.js` | 筛选、详情、统计与导出 |
| `data.js` | 发布表数据快照 |
| `crm-data.js` | 达人资产库数据快照 |
| `.nojekyll` | 静态文件部署标记 |

## GitHub Pages

已启用 GitHub Pages，发布来源为 `main` 分支的 `/ (root)`，强制使用 HTTPS。

向 `main` 提交更新后，GitHub 会自动重新部署至 https://yueee315.github.io/Kol-/ 。这只更新仓库中的静态网站，不会自动读取飞书最新数据。

## 更新数据

编辑 `data.js` 与 `crm-data.js` 后，需同时更新 `app.js` 中的快照基准及 `index.html` 中的日期、汇总说明，并核对概览数字与源数据一致。当前概览包含固定快照统计，不会自动跟随源表刷新。

只运行语法检查即可检查 JavaScript 解析：

```sh
node --check app.js
node --check data.js
node --check crm-data.js
```
