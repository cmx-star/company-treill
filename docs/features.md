# 功能说明

## 两条分发路径

本仓库维护 Trellis 已经支持的 Spec Marketplace 和 Custom Workflow。`skills/` 目录只保留源文件，不进入默认分发流程。

### Spec Marketplace

`company-spec` 模板包含 3 份公司底线：

| 文件 | 内容 |
| --- | --- |
| engineering.md | 事实来源、修改边界、依赖、文档和项目上下文要求 |
| quality.md | 验证、Bug 根因、审查、完成条件和未验证结果说明 |
| security.md | 密钥、权限、数据、配置和供应链边界 |

Spec Marketplace 走 Trellis 官方 registry。首次接入使用 `trellis init --registry ... --template company-spec --append`；后续更新仍使用官方 Trellis 命令刷新公司 Spec。安装后的文件属于业务项目，应作为普通项目文件变更审查和提交。

### Custom Workflow

`company-default` 按官方 Custom Workflow marketplace 结构维护。首次接入通过 `trellis init --workflow company-default --workflow-source ...` 安装；更新时通过 `trellis workflow --marketplace ... --template company-default --force` 刷新。

工作流保留完整的定界、方案、切分、实施、诊断、验证、审查和收尾阶段，并根据请求自动路由：

~~~text
frame -> solution -> slice -> build -> verify -> review -> finish
                     ^          |
                     | diagnose |
                     +----------+
~~~

普通任务会直接进入该工作流。只读问题不会机械创建 Task；多文件、迁移、公共契约、依赖和高风险任务才进入完整阶段。

## 公司级和项目级分层

任务处理时组合以下上下文：

1. `.trellis/spec/company/` 中的公司工程、质量和安全底线。
2. 项目的 `AGENTS.md`、`AGENTS.override.md` 和显式读取的个人补充。
3. `.trellis/spec/project/` 及其他项目规范。
4. 当前 Trellis Task 的需求、方案、计划和进度。
5. 用户最新确认的目标、限制和授权。
6. 当前代码、配置、测试、CI 和 Git 状态。

公司规范回答“所有项目必须遵守什么”，项目规范回答“这个项目具体如何实现”。项目可以补充或收紧公司规则，但不能静默降低安全、质量和授权边界。

## 自动执行

工作流安装后由 Trellis 注入项目的 Agent 上下文。用户正常描述任务即可，例如：

~~~text
修复登录页在令牌过期后仍显示已登录的问题。
~~~

工作流先按任务类型选择执行路径。

## 更新模型

公司更新拆成两段，分别使用官方能力：

1. `trellis update --skip-all` 和 `trellis init --registry ... --template company-spec --append`，刷新 Trellis 官方管理内容和公司 Spec。
2. `trellis workflow --marketplace ... --template company-default --force`，刷新公司 Workflow。

公司 Workflow 更新会覆盖项目当前 `.trellis/workflow.md`。项目若需要长期定制 Workflow，应建立经过批准的项目变体，不能把本地修改留在公司分发副本中等待下次被覆盖。

## 明确不提供

- 不修改或重新发布 `@mindfoldhq/trellis`。
- 不提供自写聚合安装器。
- 不自动覆盖 `.trellis/spec/project/`。
- 不把 Git 和产品差异规则伪装成 Spec。
