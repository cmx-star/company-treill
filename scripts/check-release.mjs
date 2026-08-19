import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const marketplaceRoot = path.join(repoRoot, "marketplace");
const indexPath = path.join(marketplaceRoot, "index.json");
const workflowPath = path.join(
  marketplaceRoot,
  "workflows",
  "company-default.md",
);
const companySpecRoot = path.join(
  marketplaceRoot,
  "specs",
  "company",
);
const skillsRoot = path.join(repoRoot, "skills");
const packagePath = path.join(repoRoot, "package.json");
const registrySource =
  "https://github.com/cmx-star/company-treill/tree/main/marketplace";
const workflowSource =
  "https://github.com/cmx-star/company-treill/tree/main/marketplace";
const requiredNodeVersion = "22.20.0";
const companySkills = [
  "company-git-workflow",
  "company-product-variants",
];
const staticOnly = process.argv.includes("--static-only");

const errors = [];
const checked = {
  marketplaceEntries: 0,
  companySpecs: 0,
  companySkillSources: 0,
  workflowLines: 0,
  workflowSteps: 0,
  workflowStates: 0,
  packageMetadata: false,
  gitDiff: false,
  e2e: staticOnly ? "已跳过" : "未执行",
};

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function fail(message) {
  errors.push(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    fail(
      `无法读取 ${relative(filePath)}：${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return "";
  }
}

function readJson(filePath) {
  const raw = readText(filePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(
      `${relative(filePath)} 不是有效 JSON：${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertTextFormat(filePath) {
  const raw = readText(filePath);
  if (!raw) return;
  if (!raw.endsWith("\n")) {
    fail(`${relative(filePath)} 缺少文件末尾换行。`);
  }
  raw.split("\n").forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      fail(`${relative(filePath)}:${index + 1} 包含行尾空白。`);
    }
  });
}

function walkFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        fail(`${relative(absolutePath)} 不得是符号链接。`);
        continue;
      }
      if (entry.isDirectory()) walk(absolutePath);
      else if (entry.isFile()) files.push(absolutePath);
      else fail(`${relative(absolutePath)} 不是普通文件。`);
    }
  };
  walk(directory);
  return files.sort();
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: "utf-8",
    maxBuffer: 20 * 1024 * 1024,
    shell: process.platform === "win32" && command !== process.execPath,
  });
}

function commandOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
}

function requireSuccess(result, label) {
  if (result.error) {
    throw new Error(`${label} 无法执行：${result.error.message}`);
  }
  const output = commandOutput(result);
  if (/\bError:/.test(output)) {
    throw new Error(`${label} 报错：\n${output.slice(-6000)}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${label} 失败（退出码 ${String(result.status)}）${
        output ? `：\n${output.slice(-6000)}` : "。"
      }`,
    );
  }
  return commandOutput(result);
}

function validateGitDiff() {
  const result = run("git", ["diff", "--check", "HEAD", "--"]);
  if (result.error || result.status !== 0) {
    fail(
      `Git 差异包含行尾空白、冲突标记或其他格式错误。${
        commandOutput(result) ? `\n${commandOutput(result)}` : ""
      }`,
    );
    return;
  }
  checked.gitDiff = true;
}

