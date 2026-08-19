# 维护和发布流程

## 发布模型

发布分为两个不可混淆的对象：

1. 固定 Registry 版本：registry/ 内容所在的不可变 commit。
2. 稳定 Channel：channel/.trellis/team-channel.json 指向已经验证的固定 commit。

业务项目通常绑定：

~~~text
git@github.com:cmx-star/company-treill/channel#main
~~~

Trellis 先读取稳定 Channel，再解析到完整 40 位 commit SHA。
维护者和业务项目都需要配置可访问该 GitHub 私有仓库的 SSH 密钥。

## 发布前修改

只在对应位置修改：

| 内容 | 路径 |
| --- | --- |
| 默认工作流 | registry/.trellis/workflows/company-default.md |
| Git 流程 | registry/.trellis/skills/company-git-workflow/SKILL.md |
| 产品差异 | registry/.trellis/skills/company-product-variants/SKILL.md |
| 公司工程规范 | registry/.trellis/spec/company/ |
| 公司默认配置 | registry/.trellis/team-defaults.yaml |
| 项目规范示例 | examples/project-spec/ |

examples/project-spec/ 不进入 Team Manifest。

## 版本规则

团队版本使用：

~~~text
YYYY.MM.N
~~~

例如：

~~~text
2026.08.1
2026.08.2
~~~

同月 N 递增。回滚版本可以低于当前版本，但 Manifest 必须设置 rollbackVersion 为成员当前安装版本。

## 构建 Manifest

在仓库根目录执行：

~~~bash
TEAM_VERSION=2026.08.1 node scripts/build-manifest.mjs
~~~

可选发布摘要：

~~~bash
TEAM_VERSION=2026.08.1 \
TEAM_SUMMARY="公司默认工作流和工程规范首版" \
node scripts/build-manifest.mjs
~~~

脚本会：

- 扫描 registry/.trellis/spec、skills 和 workflows。
- 加入 team-defaults.yaml。
- 拒绝符号链接。
- 生成每个文件的 SHA256。
- 保留已有删除、重命名、废弃和治理字段。
- 未提供私钥时删除过期签名文件。

## 可选签名

私钥必须保存在仓库外部：

~~~bash
TEAM_SIGNING_PRIVATE_KEY_FILE=/secure/team-maintainer.pem \
TEAM_VERSION=2026.08.1 \
node scripts/build-manifest.mjs
~~~

脚本仅保留仍能验证当前 Manifest 的签名，并输出 signer key id。

不得提交私钥、PEM、令牌或真实凭据。

## 提交前完整性门禁

~~~bash
node scripts/check-release.mjs
~~~

check-release.mjs 是提交前硬门禁，会自动检查：

- 当前 Git 差异是否存在行尾空白、冲突标记或其他格式错误。
- Manifest schema、字段规范化顺序和版本格式。
- 分发目录中的文件是否全部进入 Manifest。
- Manifest 中每个 SHA256 是否与当前文件一致。
- default_workflow 是否指向实际存在的 Workflow。
- Phase Index、三个 Phase 和 14 个步骤是否能按 Trellis 协议提取。
- 6 组 workflow-state 是否完整、成对且唯一。
- 是否残留“只有显式 /flow 才进入流程”的旧路由。
- Skill 目录、name、description 和 frontmatter。
- CHANGELOG、功能说明、使用指南和发布指南。
- 可选签名和稳定 Channel 指针。

该命令没有通过时不得提交固定版本。

## 固定版本发布

1. 提交 Registry、文档、脚本和 Manifest。
2. 推送提交，取得完整 commit SHA。
3. 在测试项目临时配置：

~~~yaml
registry:
  team:
    source: git@github.com:cmx-star/company-treill/registry#<完整 commit SHA>
~~~

4. 运行：

~~~bash
trellis team validate
trellis team preview
trellis update
trellis team doctor
~~~

5. 验证：

- company-default.md 已安装。
- default_workflow 自动合并为 company-default。
- 公司 Skill 已投影到启用的平台。
- 项目已有配置和项目 Spec 未被覆盖。
- 第二次 update 无变化且不产生重复更新。
- 普通开发任务自动读取 company-default。

固定版本验证失败时，不更新稳定 Channel。

## 更新稳定 Channel

固定版本通过后，修改：

~~~text
channel/.trellis/team-channel.json
~~~

内容：

~~~json
{
  "schemaVersion": 1,
  "source": "git@github.com:cmx-star/company-treill/registry#<完整 commit SHA>"
}
~~~

Channel 只能指向同一个 provider、host 和仓库中的固定 commit。

提交并推送 Channel 更新后，再用稳定来源执行一次：

~~~bash
trellis team validate
trellis team preview
trellis update
trellis team doctor
~~~

准备好 Channel、文档和脚本的全部变化后，提交前只运行一次完整门禁：

~~~bash
node scripts/check-release.mjs --require-channel
~~~

门禁通过后再统一提交和推送，不使用增量修复提交试跑检查。

## 回滚

推荐发布一个新的回滚 Manifest：

- teamVersion 可以低于当前版本。
- rollbackVersion 设置为成员当前版本。
- files 指向要恢复的文件内容。
- Channel 更新到回滚 Manifest 所在 commit。

成员正常运行：

~~~bash
trellis update
~~~

只有紧急人工降级才使用：

~~~bash
trellis update --allow-team-downgrade
~~~

不要手工修改 .team-state.json、.template-hashes.json 或更新 receipt 伪造状态。

## 发布记录

每次发布至少记录：

- teamVersion。
- 固定 commit SHA。
- Channel commit SHA。
- 变化范围。
- Trellis 兼容区间。
- 废弃、删除和重命名。
- 验证项目和执行命令。
- 未验证项。
- 回滚版本和操作。
- 签名 key id 和审批数；未启用签名时明确记录。
