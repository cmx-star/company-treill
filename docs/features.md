# 功能说明

## 公司默认工作流

company-default 是分发后的默认 Workflow。team-defaults.yaml 会把以下配置合并进业务项目：

~~~yaml
default_workflow: company-default
session_auto_commit: false
codex:
  dispatch_mode: inline
~~~

效果：

- 开发任务自动进入公司工作流，不要求输入 /flow。
- 对话、解释和单个只读命令不会机械创建 Task。
- 小型修改走紧凑路径。
- 多文件、跨模块、依赖、迁移、安全和公共契约任务走标准路径。
- Bug 和失败先进入诊断阶段。
- 子代理默认不自动委派。
- 自动提交默认关闭，Git 操作继续要求明确授权。

## 工作流阶段

标准路径：

~~~text
需求定界 frame
-> 技术方案 solution
-> 任务切分 slice
-> 实施 build
-> 验证 verify
-> 审查 review
-> 收尾 finish
~~~

diagnose 是失败处理旁路，可以根据证据返回 frame、build、verify 或 review。

每个阶段都定义：

- 进入条件。
- 必须读取的上下文。
- 具体执行步骤。
- 阶段输出。
- 通过条件。
- 阻塞条件。
- 下一阶段。

## 自动上下文组合

任务执行时按以下层级组合：

1. 公司 Spec 和适用公司 Skill。
2. 项目 AGENTS.md 和本地补充。
3. 项目 .trellis/spec/。
4. 当前 Trellis Task 的需求、设计、计划和进度。
5. 用户最新要求。
6. 当前代码、配置、测试、CI 和 Git 状态。

公司规范定义统一底线，项目规范补充当前仓库事实。

## 公司 Skill

### company-git-workflow

在以下操作中自动适用：

- 创建或切换分支。
- 暂存和提交。
- 合并和解决冲突。
- Tag、Hotfix 和版本发布。
- 推送、部署和发布回合并。

它要求先从项目规则、实际分支、CI 和发布文档确认 Git 模型，不根据技术栈猜测。

### company-product-variants

在以下差异可能影响行为时自动适用：

- 公有云、私有部署、离线和混合部署。
- 公司品牌、中性品牌和客户定制品牌。
- 国内、海外和区域市场。
- 外部服务可用性。
- 本地化、时区、货币和法规。
- 功能开关、授权和版本能力。

## 公司 Spec

| 文档 | 负责内容 |
| --- | --- |
| engineering.md | 事实来源、修改边界、依赖和文档要求 |
| quality.md | 验证原则、Bug 修复、审查和完成标准 |
| security.md | 敏感信息、权限、数据、配置和供应链 |

## 项目级规范

examples/project-spec/ 只展示推荐结构：

- architecture.md：系统边界、模块职责、数据流和公共契约。
- commands.md：环境、开发、检查、构建和发布命令。
- testing.md：测试分层、回归测试和高风险验证。

真实项目必须根据代码、配置、脚本和 CI 重写，不直接复制示例结论。

## 更新保护

Trellis Team Registry 提供：

- 文件 SHA256 完整性校验。
- 固定 commit 安装。
- 稳定 Channel。
- defaults 三方合并。
- 本地修改冲突处理。
- Team Skill 平台投影。
- 更新预览、诊断、状态和成功 receipt。
- 版本回滚与可选签名审批。
