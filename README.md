# 寻之绘馆

寻之绘馆是一个完全在浏览器中运行的静态前端应用。调色、文字与 Logo 合成、PNG 导出以及 MODNet/BEN2 人像抠图均在本地浏览器完成，不需要应用服务器、数据库、后端 API 或远程模型服务。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm ci
npm run dev
```

`npm run dev` 和 `npm run build` 会先检查本地 BEN2 权重；在全新克隆的仓库中，它会从 `model-parts/ben2/` 的 5 个分片无损重组并校验 SHA-256。

生产构建与静态审计：

```bash
npm run build
npm run verify:static
```

最终可部署目录是 `dist/`。由于应用使用 ES Module、WASM 和浏览器模型请求，不能直接双击 `index.html` 以 `file://` 打开；任何普通静态 HTTP 服务器均可运行它。

## GitHub Pages

项目已包含 `.github/workflows/deploy-pages.yml`。将仓库推送到 GitHub 后，在仓库的 **Settings > Pages > Build and deployment** 中选择 **GitHub Actions**，随后推送到 `main` 或 `master` 即会自动构建和发布。

Vite 使用相对部署基址，因此用户站点、自定义域名和 `https://用户名.github.io/仓库名/` 项目子路径都能正确加载入口、原图、WASM 与本地模型。

BEN2 原始权重为 219,121,675 bytes，超过 GitHub 普通 Git 文件 100 MiB 的硬限制。仓库中保存的是 5 个均小于 50 MiB 的分片，Actions 构建时重组成发布文件；这不依赖 Git LFS，也不会改变模型内容。

## 托管限制

构建产物约 251 MB，低于 GitHub Pages 发布站点 1 GB 限制。首次打开会按现有产品要求静默加载两套模型及 WASM，冷缓存流量约 250 MB；GitHub Pages 的月度软带宽限制为 100 GB，因此适合个人展示和低流量使用，不适合作为高流量模型分发服务。

其他纯静态平台也能运行该应用，但托管方必须允许约 251 MB 的站点和 219 MB 的单个静态响应。若平台有更低的单文件上限，需要改用对象存储/CDN 托管 BEN2，或只部署低质量 MODNet，不能直接宣称完整兼容。

GitHub 官方限制：

- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
