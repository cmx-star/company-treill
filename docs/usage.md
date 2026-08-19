# 项目接入与日常使用

## 前置条件

确认项目已经安装支持 Team Registry 的 Trellis：

~~~bash
trellis --version
trellis --help
~~~

公司 Registry 2026.08.1 要求 Trellis 0.6.15 或更高、且低于 0.8.0。

## 首次接入

在业务项目根目录执行：

~~~bash
trellis init --team-registry gh:cmx-star/company-treill/channel
~~~

如果项目已经初始化 Trellis，在 .trellis/config.yaml 中增加：

~~~yaml
registry:
  team:
    source: gh:cmx-star/company-treill/channel
~~~

然后运行：

~~~bash
trellis team validate
trellis team preview
trellis update
trellis team doctor
~~~

## 验证接入结果

检查默认工作流：

~~~bash
rg -n "^default_workflow:" .trellis/config.yaml
~~~

预期结果：

~~~text
default_workflow: company-default
~~~

检查公司文件：

~~~bash
find .trellis/workflows .trellis/spec/company .trellis/skills -type f | sort
~~~

至少应包含：

~~~text
.trellis/workflows/company-default.md
.trellis/spec/company/engineering.md
.trellis/spec/company/quality.md
.trellis/spec/company/security.md
.trellis/skills/company-git-workflow/SKILL.md
.trellis/skills/company-product-variants/SKILL.md
~~~

公司 Skill 还会由 Trellis 投影到项目已经启用的 AI 平台目录。

## 日常任务怎么使用

正常描述任务即可。

示例：

~~~text
修复登录页在令牌过期后仍显示已登录的问题。
~~~

工作流会自动：

1. 读取公司规范、项目规范和 Git 状态。
2. 判断使用紧凑路径、标准路径还是 diagnose。
3. 明确目标、范围、验收和验证。
4. 在需要时创建或继续 Trellis Task。
5. 实施当前切片。
6. 运行验证并审查结果。
7. 报告未验证项、风险和 Git 状态。

## 项目级规范

公司 Registry 不分发业务项目的真实架构和命令。项目团队应在自己的仓库维护：

~~~text
.trellis/spec/project/
├── index.md
├── architecture.md
├── commands.md
└── testing.md
~~~

可以参考本仓库 examples/project-spec/，但必须用当前项目事实替换示例内容。

项目级规范应记录：

- 架构和模块边界。
- 技术栈和版本。
- 项目标准命令。
- 业务契约和数据语义。
- 测试分层和验收路径。
- 敏感区域和扩大验证条件。

## 获取公司更新

更新前：

~~~bash
trellis team status --remote
trellis team validate
trellis team preview
~~~

应用更新：

~~~bash
trellis update
~~~

更新后：

~~~bash
trellis team doctor
~~~

## defaults 冲突

team-defaults.yaml 使用三方合并：

- 本地值未修改时跟随公司新默认。
- 本地值已经修改时保留本地值。
- 新增公司默认会补入配置。
- 公司删除旧默认且本地未修改时会删除。
- 类型冲突时保留本地值并报告冲突。

不要为了更新公司规范手工覆盖整个 .trellis/config.yaml。

## 固定版本

排查升级问题或需要严格复现时，可以临时绑定固定 commit：

~~~yaml
registry:
  team:
    source: gh:cmx-star/company-treill/registry#0123456789abcdef0123456789abcdef01234567
~~~

固定来源必须使用完整 40 位 commit SHA。

## 常见问题

### 默认工作流没有变化

依次检查：

~~~bash
trellis team validate
trellis team preview
trellis update
rg -n "^default_workflow:" .trellis/config.yaml
~~~

如果项目曾修改 default_workflow，三方合并会保留项目本地选择。检查 preview 和 doctor 的 defaults 结果。

### 公司 Skill 没有出现在平台目录

检查项目实际启用了哪些平台，并运行：

~~~bash
trellis update
trellis team doctor
~~~

Skill 的源文件保存在 .trellis/skills/，平台副本由 Trellis 生成，不手工维护。

### 本地修改了公司管理文件

运行：

~~~bash
trellis team status
trellis team preview
~~~

根据 Trellis 冲突提示保留本地版本、接受公司版本或生成 .new 文件。需要形成长期项目差异时，应把规则写入项目 Spec，不直接修改公司分发副本。
