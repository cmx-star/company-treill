# 功能说明

## 官方能力边界

本仓库只使用 `@mindfoldhq/trellis` 0.6.15 已发布的两项能力：

1. Spec Registry：把远程模板安装到 `.trellis/spec/`，并在 `trellis update` 时刷新。
2. Workflow marketplace：把远程 Workflow 安装为 `.trellis/workflow.md`。

公司仓库不接管 Trellis CLI，不分发 Trellis 内部配置，也不依赖第三方 Skill 自动投影。

## 公司默认工作流

`company-default` 安装后就是项目当前的 `.trellis/workflow.md`。开发任务由 Trellis 平台集成自动读取该文件，不要求输入 `/flow`。

工作流根据请求和当前状态自动选择：

- 对话、解释和只读查询直接处理。
- 小型修改走定界、实施、验证和审查的紧凑路径。
- 多文件、跨模块、迁移、依赖、安全和公共契约任务走完整路径。
- Bug、测试失败、构建失败和行为回归先诊断根因。
- Git 和发布操作读取公司 Git 规范。
- 部署、品牌、市场和版本差异读取公司产品差异规范。

标准阶段为：

~~~text
frame -> solution -> slice -> build -> verify -> review -> finish
                     ^          |
                     | diagnose |
                     +----------+
~~~

每个阶段都定义进入条件、必读上下文、执行步骤、输出、通过条件、阻塞条件和下一阶段。

## 公司 Spec

公司模板安装到 `.trellis/spec/company/`：

| 文档 | 负责内容 |
| --- | --- |
| engineering.md | 事实来源、修改边界、依赖和文档要求 |
| quality.md | 验证原则、Bug 修复、审查和完成标准 |
| security.md | 敏感信息、权限、数据、配置和供应链 |
| git-workflow.md | 分支模型、提交、合并、Hotfix、Tag 和发布授权 |
| product-variants.md | 部署、品牌、市场、外部服务、本地化和版本能力差异 |

Git 与产品差异内容使用 Spec 承载，是因为官方 0.6.15 能持续更新远程 Spec，而不会自动分发公司自定义 Skill。

## 公司级与项目级

任务执行时按以下层级组合上下文：

1. `.trellis/spec/company/` 中的公司底线。
2. 项目的 `AGENTS.md` 及本地补充。
3. `.trellis/spec/project/` 和其他项目规范。
4. 当前 Trellis Task 的需求、设计、计划和进度。
5. 用户最新要求。
6. 当前代码、配置、测试、CI 和 Git 状态。

公司规范回答“所有项目必须怎样工作”，项目规范回答“这个项目具体怎样实现”。

`examples/project-spec/` 只提供结构示例。真实项目必须根据当前代码、配置、脚本和 CI 编写，不直接复制示例结论。

## 更新行为

`trellis update` 会根据 `.trellis/config.yaml` 中的 `registry.spec` 配置刷新公司 Spec，并通过 Trellis 原有冲突机制保护本地修改。

官方 Workflow marketplace 不会在 `trellis update` 时自动替换用户管理的 Workflow，因此公司 Workflow 需要单独刷新：

~~~bash
trellis workflow --marketplace "git@github.com:cmx-star/company-treill#main" --template company-default --force
~~~

`--force` 会覆盖 `.trellis/workflow.md` 的本地修改。项目确需自定义工作流时，应先形成项目级变体或明确例外，不直接运行该更新命令覆盖。

## 不提供的能力

当前分发不提供以下机制：

- 公司自定义 Skill 的平台自动投影。
- 公司默认配置的三方合并。
- 文件签名、审批计数和远程更新预览。
- 独立 WorkItem、Delivery、Run 或 Conversation 运行时。
- 独立 checkpoint、receipt 或 Stop Hook。

这些能力不属于官方 0.6.15 已发布的公司分发接口，不在本仓库模拟实现。