function validateMarketplace() {
  const index = readJson(indexPath);
  if (!isRecord(index)) return;
  expect(index.version === 1, "index.json 的 version 必须为 1。");
  expect(
    Array.isArray(index.templates),
    "index.json 必须包含 templates 数组。",
  );
  if (!Array.isArray(index.templates)) return;

  const expected = new Map([
    ["company-spec", { type: "spec", path: "marketplace/specs" }],
    [
      "company-default",
      {
        type: "workflow",
        path: "workflows/company-default.md",
      },
    ],
  ]);
  expect(index.templates.length === expected.size, "marketplace 只能发布两个模板。");

  const seen = new Set();
  for (const entry of index.templates) {
    if (!isRecord(entry)) {
      fail("marketplace templates 包含非对象条目。");
      continue;
    }
    const rule = expected.get(entry.id);
    expect(Boolean(rule), `marketplace 包含未知模板：${String(entry.id)}`);
    if (!rule) continue;
    expect(!seen.has(entry.id), `marketplace 重复模板：${entry.id}`);
    seen.add(entry.id);
    expect(entry.type === rule.type, `${entry.id} 的 type 必须为 ${rule.type}。`);
    expect(entry.path === rule.path, `${entry.id} 的 path 必须为 ${rule.path}。`);
    expect(typeof entry.name === "string" && entry.name, `${entry.id} 缺少 name。`);
    expect(
      typeof entry.description === "string" && entry.description,
      `${entry.id} 缺少 description。`,
    );
    const target = path.resolve(
      entry.type === "workflow" ? marketplaceRoot : repoRoot,
      entry.path,
    );
    expect(
      target.startsWith(`${repoRoot}${path.sep}`),
      `${entry.id} 的路径越出仓库。`,
    );
    expect(fs.existsSync(target), `${entry.id} 指向不存在的路径：${entry.path}`);
    checked.marketplaceEntries += 1;
  }
  for (const id of expected.keys()) {
    expect(seen.has(id), `marketplace 缺少模板：${id}`);
  }

  const rootEntries = fs.readdirSync(marketplaceRoot).sort();
  expect(
    JSON.stringify(rootEntries) ===
      JSON.stringify(["index.json", "specs", "workflows"]),
    "marketplace 目录只能包含 index.json、specs 和 workflows。",
  );
  assertTextFormat(indexPath);
}

function validateCompanySpecs() {
  const expectedFiles = [
    "engineering.md",
    "quality.md",
    "security.md",
  ];
  const actualFiles = walkFiles(companySpecRoot).map((filePath) =>
    path.relative(companySpecRoot, filePath).split(path.sep).join("/"),
  );
  expect(
    JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
    `公司 Spec 文件必须精确为：${expectedFiles.join("、")}。`,
  );
  for (const fileName of expectedFiles) {
    const filePath = path.join(companySpecRoot, fileName);
    expect(fs.existsSync(filePath), `缺少公司 Spec：${relative(filePath)}`);
    if (fs.existsSync(filePath)) {
      assertTextFormat(filePath);
      expect(
        readText(filePath).startsWith("# "),
        `${relative(filePath)} 必须以一级标题开始。`,
      );
      checked.companySpecs += 1;
    }
  }
}

function parseSkillFrontmatter(content, filePath) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail(`${relative(filePath)} 缺少标准 YAML frontmatter。`);
    return {};
  }
  const values = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    values[key] = value;
  }
  return values;
}

function validateCompanySkillSources() {
  const actualEntries = fs.existsSync(skillsRoot)
    ? fs.readdirSync(skillsRoot).sort()
    : [];
  expect(
    JSON.stringify(actualEntries) === JSON.stringify(companySkills),
    `公司 Skill 源目录必须精确为：${companySkills.join("、")}。`,
  );
  for (const skillName of companySkills) {
    const skillDirectory = path.join(skillsRoot, skillName);
    const skillPath = path.join(skillDirectory, "SKILL.md");
    const files = walkFiles(skillDirectory).map((filePath) =>
      path.relative(skillDirectory, filePath).split(path.sep).join("/"),
    );
    expect(
      JSON.stringify(files) === JSON.stringify(["SKILL.md"]),
      `${skillName} 目录只能包含 SKILL.md。`,
    );
    if (!fs.existsSync(skillPath)) continue;
    assertTextFormat(skillPath);
    const content = readText(skillPath);
    const frontmatter = parseSkillFrontmatter(content, skillPath);
    expect(frontmatter.name === skillName, `${relative(skillPath)} 的 name 不匹配。`);
    expect(
      typeof frontmatter.description === "string" &&
        frontmatter.description.length >= 20,
      `${relative(skillPath)} 缺少可用的 description。`,
    );
    expect(
      content.includes("\n# "),
      `${relative(skillPath)} 缺少一级标题。`,
    );
    checked.companySkillSources += 1;
  }
}

