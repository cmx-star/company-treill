# 维护和发布流程

## 发布模型

本仓库是一个 Trellis marketplace，同时提供：

1. `company-spec`：安装到业务项目 `.trellis/spec/company/` 的公司规范模板。
2. `company-default`：安装为业务项目 `.trellis/workflow.md` 的公司工作流模板。

稳定来源为：

~~~text
git@github.com:cmx-star/company-treill#main
~~~

业务项目可以使用完整 commit SHA 固定版本。仓库不维护另一层通道文件，也不生成 Trellis 私有发布协议。

## 维护位置

| 内容 | 路径 |
| --- | --- |
| Marketplace 索引 | index.json |
| 公司默认工作流 | marketplace/workflows/company-default.md |
| 公司工程规范 | marketplace/specs/company/engineering.md |
| 公司质量规范 | marketplace/specs/company/quality.md |
| 公司安全规范 | marketplace/specs/company/security.md |
| 公司 Git 流程 | marketplace/specs/company/git-workflow.md |
| 公司产品差异 | marketplace/specs/company/product-variants.md |
| 项目规范示例 | examples/project-spec/ |

项目规范示例不进入 `company-spec`，不会分发到业务项目。

## Marketplace 协议

`index.json` 必须保留两个模板：

~~~json
{
  "version": 1,
  "templates": [
    {
      "id": "company-spec",
      "type": "spec",
      "name": "公司级开发规范",
      "path": "marketplace/specs"
    },
    {
      "id": "company-default",
      "type": "workflow",
      "name": "公司默认工作流",
      "path": "marketplace/workflows/company-default.md"
    }
  ]
}
~~~

实际索引还应保留中文 `description` 和标签。Spec 模板路径指向目录，Workflow 模板路径必须指向 Markdown 文件。

## 提交前完整性门禁

准备好本次全部变化后，在仓库根目录只运行一次：

~~~bash
node scripts/check-release.mjs
~~~

默认使用当前 `PATH` 中的 `trellis`。需要指定官方 CLI 文件时设置 `TRELLIS_CLI`：

~~~bash
TRELLIS_CLI=/absolute/path/to/trellis.js node scripts/check-release.mjs
~~~

检查内容包括：

- Git 差异中的行尾空白和冲突标记。
- Marketplace schema、模板 ID、类型、路径和目录边界。
- 5 份公司 Spec 的文件集合和文本格式。
- Workflow 的 Phase Index、三个 Phase、14 个步骤和 6 个状态块。
- Workflow 是否读取公司 Git 和产品差异规范。
- 中文 README、功能说明、使用指南、发布指南和项目示例。
- 当前文档是否只使用官方已发布命令。
- 官方 CLI 是否实际提供 `--registry`、`--workflow-source` 和 `--marketplace`。
- 临时项目中真实执行 `init`、`update` 和 Workflow 刷新。
- 公司 Spec、Workflow 是否安装正确，项目级 Spec 是否保留。

任何一项失败都不得提交。不要用增量修复提交试跑检查。

只排查静态结构时可以运行：

~~~bash
node scripts/check-release.mjs --static-only
~~~

静态模式不能作为发布通过证据。

## 发布步骤

1. 修改 marketplace 内容和对应中文文档。
2. 在 `CHANGELOG.md` 记录变化、兼容性和迁移影响。
3. 运行一次完整门禁并确认通过。
4. 检查 `git status` 和最终 diff，只包含本次范围。
5. 获得提交和推送授权后，统一提交并推送 `main`。
6. 使用远端来源在全新项目做一次接入检查。

远端检查命令：

~~~bash
trellis init --yes --codex --registry "git@github.com:cmx-star/company-treill#main" --template company-spec --append --workflow company-default --workflow-source "git@github.com:cmx-star/company-treill#main"
trellis update --skip-all
trellis workflow --marketplace "git@github.com:cmx-star/company-treill#main" --template company-default --force
~~~

验收结果必须包括：

- `.trellis/spec/company/` 中存在 5 份公司规范。
- `.trellis/workflow.md` 与发布内容一致。
- `.trellis/config.yaml` 记录 `company-spec` 来源和模板 ID。
- `.trellis/spec/project/` 中已有项目规范未被删除。
- 普通开发任务不需要额外命令入口即可读取公司工作流。

## 更新兼容性

公司 Spec 由 `trellis update` 刷新。删除或重命名公司 Spec 文件会改变业务项目的长期规则，应在发布前说明迁移和旧文件处理方式。

公司 Workflow 是用户管理的 marketplace 模板，不会由 `trellis update` 自动覆盖。修改 Workflow 后，使用方需要重新执行 `trellis workflow --marketplace ... --template company-default --force`。

## 回滚

发布内容有问题时，优先在本仓库创建修复或回滚提交，再让业务项目重新执行更新命令。

需要立即固定旧版本时，把来源中的 `#main` 替换为已验证的完整 commit SHA，并让 Spec 与 Workflow 使用同一个 SHA。

不要通过删除项目 `.trellis/`、覆盖项目规范或安装未发布的 Trellis 版本进行回滚。

## 发布记录

每次发布至少记录：

- Marketplace commit SHA。
- 公司 Spec 和 Workflow 的变化范围。
- 最低验证 Trellis 版本。
- 完整门禁命令和结果。
- 远端接入验证结果。
- 删除、重命名和迁移说明。
- 未验证项和残余风险。
