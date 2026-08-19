# 公司 Trellis Marketplace

本仓库使用官方 npm 版 Trellis 已发布的 Spec Registry 和 Workflow marketplace 能力，统一分发：

- 公司工程、质量和安全规范。
- 公司 Git 开发与发布流程。
- 私有部署、公有云、中性品牌和海外市场等产品差异规范。
- 公司默认开发工作流。
- 项目级规范的编写示例。

兼容基线为 `@mindfoldhq/trellis` 0.6.15。公司分发不依赖未发布的 Trellis 功能，也不要求修改或发布 Trellis 本体。

## 目录

~~~text
company-trellis/
├── index.json
├── marketplace/
│   ├── specs/company/
│   │   ├── engineering.md
│   │   ├── git-workflow.md
│   │   ├── product-variants.md
│   │   ├── quality.md
│   │   └── security.md
│   └── workflows/
│       └── company-default.md
├── examples/project-spec/
│   └── .trellis/spec/project/
├── scripts/
│   └── check-release.mjs
├── docs/
│   ├── features.md
│   ├── usage.md
│   └── release.md
└── CHANGELOG.md
~~~

## 快速接入

先确认 GitHub SSH 权限和 Trellis 版本：

~~~bash
ssh -T git@github.com
trellis --version
~~~

在业务项目根目录执行：

~~~bash
trellis init --registry "git@github.com:cmx-star/company-treill#main" --template company-spec --append --workflow company-default --workflow-source "git@github.com:cmx-star/company-treill#main"
~~~

命令会把公司规范安装到 `.trellis/spec/company/`，把公司工作流安装为 `.trellis/workflow.md`，同时保留项目已有的 `.trellis/spec/project/`。

接入后，正常描述开发任务即可。Trellis 会注入当前 `.trellis/workflow.md`，任务自动执行公司工作流，不需要输入 `/flow`。

## 获取更新

公司 Spec 由 Trellis Registry 配置持续刷新：

~~~bash
trellis update --skip-all
~~~

公司 Workflow 使用官方 marketplace 命令刷新：

~~~bash
trellis workflow --marketplace "git@github.com:cmx-star/company-treill#main" --template company-default --force
~~~

项目可以补充或收紧公司规范，但不能静默降低公司的安全、质量、Git 和发布要求。

## 发布检查

维护者准备好全部变化后，只运行一次完整门禁：

~~~bash
node scripts/check-release.mjs
~~~

门禁会检查 marketplace schema、目录边界、5 份公司 Spec、Workflow 的 14 个步骤和 6 个状态块、中文文档、Git 差异，并使用已安装的官方 Trellis CLI 在临时项目完成真实安装和更新。

仅需排查静态结构时可以运行：

~~~bash
node scripts/check-release.mjs --static-only
~~~

## 文档

- [功能说明](docs/features.md)
- [项目接入与日常使用](docs/usage.md)
- [维护和发布流程](docs/release.md)
- [版本记录](CHANGELOG.md)
