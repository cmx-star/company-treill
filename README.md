# 公司 Trellis 分发仓库

本仓库用于分发公司级 Trellis Spec、默认 Workflow 和专项 Skill。仓库不提供自写聚合安装器，不重新发布 Trellis，也不替用户选择编辑器或 Agent。

## 分发内容

| 官方路径 | 公司内容 | 安装方式 |
| --- | --- | --- |
| Spec Marketplace | 工程、质量、安全规范 | `trellis init --registry ... --template company-spec` |
| Custom Workflow | 公司默认开发工作流 | `trellis init --workflow ... --workflow-source ...` 或 `trellis workflow --marketplace ...` |
| Custom Skills / skills.sh | Git 工作流、产品版本差异 | `npm exec --yes --package=skills@1.5.23 -- skills add ...` |

公司默认工作流安装后会参与普通开发任务。遇到 Git、提交、发版等请求时加载 `company-git-workflow`；遇到私有部署、品牌、市场或版本能力差异时加载 `company-product-variants`。

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
├── scripts/check-release.mjs
└── docs/
~~~

项目级规范不由公司仓库覆盖。业务项目继续在 `.trellis/spec/project/` 中维护自己的架构、命令、测试和业务约束，本仓库的 `examples/project-spec/` 只提供结构示例。

## 前置要求

安装或更新机器需要 Node 22.20.0 或更高版本，并且当前 GitHub HTTPS 凭据可以读取公司私有仓库。

先全局安装官方 Trellis CLI：

~~~bash
npm install -g @mindfoldhq/trellis@latest
trellis --version
trellis init --help
trellis workflow --help
~~~

当前方案要求 `@mindfoldhq/trellis` 0.6.15 或更高版本。版本不满足时升级 Trellis，再继续安装公司规范。

## 首次接入

在业务项目根目录先安装公司 Spec 和 Workflow：

~~~bash
trellis init --registry "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-spec --append --workflow company-default --workflow-source "https://github.com/cmx-star/company-treill/tree/main/marketplace"
~~~

再安装公司 Skill：

~~~bash
npm exec --yes --package=skills@1.5.23 -- skills add https://github.com/cmx-star/company-treill.git --skill company-git-workflow company-product-variants --copy
~~~

`skills add` 默认交互选择安装范围和 Agent。自动化或非交互环境由执行者自行追加实际使用的 `--agent <名称>` 和 `--yes`；公司仓库不预设项目使用的编辑器或 Agent。

## 安装结果

安装后至少应看到：

~~~text
.trellis/spec/company/engineering.md
.trellis/spec/company/quality.md
.trellis/spec/company/security.md
.trellis/workflow.md
<Agent Skill 目录>/company-git-workflow/SKILL.md
<Agent Skill 目录>/company-product-variants/SKILL.md
skills-lock.json
~~~

检查差异后，把团队需要共享的生成文件提交到业务项目。其他开发者只需拉取这些普通 Markdown 文件；他们不需要 Node 22.20.0，也不需要再次运行安装命令。

## 获取更新

在业务项目根目录先刷新官方 Trellis 管理内容和公司 Spec：

~~~bash
trellis update --skip-all
trellis init --registry "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-spec --append
~~~

再刷新公司 Workflow：

~~~bash
trellis workflow --marketplace "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-default --force
~~~

最后刷新公司 Skill：

~~~bash
npm exec --yes --package=skills@1.5.23 -- skills add https://github.com/cmx-star/company-treill.git --skill company-git-workflow company-product-variants --copy
~~~

执行后必须检查 Git diff，确认项目级规范和本地项目约束没有被误改，再提交更新结果。

## 发布检查

维护者完成本次全部修改后，只运行一次完整门禁：

~~~bash
node scripts/check-release.mjs
~~~

门禁检查 Marketplace、3 个公司 Spec、846 行完整 Workflow、2 个公司 Skill、中文文档和 Git diff，并在临时项目中尽量使用官方 Trellis CLI 与 skills.sh 做端到端验证。

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
