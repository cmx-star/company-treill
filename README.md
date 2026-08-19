# 公司 Trellis 分发仓库

本仓库用于把公司级规范、默认工作流和专项 Skill 分发到业务项目。它只组合 Trellis 与 skills.sh 已提供的能力，不修改、不重新发布 Trellis 本体。

## 分发内容

| 官方路径 | 公司内容 | 安装结果 |
| --- | --- | --- |
| Spec Marketplace | 工程、质量、安全规范 | `.trellis/spec/company/` |
| Custom Workflow | 公司默认开发工作流 | `.trellis/workflow.md` |
| Custom Skills / skills.sh | Git 工作流、产品版本差异 | 项目对应的 Agent Skill 目录 |

公司默认工作流安装后会自动参与普通开发任务，不需要 `/flow`。遇到 Git、提交、发版等请求时加载 `company-git-workflow`；遇到私有部署、品牌、市场或版本能力差异时加载 `company-product-variants`。

## 目录结构

~~~text
company-trellis/
├── marketplace/
│   ├── index.json
│   ├── specs/company/
│   │   ├── engineering.md
│   │   ├── quality.md
│   │   └── security.md
│   └── workflows/
│       └── company-default.md
├── skills/
│   ├── company-git-workflow/SKILL.md
│   └── company-product-variants/SKILL.md
├── examples/project-spec/
├── bin/company-trellis.mjs
├── scripts/check-release.mjs
└── docs/
~~~

项目级规范不由公司仓库覆盖。业务项目继续在 `.trellis/spec/project/` 中维护自己的架构、命令、测试和业务约束，本仓库的 `examples/project-spec/` 只提供结构示例。

## 一次安装

安装或更新机器需要：

- Node 22.20.0 或更高版本。
- `@mindfoldhq/trellis` 0.6.15 或更高版本已经可执行。
- 当前 GitHub SSH 账号可以读取私有仓库。

在业务项目根目录执行：

~~~bash
npm exec --yes --package="git+ssh://git@github.com/cmx-star/company-treill.git#main" -- company-trellis install --agent codex --agent cursor --yes
~~~

按项目实际使用的工具传入一个或多个 `--agent`；不使用 Cursor 时可以删除 `--agent cursor`。安装器会一次完成 Spec、Workflow 和 Skill 三部分分发。

安装后至少应看到：

~~~text
.trellis/spec/company/engineering.md
.trellis/spec/company/quality.md
.trellis/spec/company/security.md
.trellis/workflow.md
.agents/skills/company-git-workflow/SKILL.md
.agents/skills/company-product-variants/SKILL.md
skills-lock.json
~~~

检查差异后，把需要团队共享的生成文件提交到业务项目。其他开发者只需拉取这些普通 Markdown 文件；他们不需要 Node 22.20.0，也不需要再次运行安装器。

## 获取更新

在业务项目根目录执行：

~~~bash
npm exec --yes --package="git+ssh://git@github.com/cmx-star/company-treill.git#main" -- company-trellis update --agent codex --agent cursor --yes
~~~

更新会刷新公司 Spec、强制替换公司 Workflow，并重新复制公司 Skill。执行后必须检查 Git diff，确认项目级规范和本地项目约束没有被误改，再提交更新结果。

## 直接使用官方命令

安装器只是把以下官方方式合成一次操作，必要时仍可分别执行：

~~~bash
trellis init --registry "git@github.com:cmx-star/company-treill/marketplace#main" --template company-spec --append --workflow company-default --workflow-source "git@github.com:cmx-star/company-treill/marketplace#main"
npx --yes skills@1.5.23 add git@github.com:cmx-star/company-treill.git --skill company-git-workflow company-product-variants --agent codex --copy --yes
~~~

## 发布检查

维护者完成本次全部修改后，只运行一次完整门禁：

~~~bash
node scripts/check-release.mjs
~~~

门禁检查 Marketplace、3 个公司 Spec、846 行完整 Workflow、2 个公司 Skill、安装器、中文文档和 Git diff，并在临时项目中真实执行安装与更新。

只排查静态结构时可以运行：

~~~bash
node scripts/check-release.mjs --static-only
~~~

静态模式不能作为发版通过证据。

## 文档

- [功能说明](docs/features.md)
- [项目接入与日常使用](docs/usage.md)
- [维护和发布流程](docs/release.md)
- [版本记录](CHANGELOG.md)
