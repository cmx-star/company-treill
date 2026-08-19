import {
  createHash,
  createPublicKey,
  verify,
} from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const bundleRoot = path.join(repoRoot, "registry");
const trellisRoot = path.join(bundleRoot, ".trellis");
const manifestPath = path.join(trellisRoot, "team-manifest.json");
const defaultsPath = path.join(trellisRoot, "team-defaults.yaml");
const signaturesPath = path.join(trellisRoot, "team-signatures.json");
const channelPath = path.join(
  repoRoot,
  "channel",
  ".trellis",
  "team-channel.json",
);
const requireChannel = process.argv.includes("--require-channel");

const errors = [];
const warnings = [];
const checked = {
  distributedFiles: 0,
  skills: 0,
  workflowSteps: 0,
  workflowStates: 0,
  signatures: 0,
};

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    fail(
      "无法读取 " +
        relative(filePath) +
        "：" +
        (error instanceof Error ? error.message : String(error)),
    );
    return "";
  }
}

function readJson(filePath) {
  const raw = readText(filePath);
  if (!raw) return { raw, value: null };
  try {
    return { raw, value: JSON.parse(raw) };
  } catch (error) {
    fail(
      relative(filePath) +
        " 不是有效 JSON：" +
        (error instanceof Error ? error.message : String(error)),
    );
    return { raw, value: null };
  }
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function assertTextFormat(filePath) {
  const raw = readText(filePath);
  if (!raw) return;
  if (!raw.endsWith("\n")) {
    fail(relative(filePath) + " 缺少文件末尾换行。");
  }
  const lines = raw.split("\n");
  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      fail(
        relative(filePath) +
          ":" +
          (index + 1) +
          " 包含行尾空白。",
      );
    }
  });
}

function walkFiles(directory, output) {
  if (!fs.existsSync(directory)) return;
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink()) {
    fail(relative(directory) + " 是符号链接。");
    return;
  }
  if (!stat.isDirectory()) {
    fail(relative(directory) + " 不是目录。");
    return;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const entryStat = fs.lstatSync(absolutePath);
    if (entryStat.isSymbolicLink()) {
      fail(relative(absolutePath) + " 是符号链接。");
      continue;
    }
    if (entry.isDirectory()) {
      walkFiles(absolutePath, output);
    } else if (entry.isFile()) {
      output.push(absolutePath);
    } else {
      fail(relative(absolutePath) + " 不是普通文件。");
    }
  }
}

function normalizeManifest(manifest) {
  const core = isRecord(manifest.core) ? manifest.core : {};
  const compatibility = isRecord(manifest.compatibility)
    ? manifest.compatibility
    : {};
  const governance = isRecord(manifest.governance)
    ? manifest.governance
    : {};

  return {
    schemaVersion: manifest.schemaVersion,
    teamVersion: manifest.teamVersion,
    core: {
      ...(core.min !== undefined ? { min: core.min } : {}),
      ...(core.maxExclusive !== undefined
        ? { maxExclusive: core.maxExclusive }
        : {}),
    },
    files: Array.isArray(manifest.files)
      ? manifest.files.map((entry) => ({
          path: entry.path,
          sha256: entry.sha256,
        }))
      : manifest.files,
    delete: Array.isArray(manifest.delete) ? manifest.delete : [],
    rename: Array.isArray(manifest.rename)
      ? manifest.rename.map((entry) => ({
          from: entry.from,
          to: entry.to,
        }))
      : [],
    ...(manifest.rollbackVersion !== undefined
      ? { rollbackVersion: manifest.rollbackVersion }
      : {}),
    ...(manifest.summary !== undefined
      ? { summary: manifest.summary }
      : {}),
    compatibility: {
      platforms: Array.isArray(compatibility.platforms)
        ? compatibility.platforms
        : [],
      ...(compatibility.notes !== undefined
        ? { notes: compatibility.notes }
        : {}),
    },
    deprecations: Array.isArray(manifest.deprecations)
      ? manifest.deprecations.map((entry) => ({
          path: entry.path,
          announcedVersion: entry.announcedVersion,
          removeAfterVersion: entry.removeAfterVersion,
          ...(entry.replacement !== undefined
            ? { replacement: entry.replacement }
            : {}),
          ...(entry.message !== undefined
            ? { message: entry.message }
            : {}),
        }))
      : [],
    governance: {
      requireDeprecationNotices:
        governance.requireDeprecationNotices === true,
    },
  };
}

