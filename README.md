# 公司 Trellis Registry

本仓库用于统一维护和分发公司级 Trellis 规范。业务项目接入后自动获得：

- 公司默认工作流。
- 公司 Git 开发与发布流程。
- 公司产品版本和部署差异处理规则。
- 工程、质量和安全底线。
- 项目级规范的编写示例。

公司工作流通过 team-defaults.yaml 自动设置为 company-default。开发任务不需要输入 /flow；Trellis 会根据任务和会话状态自动注入相应阶段。

## 目录

~~~text
company-trellis/
├── README.md
├── CHANGELOG.md
├── docs/
│   ├── features.md
│   ├── usage.md
│   └── release.md
├── scripts/
│   └── build-manifest.mjs
├── registry/
│   └── .trellis/
│       ├── team-defaults.yaml
│       ├── team-manifest.json
│       ├── workflows/
│       │   └── company-default.md
│       ├── skills/
│       │   ├── company-git-workflow/
│       │   └── company-product-variants/
│       └── spec/company/
│           ├── engineering.md
│           ├── quality.md
│           └── security.md
├── channel/
│   └── .trellis/
│       └── team-channel.json
└── examples/project-spec/
    └── .trellis/spec/project/
~~~

channel/ 在固定版本验证通过后创建或更新，只保存指向不可变 Registry commit 的稳定通道。

## 文档

- [功能说明](docs/features.md)
- [项目接入与日常使用](docs/usage.md)
- [维护和发布流程](docs/release.md)
- [版本变化](CHANGELOG.md)

## 两层职责

| 层级 | 维护位置 | 负责内容 |
| --- | --- | --- |
| 公司级 | registry/.trellis/ | 工作流、Git、产品差异、工程质量和安全底线 |
| 项目级 | 业务项目 .trellis/spec/ | 架构、技术栈、业务契约、项目命令和验证方式 |

公司规范回答“所有项目必须怎样工作”，项目规范回答“这个项目具体怎样实现”。

项目可以补充或收紧公司规范，但不能静默降低公司的安全、质量、Git 和发布要求。

## 快速接入

首次接入稳定通道：

~~~bash
trellis init --team-registry gh:cmx-star/company-treill/channel
~~~

更新前检查：

~~~bash
trellis team validate
trellis team preview
~~~

应用更新并诊断：

~~~bash
trellis update
trellis team doctor
~~~

接入完成后确认 .trellis/config.yaml 包含：

~~~yaml
default_workflow: company-default
registry:
  team:
    source: gh:cmx-star/company-treill/channel
~~~

默认配置由 Registry 三方合并，不覆盖项目已经自行修改的其他配置。

## 维护边界

- registry/.trellis/** 是公司发布内容。
- examples/project-spec/** 只是结构示例，不参与分发。
- 业务项目在自己的仓库维护真实项目规范。
- 不在本仓库保存密钥、令牌、客户数据、内部账号或个人环境配置。
- 发布使用固定 commit，稳定 channel 只负责指向已经验证的固定版本。
