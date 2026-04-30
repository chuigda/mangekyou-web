# harry-potter — 哈利·波特与霍格沃茨大世界

一个完整的哈利·波特世界模拟器示例，展示了 Mangekyou 的多 Addon 叠加能力。

> 🚧 本模拟器还在测试阶段，提示词质量可能不稳定。

## 文件列表

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| `harry-potter.simulator.chr.toml` | Simulator | 主模拟器：定义世界观、开局流程、状态栏（场景/属性/物品/人际关系）、技能体系、地点数据库、叙事准则 |

### Addon 扩展包

以下 Addon 可按需加载，互不冲突：

| 文件 | 名称 | 说明 |
| --- | --- | --- |
| `magic.addon.chr.toml` | 魔法禁书目录 | 魔法技能体系总览：变形术、咒语学、占卜学、算术占卜、古代如尼文、幻影移形、大脑封闭术、摄神取念、阿尼马格斯、黑魔法、无声咒、无杖魔法等 |
| `spells.addon.chr.toml` | 咒语大全 | 完整的咒语数据库（辅助咒、变形咒、防御咒、攻击咒、恶咒、治疗咒、黑魔法及不可饶恕咒），帮助 LLM 正确使用咒语 |
| `exam.addon.chr.toml` | 烦人的考试 | 考试系统：期末考试、OWL、NEWT、WOMBAT 的时间线、评分等级及 XP 奖励规则 |
| `goblet-of-fire.addon.chr.toml` | 三强争霸赛 | 三强争霸赛（1994-95）的完整时间线、三项任务细节及勇士积分追踪 |
| `gringotts.addon.chr.toml` | 妖精银行家 | 古灵阁巫师银行：麻瓜货币兑换规则与妖精冶金术 |
| `house-cup.addon.chr.toml` | 学院杯 | 四大学院积分和魁地奇杯战绩的实时追踪 |
| `newspaper.addon.chr.toml` | 预言家日报 | 每轮生成一条讽刺风格的《预言家日报》头条新闻 |
| `magecraft.addon.chr.toml` | 型月魔术 | 将型月世界的魔术体系引入哈利·波特宇宙：神代魔术、卢恩魔术、现代魔术，以及魔力源、魔术回路等核心概念 |
| `hachimi.addon.chr.toml` | 哈基米喔南北绿豆 | 恶搞模组：用"哈气决斗"体系替换魔法战斗 |
| `psychotropics.addon.chr.toml` | 精品神药 | 麻瓜精神类药物对魔法能力的影响及与魔药的交互作用 |

## 使用方式

1. 载入 `harry-potter.simulator.chr.toml` 作为模拟器
2. 载入玩家角色卡（可使用 `blank/example.player.chr.toml` 模板创建）
3. 按需载入并启用上方的 Addon 扩展包
4. 按照开场白中的模板创建角色，开始游戏
