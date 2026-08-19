# 项目接入与日常使用

## 前置条件

确认使用官方 npm 包，版本不低于 0.6.15：

~~~bash
trellis --version
trellis init --help
trellis workflow --help
~~~

帮助中必须包含：

- `init --registry`
- `init --workflow-source`
- `workflow --marketplace`

公司仓库通过 GitHub SSH 访问，还需要确认当前机器有仓库权限：

~~~bash
ssh -T git@github.com
~~~

## 首次接入

在业务项目根目录执行：

~~~bash
trellis init --registry "git@github.com:cmx-star/company-treill#main" --template company-spec --append --workflow company-default --workflow-source "git@github.com:cmx-star/company-treill#main"
~~~

命令中的 `--append` 会保留已有项目规范，只补充模板中缺少的文件。Trellis 仍会正常询问要配置的 AI 平台。

Codex 项目需要非交互初始化时可以明确指定平台：

~~~bash
trellis init --yes --codex --registry "git@github.com:cmx-star/company-treill#main" --template company-spec --append --workflow company-default --workflow-source "git@github.com:cmx-star/company-treill#main"
~~~

其他平台使用 Trellis `init --help` 中已经发布的对应参数，不猜测平台名称。

## 验证接入结果

公司规范应安装到：

~~~text
.trellis/spec/company/engineering.md
.trellis/spec/company/git-workflow.md
.trellis/spec/company/product-variants.md
.trellis/spec/company/quality.md
.trellis/spec/company/security.md
~~~

公司工作流应安装为：

~~~text
.trellis/workflow.md
~~~

`.trellis/config.yaml` 应包含：

~~~yaml
registry:
  spec:
    source: git@github.com:cmx-star/company-treill#main
    template: company-spec
~~~

macOS、Linux 或 Git Bash 可以检查：

~~~bash
find .trellis/spec/company -type f | sort
rg -n "^registry:|source:|template:" .trellis/config.yaml
~~~

Windows PowerShell 可以检查：

~~~powershell
Get-ChildItem .trellis\spec\company -File
Select-String -Path .trellis\config.yaml -Pattern "registry:|source:|template:"
~~~

## 日常任务

接入后正常描述任务即可，例如：

~~~text
修复登录页在令牌过期后仍显示已登录的问题。
~~~

Trellis 会把 `.trellis/workflow.md` 注入支持的平台上下文。公司工作流会自动读取 `.trellis/spec/company/` 和项目规范，完成任务分类、定界、实施、验证、审查与收尾，不需要额外命令入口。

## 项目级规范

真实项目规范继续由业务项目自己维护：

~~~text
.trellis/spec/project/
├── index.md
├── architecture.md
├── commands.md
└── testing.md
~~~

可以参考本仓库 `examples/project-spec/`，但必须使用当前项目事实替换示例内容。

项目规范应记录：

- 架构和模块边界。
- 技术栈和版本。
- 项目标准命令。
- 业务契约和数据语义。
- 测试分层和验收路径。
- 敏感区域和扩大验证条件。

公司模板只写入 `.trellis/spec/company/`，不会把示例项目规范分发到业务项目。

## 获取公司更新

先刷新公司 Spec：

~~~bash
trellis update --skip-all
~~~

再刷新公司 Workflow：

~~~bash
trellis workflow --marketplace "git@github.com:cmx-star/company-treill#main" --template company-default --force
~~~

最后检查公司文件和项目级规范仍然存在。`trellis update` 使用 Trellis 自带的模板哈希和冲突处理；Workflow 更新中的 `--force` 会明确覆盖当前 `.trellis/workflow.md`。

## 固定版本

排查更新问题或需要严格复现时，可以把 `#main` 替换为完整 40 位 commit SHA，并让 Spec 与 Workflow 使用同一个来源：

~~~bash
trellis init --registry "git@github.com:cmx-star/company-treill#0123456789abcdef0123456789abcdef01234567" --template company-spec --append --workflow company-default --workflow-source "git@github.com:cmx-star/company-treill#0123456789abcdef0123456789abcdef01234567"
~~~

固定来源不会自动跟随 `main` 更新。

## 常见问题

### init 不认识 registry 或 workflow-source

当前 `trellis` 不是支持本方案的官方版本。执行：

~~~bash
trellis --version
trellis init --help
~~~

不要通过猜测新参数解决；先确认安装的是 `@mindfoldhq/trellis` 0.6.15 或更高版本，并以实际帮助输出为准。

### SSH 权限失败

先确认：

~~~bash
ssh -T git@github.com
git ls-remote git@github.com:cmx-star/company-treill.git
~~~

不能访问仓库时，由有权限的管理员配置 GitHub 账号和 SSH 密钥；不要把私钥复制到项目或聊天中。

### 公司 Workflow 没有更新

`trellis update` 只会根据 Registry 配置刷新公司 Spec。Workflow 需要执行：

~~~bash
trellis workflow --marketplace "git@github.com:cmx-star/company-treill#main" --template company-default --force
~~~

### 项目修改了公司规范

运行 `trellis update`，按 Trellis 的冲突提示处理。长期项目差异应写入 `.trellis/spec/project/`，不要直接修改公司分发副本。
