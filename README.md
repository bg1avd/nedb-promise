# NeDB Promise

> **A modernized fork of [NeDB](https://github.com/louischatriot/nedb) with Promise/async-await support**

[![npm version](https://img.shields.io/npm/v/@raolin2025%2Fnedb-promise.svg)](https://www.npmjs.com/package/@raolin2025/nedb-promise)
[![CI](https://github.com/bg1avd/nedb-promise/actions/workflows/ci.yml/badge.svg)](https://github.com/bg1avd/nedb-promise/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📦 About

**NeDB Promise** is a modernized version of the popular embedded JavaScript database [NeDB](https://github.com/louischatriot/nedb). It maintains 100% backward compatibility with the original NeDB while adding native Promise support and removing outdated dependencies.

### 🔥 Key Features

- ✅ **Native Promise Support** - All APIs now support Promise/async-await
- ✅ **No Legacy Dependencies** - Removed `underscore` and `async`（运行时仅剩 3 个：`binary-search-tree` / `localforage` / `mkdirp`）
- ✅ **ES6+ Modernized** - Using native JavaScript methods
- ✅ **100% Backward Compatible** - Your existing code still works
- ✅ **Embedded & Persistent** - Same great features as NeDB
- ✅ **MongoDB-like API** - Familiar and easy to use

### ⚠️ Important Notice

> This is a **fork** of the original [NeDB](https://github.com/louischatriot/nedb) project by Louis Chatriot. The original project is no longer maintained. This fork modernizes the codebase while preserving all original functionality.

**Original Project**: https://github.com/louischatriot/nedb  
**License**: MIT (same as original)

---

## 🚀 Quick Start

### Installation

```bash
npm install @raolin2025/nedb-promise --save
# or
yarn add @raolin2025/nedb-promise
```

> ⚠️ **包名注意**：npm 上不带 scope 的 `nedb-promise` 是**另一个项目**（jrop 的 "promise wrapper around the nedb package"，2022 年后未再更新），与本 fork 无关。本 fork 的包名是 **`@raolin2025/nedb-promise`**，请务必使用 scoped 名安装。

### Usage with async/await (Recommended)

```javascript
const Datastore = require('@raolin2025/nedb-promise');
const db = new Datastore({ filename: 'data.db' });

async function main() {
  // Insert
  const doc = await db.insert({ name: 'Alice', age: 30 });
  console.log('Inserted:', doc);
  
  // Find
  const results = await db.find({ age: { $gte: 18 } });
  console.log('Adults:', results);
  
  // Find One
  const person = await db.findOne({ name: 'Alice' });
  console.log('Found:', person);
  
  // Update
  const updated = await db.update({ name: 'Alice' }, { $set: { age: 31 } });
  console.log('Updated:', updated);
  
  // Remove
  const removed = await db.remove({ name: 'Alice' });
  console.log('Removed:', removed);
  
  // Count
  const count = await db.count({});
  console.log('Total:', count);
}

main().catch(console.error);
```

### Usage with Callbacks (Backward Compatible)

```javascript
const Datastore = require('@raolin2025/nedb-promise');
const db = new Datastore({ filename: 'data.db' });

db.insert({ name: 'Bob', age: 25 }, function (err, doc) {
  if (err) return console.error(err);
  console.log('Inserted:', doc);
});

db.find({ age: { $gte: 18 } }, function (err, docs) {
  if (err) return console.error(err);
  console.log('Adults:', docs);
});
```

---

## 🪟 Windows Conda 环境使用指南

如果你在 Windows 的 Conda `kmax` 环境中开发或使用本项目，请按照以下步骤操作：

### 1. 激活 Conda 环境
```bash
conda activate kmax
```

> 注意：如果是在 Windows Command Prompt/PowerShell 中使用，需要先运行 `conda init` 初始化终端后再执行上述命令；如果使用 Git Bash/WSL，步骤一致。

### 2. 安装依赖
#### 作为项目依赖安装
```bash
npm install @raolin2025/nedb-promise --save
# 或使用 yarn
yarn add @raolin2025/nedb-promise
```

#### 开发本项目
```bash
# 克隆仓库到本地后
npm install
```

### 3. 运行测试与开发
```bash
# 运行单元测试
npm test

# 本项目无额外构建步骤，直接修改代码即可
```

---

## 📖 API

All original NeDB APIs are supported. Here are the main operations:

### Creating a Database

```javascript
// In-memory only
const db = new Datastore();

// Persistent with filename
const db = new Datastore({ filename: 'data.db' });

// With options
const db = new Datastore({
  filename: 'data.db',
  autoload: true,           // Auto-load on creation
  timestampData: true       // Auto-add createdAt and updatedAt
});
```

### Insert Documents

```javascript
// Single document
const doc = await db.insert({ name: 'Alice', age: 30 });

// Multiple documents
const docs = await db.insert([
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 35 }
]);
```

### Find Documents

```javascript
// Find all
const all = await db.find({});

// Find with query
const adults = await db.find({ age: { $gte: 18 } });

// Find one
const first = await db.findOne({ name: 'Alice' });

// With projection
const withNameOnly = await db.find({}, { name: 1, _id: 0 });

// With sorting and limiting
const sorted = await db.find({})
  .sort({ age: -1 })
  .limit(10)
  .skip(5);
```

### Update Documents

```javascript
// Update one
const updated = await db.update(
  { name: 'Alice' },
  { $set: { age: 31 } }
);

// Update multiple
const multi = await db.update(
  { age: { $lt: 18 } },
  { $set: { status: 'minor' } },
  { multi: true }
);

// Upsert
const upserted = await db.update(
  { name: 'Unknown' },
  { $set: { status: 'new' } },
  { upsert: true }
);
```

### Remove Documents

```javascript
// Remove one
const removed1 = await db.remove({ name: 'Alice' });

// Remove multiple
const removedMany = await db.remove({ status: 'inactive' }, { multi: true });
```

### Count Documents

```javascript
const count = await db.count({ age: { $gte: 18 } });
```

### Indexes

```javascript
// Create index
await db.ensureIndex({ fieldName: 'name', unique: true });

// Remove index
await db.removeIndex('name');
```

---

## 🔁 Migration from NeDB

Migration is **100% seamless**. Simply replace the import:

```javascript
// Before
const Datastore = require('nedb');

// After
const Datastore = require('@raolin2025/nedb-promise');
```

All your existing callback-based code will continue to work. Additionally, you can now use Promise/async-await syntax!

---

## 🆚 Comparison with Original NeDB

| Feature | NeDB (Original) | NeDB Promise (This Fork) |
|---------|----------------|--------------------------|
| Promise Support | ❌ | ✅ |
| async/await | ❌ | ✅ |
| Dependencies | underscore, async | 3 个（binary-search-tree / localforage / mkdirp）；已移除 underscore / async |
| ES6+ Syntax | ❌ | ✅ |
| Backward Compatible | - | ✅ 100% |
| Browser Support | ✅ | ✅ |
| TypeScript Types | ❌ | ❌ (纯 JS 模式，无额外依赖) |

---

## 🛠️ Development

### Running Tests

```bash
npm install
npm test
```

### Release Process

发布前的三道闸门完全一致（单测 → `prepublish-check` → 浏览器产物一致性），两条路径任选：

**1. CI 自动发布（推荐）** —— 打 tag 触发，不依赖本机凭据：

```bash
npm version patch --no-git-tag-version   # 同时更新 package.json 与 package-lock.json 的版本
# 手工补 README 的 Changelog 小节
git commit -am "release: v2.0.3"
git tag v2.0.3
git push <remote> v2.0.3
```

`.github/workflows/release.yml` 会依次校验「tag 与 `package.json` 版本一致」→ 单测 → `prepublish-check` → 浏览器产物同步 → `npm publish --provenance`（附带来源证明）→ 创建 GitHub Release。
*前置条件*：仓库需配置 `NPM_TOKEN` secret（Settings → Secrets and variables → Actions）。

**2. 本地发布（应急）**：`npm publish`（`prepublishOnly` 自动跑校验）。
⚠️ 若走 npm 的 manual PUT 兜底通道，它**不会**触发 `prepublishOnly`，务必先手动 `npm run prepublish-check`。

### Pre-publish Checks

发布前自动校验（`npm publish` 会通过 `prepublishOnly` 强制执行）：

```bash
npm run prepublish-check
```

检查内容：
1. README 的安装命令引用的包名 == `package.json` 的 `name`（含无 scope 裸名/错误 badge 的负向断言）
2. README 的依赖口径与 `package.json` 的 `dependencies` 一致（不得声称项目没有运行时依赖）
3. `npm pack` 产出的文件清单不含 `test/` `benchmarks/` `test_lac/` `MODERNIZATION_*.md` `.npmrc` 等不应发布的内容

### Contributing

见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

### Modernization Progress

- [x] **P0**: Remove underscore/async, add Promise support
- [x] **P1**: ES6 class refactoring
- [x] **P2**: Performance optimizations
- [x] **P4**: Stream API
- [x] **纯 JS 模式**：不引入 TypeScript，不增加任何构建/类型依赖（运行时依赖仅 3 个，见对比表）

> **技术方向**：本项目坚持**纯 JavaScript** 模式，不添加 TypeScript 定义/构建工具，保持零额外构建步骤与极简运行时依赖。

See `MODERNIZATION_P0.md` / `MODERNIZATION_P1.md` for detailed changes.

---

## 📝 Changelog

### Version 2.0.2

- 📛 **文档/元数据修复**：README 全部安装命令与示例改为真实包名 `@raolin2025/nedb-promise`（此前写成无 scope 的 `nedb-promise`，会指向 npm 上 jrop 的另一个包）
- 🏷️ npm badge 改为 scoped 编码 URL，不再显示其它项目的版本号
- 📊 依赖口径修正：对比表 `Dependencies` 由 `None` 更正为实际的 3 个运行时依赖（此前 "Zero Dependencies" 仅指移除 underscore/async）
- 🔒 新增 `scripts/prepublish-check.js` + `prepublishOnly`：发布前自动断言包名一致、依赖口径一致、tarball 不含测试/文档噪音
- 📄 `MODERNIZATION_P1.md` 待办清单回填（浏览器构建、npm 发布均已完成）

### Version 2.0.0 / 2.0.1

- 🚀 P2：性能优化（投影查询提速约 60%）、esbuild 浏览器构建，极简运行时体积
- 🧹 移除 tarball 中的测试/基准/文档噪音（`.npmignore` + `files` 白名单）

### Version 1.8.1 (Modernized)

- ✨ Added native Promise support to all APIs
- 🗑️ Removed `underscore` dependency
- 🗑️ Removed `async` dependency  
- 🔧 Modernized executor with Promise chain
- 📦 Updated all internal code to ES6+
- ✅ 100% backward compatible with NeDB 1.8.0

---

## 🙏 Acknowledgments

This project is a fork of the excellent [NeDB](https://github.com/louischatriot/nedb) database by Louis Chatriot. All credit for the original design and implementation goes to the original author.

**Original Repository**: https://github.com/louischatriot/nedb  
**Original License**: MIT

---

## 📄 License

MIT License - same as the original NeDB project.

Copyright (c) 2026 Rao Lin (fork author)  
Based on NeDB by Louis Chatriot