function extractWorkflowStep(content, stepId) {
  const lines = content.split("\n");
  const heading = new RegExp(`^####\\s+${stepId.replace(".", "\\.")}\\b`);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return "";
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("#### ") || line.startsWith("## ") || line === "---") {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function validateWorkflow() {
  const content = readText(workflowPath);
  if (!content) return;
  const workflowLines = content.split("\n").length - 1;
  expect(
    workflowLines === 777,
    `Workflow 必须保留当前发布版 777 行，实际为 ${workflowLines} 行。`,
  );
  checked.workflowLines = workflowLines;
  const headings = [
    "## Phase Index",
    "## Phase 1: Plan",
    "## Phase 2: Execute",
    "## Phase 3: Finish",
  ];
  let previousIndex = -1;
  for (const heading of headings) {
    const count = content.split("\n").filter((line) => line === heading).length;
    expect(count === 1, `Workflow 必须且只能包含一个精确标题：${heading}`);
    const index = content.indexOf(heading);
    expect(index > previousIndex, `Workflow 标题顺序错误：${heading}`);
    previousIndex = index;
  }

  const requiredSteps = [
    "1.0",
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
    "2.1",
    "2.2",
    "2.3",
    "2.4",
    "3.1",
    "3.2",
    "3.3",
  ];
  const seenSteps = [...content.matchAll(/^####\s+(\d+\.\d+)\b.*$/gm)].map(
    (match) => match[1],
  );
  for (const stepId of requiredSteps) {
    expect(
      seenSteps.filter((value) => value === stepId).length === 1,
      `Workflow 必须且只能包含一个步骤：${stepId}`,
    );
    expect(
      extractWorkflowStep(content, stepId).split("\n").length >= 5,
      `Workflow 步骤内容过短或无法提取：${stepId}`,
    );
    checked.workflowSteps += 1;
  }

  const phaseIndexStart = content.indexOf("## Phase Index");
  const phaseOneStart = content.indexOf("## Phase 1: Plan");
  const states = [
    "no_task",
    "planning",
    "planning-inline",
    "in_progress",
    "in_progress-inline",
    "completed",
  ];
  for (const state of states) {
    const open = `[workflow-state:${state}]`;
    const close = `[/workflow-state:${state}]`;
    expect(content.split(open).length - 1 === 1, `Workflow 状态入口不唯一：${state}`);
    expect(content.split(close).length - 1 === 1, `Workflow 状态出口不唯一：${state}`);
    const index = content.indexOf(open);
    expect(
      index > phaseIndexStart && index < phaseOneStart,
      `Workflow 状态必须位于 Phase Index：${state}`,
    );
    checked.workflowStates += 1;
  }

  expect(content.includes("自动路由"), "Workflow 缺少自动路由说明。");
  expect(
    !content.includes(".trellis/spec/company/git-workflow.md") &&
      !content.includes(".trellis/spec/company/product-variants.md"),
    "Workflow 仍把专项 Skill 当作公司 Spec。",
  );
  assertTextFormat(workflowPath);
}

function validatePackageMetadata() {
  const packageJson = readJson(packagePath);
  if (isRecord(packageJson)) {
    expect(packageJson.name === "company-trellis", "package.json 的 name 不正确。");
    expect(packageJson.private === true, "公司分发仓库必须保持 private。");
    expect(packageJson.type === "module", "package.json 的 type 必须为 module。");
    expect(
      !Object.prototype.hasOwnProperty.call(packageJson, "bin"),
      "package.json 不得声明 company-trellis bin；Spec/Workflow 必须走官方 Trellis 命令。",
    );
    expect(
      isRecord(packageJson.engines) &&
        packageJson.engines.node === `>=${requiredNodeVersion}`,
      `package.json 必须要求 Node >=${requiredNodeVersion}。`,
    );
    expect(
      !Object.prototype.hasOwnProperty.call(packageJson, "files"),
      "package.json 不得声明 files；本仓库不作为 npm 分发包使用。",
    );
  }

  expect(!fs.existsSync(path.join(repoRoot, "bin")), "不得保留 bin 聚合安装器目录。");
  checked.packageMetadata = true;
}

function validateDocsAndExamples() {
  const requiredFiles = [
    "README.md",
    "CHANGELOG.md",
    "docs/features.md",
    "docs/usage.md",
    "docs/release.md",
    "scripts/check-release.mjs",
  ];
  for (const fileName of requiredFiles) {
    const filePath = path.join(repoRoot, fileName);
    expect(fs.existsSync(filePath), `缺少发布文件：${fileName}`);
    if (fs.existsSync(filePath)) assertTextFormat(filePath);
  }

  const docs = ["README.md", "docs/features.md", "docs/usage.md", "docs/release.md"]
    .map((fileName) => readText(path.join(repoRoot, fileName)))
    .join("\n");
  for (const fragment of [
    "Spec Marketplace",
    "Custom Workflow",
    "Node 22.20.0",
    "company-git-workflow/SKILL.md",
    "company-product-variants/SKILL.md",
    "--registry",
    "--template company-spec",
    "--workflow company-default",
    "--workflow-source",
    "trellis update",
    "trellis workflow --marketplace",
    registrySource,
    workflowSource,
  ]) {
    expect(docs.includes(fragment), `文档缺少官方接入片段：${fragment}`);
  }
  const secureShell = String.fromCharCode(115, 115, 104);
  for (const forbidden of [
    "git+" + secureShell,
    "git" + "@github.com",
    secureShell + " -T",
    "fnm" + " exec",
    "git+https://github.com/cmx-star/" + "company-treill.git",
    "company-trellis" + " install",
    "company-trellis" + " update",
    "skills" + ".sh",
    "skills" + "-lock.json",
    "npm exec --yes --package=" + "skills",
    "skills" + " add https://github.com/cmx-star/company-treill.git " + "--skill",
    "skills" + " add https://github.com/cmx-star/company-treill.git --copy " + "--agent",
    "--team-registry",
    "trellis team",
    "team-manifest.json",
    "team-defaults.yaml",
    "team-channel.json",
    ".trellis/spec/company/git-workflow.md",
    ".trellis/spec/company/product-variants.md",
  ]) {
    expect(!docs.includes(forbidden), `当前文档仍包含未发布能力：${forbidden}`);
  }

  const exampleRoot = path.join(
    repoRoot,
    "examples",
    "project-spec",
    ".trellis",
    "spec",
    "project",
  );
  for (const fileName of ["index.md", "architecture.md", "commands.md", "testing.md"]) {
    const filePath = path.join(exampleRoot, fileName);
    expect(fs.existsSync(filePath), `缺少项目规范示例：${relative(filePath)}`);
    if (fs.existsSync(filePath)) assertTextFormat(filePath);
  }
}

function validateRemovedTeamLayout() {
  for (const obsoletePath of [
    "index.json",
    "registry",
    "channel",
    "bin",
    "scripts/build-manifest.mjs",
    "marketplace/specs/company/git-workflow.md",
    "marketplace/specs/company/product-variants.md",
  ]) {
    expect(
      !fs.existsSync(path.join(repoRoot, obsoletePath)),
      `仍残留旧分发路径：${obsoletePath}`,
    );
  }
}

function resolveTrellisCommand() {
  const configured = process.env.TRELLIS_CLI?.trim();
  if (configured) {
    if (configured.endsWith(".js")) {
      return { command: process.execPath, prefix: [configured] };
    }
    return { command: configured, prefix: [] };
  }
  return {
    command: "trellis",
    prefix: [],
  };
}

function runTrellis(cli, args, cwd, env) {
  return run(cli.command, [...cli.prefix, ...args], { cwd, env });
}

function parseVersion(raw) {
  const match = raw.match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1, 4).map(Number) : null;
}

function isAtLeast0615(version) {
  if (!version) return false;
  const [major, minor, patch] = version;
  return major > 0 || minor > 6 || (minor === 6 && patch >= 15);
}

function validateOfficialCliE2E() {
  const cli = resolveTrellisCommand();
  const versionResult = runTrellis(cli, ["--version"], repoRoot, process.env);
  const versionOutput = requireSuccess(versionResult, "读取 Trellis 版本");
  expect(
    isAtLeast0615(parseVersion(versionOutput)),
    `Trellis 版本必须不低于 0.6.15，实际为 ${versionOutput || "未知"}。`,
  );

  const initHelp = requireSuccess(
    runTrellis(cli, ["init", "--help"], repoRoot, process.env),
    "读取 trellis init 帮助",
  );
  const workflowHelp = requireSuccess(
    runTrellis(cli, ["workflow", "--help"], repoRoot, process.env),
    "读取 trellis workflow 帮助",
  );
  for (const option of ["--registry", "--template", "--workflow-source"]) {
    expect(initHelp.includes(option), `官方 CLI 缺少 init ${option}。`);
  }
  expect(workflowHelp.includes("--marketplace"), "官方 CLI 缺少 workflow --marketplace。");

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "company-trellis-check-"));
  try {
    const projectRoot = path.join(tempRoot, "project");
    fs.mkdirSync(path.join(projectRoot, ".trellis", "spec", "project"), {
      recursive: true,
    });
    const projectSpecPath = path.join(
      projectRoot,
      ".trellis",
      "spec",
      "project",
      "local.md",
    );
    fs.writeFileSync(projectSpecPath, "# 项目本地规范\n\n不得被公司模板覆盖。\n", "utf-8");
    requireSuccess(run("git", ["init", "-b", "main"], { cwd: projectRoot }), "初始化临时项目");

    requireSuccess(
      runTrellis(
        cli,
        [
          "init",
          "--registry",
          registrySource,
          "--template",
          "company-spec",
          "--append",
          "--workflow",
          "company-default",
          "--workflow-source",
          workflowSource,
          "--yes",
          "--codex",
        ],
        projectRoot,
        process.env,
      ),
      "官方 Trellis CLI 初始化公司 Spec 和 Workflow",
    );

    const installedWorkflow = path.join(projectRoot, ".trellis", "workflow.md");
    expect(fs.existsSync(installedWorkflow), "初始化后缺少 .trellis/workflow.md。");
    for (const fileName of [
      "engineering.md",
      "quality.md",
      "security.md",
    ]) {
      expect(
        fs.existsSync(path.join(projectRoot, ".trellis", "spec", "company", fileName)),
        `初始化后缺少公司 Spec：${fileName}`,
      );
    }
    expect(fs.existsSync(projectSpecPath), "项目级 Spec 被公司模板覆盖或删除。");

    requireSuccess(
      runTrellis(
        cli,
        [
          "workflow",
          "--marketplace",
          workflowSource,
          "--template",
          "company-default",
          "--force",
        ],
        projectRoot,
        process.env,
      ),
      "官方 Trellis CLI 刷新公司 Workflow",
    );
    expect(fs.existsSync(installedWorkflow), "刷新后缺少 .trellis/workflow.md。");

    checked.e2e = `通过（Trellis ${versionOutput.trim()}）`;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  validateGitDiff();
  validateMarketplace();
  validateCompanySpecs();
  validateCompanySkillSources();
  validateWorkflow();
  validatePackageMetadata();
  validateDocsAndExamples();
  validateRemovedTeamLayout();

  if (!staticOnly && errors.length === 0) {
    try {
      validateOfficialCliE2E();
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) {
    console.error("发布完整性检查失败：");
    errors.forEach((message, index) => {
      console.error(`${index + 1}. ${message}`);
    });
    process.exit(1);
  }

  console.log("发布完整性检查通过。");
  console.log(JSON.stringify(checked, null, 2));
}

main();
