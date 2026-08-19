# 项目接入与日常使用

## 谁需要运行安装器

每个业务项目只需要一名维护者或有权限的开发者运行安装和更新命令，然后把生成文件提交到业务项目 Git。

运行安装器的机器需要 Node 22.20.0 或更高版本。其他成员拉取已经提交的 `.trellis/`、Agent Skill 和 `skills-lock.json` 后即可使用，不受安装器 Node 版本限制。

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

## 首次安装

在业务项目根目录执行：

~~~bash
npm exec --yes --package="git+https://github.com/cmx-star/company-treill.git#main" -- company-trellis install
~~~

安装器会交互询问项目要安装到哪个 Agent。当前支持的 Agent 名称包括：

~~~text
codex
claude-code
cursor
opencode
gemini-cli
github-copilot
antigravity
pi
~~~

需要同时安装到多个工具时重复传入 `--agent`：

~~~bash
npm exec --yes --package="git+https://github.com/cmx-star/company-treill.git#main" -- company-trellis install --agent <名称> --agent <名称> --yes
~~~

非交互命令必须由执行者明确传入实际使用的 `--agent <名称>` 和 `--yes`；公司仓库不预设编辑器或 Agent。

## 安装结果

项目至少应包含：

~~~text
.trellis/spec/company/engineering.md
.trellis/spec/company/quality.md
.trellis/spec/company/security.md
.trellis/workflow.md
<Agent Skill 目录>/company-git-workflow/SKILL.md
<Agent Skill 目录>/company-product-variants/SKILL.md
skills-lock.json
~~~

如果交互时选择 `codex`，Agent Skill 目录通常是 `.agents/skills/`，对应结果为 `.agents/skills/company-git-workflow/SKILL.md` 和 `.agents/skills/company-product-variants/SKILL.md`。

公司 Spec 与 Workflow 由 `company-trellis` 从当前 Git 包复制，后续也通过 `company-trellis update` 刷新；`.trellis/config.yaml` 不需要记录公司 Registry 来源。

检查命令：

~~~bash
find .trellis/spec/company -type f | sort
test -f .trellis/workflow.md && printf '%s\n' .trellis/workflow.md
find "<Agent Skill 目录>" -maxdepth 2 -type f | sort
git status --short
~~~

Windows PowerShell：

~~~powershell
Get-ChildItem .trellis\spec\company,"<Agent Skill 目录>" -Recurse -File; Test-Path .trellis\workflow.md; git status --short
~~~

确认差异后，把团队需要共享的 Trellis、Agent Skill 和锁文件提交到业务项目。不要提交密钥、个人配置或与本次接入无关的改动。

## 日常使用

接入后正常描述开发任务，不需要输入 `/flow`。Trellis 会注入 `.trellis/workflow.md`，工作流会读取公司 Spec、项目规范和当前任务上下文，并按任务风险选择紧凑路径或完整路径。公司安装器在接入和更新时从已下载的 Git 包本地复制公司 Spec 与 Workflow，不依赖运行时访问 GitHub raw 文件。

Git、提交、合并、Tag、Hotfix、推送和发布请求会加载 `company-git-workflow`。私有部署、品牌、市场、外部服务、本地化和版本能力请求会加载 `company-product-variants`。

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

公司安装器只处理 `.trellis/spec/company/`，不会分发或删除项目级示例。

## 获取公司更新

在业务项目根目录执行：

~~~bash
npm exec --yes --package="git+https://github.com/cmx-star/company-treill.git#main" -- company-trellis update
~~~

更新同样默认交互选择 Agent；自动化环境由执行者追加实际使用的 `--agent <名称>` 和 `--yes`。

更新完成后检查：

1. 3 份公司 Spec 已更新。
2. `.trellis/workflow.md` 与公司版本一致。
3. 2 个公司 Skill 已重新复制。
4. `skills-lock.json` 已同步。
5. `.trellis/spec/project/` 未被删除或覆盖。

## 分步排查命令

需要排查某一分发路径时，可以绕过安装器分别运行。默认接入仍优先使用 `company-trellis install`。

Spec Marketplace 与 Custom Workflow 兼容性检查：

~~~bash
trellis init --registry "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-spec --append --workflow company-default --workflow-source "https://github.com/cmx-star/company-treill/tree/main/marketplace"
trellis update --skip-all
trellis workflow --marketplace "https://github.com/cmx-star/company-treill/tree/main/marketplace" --template company-default --force
~~~

Custom Skills：

~~~bash
npm exec --yes --package=skills@1.5.23 -- skills add https://github.com/cmx-star/company-treill.git --skill company-git-workflow company-product-variants --copy
~~~

## 固定版本

需要严格复现时，把安装包来源的 `#main` 替换为完整 commit SHA。只有在单独排查 Marketplace 兼容性命令时，才同步固定 Marketplace 来源版本。

## 常见问题

### Node 版本不足

Node 22.20.0 只限制安装或更新动作。由一台符合要求的机器执行并提交生成文件后，其他成员只需 Git 拉取。

### Trellis 不认识参数

检查 `trellis --version`、`trellis init --help` 和 `trellis workflow --help`。不要猜测未发布参数；当前方案以官方 npm 版 0.6.15 的实际帮助输出为基线。

### HTTPS 权限失败

~~~bash
git ls-remote https://github.com/cmx-star/company-treill.git HEAD
~~~

由仓库管理员处理账号权限和 Git HTTPS 凭据。不要把令牌、密码或凭据内容复制到项目、日志或聊天中。

### Skill 没有出现

交互安装时确认已经选择目标 Agent；非交互安装时确认命令显式传入了实际使用的 `--agent <名称>` 和 `--yes`。再检查对应 Agent Skill 目录与 `skills-lock.json`。Trellis CLI 本身不会替代 skills.sh 安装外部 Skill。

### 项目修改了公司分发副本

先保留 diff 并判断这些修改应该进入公司仓库还是项目级规范。直接更新可能覆盖 Workflow 和 Skill 的本地改动，不要在未审查时执行更新。
