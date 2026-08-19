# 项目接入与日常使用

## 谁需要运行安装器

每个业务项目只需要一名维护者或有权限的开发者运行安装和更新命令，然后把生成文件提交到业务项目 Git。

运行安装器的机器需要 Node 22.20.0 或更高版本。其他成员拉取已经提交的 `.trellis/`、Agent Skill 和 `skills-lock.json` 后即可使用，不受安装器 Node 版本限制。

## 前置检查

确认 Trellis 与私有仓库权限：

~~~bash
trellis --version
trellis init --help
trellis workflow --help
ssh -T git@github.com
~~~

当前最低验证 Trellis 版本为 `@mindfoldhq/trellis` 0.6.15。帮助中应包含 `init --registry`、`init --workflow-source` 和 `workflow --marketplace`。

## 首次安装

Codex 项目在业务项目根目录执行：

~~~bash
fnm exec --using=22.20.0 -- npm exec --yes --package="git+ssh://git@github.com/cmx-star/company-treill.git#main" -- company-trellis install --agent codex --yes
~~~

常用 Agent 名称包括：

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
fnm exec --using=22.20.0 -- npm exec --yes --package="git+ssh://git@github.com/cmx-star/company-treill.git#main" -- company-trellis install --agent codex --agent cursor --yes
~~~

## 安装结果

Codex 项目至少应包含：

~~~text
.trellis/spec/company/engineering.md
.trellis/spec/company/quality.md
.trellis/spec/company/security.md
.trellis/workflow.md
.agents/skills/company-git-workflow/SKILL.md
.agents/skills/company-product-variants/SKILL.md
skills-lock.json
~~~

`.trellis/config.yaml` 应记录：

~~~yaml
registry:
  spec:
    source: git@github.com:cmx-star/company-treill/marketplace#main
    template: company-spec
~~~

检查命令：

~~~bash
find .trellis/spec/company .agents/skills -type f | sort
rg -n "^registry:|source:|template:" .trellis/config.yaml
git status --short
~~~

Windows PowerShell：

~~~powershell
Get-ChildItem .trellis\spec\company,.agents\skills -Recurse -File; Select-String -Path .trellis\config.yaml -Pattern "registry:|source:|template:"; git status --short
~~~

确认差异后，把团队需要共享的 Trellis、Agent Skill 和锁文件提交到业务项目。不要提交密钥、个人配置或与本次接入无关的改动。

## 日常使用

接入后正常描述开发任务，不需要输入 `/flow`。Trellis 会注入 `.trellis/workflow.md`，工作流会读取公司 Spec、项目规范和当前任务上下文，并按任务风险选择紧凑路径或完整路径。

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
fnm exec --using=22.20.0 -- npm exec --yes --package="git+ssh://git@github.com/cmx-star/company-treill.git#main" -- company-trellis update --agent codex --yes
~~~

更新完成后检查：

1. 3 份公司 Spec 已更新。
2. `.trellis/workflow.md` 与公司版本一致。
3. 2 个公司 Skill 已重新复制。
4. `skills-lock.json` 已同步。
5. `.trellis/spec/project/` 未被删除或覆盖。

## 分别执行官方命令

需要排查某一分发路径时，可以绕过安装器分别运行。

Spec Marketplace 与 Custom Workflow：

~~~bash
trellis init --registry "git@github.com:cmx-star/company-treill/marketplace#main" --template company-spec --append --workflow company-default --workflow-source "git@github.com:cmx-star/company-treill/marketplace#main"
trellis update --skip-all
trellis workflow --marketplace "git@github.com:cmx-star/company-treill/marketplace#main" --template company-default --force
~~~

Custom Skills：

~~~bash
npx --yes skills@1.5.23 add git@github.com:cmx-star/company-treill.git --skill company-git-workflow company-product-variants --agent codex --copy --yes
~~~

## 固定版本

需要严格复现时，把安装包和两个 Marketplace 来源的 `#main` 替换为同一个完整 commit SHA。不要让 Spec、Workflow 和 Skill 分别指向不同版本。

## 常见问题

### Node 版本不足

Node 22.20.0 只限制安装或更新动作。由一台符合要求的机器执行并提交生成文件后，其他成员只需 Git 拉取。

### Trellis 不认识参数

检查 `trellis --version`、`trellis init --help` 和 `trellis workflow --help`。不要猜测未发布参数；当前方案以官方 npm 版 0.6.15 的实际帮助输出为基线。

### SSH 权限失败

~~~bash
ssh -T git@github.com
git ls-remote git@github.com:cmx-star/company-treill.git
~~~

由仓库管理员处理账号和 SSH 权限，不要把私钥复制到项目、日志或聊天中。

### Skill 没有出现

确认命令使用了 `--agent codex --copy --yes`，再检查 `.agents/skills/` 与 `skills-lock.json`。Trellis CLI 本身不会替代 skills.sh 安装外部 Skill。

### 项目修改了公司分发副本

先保留 diff 并判断这些修改应该进入公司仓库还是项目级规范。直接更新可能覆盖 Workflow 和 Skill 的本地改动，不要在未审查时执行更新。
