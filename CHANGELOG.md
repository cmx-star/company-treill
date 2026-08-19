# 版本记录

## 2026.08.3 - 2026-08-19

按 Trellis 官方提供的三条路径重新整理公司分发方式，撤回自写聚合安装器。

### 变更

- Spec Marketplace 只分发工程、质量和安全 3 份公司规范。
- 公司 Git 工作流和产品版本差异迁移为独立 Custom Skills。
- 使用 `skills@1.5.23` 和 `--copy` 交互选择并安装公司 Skill，生成 `skills-lock.json`。
- 公司默认 Workflow 保留完整阶段和自动路由。
- Spec 和 Workflow 回归官方 `trellis init`、`trellis update` 与 `trellis workflow` 命令。
- Marketplace 索引移动到官方约定的 `marketplace/index.json`。
- 完整性门禁检查 3 个 Spec、2 个 Skill、Workflow、官方 CLI 参数和 skills.sh 复制能力。
- 中文文档明确安装产物应提交到业务项目，低 Node 版本使用者只需 Git 拉取。

### 兼容性

- 最低验证 Trellis：`@mindfoldhq/trellis` 0.6.15。
- 安装或更新要求 Node 22.20.0 或更高版本。
- 安装后的 Spec、Workflow 和 Skill 是普通项目文件，使用者不需要 Node 22.20.0。
- 本仓库不发布 npm 包，不提供 npm Git package 安装入口。

### 迁移

- 删除旧的公司 Git 与产品差异 Spec 文件；已接入项目应安装同名公司 Skill，并清理旧 Spec 副本。
- 旧的仓库根 `index.json` 移至 `marketplace/index.json`，Registry 来源改为 `https://github.com/cmx-star/company-treill/tree/main/marketplace`。

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
- 分发后自动设置 default_workflow。
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
