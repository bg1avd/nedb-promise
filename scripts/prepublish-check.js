#!/usr/bin/env node
/**
 * Pre-publish consistency check for @raolin2025/nedb-promise.
 *
 * 把历史上"发布后才发现"的两个坑固化为机器检查：
 *   1) 包名一致性 —— README 的安装命令 / 示例 / badge 必须使用 package.json 的真实 name。
 *      背景：README 曾写成无 scope 的 `nedb-promise`，而 npm 上该名字属于另一个项目
 *      (jrop/nedb-promise)，用户按 README 安装会装到别人的包上。
 *   2) 依赖口径一致性 —— README 不得声称"零依赖"，对比表必须列出真实的运行时依赖。
 *   3) 发布内容白名单 —— `npm pack` 产物不得包含 test/ benchmarks/ MODERNIZATION_*.md .npmrc 等噪音。
 *      背景：1.8.1 的 tarball 曾泄漏 59 个文件（含测试、基准、阶段报告）。
 *
 * 用法:
 *   node scripts/prepublish-check.js     # 手动
 *   npm run prepublish-check             # 同上
 *   npm publish                          # 由 prepublishOnly 自动强制执行
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const errors = [];
const warnings = [];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const rel = (p) => path.relative(ROOT, p) || p;

let pkg;
try {
  pkg = JSON.parse(read('package.json'));
} catch (e) {
  console.error(`✖ 无法解析 package.json: ${e.message}`);
  process.exit(1);
}

const NAME = pkg.name;                       // @raolin2025/nedb-promise
const BARE = NAME.replace(/^@[^/]+\//, '');  // nedb-promise
const ENCODED = NAME.replace('/', '%2F');    // @raolin2025%2Fnedb-promise
const deps = Object.keys(pkg.dependencies || {});
let readme;
try {
  readme = read('README.md');
} catch (e) {
  errors.push('README.md 不存在或不可读');
  readme = '';
}

/* ---------- 1. 包名一致性 ---------- */

if (!readme.includes(`npm install ${NAME}`)) {
  errors.push(`README 缺少正确的安装命令：npm install ${NAME}`);
}
if (!readme.includes(`require('${NAME}')`)) {
  errors.push(`README 示例未使用真实包名：require('${NAME}')`);
}
if (!readme.includes(ENCODED)) {
  errors.push(`README 的 npm badge 未使用编码后的 scoped 包名（应为 ${ENCODED}）`);
}

// 负向断言：不得出现"安装/引用无 scope 裸名"的命令
const bareInstall = new RegExp(`(?:npm install|yarn add)\\s+${BARE}(?![\\w@/-])`);
if (bareInstall.test(readme)) {
  errors.push(`README 出现无 scope 安装命令（会装到别人的包）: npm install ${BARE}`);
}
const bareRequire = new RegExp(`require\\(['"]${BARE}['"]\\)`);
if (bareRequire.test(readme)) {
  errors.push(`README 出现无 scope 引用（会加载别人的包）: require('${BARE}')`);
}

/* ---------- 2. 依赖口径一致性 ---------- */

const depRow = readme.split('\n').find((l) => /^\|\s*Dependencies\s*\|/.test(l));
if (deps.length > 0) {
  if (/Dependencies\s*\|\s*[^|\n]*\|\s*None\s*\|/i.test(readme)) {
    errors.push(`对比表声称 Dependencies: None，但 package.json 有 ${deps.length} 个运行时依赖`);
  }
  if (/零运行时依赖/.test(readme)) {
    errors.push('README 声称"零运行时依赖"，与实际不符');
  }
  if (/\*\*Zero Dependencies\*\*/.test(readme)) {
    errors.push('README 使用无限定语的 "Zero Dependencies"，实际仍有运行时依赖');
  }
  if (!depRow) {
    errors.push('README 对比表缺少 Dependencies 行，无法核对依赖口径');
  } else {
    const missing = deps.filter((d) => !depRow.includes(d));
    if (missing.length > 0) {
      errors.push(`README 的 Dependencies 行未列出实际依赖: ${missing.join(', ')}`);
    }
  }
}

/* ---------- 3. 版本 / Changelog ---------- */

if (!new RegExp(`###\\s*Version\\s*${pkg.version.replace(/\./g, '\\.')}\\b`).test(readme)) {
  warnings.push(`README Changelog 中没有 "### Version ${pkg.version}" 小节（建议补上）`);
}

/* ---------- 4. 发布内容白名单（真实 npm pack 产物） ---------- */

const FORBIDDEN = [
  [/^test\//, '测试目录 test/'],
  [/^test_lac\//, '测试目录 test_lac/'],
  [/^benchmarks\//, '基准目录 benchmarks/'],
  [/^MODERNIZATION_/, '阶段报告 MODERNIZATION_*.md'],
  [/^\.claude-code\//, 'AI 会话目录 .claude-code/'],
  [/^workspace\//, '本地数据目录 workspace/'],
  [/^bower\.json$/, '过时的 bower.json'],
  [/(^|\/)\.npmrc$/, '含有 auth token 的 .npmrc'],
  [/(^|\/)\.git($|\/)/, 'git 元数据'],
  [/\.test\.js$/, '测试文件 *.test.js'],
  [/\.tgz$/, '打包产物本身'],
  [/^README_PROMISE\.md$/, '冗余文档 README_PROMISE.md'],
];

let packedFiles = null;
try {
  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const out = execFileSync(npmBin, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const parsed = JSON.parse(out);
  packedFiles = (Array.isArray(parsed) ? parsed[0] : parsed).files.map((f) => f.path);
} catch (e) {
  errors.push(`npm pack --dry-run 失败: ${(e.stderr || e.message || '').toString().trim().split('\n')[0]}`);
}

if (packedFiles) {
  for (const file of packedFiles) {
    for (const [re, label] of FORBIDDEN) {
      if (re.test(file)) errors.push(`发布产物包含不应发布的${label}: ${file}`);
    }
  }
  for (const required of ['index.js', 'lib/datastore.js', 'lib/stream.js', 'browser-version/out/nedb.min.js', 'README.md', 'LICENSE']) {
    if (!packedFiles.includes(required)) errors.push(`发布产物缺少必需文件: ${required}`);
  }
}

/* ---------- 报告 ---------- */

console.log(`prepublish-check ${NAME} v${pkg.version}`);
console.log(`  README 包名/依赖口径：已核对`);
if (packedFiles) console.log(`  npm pack 产物：${packedFiles.length} 个文件，白名单校验完成`);

if (warnings.length > 0) {
  console.log('\n⚠️  警告：');
  warnings.forEach((w) => console.log(`  - ${w}`));
}

if (errors.length > 0) {
  console.error('\n✖ 发布前检查未通过：');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('\n✅ 发布前检查全部通过');
