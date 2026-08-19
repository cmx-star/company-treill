# 版本记录

## 2026.08.2 - 2026-08-19

修正公司规范分发方案，使其只依赖官方 npm 版 Trellis 已发布能力。

### 变更

- 使用仓库根目录的 `index.json` 发布 `company-spec` 和 `company-default`。
- 公司工程、质量、安全、Git 流程和产品差异统一由 Spec Registry 分发。
- 公司默认工作流通过 Workflow marketplace 安装为 `.trellis/workflow.md`。
- 项目级规范继续由业务项目维护，不进入公司模板。
- 发布完整性门禁改为使用官方 CLI 真实执行初始化、Spec 更新和 Workflow 更新。
- 使用和发布文档全部改为官方 `--registry`、`--template`、`--workflow-source` 和 `workflow --marketplace` 命令。

### 移除

- 移除依赖未发布能力的 Team Manifest、Channel、默认配置合并和 Team Skill 投影。
- 移除 Manifest 构建脚本和无效的接入命令。

### 兼容性

- 最低验证版本：官方 npm 包 `@mindfoldhq/trellis` 0.6.15。
- 已按旧方案接入的测试项目需要使用新 marketplace 命令重新初始化。

## 2026.08.1 - 2026-08-19

首个公司 Trellis Registry 草案。该版本错误依赖尚未进入官方 npm 包的能力，已由 2026.08.2 替代，不应继续接入。

### 新增

- 公司默认工作流 company-default。
- 分发后自动设置 default_workflow，不依赖 /flow。
- 完整迁移 Skill Share 中适合 Trellis 的任务路由、计划和七阶段工作方法。
- 公司 Git 工作流和产品差异 Skill。
- 公司工程、质量和安全 Spec。
- 项目级 Spec 编写示例。
- Team Manifest 构建脚本、使用指南和发布指南。
- 无依赖的发布完整性检查脚本，覆盖 Manifest、Workflow、Skill、文档和 Channel。


### 兼容性

- 最低 Trellis 版本：0.6.15。
- 最高兼容范围：低于 0.8.0。
- Registry 内容为平台无关 Markdown，由 Trellis 投影公司 Skill。
