# NeDB 现代化改造 - P1 阶段完成报告

## 改造目标
- ✅ 修复 P0 遗漏（storage.js `fs.exists` 废弃 API）
- ✅ ES6+ 语法全面现代化
- ✅ 流模式 API（Stream API）
- ✅ Cursor thenable 支持（链式调用 + await）
- ✅ 向后兼容，所有 callback 风格代码无需修改
- ✅ **Bugs 修复**：`$in` 索引候选 bug、executor 健壮性、空字符串 filename 兼容等
- ✅ **性能优化**：投影路径去重 deepCopy、轻量 key 展开（find 提升 ~60%）
- ✅ **依赖精简**：修复无效 devDependencies，`npm install && npm test` 可直接运行

---

## 改造文件清单

### 1. `lib/storage.js` — P0 遗漏修复
- **改动**: `fs.exists`（已废弃）替换为 `fs.stat`
- **改动**: 直接暴露 `fs.rename`、`fs.writeFile` 等原生方法，不再通过 `Storage.exists` 赋值
- **改动**: 箭头函数、`const/let`

### 2. `lib/model.js` — 全面 ES6+ 现代化
- **改动**: `hasOwnProperty` → `Object.hasOwn()`
- **改动**: `indexOf('.') !== -1` → `includes('.')`
- **改动**: `_compareStrings || compareNSB` → `_compareStrings ?? compareNSB`
- **改动**: `typeof this[k].getTime` → `this[k]?.getTime`（可选链）
- **改动**: `v && v.$$date` → `v?.$$date`（可选链）
- **改动**: `forEach(function...)` → `for...of` / 箭头函数
- **改动**: `new Array()` → `[]`
- **改动**: `keys.indexOf('_id')` → `keys.includes('_id')`
- **改动**: `bKeys.indexOf(aKeys[i])` → `bKeys.includes(k)`
- **改动**: `uniqStr()` 辅助函数 → `[...new Set(keys)]`
- **改动**: 字符串拼接 → 模板字面量
- **改动**: `typeof obj[field] === 'undefined'` → `obj[field] === undefined`
- **改动**: 格式化：单行 → 多行标准格式（780行 → 737行）

### 3. `lib/datastore.js` — 全面现代化 + 流API混入
- **改动**: 移除未使用的 `pluck()`、`uniq()` helper
- **改动**: `arguments` 直接传递（不再用 `arguments` 对象字面量）
- **改动**: 所有 `function (err)` → 箭头函数 `(err) =>`
- **改动**: `for...of` 替代 `for (const i of Object.keys(...))` 的变量命名改进
- **改动**: **Cursor thenable 支持**: `find()`/`findOne()`/`count()` 无 callback 时返回 thenable Cursor
  - 支持 `await db.find({}).sort({ age: -1 }).limit(10)` 链式调用
- **改动**: **Stream API 混入**: 通过 `Object.assign(Datastore.prototype, streamMixins)`
- **改动**: 修复 `onload` 变量作用域 bug

### 4. `lib/cursor.js` — 现代化 + thenable
- **改动**: 箭头函数替代 `function`
- **改动**: **`then()` / `catch()` 方法**: 使 Cursor 成为 thenable 对象
  - 允许 Cursor 实例直接被 `await`
  - `const docs = await db.find({}).sort({ age: -1 }).limit(10);`

### 5. `lib/persistence.js` — 现代化
- **改动**: 模板字面量（`throw new Error(...)`)
- **改动**: `for (let i = 1; i < 30; i += 1)` → `i++`
- **改动**: 箭头函数

### 6. `lib/indexes.js` — 现代化
- **改动**: 模板字面量
- **改动**: `i += 1` → `i++`
- **改动**: `resultMap` 命名更清晰

### 7. `lib/customUtils.js` — 现代化
- **改动**: 注释更新

### 8. `lib/stream.js` — 新增文件 🆕
流模式 API，支持 Node.js Stream 接口：