function validateManifest() {
  expect(
    fs.existsSync(manifestPath),
    "缺少 registry/.trellis/team-manifest.json。",
  );
  const { raw, value: manifest } = readJson(manifestPath);
  if (!isRecord(manifest)) return null;

  expect(
    manifest.schemaVersion === 1,
    "team-manifest.json 的 schemaVersion 必须为 1。",
  );
  expect(
    typeof manifest.teamVersion === "string" &&
      /^\d+(?:\.\d+){2}(?:-[0-9A-Za-z.-]+)?$/.test(
        manifest.teamVersion,
      ),
    "teamVersion 必须使用可发布版本格式，例如 2026.08.1。",
  );
  expect(isRecord(manifest.core), "Manifest 缺少 core 兼容区间。");
  expect(
    typeof manifest.core?.min === "string",
    "Manifest core.min 必须是非空版本。",
  );
  expect(
    typeof manifest.core?.maxExclusive === "string",
    "Manifest core.maxExclusive 必须是非空版本。",
  );
  expect(
    Array.isArray(manifest.files) && manifest.files.length > 0,
    "Manifest files 必须是非空数组。",
  );

  const canonicalRaw =
    JSON.stringify(normalizeManifest(manifest), null, 2) + "\n";
  if (raw !== canonicalRaw) {
    fail(
      "team-manifest.json 不是 Trellis 规范化顺序；安装后摘要会变化。请重新运行 build-manifest.mjs。",
    );
  }

  const listed = new Map();
  const listedPaths = [];
  if (Array.isArray(manifest.files)) {
    for (const entry of manifest.files) {
      if (!isRecord(entry)) {
        fail("Manifest files 包含非对象条目。");
        continue;
      }
      const filePath = entry.path;
      if (
        typeof filePath !== "string" ||
        !filePath.startsWith(".trellis/")
      ) {
        fail("Manifest 文件路径必须位于 .trellis/：" + String(filePath));
        continue;
      }
      if (
        !(
          filePath.startsWith(".trellis/spec/") ||
          filePath.startsWith(".trellis/skills/") ||
          filePath.startsWith(".trellis/workflows/") ||
          filePath === ".trellis/team-defaults.yaml"
        )
      ) {
        fail("Manifest 包含不允许分发的路径：" + filePath);
      }
      if (
        path.posix.normalize(filePath) !== filePath ||
        filePath.includes("..")
      ) {
        fail("Manifest 路径没有规范化：" + filePath);
      }
      if (listed.has(filePath)) {
        fail("Manifest 重复列出路径：" + filePath);
      }
      if (
        typeof entry.sha256 !== "string" ||
        !/^[0-9a-f]{64}$/i.test(entry.sha256)
      ) {
        fail("Manifest SHA256 无效：" + filePath);
      }
      listed.set(filePath, entry.sha256);
      listedPaths.push(filePath);
    }
  }

  const sortedListedPaths = [...listedPaths].sort();
  if (
    JSON.stringify(listedPaths) !== JSON.stringify(sortedListedPaths)
  ) {
    fail("Manifest files 必须按路径排序。");
  }

  const actualFiles = [];
  const allowedRootEntries = new Set([
    "skills",
    "spec",
    "workflows",
    "team-defaults.yaml",
    "team-manifest.json",
    "team-signatures.json",
  ]);
  for (const entry of fs.readdirSync(trellisRoot)) {
    if (!allowedRootEntries.has(entry)) {
      fail(
        "registry/.trellis/ 包含不允许发布的入口：" + entry,
      );
    }
  }
  for (const rootName of ["spec", "skills", "workflows"]) {
    walkFiles(path.join(trellisRoot, rootName), actualFiles);
  }
  if (fs.existsSync(defaultsPath)) actualFiles.push(defaultsPath);

  const actualPaths = actualFiles
    .map((filePath) =>
      path.relative(bundleRoot, filePath).split(path.sep).join("/"),
    )
    .sort();
  checked.distributedFiles = actualPaths.length;

  for (const filePath of actualPaths) {
    if (!listed.has(filePath)) {
      fail("分发文件未写入 Manifest：" + filePath);
    }
  }
  for (const filePath of listedPaths) {
    if (!actualPaths.includes(filePath)) {
      fail("Manifest 路径不存在或不属于分发范围：" + filePath);
      continue;
    }
    const absolutePath = path.join(bundleRoot, filePath);
    const actualHash = sha256(fs.readFileSync(absolutePath));
    if (actualHash !== listed.get(filePath)) {
      fail("Manifest SHA256 已过期：" + filePath);
    }
  }

  for (const operation of manifest.delete ?? []) {
    if (listed.has(operation)) {
      fail("Manifest 不能同时安装和删除：" + operation);
    }
  }
  for (const rename of manifest.rename ?? []) {
    if (!isRecord(rename)) {
      fail("Manifest rename 包含非对象条目。");
      continue;
    }
    if (rename.from === rename.to) {
      fail("Manifest rename 的来源和目标不能相同：" + rename.from);
    }
    if (!listed.has(rename.to)) {
      fail("Manifest rename 目标必须存在于 files：" + rename.to);
    }
  }

  assertTextFormat(manifestPath);
  actualFiles.forEach(assertTextFormat);
  return manifest;
}

