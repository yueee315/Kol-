# Astra-agency · KOL 发布看板

Astra-agency 的 KOL 合作和发布进度看板，使用原生 HTML、CSS、JavaScript，无需安装依赖或构建。

## 在线网站

当前已部署的站点：https://astra-agency-kol-board.chenjiaxuechen22.chatgpt.site

该站点保留原有访问权限。GitHub 中的修改不会自动同步至此站点。

## 功能

- 发布总览、交付完成率、逾期跟进与待确认排期。
- 按交付状态分组的进度看板。
- KOL 明细、脚本链接、发布链接及合作详情。
- 达人资产库的 12 个字段与匹配资料。
- 机构、平台、状态筛选和关键词搜索。
- 导出当前筛选结果为 CSV。

## 数据说明

数据快照日期为 **2026-10-16**，未接入飞书自动同步。

- `data.js`：Astra-agency 的 8 位 KOL 及合作、排期、脚本和发布信息。
- `crm-data.js`：达人资产库表头及 6 位匹配达人的资料。Pro AE、Sorin 未匹配。
- 未填写字段与未匹配记录分别标注；下单价格的币种在源表中未注明。
- 本仓库包含合作价格、联系方式及内部业务资料，当前保持私有。

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

仓库文件已按静态站点根目录组织。检查仓库 Settings → Pages 的可用性；在当前私有仓库和账户套餐下，GitHub 提示需升级套餐或公开仓库才能启用 Pages，因此本次未启用 GitHub Pages。

此静态应用本身不提供登录控制。启用公开托管前，需要先处理业务数据的访问权限；不要将私有仓库直接视为网站访问控制。

## 更新数据

编辑 `data.js` 与 `crm-data.js` 后，需同时更新 `app.js` 中的快照基准及 `index.html` 中的日期、汇总说明，并核对概览数字与源数据一致。当前概览包含固定快照统计，不会自动跟随源表刷新。

只运行语法检查即可检查 JavaScript 解析：

```sh
node --check app.js
node --check data.js
node --check crm-data.js
```
