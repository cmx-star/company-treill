# 项目接入与日常使用

## 谁需要运行接入命令

每个业务项目只需要一名维护者或有权限的开发者运行接入和更新命令，然后把生成文件提交到业务项目 Git。

运行接入和更新命令的机器需要 Node 22.20.0 或更高版本。其他成员拉取已经提交的 `.trellis/` 后即可使用，不受接入机器的 Node 版本限制。

## 前置检查

先全局安装官方 Trellis CLI，并确认私有仓库 HTTPS 读取权限：

~~~bash
npm install -g @mindfoldhq/trellis@latest
trellis --version
trellis init --help
trellis workflow --help
git ls-remote https://github.com/cmx-star/company-treill.git HEAD
~~~

当前最低验证 Trellis 版本为 `@mindfoldhq/trellis` 0.6.15。帮助中应包含 `init --registry`、`init --workflow-source` 和 `workflow --marketplace`。

## 首次接入

在业务项目根目录先安装公司 Spec 和 Workflow：

~~~bash
trellis init --registry "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-spec --append --workflow company-default --workflow-source "https://github.com/cmx-star/company-treill/tree/main/marketplace"
~~~

## 安装结果

项目至少应包含：

~~~text
.trellis/spec/company/engineering.md
.trellis/spec/company/quality.md
.trellis/spec/company/security.md
.trellis/workflow.md
~~~

检查命令：

~~~bash
find .trellis/spec/company -type f | sort
test -f .trellis/workflow.md && printf '%s\n' .trellis/workflow.md
git status --short
~~~

Windows PowerShell：

~~~powershell
Get-ChildItem .trellis\spec\company -Recurse -File; Test-Path .trellis\workflow.md; git status --short
~~~

确认差异后，把团队需要共享的 Trellis 文件提交到业务项目。不要提交密钥、个人配置或与本次接入无关的改动。

## 日常使用

接入后正常描述开发任务。Trellis 会注入 `.trellis/workflow.md`，工作流会读取公司 Spec、项目规范和当前任务上下文，并按任务风险选择紧凑路径或完整路径。

## 项目级规范

业务项目继续维护自己的项目规范：

~~~text
.trellis/spec/project/
├── index.md
├── architecture.md
├── commands.md
└── testing.md
~~~

可以参考本仓库 `examples/project-spec/` 的结构，但必须用当前项目代码、配置、脚本和 CI 的事实替换示例内容。

项目规范适合记录：

- 架构、模块和包边界。
- 技术栈和实际版本。
- 安装、开发、检查、测试和构建命令。
- 业务契约、数据语义和敏感区域。
- 测试分层及需要扩大验证的条件。

公司 Spec 只处理 `.trellis/spec/company/`，不会分发或删除项目级示例。项目自己的演进内容应放在 `.trellis/spec/project/` 或团队约定的项目文档中。

## 获取公司更新

在业务项目根目录先刷新官方 Trellis 管理内容和公司 Spec：

~~~bash
trellis update --skip-all
trellis init --registry "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-spec --append
~~~

再刷新公司 Workflow：

~~~bash
trellis workflow --marketplace "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-default --force
~~~

更新完成后检查：

1. 3 份公司 Spec 已更新。
2. `.trellis/workflow.md` 与公司版本一致。
3. `.trellis/spec/project/` 未被删除或覆盖。

## 固定版本

日常接入使用 `main`。需要稳定发布时，由维护者打 Git tag，再把上述 HTTPS 来源中的 `main` 替换为已验证 tag。不要把 npm Git package 加完整 commit SHA 作为推荐安装方式。

## 常见问题

### Node 版本不足

Node 22.20.0 只限制接入或更新动作。由一台符合要求的机器执行并提交生成文件后，其他成员只需 Git 拉取。

### Trellis 不认识参数

检查 `trellis --version`、`trellis init --help` 和 `trellis workflow --help`。不要猜测未发布参数；当前方案以官方 npm 版 0.6.15 的实际帮助输出为基线。

### HTTPS 权限失败

~~~bash
git ls-remote https://github.com/cmx-star/company-treill.git HEAD
~~~

由仓库管理员处理账号权限和 Git HTTPS 凭据。不要把令牌、密码或凭据内容复制到项目、日志或聊天中。

### 项目修改了公司分发副本

先保留 diff 并判断这些修改应该进入公司仓库还是项目级规范。直接更新可能覆盖 Workflow 的本地改动，不要在未审查时执行更新。