function validateSkills() {
  const skillsRoot = path.join(trellisRoot, "skills");
  if (!fs.existsSync(skillsRoot)) {
    fail("缺少 registry/.trellis/skills/。");
    return;
  }

  for (const entry of fs.readdirSync(skillsRoot, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) {
      fail("Skill 根目录只能包含目录：" + entry.name);
      continue;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.name)) {
      fail("Skill 目录名必须使用 kebab-case：" + entry.name);
    }
    const skillPath = path.join(skillsRoot, entry.name, "SKILL.md");
    if (!fs.existsSync(skillPath)) {
      fail("Skill 缺少 SKILL.md：" + entry.name);
      continue;
    }
    const content = readText(skillPath);
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatter) {
      fail(relative(skillPath) + " 缺少 YAML frontmatter。");
      continue;
    }
    const name = frontmatter[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const description =
      frontmatter[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
    if (name !== entry.name) {
      fail(
        relative(skillPath) +
          " 的 name 必须与目录一致：" +
          entry.name,
      );
    }
    if (!description) {
      fail(relative(skillPath) + " 缺少 description。");
    }
    checked.skills += 1;
  }
}

function extractWorkflowStep(content, stepId) {
  const lines = content.split("\n");
  const heading = new RegExp("^####\\s+" + stepId.replace(".", "\\.") + "\\b");
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return "";
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (
      line.startsWith("#### ") ||
      line.startsWith("## ") ||
      line.trim() === "---"
    ) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function validateWorkflow() {
  const defaults = readText(defaultsPath);
  const matches = [
    ...defaults.matchAll(/^default_workflow:\s*([A-Za-z0-9_-]+)\s*$/gm),
  ];
  if (matches.length !== 1) {
    fail(
      "team-defaults.yaml 必须且只能设置一个 default_workflow。",
    );
    return;
  }
  const workflowId = matches[0][1];
  expect(
    /^session_auto_commit:\s*false\s*$/m.test(defaults),
    "team-defaults.yaml 必须关闭 session_auto_commit。",
  );
  expect(
    /^codex:\s*\n\s{2}dispatch_mode:\s*inline\s*$/m.test(defaults),
    "team-defaults.yaml 必须把 Codex dispatch_mode 设置为 inline。",
  );
  const workflowPath = path.join(
    trellisRoot,
    "workflows",
    workflowId + ".md",
  );
  if (!fs.existsSync(workflowPath)) {
    fail("default_workflow 指向不存在的文件：" + workflowId);
    return;
  }

  const content = readText(workflowPath);
  const requiredHeadings = [
    "## Phase Index",
    "## Phase 1: Plan",
    "## Phase 2: Execute",
    "## Phase 3: Finish",
  ];
  let previousIndex = -1;
  for (const heading of requiredHeadings) {
    const count = content
      .split("\n")
      .filter((line) => line.trim() === heading).length;
    if (count !== 1) {
      fail(
        relative(workflowPath) +
          " 必须且只能包含一个精确标题：" +
          heading,
      );
      continue;
    }
    const index = content.indexOf(heading);
    if (index <= previousIndex) {
      fail("Workflow Phase 标题顺序无效：" + heading);
    }
    previousIndex = index;
  }

  const phaseIndexStart = content.indexOf("## Phase Index");
  const phaseOneStart = content.indexOf("## Phase 1: Plan");
  if (
    phaseIndexStart !== -1 &&
    phaseOneStart !== -1 &&
    !content
      .slice(phaseIndexStart, phaseOneStart)
      .replace(/\[workflow-state:[\s\S]*?\[\/workflow-state:[^\]]+\]/g, "")
      .trim()
  ) {
    fail("Workflow Phase Index 为空。");
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
    "3.4",
  ];
  const seenSteps = [
    ...content.matchAll(/^####\s+(\d+\.\d+)\b.*$/gm),
  ].map((match) => match[1]);
  for (const stepId of requiredSteps) {
    const count = seenSteps.filter((value) => value === stepId).length;
    if (count !== 1) {
      fail(
        "Workflow 必须且只能包含一个可提取步骤：" + stepId,
      );
      continue;
    }
    const section = extractWorkflowStep(content, stepId);
    if (section.split("\n").length < 5) {
      fail("Workflow 步骤内容过短或无法提取：" + stepId);
    }
    checked.workflowSteps += 1;
  }

  const requiredStates = [
    "no_task",
    "planning",
    "planning-inline",
    "in_progress",
    "in_progress-inline",
    "completed",
  ];
  for (const state of requiredStates) {
    const escapedState = state.replace("-", "\\-");
    const open = new RegExp(
      "^\\[workflow-state:" + escapedState + "\\]$",
      "gm",
    );
    const close = new RegExp(
      "^\\[/workflow-state:" + escapedState + "\\]$",
      "gm",
    );
    const openCount = [...content.matchAll(open)].length;
    const closeCount = [...content.matchAll(close)].length;
    if (openCount !== 1 || closeCount !== 1) {
      fail(
        "Workflow 状态块必须成对且唯一：" +
          state +
          "（open=" +
          openCount +
          "，close=" +
          closeCount +
          "）",
      );
    } else {
      const openIndex = content.indexOf(
        "[workflow-state:" + state + "]",
      );
      if (
        phaseIndexStart !== -1 &&
        phaseOneStart !== -1 &&
        !(openIndex > phaseIndexStart && openIndex < phaseOneStart)
      ) {
        fail(
          "Workflow 状态块必须位于 Phase Index 内，避免污染步骤提取：" +
            state,
        );
      }
      const block = content.match(
        new RegExp(
          "\\[workflow-state:" +
            escapedState +
            "\\]\\n([\\s\\S]*?)\\n\\[/workflow-state:" +
            escapedState +
            "\\]",
        ),
      );
      if (!block?.[1]?.trim()) {
        fail("Workflow 状态块内容为空：" + state);
      }
      checked.workflowStates += 1;
    }
  }

  const forbiddenRouting = [
    /只有用户显式.*\/flow.*进入/,
    /仅在用户显式.*\/flow/,
    /默认使用直接模式/,
  ];
  for (const pattern of forbiddenRouting) {
    if (pattern.test(content)) {
      fail(
        "Workflow 仍包含依赖 /flow 或默认 direct 的旧路由：" +
          pattern,
      );
    }
  }
  expect(
    content.includes("不依赖 /flow"),
    "Workflow 必须明确说明自动执行且不依赖 /flow。",
  );
  expect(
    content.includes("自动路由"),
    "Workflow 缺少自动路由说明。",
  );
  assertTextFormat(defaultsPath);
  assertTextFormat(workflowPath);
}

function validateSignatures(manifestRaw) {
  if (!fs.existsSync(signaturesPath)) return;
  const { value: document } = readJson(signaturesPath);
  if (!isRecord(document)) return;
  expect(
    document.schemaVersion === 1,
    "team-signatures.json 的 schemaVersion 必须为 1。",
  );
  expect(
    Array.isArray(document.signatures),
    "team-signatures.json 的 signatures 必须为数组。",
  );
  for (const entry of document.signatures ?? []) {
    try {
      expect(
        entry.algorithm === "ed25519",
        "团队签名算法必须为 ed25519。",
      );
      const publicKeyBytes = Buffer.from(entry.publicKey, "base64");
      const keyId = sha256(publicKeyBytes);
      expect(
        keyId === entry.keyId,
        "团队签名 keyId 与公钥摘要不一致。",
      );
      const valid = verify(
        null,
        Buffer.from(manifestRaw, "utf-8"),
        createPublicKey({
          key: publicKeyBytes,
          format: "der",
          type: "spki",
        }),
        Buffer.from(entry.signature, "base64"),
      );
      expect(valid, "团队签名无法验证：" + entry.keyId);
      checked.signatures += 1;
    } catch (error) {
      fail(
        "团队签名无效：" +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}

function validateDocs(teamVersion) {
  const requiredFiles = [
    "README.md",
    "CHANGELOG.md",
    "docs/features.md",
    "docs/usage.md",
    "docs/release.md",
    "scripts/build-manifest.mjs",
    "scripts/check-release.mjs",
  ];
  for (const filePath of requiredFiles) {
    const absolutePath = path.join(repoRoot, filePath);
    expect(fs.existsSync(absolutePath), "缺少发布文件：" + filePath);
    if (fs.existsSync(absolutePath)) assertTextFormat(absolutePath);
  }

  const readme = readText(path.join(repoRoot, "README.md"));
  for (const target of [
    "docs/features.md",
    "docs/usage.md",
    "docs/release.md",
    "CHANGELOG.md",
  ]) {
    expect(readme.includes(target), "README 缺少文档入口：" + target);
  }

  const changelog = readText(path.join(repoRoot, "CHANGELOG.md"));
  expect(
    changelog.includes("## " + teamVersion),
    "CHANGELOG 未记录当前 teamVersion：" + teamVersion,
  );

  const releaseDoc = readText(path.join(repoRoot, "docs/release.md"));
  expect(
    releaseDoc.includes("node scripts/check-release.mjs"),
    "发布文档未把完整性检查脚本列为发布步骤。",
  );

  const exampleRoot = path.join(
    repoRoot,
    "examples",
    "project-spec",
    ".trellis",
    "spec",
    "project",
  );
  const expectedExamples = [
    "index.md",
    "architecture.md",
    "commands.md",
    "testing.md",
  ];
  for (const fileName of expectedExamples) {
    const filePath = path.join(exampleRoot, fileName);
    expect(
      fs.existsSync(filePath),
      "缺少项目规范示例：" + relative(filePath),
    );
    if (fs.existsSync(filePath)) assertTextFormat(filePath);
  }
}

function runGit(args) {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf-8",
  });
}

function parseChannelSource(source) {
  if (typeof source !== "string") return null;
  const match = source.match(
    /^(?:gh:cmx-star\/company-treill|git@github\.com:cmx-star\/company-treill)(?:\.git)?\/registry#([0-9a-f]{40})$/i,
  );
  return match ? { commit: match[1] } : null;
}

function validateChannel() {
  if (!fs.existsSync(channelPath)) {
    if (requireChannel) {
      fail(
        "稳定发布要求 channel/.trellis/team-channel.json 存在。",
      );
    } else {
      warn("尚未创建稳定 Channel；固定版本检查允许省略。");
    }
    return;
  }

  const { value: channel } = readJson(channelPath);
  if (!isRecord(channel)) return;
  expect(
    channel.schemaVersion === 1,
    "team-channel.json 的 schemaVersion 必须为 1。",
  );
  const parsed = parseChannelSource(channel.source);
  if (!parsed) {
    fail(
      "team-channel.json 必须指向本仓库 registry/ 下的完整 40 位 commit SHA。",
    );
    return;
  }

  const exists = runGit([
    "cat-file",
    "-e",
    parsed.commit + "^{commit}",
  ]);
  if (exists.status !== 0) {
    fail("Channel 指向本地不存在的 commit：" + parsed.commit);
    return;
  }

  const registryDiff = runGit([
    "diff",
    "--quiet",
    parsed.commit,
    "--",
    "registry",
  ]);
  if (registryDiff.status !== 0) {
    fail(
      "Channel 指向的 commit 与当前 registry/ 内容不一致：" +
        parsed.commit,
    );
  }
  assertTextFormat(channelPath);
}

function main() {
  const manifest = validateManifest();
  validateSkills();
  validateWorkflow();
  if (manifest) {
    validateSignatures(readText(manifestPath));
    validateDocs(manifest.teamVersion);
  }
  validateChannel();

  for (const message of warnings) {
    console.warn("[警告] " + message);
  }
  if (errors.length > 0) {
    console.error("发布完整性检查失败：");
    errors.forEach((message, index) => {
      console.error(String(index + 1) + ". " + message);
    });
    process.exit(1);
  }

  console.log("发布完整性检查通过。");
  console.log(
    JSON.stringify(
      {
        teamVersion: manifest?.teamVersion,
        distributedFiles: checked.distributedFiles,
        skills: checked.skills,
        workflowSteps: checked.workflowSteps,
        workflowStates: checked.workflowStates,
        signatures: checked.signatures,
        channel: fs.existsSync(channelPath) ? "已校验" : "尚未创建",
      },
      null,
      2,
    ),
  );
}

main();
