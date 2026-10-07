# Contributing

## 环境要求

- **Node.js 18+**（CI 矩阵为 18 / 20 / 22；`package-lock.json` 是 `lockfileVersion 3`，Node 16 自带的 npm 8 无法消费它）

## 提 PR 前的本地自检（与 CI 完全一致）

```bash
npm ci
npm test                     # mocha，343 用例
npm run prepublish-check     # 包名一致性 / 依赖口径 / npm pack 产物白名单
npm run build:browser        # 仅当改动 lib/ 或 browser-version/ 时需要
```

> ⚠️ 若改动了 `lib/`、`browser-version/build-modern.js` 或 `browser-version/browser-specific/`，
> 必须运行 `npm run build:browser` 并**提交 `browser-version/out/` 下的产物**。
> CI 有一条断言会比对「重新构建的产物」与「仓库里提交的产物」，不一致即失败。

## CI 会检查什么

| Job | 内容 |
|---|---|
| `test / node 18, 20, 22` | `npm test` + `npm run prepublish-check` |
| `browser build (esbuild)` | 构建成功 + bundle 不引用 Node 内置 `stream` + 产物与源码同步 |

PR 需全部通过后方可合并。

## 提交信息

沿用 Conventional Commits：`feat:` / `fix:` / `docs:` / `ci:` / `chore:` / `test:`。

## 行为约定（都是踩过的坑）

- **包名**：本 fork 的包名是 `@raolin2025/nedb-promise`。npm 上无 scope 的 `nedb-promise` 属于另一个项目（jrop 的 promise wrapper，2022 年后未更新），README 与示例中不得使用无 scope 名 —— `prepublish-check` 会拦截。
- **依赖口径**：本包**不是**零依赖（运行时仍有 `binary-search-tree` / `localforage` / `mkdirp`），文档中不得声称"零依赖"或 `Dependencies: None`。
- **npm 凭据**：只放在用户级 `~/.npmrc`。项目级 `.npmrc` 优先级更高，在此内嵌 token 会静默覆盖用户级配置并导致 `401`（曾因此排查了数小时级的问题）。
- **不要提交**：`.npmrc`、`workspace/`、`test/`、`benchmarks/`、`test_lac/`（`.gitignore` 与 package.json 的 `files` 白名单已覆盖，请勿放宽）。

## 分支保护与 required checks

`main` 与 `modernization-p1` 启用了 ruleset（名称「分支保护规则」，Target: 这两个分支）：

- 变更需通过 pull request，且 **4 项 CI 检查全部通过**：
  `test / node 18`、`test / node 20`、`test / node 22`、`browser build (esbuild)`
- 禁止 force push、禁止删除分支
- `Required approvals = 0` —— 不需要他人批准，CI 绿即可合并

⚠️ **两个容易踩的点**

1. **required check 按 job 名匹配**。若修改了 `.github/workflows/ci.yml` 里的 `jobs.<id>.name`，
   必须同步更新 ruleset 中的 required checks —— 否则旧名字会永远停在
   *Expected — waiting for status*，导致所有 PR 都无法合并。
2. ruleset 的 `Bypass list` 含 `Repository admin (Always allow)`，**维护者可绕过上述规则直推**
   （push 时 GitHub 会打印 `Bypassed rule violations: ...` 作为提示，属正常现象）。
   如需规则对所有人（含维护者）生效，则移除该 bypass —— 届时变更只能走 PR。

## 发布

由维护者打 tag 触发 CI 发布（`v*` → 校验 tag 与版本一致 → 测试 → 校验 → `npm publish --provenance`），详见 README 的 **Release Process**。