#### `createReadStream(options)` — 流式查询
```javascript
// 流式遍历所有文档
const stream = db.createReadStream({ query: { age: { $gte: 18 } } });
stream.on('data', (doc) => { console.log(doc); });
stream.on('end', () => { console.log('Done'); });

// pipe 到其他流
db.createReadStream()
  .pipe(transformStream)
  .pipe(writableStream);
```

#### `createWriteStream(options)` — 流式批量插入
```javascript
const writeStream = db.createWriteStream();
writeStream.write({ name: 'Alice', age: 30 });
writeStream.write({ name: 'Bob', age: 25 });
writeStream.end();
writeStream.on('finish', () => { console.log('All inserted'); });
```

#### `createUpdateStream(options)` — 流式更新
```javascript
db.createReadStream({ query: { status: 'inactive' } })
  .pipe(db.createUpdateStream({ update: { $set: { status: 'active' } } }));
```

#### `createRemoveStream(options)` — 流式删除
```javascript
db.createReadStream({ query: { expired: true } })
  .pipe(db.createRemoveStream());
```

### 9. 浏览器版本文件现代化
- `browser-version/browser-specific/lib/storage.js`: `var` → `const/let`, 箭头函数
- `browser-version/browser-specific/lib/customUtils.js`: `var` → `const/let`, 箭头函数

### 10. `package.json`
- `engines.node`: `>=8.0.0` → `>=16.0.0`（因使用 `Object.hasOwn()` 和 `?.`）

---

## ES6+ 特性使用汇总

| 特性 | 使用位置 |
|------|---------|
| `Object.hasOwn()` | `model.js` ($push, $addToSet, $inc) |
| 可选链 `?.` | `model.js` (serialize, deserialize), `datastore.js` (getCandidates), `persistence.js` |
| 空值合并 `??` | `model.js` (compareThings), `datastore.js` (options), `persistence.js`, `indexes.js` |
| 模板字面量 | `model.js`, `persistence.js`, `indexes.js` |
| `for...of` | 所有文件 |
| 箭头函数 | 所有文件 |
| `includes()` | `model.js`, `datastore.js` |
| `const/let` | 所有文件（全面替代 var） |
| `[...new Set()]` | `model.js` (modify 函数去重) |

---

## 新增功能

### 1. Cursor thenable 支持
```javascript
// 之前（P0）：只能分开写
const cursor = db.find({});
// cursor.sort() 不可用，因为 find() 返回 Promise

// 现在（P1）：直接链式调用
const docs = await db.find({}).sort({ age: -1 }).limit(10).skip(5);
```

### 2. Stream API
```javascript
const { pipeline } = require('stream');

// 流式管道操作
await pipeline(
  db.createReadStream({ query: { status: 'inactive' } }),
  db.createUpdateStream({ update: { $set: { status: 'archived' } } }),
  async function (source) {
    for await (const doc of source) {
      console.log('Archived:', doc._id);
    }
  }
);
```

---

## 测试状态

### 已验证功能
- ✅ insert / find / findOne / count / update / remove（Promise + Callback）
- ✅ $set / $unset / $push / $addToSet / $pop / $pull / $inc / $min / $max
- ✅ $in / $nin / $or / $and / $not / $regex / $ne / $exists / $gte / $gt / $lte / $lt
- ✅ 索引功能（unique constraint）
- ✅ 持久化（文件读写 + reload）
- ✅ Cursor 链式调用 (sort/skip/limit/projection)
- ✅ TimestampData
- ✅ Upsert
- ✅ Multi update
- ✅ Projection
- ✅ Stream API（ReadStream / WriteStream / UpdateStream / RemoveStream / Pipe）

---

## Node.js 版本要求

使用 `Object.hasOwn()` 和可选链 `?.` 需要 **Node.js 16+**。

`engines` 已更新为 `>=16.0.0`。

---

