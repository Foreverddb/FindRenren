# 寻之绘馆静态部署审计报告

审计日期：2026-07-27  
模拟地址：`http://127.0.0.1:4180/findxx/`

## 结论

该项目是完整的纯前端应用。运行时只需要静态 HTTP 文件服务，调色、Canvas 合成、图片导入导出和两套人像抠图均在浏览器中执行，不依赖应用服务器、数据库、后端 API、云函数或远程模型接口。

项目已经过 GitHub Pages 项目子路径模拟验证，可以通过仓库内置的 GitHub Actions 工作流完整部署到 `https://用户名.github.io/仓库名/`。自定义域名和用户根站点同样适用。

## 原始阻塞项与修复

| 项目 | 原始状态 | 修复结果 |
| --- | --- | --- |
| 静态资源路径 | 使用 `/assets/`、`/models/` 等根路径，项目子路径会 404 | 改为 Vite 相对基址与运行时站点基址解析 |
| Transformers.js 模型路径 | 固定 `/models/` | 根据当前部署目录生成同源 pathname，例如 `/findxx/models/` |
| BEN2 Git 提交 | 单文件 219,121,675 bytes，超过 GitHub 100 MiB 硬限制 | 拆为 5 个小于 50 MiB 的普通 Git 分片，构建时重组 |
| 模型完整性 | 无构建期校验 | 重组及发布审计均校验 SHA-256 |
| Pages 发布 | 无部署配置 | 增加官方 Pages Actions 工作流 |
| 发布产物检查 | 无 | 增加路径、资源、模型哈希、分片大小和站点总大小检查 |

## 线上故障诊断：`blog.yuki-ddb.cn/FindRenren/`

2026-07-27 对线上地址进行了浏览器与 HTTP 实测。页面返回 200，但返回内容是仓库根目录中的开发版 `index.html`，不是 Vite 生成的 `dist/index.html`。

| 线上信号 | 实测结果 | 含义 |
| --- | --- | --- |
| favicon 地址 | `/FindRenren/%BASE_URL%favicon.svg`，404 | Vite 占位符没有经过构建替换 |
| 模块入口 | `https://blog.yuki-ddb.cn/src/main.js`，404 | 根路径脚本引用越过了 `/FindRenren/` |
| 样式表数量 | 0 | `src/style.css` 依赖 Vite 从 JS 导入，脚本未运行所以页面无样式 |
| Canvas 展示尺寸 | 1176 × 1224 CSS px | 初始化脚本未运行，Canvas 保留 HTML 属性尺寸且内容为空 |
| 自定义部署工作流 | 构建、静态审计通过，`Configure Pages` 失败 | GitHub Pages 没有配置为 Actions 发布源 |
| 平台部署工作流 | `pages build and deployment` 成功 | 当前使用的是从 `main` 分支直接发布 |

失败工作流为 [Deploy static frontend to GitHub Pages #1](https://github.com/Foreverddb/FindRenren/actions/runs/30217636769)。GitHub 的原始错误为：`Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions`。

### 根因与修复

根因是仓库 **Settings > Pages > Build and deployment > Source** 选择了 **Deploy from a branch**。这种模式会直接发布 `main` 根目录，而本项目必须先执行 Vite 构建并发布 `dist/`。

将 Source 改成 **GitHub Actions** 后，在 Actions 页面手动运行 `Deploy static frontend to GitHub Pages`，或向 `main` 推送新提交。该设置属于 GitHub 仓库的外部配置，不能仅通过提交代码替代。工作流已把 Pages 配置检查移动到 251 MB 构建之前，设置错误时会快速失败。

### 修复路径模拟复测

使用生产 `dist/` 在 `http://127.0.0.1:4181/FindRenren/` 模拟与线上完全相同的项目子路径，验证结果如下：

- 生产模块入口：1 个，来自 `./assets/index-*.js`
- 生产样式表：1 个，来自 `./assets/index-*.css`
- 页面初始化：通过，识别 548,848 个目标像素并关闭加载遮罩
- 本地图片：企鹅原图、顶栏 Logo 与毛笔字标题均成功加载
- 页面标题：保持 `寻之绘馆`
- 横向溢出：0

## 产物审计

| 指标 | 结果 |
| --- | ---: |
| 静态文件数量 | 13 |
| 发布总大小 | 251,487,413 bytes |
| BEN2 FP16 | 219,121,675 bytes，SHA-256 通过 |
| MODNet q8 | 6,632,188 bytes，SHA-256 通过 |
| 根路径资源引用 | 0 |
| 最大仓库分片 | 47,185,920 bytes |
| GitHub Pages 1 GB 发布限制 | 通过 |

## 子路径浏览器验证

- 桌面视口：1440 × 1000，通过
- 手机视口：390 × 844，通过，横向溢出 0
- 原图载入、调色、文字、Logo、人物完整替换：通过
- BEN2 高质量实际推理：通过
- MODNet 低质量实际推理：通过
- 高低质量缓存切换：通过
- PNG 导出 1176 × 1224：通过
- 外部模型请求：0
- 浏览器控制台错误：0

## 平台边界

GitHub Pages 官方限制为：源仓库建议不超过 1 GB、发布站点不超过 1 GB、部署不超过 10 分钟、月度软带宽 100 GB；GitHub 普通 Git 文件超过 100 MiB 会被阻止。本项目通过分片解决 Git 文件限制，发布产物容量也在 Pages 范围内。

首次访问按产品要求会静默加载两套模型及 WASM，冷缓存传输约 250 MB。GitHub Pages 可以完整运行，但更适合个人展示或低流量使用。其他静态平台只有在允许约 251 MB 站点和 219 MB 单文件响应时才能完整部署；存在更低单文件上限的平台不能直接完整托管高质量 BEN2。
