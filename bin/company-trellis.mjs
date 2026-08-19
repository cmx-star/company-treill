#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY_SOURCE =
  "https://github.com/cmx-star/company-treill/tree/main/marketplace";
const SKILLS_SOURCE = "https://github.com/cmx-star/company-treill.git";
const TRELLIS_PACKAGE = "@mindfoldhq/trellis@latest";
const SKILLS_PACKAGE = "skills@1.5.23";
const COMPANY_SKILLS = [
  "company-git-workflow",
  "company-product-variants",
];
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const companySpecSource = path.join(
  packageRoot,
  "marketplace",
  "specs",
  "company",
);
const workflowSource = path.join(
  packageRoot,
  "marketplace",
  "workflows",
  "company-default.md",
);

const PLATFORM_FLAGS = new Map([
  ["antigravity", "--antigravity"],
  ["claude-code", "--claude"],
  ["codex", "--codex"],
  ["cursor", "--cursor"],
  ["gemini-cli", "--gemini"],
  ["github-copilot", "--copilot"],
  ["opencode", "--opencode"],
  ["pi", "--pi"],
]);

function printHelp() {
  console.log(`公司 Trellis 安装器

用法：
  company-trellis install [选项]
  company-trellis update [选项]

选项：
  --project <目录>   目标项目，默认当前目录
  --agent <名称>     目标 AI 工具，可重复或使用逗号分隔
  -y, --yes          非交互执行；install 时必须指定 --agent
  --dry-run          只显示将执行的命令
  -h, --help         显示帮助

常用 Agent：
  codex, claude-code, cursor, opencode, gemini-cli,
  github-copilot, antigravity, pi

示例：
  company-trellis install --agent codex --yes
  company-trellis update --agent codex --yes
  company-trellis install --project ../my-project
`);
}

function parseVersion(value) {
  return value.split(".").map((part) => Number.parseInt(part, 10));
}

function versionAtLeast(actual, required) {
  const actualParts = parseVersion(actual);
  const requiredParts = parseVersion(required);
  for (let index = 0; index < requiredParts.length; index += 1) {
    const current = actualParts[index] ?? 0;
    const minimum = requiredParts[index] ?? 0;
    if (current > minimum) return true;
    if (current < minimum) return false;
  }
  return true;
}

function parseArgs(argv) {
  const options = {
    command: "install",
    project: process.cwd(),
    agents: [],
    yes: false,
    dryRun: false,
  };
  const args = [...argv];
  if (args[0] === "install" || args[0] === "update") {
    options.command = args.shift();
  }
  while (args.length > 0) {
    const argument = args.shift();
    if (argument === "--project") {
      const value = args.shift();
      if (!value) throw new Error("--project 缺少目录参数。");
      options.project = path.resolve(value);
    } else if (argument === "--agent") {
      const value = args.shift();
      if (!value) throw new Error("--agent 缺少工具名称。");
      options.agents.push(
        ...value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
    } else if (argument === "-y" || argument === "--yes") {
      options.yes = true;
    } else if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "-h" || argument === "--help") {
      options.help = true;
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }
  options.agents = [...new Set(options.agents)];
  return options;
}

function quote(value) {
  return /[\s"']/u.test(value) ? JSON.stringify(value) : value;
}

function shouldUseShell(command) {
  return process.platform === "win32" && command !== process.execPath;
}

function resolveTrellisCommand() {
  const configured = process.env.TRELLIS_CLI?.trim();
  if (!configured) {
    const result = spawnSync("trellis", ["--version"], {
      stdio: "ignore",
      env: process.env,
      shell: shouldUseShell("trellis"),
    });
    if (!result.error && result.status === 0) {
      return { command: "trellis", prefix: [] };
    }
    return {
      command: "npm",
      prefix: [
        "exec",
        "--yes",
        `--package=${TRELLIS_PACKAGE}`,
        "--",
        "trellis",
      ],
    };
  }
  if (configured.endsWith(".js")) {
    return { command: process.execPath, prefix: [configured] };
  }
  return { command: configured, prefix: [] };
}

function run(command, args, options) {
  console.log(`> ${command} ${args.map(quote).join(" ")}`);
  if (options.dryRun) return;
  const result = spawnSync(command, args, {
    cwd: options.project,
    stdio: "inherit",
    env: process.env,
    shell: shouldUseShell(command),
  });
  if (result.error) {
    throw new Error(`${command} 无法执行：${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} 执行失败，退出码 ${String(result.status)}。`);
  }
}

function runTrellis(args, options) {
  const cli = resolveTrellisCommand();
  run(cli.command, [...cli.prefix, ...args], options);
}

function trellisPlatformArgs(agents) {
  return agents.map((agent) => {
    const flag = PLATFORM_FLAGS.get(agent);
    if (!flag) {
      throw new Error(
        `非交互安装暂不支持 Agent "${agent}"。请去掉 --yes 使用交互选择，或直接执行官方命令。`,
      );
    }
    return flag;
  });
}

function installSkills(options) {
  const args = [
    "exec",
    "--yes",
    `--package=${SKILLS_PACKAGE}`,
    "--",
    "skills",
    "add",
    SKILLS_SOURCE,
    "--skill",
    ...COMPANY_SKILLS,
    "--copy",
  ];
  if (options.agents.length > 0) {
    args.push("--agent", ...options.agents);
  }
  if (options.yes) args.push("--yes");
  run("npm", args, options);
}

function copyCompanyDistribution(options) {
  const specTarget = path.join(options.project, ".trellis", "spec", "company");
  const workflowTarget = path.join(options.project, ".trellis", "workflow.md");
  console.log(`> copy ${quote(companySpecSource)} ${quote(specTarget)}`);
  console.log(`> copy ${quote(workflowSource)} ${quote(workflowTarget)}`);
  if (options.dryRun) return;
  if (!fs.existsSync(companySpecSource)) {
    throw new Error(`安装包缺少公司 Spec：${companySpecSource}`);
  }
  if (!fs.existsSync(workflowSource)) {
    throw new Error(`安装包缺少公司 Workflow：${workflowSource}`);
  }
  fs.rmSync(specTarget, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(specTarget), { recursive: true });
  fs.cpSync(companySpecSource, specTarget, { recursive: true });
  fs.mkdirSync(path.dirname(workflowTarget), { recursive: true });
  fs.copyFileSync(workflowSource, workflowTarget);
}

function install(options) {
  const args = ["init"];
  if (options.yes) {
    if (options.agents.length === 0) {
      throw new Error("非交互安装必须至少指定一个 --agent。");
    }
    args.push("--yes", ...trellisPlatformArgs(options.agents));
  }
  runTrellis(args, options);
  copyCompanyDistribution(options);
  installSkills(options);
}

function update(options) {
  runTrellis(["update", "--skip-all"], options);
  copyCompanyDistribution(options);
  installSkills(options);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!versionAtLeast(process.versions.node, "22.20.0")) {
    throw new Error(
      `安装器要求 Node >=22.20.0，当前为 ${process.versions.node}。安装后的 Markdown Skill 不受此限制。`,
    );
  }
  if (!fs.existsSync(options.project) || !fs.statSync(options.project).isDirectory()) {
    throw new Error(`目标项目目录不存在：${options.project}`);
  }
  if (options.command === "install") install(options);
  else update(options);
  if (!options.dryRun) {
    console.log("\n公司 Trellis 内容已处理。请检查 Git diff，并提交需要共享的文件。");
  }
}

try {
  main();
} catch (error) {
  console.error(`错误：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