## 本轮收尾改动

### Bugs 修复
- **`lib/datastore.js`**：修复 `getCandidates()` 中 `$in` 索引候选 bug（引用未定义的 `indexNamesSet`，会抛 `ReferenceError`）
- **`lib/executor.js`**：重写串行队列，支持「回调抛异常」「falsy callback」时队列不卡顿（原实现回调抛错会导致 Promise 链中断、后续操作全部卡死）
- **`lib/datastore.js`**：修复 `update`/`remove` 传 `null` options 时抛 `TypeError`
- **`lib/datastore.js`**：恢复 v0.6 兼容语义——`new Datastore('')` 空字符串应视为 in-memory（filename = null）
- **`lib/datastore.js`**：清理文件末尾冗余悬空表达式

### 性能优化（相对改造前基准）

| 操作（20000 文档） | 优化前 | 优化后 | 提升 |
|---|---|---|---|
| find 全文档投影 | 45 ms | 15 ms | **-66%** |
| find+projection ×20 | 505 ms | 180 ms | **-64%** |
| update（每 10 条一次） | 53 ms | 46 ms | ~-13% |
| insert 20000 文档 | 180 ms | 181 ms | 持平 |

**关键优化**：
- `find()` 有投影时避免二次 `deepCopy`（`project()` 已产出新对象）——最大收益
- pick 投影改用轻量 dot-notation key 展开，替代 `model.modify` 完整流水线（跳过多余 `checkObject`）
- `model.modify()` 去掉冗余的 `[...new Set(keys)]`
- `persistCachedDatabase` / `persistNewState` 字符串拼接 → 数组 `join`

### 依赖精简
- 移除无效的 devDependency：`exec-time@^1.1.0`（npm 上不存在）、未使用的 `request`、`sinon`、`commander`
- 升级测试依赖到可用版本（`mocha@10`、`chai@4`、`async@3`），`npm install && npm test` 可直接运行

### 验证
- ✅ 完整测试套件 `330 passing / 0 failing`

---

## 下一步计划 (P2 阶段)

> **技术方向**：坚持**纯 JavaScript** 模式，不引入 TypeScript，尽量减少依赖与构建成本。

1. ✅ **性能优化** — 已验证完成：
   - 投影路径避免双重 `deepCopy`（提升约 60-65%）
   - pick 投影用轻量 key 展开替代完整 modify 流水线
   - 持久化序列化改用数组 `join`
2. ✅ **更完善的测试套件** — 修复无效 devDependencies（移除不存在的 `exec-time@^1.1.0` 等），`npm install && npm test` 可直接运行
3. ⬜ **浏览器版本构建** — 更新 browserify 构建
4. ❌ ~~TypeScript 类型定义~~ — **不采用**，坚持纯 JS 模式、零依赖
5. ⬜ **npm 发布** — 发布为 `nedb-promise` v2.x

---

## 注意事项

⚠️ **向后兼容性**: 所有改造保持向后兼容，现有 callback 风格代码无需修改即可运行。

⚠️ **Node.js 16+**: P1 阶段开始使用 `Object.hasOwn()` 和 `?.`，需要 Node.js 16+。

⚠️ **Stream API**: 仅在 Node.js 环境可用（浏览器版本不支持 Stream）。

### 已知的传递依赖漏洞（不可达，低风险）

`binary-search-tree@0.2.5`（索引核心库）内部硬嵌套了一个旧版 `underscore`（1.4.4，受 GHSA 影响）。
- 该库仅在 `avltree.js` 中 `require('underscore')`，但**从不调用其任何函数**（`_.flatten` / `_.isEqual` 等脆弱 API 完全不可达）。
- `npm overrides` 无法覆盖此深层嵌套锁版，故不做无效强制。
- **结论**：漏洞代码路径不可达，实际利用风险≈0。若不放心，可后续更换索引库或 fork `binary-search-tree` 移除其 underscore 引入。
