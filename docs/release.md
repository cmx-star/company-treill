# 维护和发布流程

## 发布模型

本仓库发布三类内容：

1. Spec Marketplace：`company-spec`，安装到 `.trellis/spec/company/`。
2. Custom Workflow：`company-default`，安装为 `.trellis/workflow.md`。
3. Custom Skills：通过 skills.sh 复制到项目的 Agent Skill 目录。

稳定来源为：

~~~text
https://github.com/cmx-star/company-treill/tree/main/marketplace
https://github.com/cmx-star/company-treill.git
~~~

这里的“发布”是完整检查通过后提交并推送公司仓库 `main`，或为稳定版本创建 Git tag。`package.json` 只保留仓库元数据，保持 `private: true`。

## 维护位置

| 内容 | 路径 |
| --- | --- |
| Marketplace 索引 | marketplace/index.json |
| 公司工程规范 | marketplace/specs/company/engineering.md |
| 公司质量规范 | marketplace/specs/company/quality.md |
| 公司安全规范 | marketplace/specs/company/security.md |
| 公司默认工作流 | marketplace/workflows/company-default.md |
| 公司 Git Skill | skills/company-git-workflow/SKILL.md |
| 公司产品差异 Skill | skills/company-product-variants/SKILL.md |
| 项目规范示例 | examples/project-spec/ |
| 发布完整性门禁 | scripts/check-release.mjs |

## Marketplace 协议

`marketplace/index.json` 必须只发布两个模板：

~~~json
{
  "version": 1,
  "templates": [
    {
      "id": "company-spec",
      "type": "spec",
      "path": "marketplace/specs"
    },
    {
      "id": "company-default",
      "type": "workflow",
      "path": "workflows/company-default.md"
    }
  ]
}
~~~

Trellis 0.6.15 的 Spec 下载器从仓库根解析路径，因此 Spec 使用 `marketplace/specs`；Workflow 下载器从 Marketplace 来源目录解析路径，因此 Workflow 使用 `workflows/company-default.md`。公司 Spec 必须精确为工程、质量、安全 3 份；Git 与产品差异必须保留为 Skill。

## Skill 协议

每个 Skill 使用独立目录和标准 `SKILL.md`：

~~~text
skills/<skill-name>/SKILL.md
~~~

Frontmatter 至少包含与目录一致的 `name` 和可用于自动触发的 `description`。发布前同时使用仓库门禁和 Skill validator 检查，不能只验证 Markdown 能否打开。

## 一次完整门禁

准备好本次全部修改后，在提交前运行一次：

~~~bash
node scripts/check-release.mjs
~~~

需要指定官方 Trellis CLI 文件时：

~~~bash
env TRELLIS_CLI=/absolute/path/to/trellis.js node scripts/check-release.mjs
~~~

完整门禁检查：

- Git diff 的行尾空白和冲突标记。
- `marketplace/index.json` 的 schema、模板 ID、类型和路径。
- 3 份公司 Spec 的精确文件集合。
- 846 行 Workflow 的 Phase Index、3 个 Phase、14 个步骤和 6 个状态块。
- Workflow 是否按条件加载两个公司 Skill。
- 两个 Skill 的目录、frontmatter、名称和说明。
- `package.json`、Node 22.20.0、`skills@1.5.23` 和无聚合安装器约定。
- README、功能、使用、发布和项目规范示例。
- 临时项目中的官方 Trellis CLI 初始化和 skills.sh 安装能力。

静态排查命令：

~~~bash
node scripts/check-release.mjs --static-only
~~~

静态模式只用于开发中定位结构问题，不能作为提交或发布通过证据。不要为了试门禁连续制造多个修复提交；先完成修改，再一次检查、一次审查、一次提交。

## 发布步骤

1. 修改 Spec、Workflow、Skill 或文档。
2. 同步 README、专项文档和 `CHANGELOG.md`。
3. 运行一次完整门禁并确认通过。
4. 检查 `git status`、最终 diff 和删除文件，只保留本次范围。
5. 获得独立的提交和推送授权。
6. 统一提交并推送 `main`。
7. 从远端 HTTPS 来源在临时业务项目再执行一次官方接入命令。

远端检查：

~~~bash
trellis init --registry "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-spec --append --workflow company-default --workflow-source "https://github.com/cmx-star/company-treill/tree/main/marketplace"
npm exec --yes --package=skills@1.5.23 -- skills add https://github.com/cmx-star/company-treill.git --copy
~~~

验收至少包括：

- `.trellis/spec/company/` 中存在 3 份公司 Spec。
- `.trellis/workflow.md` 与远端发布内容一致。
- `<Agent Skill 目录>/company-git-workflow/SKILL.md` 存在。
- `<Agent Skill 目录>/company-product-variants/SKILL.md` 存在。
- `skills-lock.json` 存在。
- `.trellis/spec/project/` 中已有项目规范仍然存在。

## 兼容性

- 最低验证 Trellis：`@mindfoldhq/trellis` 0.6.15。
- 接入命令和 `skills@1.5.23`：Node 22.20.0 或更高版本。
- 分发结果：普通 Markdown 和锁文件，拉取后不要求 Node 22.20.0。
- 使用 `--copy`，避免符号链接在 Windows 和业务项目 Git 中产生差异。

删除、重命名 Spec 或 Skill 属于迁移。必须在变更记录中说明旧文件处理方式，避免旧规则继续残留在已经接入的业务项目。

## 回滚

发布内容有问题时，优先在本仓库创建修复或回滚提交，再让业务项目重新执行更新。

需要立即固定旧版本时，使用已经验证过的 Git tag。不要通过删除整个 `.trellis/`、覆盖项目规范、安装未发布的 Trellis 版本或 npm Git package commit SHA 回滚。

## 官方参考

- [自定义工作流](https://docs.trytrellis.app/zh/advanced/custom-workflow)
- [自定义 Skills](https://docs.trytrellis.app/zh/advanced/custom-skills)
- [自定义规范模板市场](https://docs.trytrellis.app/zh/advanced/custom-spec-template-marketplace)
- [Skills Marketplace](https://docs.trytrellis.app/zh/skills-market)
