/**
 * Simplified Chinese translation of the portal chrome.
 *
 * Generated from the inline French and English labels (`npm run i18n:extract`),
 * then translated. Keys mirror the English source; a key missing here reads
 * English. Edit translations here, and the source labels in their components.
 */
const LOCALE = {
    "app/(home)/page#LOCAL": {
        "description": "您的档案在客户处的进展，以及客户对您的期望。",
        "generatedAt": "数据截至 {time}"
    },
    "app/company/page#LABELS": {
        "title": "我的企业",
        "noSupplier": "无供应商档案",
        "noSupplierHint": "您的账户未关联任何供应商。请联系您的客户代表。",
        "approval": "认证状态",
        "approvalHint": "根据您的文件、项目和不合格项实时计算。",
        "reasons": {
            "documentExpired": "一份必需文件已过期",
            "documentExpiring": "一份必需文件即将过期",
            "documentMissing": "一份必需文件尚未提供",
            "blockingNc": "存在一项未关闭的阻断性不合格项",
            "openProject": "一个准入项目正在进行中",
            "blockingCatalog": "一项阻断性目录要求未满足"
        },
        "metrics": {
            "documentsExpired": "已过期文件",
            "documentsExpiring": "即将过期文件",
            "documentsMissing": "缺失文件",
            "openNc": "未关闭 NC",
            "openProjects": "进行中的项目"
        },
        "sections": {
            "identity": "基本信息",
            "surveyList": "问卷",
            "contactList": "联系人",
            "plant": "工厂",
            "certification": "认证",
            "documents": "文件",
            "specs": "规格书"
        },
        "frozen": "列表已由客户确认 — 只读",
        "emptyList": "无数据行",
        "emptyListHint": "此部分尚未填写。",
        "questionnaire": "已回答 {done} / {total} 个问题",
        "noProperties": "无可显示的属性",
        "yes": "是",
        "no": "否",
        "code": "代码",
        "request": "申请更新"
    },
    "app/documents/page#LABELS": {
        "title": "我的文件",
        "tabRequirements": "要求",
        "tabAll": "全部文件",
        "tabSigned": "已签署",
        "deposit": "上传文件",
        "depositTitle": "上传文件",
        "entity": "相关产品",
        "chooseEntity": "选择产品…",
        "filters": {
            "open": "待处理",
            "blocking": "阻断性",
            "expiring": "即将过期",
            "done": "已提供",
            "all": "全部"
        },
        "stats": {
            "toProvide": "待提供",
            "expired": "已过期",
            "expiring": "{days} 天内过期",
            "compliance": "文件合规性",
            "mandatory": "必需文件 {done} / {total}",
            "noScope": "无可评估的范围"
        },
        "search": "搜索文件",
        "noMatch": "没有符合此筛选条件的文件",
        "noMatchHint": "请选择“全部”以查看所有文件。",
        "columns": {
            "document": "文件",
            "entity": "产品",
            "status": "状态",
            "validity": "有效期",
            "modified": "修改日期",
            "ai": "AI 分析",
            "actions": ""
        },
        "download": "下载",
        "view": "查看",
        "noFile": "尚未提供",
        "blockingBanner": "有 {count} 份必需文件影响您的认证。它们显示在列表顶部。",
        "scopeEmpty": "您的账户未关联任何供应商，因此无法计算文件要求。上方计数器为空，并不代表已满足。请联系您的客户代表。"
    },
    "app/error#LABELS": {
        "title": "无法显示此页面",
        "message": "渲染时发生技术错误。您已输入的内容不会丢失：系统会随时保存。",
        "retry": "重试",
        "home": "返回首页",
        "reference": "提供给技术支持的参考编号"
    },
    "app/global-error#LABELS": {
        "title": "门户无法启动",
        "message": "技术错误导致门户无法显示。请重试；如问题仍然存在，请凭以下参考编号联系您的 beCPG 联系人。",
        "retry": "重试",
        "reference": "参考编号"
    },
    "app/help/page#LABELS": {
        "title": "帮助",
        "subtitle": "门户使用方法分步说明",
        "scope": "beCPG 供应商门户",
        "search": "搜索帮助",
        "expandAll": "全部展开",
        "collapseAll": "全部折叠",
        "topics": "目录",
        "noResult": "没有匹配的主题",
        "noResultHint": "请尝试其他关键词：“文件”、“签名”、“步骤”、“认证”。",
        "anchor": "链接到此主题",
        "anchorCopied": "链接已复制",
        "goTo": "前往",
        "monitorNotice": "本帮助描述的是供应商视图：即您的供应商所看到的界面，其中“您的客户”指贵公司本身。监控空间的帮助尚未编写。"
    },
    "app/help/page#TOPICS": [
        {
            "id": "start",
            "icon": "flag",
            "title": "从哪里开始",
            "summary": "仪表板只回答一个问题：您需要做什么，以及截止日期是什么时候。",
            "blocks": [
                {
                    "p": "一切从仪表板开始。顶部的四张卡片汇总了您在该客户处的档案："
                },
                {
                    "ul": [
                        "**认证状态** — 已认证、进行中、待更新或已暂停，并显示有效期。",
                        "**完整度** — 您的资料表中已填写的预期字段所占比例。",
                        "**待办事项** — 有多少任务未完成，其中多少已逾期。",
                        "**文件** — 多少有效，多少即将过期，多少缺失。"
                    ]
                },
                {
                    "p": "下方的列表提供详细信息：您的任务、产品、文件、讨论和通知。页眉中的铃铛图标可在任何页面显示相同的通知列表。"
                },
                {
                    "note": "一个账户可以为多个 beCPG 客户工作，每个客户对应一个门户。客户的徽标和名称始终显示在左上角：据此可知您当前所在的档案。"
                },
                {
                    "warn": "如果显示“TEST 实例”横幅，说明您处于试用环境：在此输入的任何内容均不具有合同效力。"
                },
                {
                    "links": [
                        {
                            "href": "/",
                            "icon": "dashboard",
                            "label": "仪表板"
                        },
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "我的任务"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "我的文件"
                        }
                    ]
                }
            ]
        },
        {
            "id": "tasks",
            "icon": "assignment_turned_in",
            "title": "准入任务如何运作",
            "summary": "任务来自客户发起的项目。任务类型决定您进入哪个页面。",
            "blocks": [
                {
                    "p": "您的客户发起准入项目，该项目向您发送任务。任务包含标题、相关产品、截止日期和类型。点击任务会直接进入完成该任务的页面 — 没有中间页面。"
                },
                {
                    "ul": [
                        "**向导** — 引导您填写产品资料表或供应商资料表。",
                        "**签名** — 阅读 PDF 文件，然后签署。",
                        "**文件** — 上传或更新所需文件。",
                        "**审阅** — 通读产品信息，无需填写。"
                    ]
                },
                {
                    "p": "“已计划”或“进行中”的任务正在等待您处理。“已拒绝”的任务由客户附带理由退回：重新提交前请阅读备注。“已完成”的任务无需再处理。"
                },
                {
                    "p": "超过截止日期的任务会在列表和通知中标记为逾期。逾期超过七天时显示为红色。"
                },
                {
                    "note": "您可以随意多次打开和离开任务：任务会一直保持打开，直到您亲自完成，两次访问之间不会丢失任何内容。"
                },
                {
                    "links": [
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "我的任务"
                        }
                    ]
                }
            ]
        },
        {
            "id": "wizard",
            "icon": "auto_stories",
            "title": "向导步骤的顺序",
            "summary": "页眉中的技术资料表、常驻的“背景信息”面板、客户定义的各部分，最后是合规性。",
            "blocks": [
                {
                    "p": "向导始终遵循相同的顺序。它不是单向流程：步骤一经访问，即可自由返回。"
                },
                {
                    "ol": [
                        "**页眉 · 技术资料表** — 您需要完成的第一步。缺少时，每个步骤上方都会显示红色提示条；上传后，仅保留一行显示其日期和有效期。AI 正是读取这份文件来建议数值：没有它就无可读取。如果客户未配置此文件类型，则完全不显示该提示条。",
                        "**步骤 0 · 背景信息** — 始终可见的面板，在手机上只需轻点即可打开。其中包含 AI 建议、适用的规格书、客户已确认的列表以及以往的退回记录。您无需逐步浏览它：无论处于哪个步骤，它都在那里。",
                        "**客户定义的各部分** — 属性、问卷、配料、营养成分、过敏原、理化指标、声明、微生物、感官、包装材料、文件……显示哪些部分及其顺序，取决于客户的配置和产品类型：门户不做选择。",
                        "**文件** — 该步骤保持客户为其设定的位置，通常靠近末尾。这是有意为之：beCPG 根据您输入的内容推导所需文件（“非转基因”声明需要相应证明），过早询问会导致列表为空或不正确。只有技术资料表在任何情况下都需要提供，它位于页眉中。",
                        "**合规性** — 列出仍缺失的字段，每项均可点击直接跳转，并显示完整度评分。如果客户定义了阻断性检查，在满足之前无法完成。"
                    ]
                },
                {
                    "note": "每个部分都会自动保存，无需点击按钮。向导底部导航按钮旁的“已于 HH:MM 保存”提示即为确认 — 如果您关闭门户、切换设备或断网，也能从中断处继续。"
                },
                {
                    "p": "在某些步骤之间，您的资料表会重新计算（过敏原、营养成分、成本……）。计算在后台运行，不会阻碍您：计算期间您可以继续输入。"
                },
                {
                    "p": "在宽屏上，“扩大输入区域”会隐藏侧面板，并将步骤列表缩小为图标，便于处理宽表格。该选择会在不同资料表之间保留；通过页眉图标仍可一键打开面板。"
                },
                {
                    "note": "如果您的联系人代您输入数据，向导顶部会显示“您正在为……输入数据”的横幅明确说明。"
                }
            ]
        },
        {
            "id": "grids",
            "icon": "grid_on",
            "title": "在表格中快速输入",
            "summary": "配料、营养成分、过敏原：全部通过键盘完成，电子表格中的数据块可直接粘贴。",
            "blocks": [
                {
                    "p": "表格部分 — 配料、营养成分、过敏原、理化指标…… — 无需离开键盘即可填写。表格上方的键盘按钮可随时调出快捷键列表。"
                },
                {
                    "ul": [
                        "**Tab / Shift+Tab** — 下一个 / 上一个单元格。",
                        "**Enter** — 保存该行并移至同一列的下一行；在最后一行时新增一行。",
                        "**↑ / ↓** — 同一列的上一行 / 下一行。",
                        "**Esc** — 放弃正在编辑行的更改。",
                        "**Ctrl+D** — 复制当前行。",
                        "**Ctrl+V** — 粘贴电子表格中的单元格区域。"
                    ]
                },
                {
                    "p": "从电子表格粘贴可一次性导入多行多列，自动创建缺少的行，并告知无法导入的内容 — 不在建议列表中的值、应为数字却是文本、只读列。系统不做任何猜测：没有精确匹配的内容都会退回给您修正。"
                },
                {
                    "note": "与向导中其他地方一样，离开一行即自动保存 — 或按 Enter，或勾选复选框时。没有保存按钮：无需确认。只有粘贴操作会提供“保存 N 行”，因为这些行没有人逐一检查过。"
                },
                {
                    "p": "在手机上，表格变为每行一张卡片：字段相同，纵向排列，无需横向滚动。"
                }
            ]
        },
        {
            "id": "specs",
            "icon": "menu_book",
            "title": "规格书与目录：有何区别",
            "summary": "规格书供阅读。目录需要填写 — 并且由它决定您能否完成。",
            "blocks": [
                {
                    "p": "这是两种不同的对象，用于不同的时机。最简单的方法是按照遇到它们的顺序来理解。"
                },
                {
                    "ul": [
                        "**规格书** — 客户提供的文件，关联到某个产品或产品系列。它说明客户的要求：禁用物质、可接受的产地、分析阈值、运输条件、CSR 承诺。它是**参考文本**，供阅读。门户在向导的“背景信息”面板中显示它，“规格书”页面汇集了所有规格书。",
                        "**目录** — 客户定义的**必填字段列表**：“原料要在我这里准入，我需要产地、密度、EAN 码、主要过敏原……”。它不是文本，而是一项检查。门户持续计算它，并在“合规性”步骤中给出评分。"
                    ]
                },
                {
                    "p": "换言之：规格书告诉您**客户对您产品的期望**，目录则核查**产品资料表是否完整**。您可能符合规格书但资料表不完整，反之亦然。"
                },
                {
                    "p": "两者中只有目录会阻止您提交。当客户声明了阻断性目录时，只要有字段缺失，“完成”按钮就不可用，“合规性”步骤会准确列出缺失项 — 每一行都可跳转到相应字段。"
                },
                {
                    "note": "规格书也可能要求提供文件（有机证书、非转基因证明）。这些文件会出现在“我的文件”和“文件”步骤中，并附有效期 — 而不在目录中。"
                },
                {
                    "links": [
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "规格书"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "我的文件"
                        }
                    ]
                }
            ]
        },
        {
            "id": "frozen",
            "icon": "lock",
            "title": "冻结列表的含义",
            "summary": "客户确认的列表变为只读。这是有意为之，可应要求撤销。",
            "blocks": [
                {
                    "p": "当客户确认某一部分 — 配料表、问卷、过敏原…… — 该部分即被**冻结**：您仍能看到其全部数值，但无法再修改。挂锁图标和“只读”标识会加以说明。"
                },
                {
                    "p": "这正是其目的：数值一经确认，就成为客户所依赖的基准（标签、规格书、检验）。如果它可以在客户不知情的情况下更改，确认就失去了意义。"
                },
                {
                    "p": "冻结的列表也会列在向导“背景信息”面板的“已确认列表”下：这是查看哪些已定、哪些仍待处理的最快方式。"
                },
                {
                    "warn": "在冻结列表中发现错误？请不要创建重复的资料表。请通过资料表所附的讨论申请重新开放该部分：客户解冻后，您即可重新编辑。"
                },
                {
                    "p": "整个资料表也可能因其他原因而只读：任务已完成、项目已关闭，或您只有读取权限。向导会告诉您属于哪种情况。"
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "讨论"
                        }
                    ]
                }
            ]
        },
        {
            "id": "confidence",
            "icon": "auto_awesome",
            "title": "AI 提供的建议",
            "summary": "仅为建议 — 绝不会代替您写入数值。",
            "blocks": [
                {
                    "p": "当客户启用自动提取时，门户会读取您的文件并建议所找到的数值。这些建议显示在表单右侧的“背景信息”面板中，每次切换步骤时重新读取 — 您刚输入的内容会改变剩余的建议。"
                },
                {
                    "p": "一切从向导页眉中的**技术资料表**开始。在其上传之前，没有可读取的内容，建议列表保持为空：这正是红色提示条的含义。"
                },
                {
                    "ul": [
                        "**应用** — 将数值写入资料表。点击之前不会写入任何内容。",
                        "**展开** — 用于面板中放不下的较长分析。"
                    ]
                },
                {
                    "note": "不需要的建议无需拒绝：不应用即可，这本就是默认行为。无论识别结果声称多么确定，任何数值都不会被自动应用。提交资料表的是您：决定权逐字段归您所有。"
                },
                {
                    "p": "在任何情况下，最终数值都由您决定：您对所确认的内容负责，在您完成任务之前，任何内容都不会发送给客户。"
                }
            ]
        },
        {
            "id": "documents",
            "icon": "folder_shared",
            "title": "文件有效期与更新",
            "summary": "门户知道需要哪些文件、有效期多长以及缺少哪些文件。",
            "blocks": [
                {
                    "p": "所需文件并不需要您去猜：由客户进行配置（文件类型、是否必需、有效期限、适用范围），“我的文件”页面按产品原样呈现给您。"
                },
                {
                    "ul": [
                        "**有效** — 已提供、已接受，且距有效期截止尚远。",
                        "**待更新** — 距有效期截止不足 60 天（客户可调整该期限）。",
                        "**已过期** — 有效期已过。对于必需文件，这会暂停您的认证。",
                        "**缺失** — 需要但从未提供。",
                        "**已拒绝** — 已提供，但被客户拒绝：重新上传前请阅读拒绝理由。"
                    ]
                },
                {
                    "p": "每份文件都有有效期（开始和结束），显示在其所在行，颜色与 beCPG 一致：在有效期内为**绿色**，临近截止为**橙色**，过期后为**红色**。"
                },
                {
                    "p": "根据文件类型，有效期由上传日期和客户配置的期限自动推导，或者**需由您填写**：此时上传区域会出现两个日期框，请根据所上传的文件填写。日期随文件一起保存，之后仍可通过该行的“编辑”修改。"
                },
                {
                    "warn": "从未填写有效期的必需文件会以红色标记“需填写有效期”。没有截止日期，它永远不会过期，也不会发送提醒，客户也无从得知其自何时起有效。"
                },
                {
                    "p": "更新是指在同一行上传新版本 — 绝不是新建第二行。旧版本连同其有效期保留在文件历史中：这正是您在过去某一日期处于有效覆盖状态的证明。"
                },
                {
                    "note": "文件名和存放位置无关紧要：门户会按照客户的配置重命名和归档文件。请按收到时的原样上传文件。"
                },
                {
                    "p": "到期前的邮件提醒由 beCPG 根据客户定义的规则发送。门户始终显示真实状态：请不要依赖邮件，以“我的文件”为准。"
                },
                {
                    "links": [
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "我的文件"
                        }
                    ]
                }
            ]
        },
        {
            "id": "approval",
            "icon": "verified",
            "title": "认证状态",
            "summary": "根据您的文件、资料表和不合格项实时计算。从不冻结。",
            "blocks": [
                {
                    "p": "仪表板上显示的状态并非手工录入的决定：每次显示时都会根据您的档案重新计算。解决原因后，状态即会改变。"
                },
                {
                    "ul": [
                        "**已暂停** — 至少一份必需文件已过期，或存在未关闭的阻断性不合格项。",
                        "**待更新** — 至少一份必需文件即将过期。",
                        "**进行中** — 有准入项目未关闭，或某份必需文件从未提供，或某项阻断性检查未满足。",
                        "**已认证** — 以上情况均不存在。"
                    ]
                },
                {
                    "p": "仪表板卡片列出了导致该状态的原因：每项均可点击，并跳转到需要修正的内容。"
                },
                {
                    "note": "客户的采购系统也会读取同一状态。因此，一份过期的必需文件可能会阻止订单，而不仅仅是显示一个橙色标签。"
                }
            ]
        },
        {
            "id": "signature",
            "icon": "draw",
            "title": "签名如何运作",
            "summary": "系统会要求您先阅读，再签署。签名由 beCPG 完成，而非您的浏览器。",
            "blocks": [
                {
                    "p": "签名任务会在门户内置的查看器中打开文件。文件不会离开门户，在手机上也可使用。"
                },
                {
                    "ol": [
                        "**阅读整份文件。** 系统逐页跟踪阅读进度：只要有页面未显示，就无法签署。",
                        "用手指、鼠标或手写笔在客户准备好的位置**绘制您的签名**。签名区和简签区已预先设置：您无需自行放置。",
                        "**勾选同意框**，然后提交。任务只发送一次。"
                    ]
                },
                {
                    "p": "beCPG 在服务器上签署文件，归档已签署版本，并通过邮件发送给收件人。门户不会自行颁发任何证书。"
                },
                {
                    "note": "如果提交过程中网络中断，请重试：请求带有唯一标识，因此重复到达的请求不会签署两次。已签署的文件会如实显示并提供下载，而不会要求您再次签署。"
                },
                {
                    "warn": "签名无法在门户中拒绝或撤销。如果文件有误，请不要签署：打开讨论并告知客户。"
                }
            ]
        },
        {
            "id": "discussion",
            "icon": "forum",
            "title": "客户的备注在哪里",
            "summary": "每份资料表一个对话，但每条消息都关联到其所涉及的内容。",
            "blocks": [
                {
                    "p": "资料表的讨论对双方而言是同一个：客户在 beCPG 中写的内容会在这里送达您，您的回复也会在那里送达客户。无需关注单独的邮箱。"
                },
                {
                    "p": "一条消息可以关联到三个位置，面板顶部的选择器可让您选择要阅读或发送到的位置："
                },
                {
                    "ul": [
                        "**整个资料表** — 完整对话，包括针对某个字段或表格行的备注。这是默认视图。",
                        "**某个字段** — “法定名称不完整”。此时向导中该字段旁会出现一个气泡。",
                        "**某个表格行** — “饱和脂肪有误”。备注跟随该行，而非行号。"
                    ]
                },
                {
                    "note": "从字段或行而非“整个资料表”发起讨论可为所有人节省时间：您的联系人立即知道您在说什么，无需在两百个字段中查找。"
                },
                {
                    "p": "准入结束后讨论变为只读：您可以回看交流内容，但不能再添加。页面会告诉您属于哪种原因。"
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "讨论"
                        }
                    ]
                }
            ]
        },
        {
            "id": "contact",
            "icon": "support_agent",
            "title": "联系谁",
            "summary": "您的联系人就是您的客户。资料表所附的讨论是合适的沟通渠道。",
            "blocks": [
                {
                    "p": "本门户由客户为您开通：客户配置所需文件、向导步骤、确认流程和截止日期。因此，涉及内容的任何问题，客户都是您的首要联系人。"
                },
                {
                    "ul": [
                        "**关于资料表的问题、备注、更正、需要解冻的列表** — 请使用资料表或任务所附的讨论。您的消息会送达负责您档案的人员，并保留在相关产品下。",
                        "**文件被拒绝但理由不明确** — 重新上传前请在产品讨论中回复。",
                        "**无法按期完成** — 请在讨论中说明，而不要让任务逾期。",
                        "**访问问题**（密码、添加同事、关闭账户） — 请通过您在客户处的联系人处理：账户由客户创建和关闭，而非在本门户中操作。"
                    ]
                },
                {
                    "note": "您申报的联系人以及客户的联系人列在您的供应商资料表“联系人”标签页中。"
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "讨论"
                        },
                        {
                            "href": "/company",
                            "icon": "business",
                            "label": "我的企业"
                        },
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "规格书"
                        }
                    ]
                }
            ]
        }
    ],
    "app/login/page#PAGE_TEXT": {
        "welcome": "欢迎",
        "intro": "登录以访问您的供应商空间：您的任务、产品、文件和认证状态。",
        "chooseTenant": "选择您的客户",
        "chooseTenantHelp": "为多个 beCPG 客户工作？请选择您要打开其档案的客户。",
        "sso": "您将被重定向到客户的身份验证服务。",
        "testNotice": "TEST 实例 — 在此输入的数据不具有合同效力。",
        "help": "需要帮助？",
        "errorTitle": "登录失败",
        "pitch": "beCPG 供应商门户",
        "sellingPoints": [
            {
                "icon": "assignment_turned_in",
                "text": "您的准入申请和任务，集中一处"
            },
            {
                "icon": "folder_shared",
                "text": "您的文件和证书，附带到期日期"
            },
            {
                "icon": "verified",
                "text": "您的认证状态，由客户实时更新"
            }
        ]
    },
    "app/login/page#ERROR_TEXT": {
        "oidc_not_configured": "此客户未配置身份验证。",
        "tenant_mismatch": "您的会话属于另一个客户。请重新登录。",
        "dev_auth_misconfigured": "开发模式已开启，但配置有误。",
        "session_expired": "您的会话已过期。请重新登录。"
    },
    "app/messages/page#LABELS": {
        "title": "讨论",
        "subjects": "主题",
        "messageCount": "{count} 条消息",
        "search": "搜索主题",
        "myRecord": "我的供应商档案",
        "back": "主题",
        "placeholder": "输入消息…",
        "send": "发送",
        "sending": "正在发送…",
        "empty": "无消息",
        "emptyHint": "开始讨论 — 客户将收到通知。",
        "noSubject": "请选择主题",
        "noSubjectHint": "选择一个产品或您的档案以查看交流内容。",
        "noSubjects": "无讨论主题",
        "noSubjectsHint": "讨论附属于您的产品。目前没有与您关联的产品。",
        "field": "字段",
        "edited": "已编辑",
        "you": "您",
        "openSubject": "打开资料表",
        "thread": "讨论",
        "more": "加载更多",
        "loading": "正在加载…",
        "tooLong": "消息过长（最多 20,000 个字符）。",
        "denyReasons": {
            "noAssignedTask": "准入已结束：此讨论为只读。",
            "readAccess": "您对此资料表仅有读取权限。",
            "noPermission": "您无权在此讨论中发言。"
        }
    },
    "app/monitor/campaigns/[id]/page#LABELS": {
        "back": "项目",
        "notFound": "未找到项目",
        "notFoundHint": "此项目不存在、不是供应商项目，或超出您的范围。",
        "kpi": {
            "response": "回复率",
            "age": "已开启",
            "due": "截止日期",
            "tasks": "未完成任务"
        },
        "hints": {
            "days": "{count} 天",
            "noDue": "无截止日期",
            "overdue": "逾期 {count} 天",
            "dueIn": "{count} 天后",
            "late": "{count} 项逾期",
            "unanswered": "开启以来无回复"
        },
        "tasks": "未完成任务",
        "tasksEmpty": "此项目没有未完成的任务。",
        "tasksHint": "流程正在等待什么，以及等待谁。",
        "noAssignee": "未分配",
        "entities": "项目涉及的内容",
        "entitiesHint": "打开资料表以查看正在录入的数据及其讨论。",
        "entitiesEmpty": "此项目未引用任何资料表。",
        "unreadable": "超出您的范围",
        "open": "打开",
        "suppliers": "供应商",
        "manager": "负责人",
        "discussion": "项目讨论",
        "state": "状态"
    },
    "app/monitor/campaigns/page#LABELS": {
        "title": "项目",
        "subtitle": "进行中的准入和更新项目。选择项目以提醒或升级其供应商。",
        "stats": {
            "open": "未关闭项目",
            "openState": "项目 · {state}",
            "response": "回复率",
            "unanswered": "无回复",
            "reminders": "待提醒"
        },
        "hints": {
            "scanned": "已扫描 {count} 个",
            "meanCompletion": "平均进度 {value}%",
            "escalations": "{count} 个待升级",
            "late": "{count} 项逾期",
            "noEscalation": "无需升级",
            "answered": "{count} 个已回复"
        },
        "startCampaign": "发起项目",
        "allOpen": "所有未关闭项目",
        "state": "项目状态",
        "sortLabel": "排序方式",
        "sorts": {
            "dueDate": "截止日期最早",
            "completion": "回复率最低",
            "age": "开启时间最长",
            "name": "名称"
        },
        "searchSupplier": "按供应商筛选",
        "truncated": "扫描窗口：beCPG 每次列表最多返回 250 行，已读取 {scanned} 个项目。本页的排序和合计仅覆盖该窗口 — 请缩小状态或范围以获得完整视图。",
        "scopeEmpty": "没有供应商符合此范围。无法关联任何项目：上方计数器为零是结构所致，并非测量结果。",
        "parkScoped": "计数器限于筛选后的范围（{count} 个供应商）。",
        "noRate": "无可评分的项目",
        "unsupported": "标准 beCPG 模型不支持的筛选条件：{names}。请在客户端进行配置。",
        "pageOf": "第 {from}-{to} 个，共 {total} 个项目",
        "previous": "上一页",
        "next": "下一页",
        "rows": "行数",
        "reminder": "您在门户上的进行中项目仍在等待您的回复。请尽快完成分配给您的任务。",
        "hintTargets": "所选项目的供应商",
        "noteReminder": "beCPG 不保存提醒日志：“最近提醒”列显示的是项目的最近活动，这是实际可获得的最接近的信息。",
        "truncatedShort": "窗口：已读取 {scanned} 个项目"
    },
    "app/monitor/documents/page#LABELS": {
        "title": "文件合规性",
        "views": "合规视图",
        "matrixView": "矩阵",
        "sceneView": "3D 视图",
        "subtitle": "供应商 × 文件类型矩阵。选择单元格或行以发送批量提醒。",
        "search": "搜索供应商",
        "allTypes": "所有文件类型",
        "allStatuses": "所有状态",
        "mandatoryOnly": "仅必需文件",
        "export": "导出",
        "stats": {
            "suppliers": "供应商",
            "missing": "缺失",
            "expired": "已过期",
            "expiring": "待更新",
            "refused": "已拒绝"
        },
        "statuses": {
            "valid": "有效",
            "expiring": "即将过期",
            "expired": "已过期",
            "missing": "缺失",
            "refused": "已拒绝",
            "toValidate": "审核中"
        },
        "truncatedShort": "窗口：已读取 {scanned} 家供应商",
        "truncated": "供应商库超出扫描窗口（已读取 {scanned} 个，共 {total} 个供应商）：请缩小筛选条件以获得完整矩阵。",
        "scopeEmpty": "没有供应商符合此范围。未执行任何文件查询：上方计数器为零是结构所致，并非测量结果。",
        "cellsScope": "单元格 · 覆盖供应商库中的 {total} 个供应商",
        "statusScope": "显示筛选“{status}”：本页显示的 {shown} 行中保留 {kept} 行。上方计数器覆盖供应商库中的 {total} 个供应商，而非仅本页。",
        "unsupported": "标准 beCPG 模型不支持的筛选条件：{names}。请在客户端进行配置。",
        "pageOf": "第 {from}-{to} 个，共 {total} 个供应商",
        "previous": "上一页",
        "next": "下一页",
        "rows": "行数",
        "reminder": "您的供应商档案中有文件需要在门户上更新：{types}。请尽快上传。",
        "reminderGeneric": "您的供应商档案中有必需文件缺失或已过期。请在门户上更新。",
        "hintTypes": "涉及 {count} 种文件类型"
    },
    "app/monitor/layout#LABELS": {
        "metaTitle": "供应商监控 — beCPG",
        "metaDescription": "供应商库一览：文件合规性与项目",
        "title": "监控空间",
        "denied": "监控空间仅限内部团队使用",
        "deniedGroups": "您的账户不属于任何可访问监控空间的 beCPG 用户组：{groups}。请向您的 beCPG 管理员申请加入。",
        "backSupplier": "前往我的仪表板"
    },
    "app/monitor/page#LABELS": {
        "title": "供应商库监控",
        "description": "实时查看供应商库的准入、文件合规、到期、项目和不合格。",
        "generatedAt": "数据截至 {time}",
        "truncated": "供应商库超出扫描窗口：已读取 {scanned} 个，共 {total} 个供应商。标有“≈”的计数器已封顶；分布和前 10 名仅覆盖该窗口。",
        "truncatedShort": "窗口：已读取 {scanned} 家供应商",
        "tablist": "供应商库解读",
        "tabs": {
            "quality": "质量",
            "purchasing": "采购",
            "rnd": "研发",
            "csr": "企业社会责任",
            "assistant": "助手"
        },
        "ai": "AI"
    },
    "app/monitor/products/page#LABELS": {
        "title": "供应商产品",
        "subtitle": "委托给供应商的产品。按证书日期筛选以查看需要更新的产品。",
        "search": "搜索产品、代码、法定名称…",
        "state": "产品状态",
        "anyState": "所有状态",
        "certified": "证书日期",
        "anyCertified": "所有日期",
        "certifiedNone": "无日期",
        "certifiedYears": "认证已超过 {count} 年",
        "columns": {
            "name": "产品",
            "code": "代码",
            "supplierRef": "供应商编号",
            "suppliers": "供应商",
            "plants": "供应商工厂",
            "state": "状态",
            "certificate": "证书日期",
            "modified": "更新日期"
        },
        "age": "{count} 年前",
        "ageMonths": "{count} 个月前",
        "none": "—",
        "empty": "此范围内无产品",
        "emptyHint": "在这些筛选条件下，没有产品实体带有供应商属性。产品一旦关联供应商即会显示在此处。",
        "pageOf": "第 {from} - {to} 个，共 {total} 个",
        "previous": "上一页",
        "next": "下一页",
        "rows": "每页行数",
        "sortScope": "排序仅适用于当前页，而非整个供应商库。",
        "tiles": {
            "total": "产品",
            "valid": "已验证",
            "draft": "模拟",
            "noCertificate": "无准入日期"
        }
    },
    "app/monitor/quality/[id]/page#LABELS": {
        "back": "不合格项",
        "notFound": "未找到不合格项",
        "notFoundHint": "该项不存在，或不在您的范围内。",
        "blocking": "阻断性",
        "priority": "优先级",
        "product": "产品",
        "suppliers": "供应商",
        "batch": "批次",
        "created": "创建于",
        "modified": "更新于",
        "cost": "成本",
        "discussion": "讨论"
    },
    "app/monitor/quality/page#LABELS": {
        "title": "不合格项",
        "startNc": "发起不合格项",
        "subtitle": "供应商 NC、处理时长和纠正措施进度。选择 NC 以提醒、升级或暂停相关供应商。",
        "stats": {
            "open": "未关闭 NC",
            "blocking": "阻断性",
            "overdue": "超出目标期限",
            "delay": "平均时长"
        },
        "hints": {
            "total": "共 {count} 个",
            "blocking": "使认证状态变为“已暂停”",
            "noBlocking": "没有因 NC 而受阻的认证",
            "actionsLate": "{count} 项纠正措施逾期",
            "noActionsLate": "无逾期纠正措施",
            "closing": "平均关闭时长 {value} 天",
            "noClosing": "此范围内无已关闭 NC",
            "closingHidden": "{count} 条已关闭的不合格 · 点击以包含"
        },
        "dayUnit": "天",
        "allStates": "所有状态",
        "allTypes": "所有类型",
        "includeClosed": "包含已关闭 NC",
        "searchSupplier": "按供应商筛选",
        "truncatedShort": "窗口：已读取 {scanned} 条不合格",
        "truncated": "NC 数量超出扫描窗口（已扫描 {scanned} 个）：请缩小筛选条件以获得完整视图。",
        "inexact": "计数器为近似值：至少有一次查询返回了封顶的总数。",
        "scopeEmpty": "没有供应商符合此范围。未执行任何查询：上方计数器为零是结构所致，并非测量结果。",
        "unsupported": "标准 beCPG 模型不支持的筛选条件：{names}。请在客户端进行配置。",
        "pageOf": "第 {from}-{to} 个，共 {total} 个 NC",
        "previous": "上一页",
        "next": "下一页",
        "rows": "行数",
        "reminder": "有一项涉及您的不合格项尚未关闭。请尽快在门户上处理相关纠正措施。",
        "hintTargets": "所选 NC 的供应商",
        "note": "处理时长：自 NC 创建起计算；对于已关闭的 NC，为创建至最后修改之间的时长 — beCPG 不保存关闭日期。"
    },
    "app/monitor/suppliers/[id]/page#LABELS": {
        "back": "供应商",
        "notFound": "未找到供应商",
        "notFoundHint": "此供应商不存在，或超出您的范围。",
        "tiles": {
            "label": "供应商指标",
            "nc": "阻断性 NC",
            "ncHint": "未关闭",
            "projects": "进行中的项目",
            "projectsHint": "{count} 个未回复",
            "documents": "必需文件",
            "documentsHint": "已过期 {expired} · 缺失 {missing}",
            "documentsNone": "无预期文件",
            "products": "产品",
            "productsHint": "已关联",
            "delay": "响应时长",
            "delayHint": "{period} 平均",
            "delayNone": "决策模块",
            "completion": "完整度",
            "completionHint": "{count} 个有效目录",
            "completionNone": "无有效目录",
            "days": "天"
        },
        "tabs": {
            "label": "供应商档案",
            "overview": "概览",
            "nc": "不符合项",
            "projects": "项目",
            "documents": "文件",
            "products": "产品",
            "subSuppliers": "下级供应商",
            "history": "历史记录"
        },
        "status": "认证状态",
        "statusHelp": "状态在每次显示时计算，从不存储：以第一条满足的规则为准。",
        "risk": "风险评分",
        "riskHelp": "每个原因计入其权重；每多出现一次，计入递减的附加分。",
        "riskFrom": "自 {from} 起",
        "reasonNames": {
            "documentExpired": "文件已过期",
            "blockingNc": "阻断性 NC",
            "campaignNoAnswer": "项目未回复",
            "scoreDropping": "评分下降",
            "documentExpiring": "文件即将过期",
            "lateTask": "逾期任务",
            "lowCompletion": "完整度低",
            "documentMissing": "文件缺失",
            "openNc": "未关闭 NC"
        },
        "activity": "活动与响应",
        "activityHelp": "分配给供应商的任务及每年的平均响应时长，读取自决策模块。",
        "identity": "基本信息",
        "identityRows": {
            "code": "代码",
            "erpCode": "ERP 代码",
            "legalName": "法定名称",
            "state": "beCPG 状态",
            "family": "类别",
            "subFamily": "子类别",
            "sites": "工厂",
            "subsidiaries": "子公司",
            "parent": "上级供应商",
            "catalogs": "有效目录"
        },
        "scorecard": "评分",
        "scorecardHelp": "供应商最近项目中各评分标准的加权平均值。",
        "allNc": "全部 NC",
        "startNc": "发起 NC",
        "exchanges": "往来记录",
        "ncFile": "supplier-ncs",
        "projectsFile": "supplier-projects",
        "none": "—"
    },
    "app/monitor/suppliers/page#LABELS": {
        "title": "供应商",
        "statuses": {
            "suspended": "已暂停",
            "toRenew": "待更新",
            "inProgress": "进行中",
            "approved": "已认证"
        },
        "statusFiltered": "筛选已启用",
        "export": "导出（CSV）",
        "exportCutTitle": "导出不完整：{scanned} 行，共 {total} 行",
        "exportCutMessage": "beCPG 每次查询最多返回 250 行，因此导出仅覆盖已读取的窗口，而非整个供应商库。请缩小筛选条件（类别、采购员、状态）并分批导出以获得完整文件。",
        "exportCutConfirm": "导出该窗口",
        "generatedAt": "数据截至 {time}",
        "windowOf": "第 {from}-{to} 个，共 {total} 个供应商",
        "previous": "上一个窗口",
        "next": "下一个窗口",
        "truncated": "供应商库超出扫描窗口（已读取 {scanned} 个，共 {total} 个）：排序和排名仅覆盖该窗口。请缩小筛选条件以获得整个供应商库的准确排名。",
        "sortScope": "在已读取的窗口内排序",
        "sortedBy": "初始排序：{sort}",
        "reminder": "您好：\n\n您的供应商档案需要更新（必需文件缺失、已过期或待处理）。\n请登录门户完成更新。\n\n此致敬礼",
        "countsScope": "基于已读取的 {scanned} 个供应商的分布",
        "sortNames": {
            "risk": "风险，降序",
            "name": "名称",
            "code": "代码",
            "status": "认证状态",
            "completion": "完整度",
            "expiring": "即将过期文件",
            "expired": "已过期文件",
            "nc": "未关闭 NC",
            "lastActivity": "最近活动"
        },
        "truncatedShort": "窗口：已读取 {scanned} 家供应商"
    },
    "app/not-found#LABELS": {
        "title": "未找到页面",
        "message": "此地址不存在，或其指向的内容已无法访问。如果您是从邮件进入的，链接可能已失效。",
        "home": "返回首页"
    },
    "app/products/[id]/page#LABELS": {
        "sheet": "资料表",
        "notFound": "未找到产品",
        "notFoundHint": "此资料表不存在，或不在您的范围内。",
        "back": "我的产品",
        "monitorBack": "供应商产品",
        "versionTitle": "{date} 的版本 {label}",
        "versionBy": "作者：{author}",
        "versionBack": "返回当前版本",
        "versionFailed": "无法读取此版本。",
        "request": "申请更新",
        "startProject": "发起项目",
        "partial": "此资料表显示不完整：其中至少有一项数据您的账户无权读取。相关字段未在页面上显示 — 这并不表示它们为空。如需访问其中某项，请联系您的 beCPG 联系人。"
    },
    "app/products/page#LABELS": {
        "title": "我的产品",
        "search": "搜索产品",
        "allStates": "所有状态",
        "allTypes": "所有类型",
        "branch": "更新",
        "branchFrom": "版本 {version} 的更新",
        "columns": {
            "name": "产品",
            "code": "代码",
            "type": "类型",
            "state": "状态",
            "completion": "完整度",
            "project": "项目",
            "supplierRef": "供应商编号",
            "certificateDate": "证书日期",
            "modified": "更新日期",
            "actions": "操作"
        },
        "stats": {
            "total": "产品",
            "valid": "已确认",
            "pending": "进行中",
            "completion": "平均完整度"
        },
        "empty": "无产品",
        "emptyHint": "尚无与您关联的产品。客户分配资料表后即会显示在此处。",
        "request": "申请更新"
    },
    "app/specs/page#LABELS": {
        "title": "规格书",
        "stats": {
            "specs": "规格书",
            "products": "涵盖的产品"
        },
        "emptyHint": "暂无可供您查看的规格书。如有适用的规格书，客户会与您共享。"
    },
    "app/tasks/[id]/page#LABELS": {
        "loading": "任务",
        "notFound": "未找到任务",
        "notFoundHint": "此任务已不存在、已处理，或不在您的范围内。",
        "back": "我的任务",
        "noEntity": "此任务未指向任何资料表",
        "noEntityHint": "此任务的交付物未引用任何产品。请通过项目讨论联系您的客户。",
        "documents": "需提供的文件",
        "viewDocument": "查看文件",
        "due": "截止日期 {date}",
        "late": "逾期",
        "done": "已完成",
        "discussion": "讨论"
    },
    "app/tasks/page#LOCAL": {
        "title": "我的任务",
        "search": "搜索任务、产品、代码…",
        "anyType": "所有类型",
        "anyPriority": "所有优先级",
        "anyProduct": "所有产品",
        "anyDue": "所有截止日期",
        "dueLate": "逾期",
        "dueToday": "今天",
        "dueWeek": "7 天内",
        "dueMonth": "30 天内",
        "dueNone": "无截止日期",
        "stateOpen": "进行中",
        "stateDone": "已完成",
        "colTask": "任务",
        "colProduct": "产品 / 客户",
        "colType": "类型",
        "colPriority": "优先级",
        "colDue": "截止日期",
        "colProgress": "进度",
        "kpiTotal": "任务",
        "kpiLate": "逾期",
        "kpiReview": "待审阅",
        "kpiNext": "下一个截止日期",
        "kpiNone": "无",
        "reset": "重置",
        "empty": "无任务",
        "emptyHint": "目前没有需要您处理的事项。",
        "emptyFiltered": "没有符合这些筛选条件的任务。",
        "truncated": "仅显示前面的任务。请缩小筛选条件以查看其余任务。",
        "scoped": "范围：{supplier}。",
        "scopedAll": "范围：所有供应商。",
        "orphans": "有 {count} 项任务未关联到您的任何供应商档案，因此未在此列出。请在右上角选择“所有供应商”以查看。",
        "priorityHigh": "高",
        "priorityMedium": "中",
        "priorityLow": "低",
        "noPriority": "无优先级",
        "untitled": "未命名任务",
        "caption": "我的任务列表"
    },
    "components/dashboard/DashboardCharts#LOCAL": {
        "schedule": "我的截止日期",
        "scheduleAria": "按周显示的到期任务和即将过期的文件",
        "tasks": "到期任务",
        "documents": "即将过期的文件",
        "overdue": "逾期",
        "thisWeek": "本周",
        "later": "以后",
        "undated": "{count} 个任务无截止日期",
        "catalogs": "按目录的完整度",
        "catalogsAria": "每个目录中完整度最低产品的完整度评分",
        "catalogsHint": "每个目录中完整度最低产品的评分。"
    },
    "components/dashboard/DashboardKpis#LOCAL": {
        "approval": "认证状态",
        "approvalUnknown": "不可用",
        "approvalSuppliers": "{count} 个供应商",
        "approvalPickSupplier": "请在屏幕顶部选择供应商以查看其状态。",
        "validUntil": "有效期至 {date}",
        "noValidity": "无已知期限",
        "allGood": "无阻断事项",
        "completion": "完整度",
        "completionScope": "已评分产品 {scored} / {total}",
        "completionNone": "无已评分产品",
        "tasks": "未完成任务",
        "late": "逾期",
        "onTime": "按时",
        "nextDue": "下一个截止日期：{date}",
        "noTask": "目前无待办事项",
        "documents": "待处理文件",
        "documentsOf": "/ {total}",
        "documentsUnavailable": "文件跟踪不可用",
        "valid": "有效",
        "expiring": "即将过期",
        "refused": "已拒绝",
        "expired": "已过期",
        "missing": "缺失",
        "more": "+{count}"
    },
    "components/dashboard/taskTypes#TASK_TYPE_META.wizard": "向导",
    "components/dashboard/taskTypes#TASK_TYPE_META.signature": "签名",
    "components/dashboard/taskTypes#TASK_TYPE_META.document": "文件",
    "components/dashboard/taskTypes#TASK_TYPE_META.review": "审阅",
    "components/dashboard/taskTypes#TASK_TYPE_META.workflow": "工作流",
    "components/dashboard/DashboardKpis#REASONS": {
        "documentExpired": "必需文件已过期",
        "documentExpiring": "文件即将过期",
        "documentMissing": "所需文件未提供",
        "documentRefused": "文件被拒绝",
        "catalogIncomplete": "档案不完整",
        "openProject": "进行中的准入项目",
        "openNonConformity": "未关闭的不合格项"
    },
    "components/dashboard/DashboardTabs#LOCAL": {
        "label": "我的仪表板",
        "todo": "待办",
        "followUp": "跟进"
    },
    "components/dashboard/DiscussionList#LOCAL": {
        "title": "我的讨论",
        "empty": "无讨论",
        "emptyHint": "客户对您的任务和产品的备注将显示在此处。",
        "all": "查看全部",
        "messages": "{count} 条消息",
        "anonymous": "用户",
        "onField": "关于 {field}",
        "unread": "新",
        "unreadCount": "{count} 条未读"
    },
    "components/dashboard/DocumentList#LOCAL": {
        "title": "我的文件",
        "empty": "无所需文件",
        "emptyHint": "客户要求的证书将显示在此处。",
        "all": "查看全部",
        "supplierScope": "供应商",
        "mandatory": "必需",
        "until": "至 {date}",
        "expiredSince": "已过期 {days} 天",
        "expiresIn": "{days} 天后过期",
        "noValidity": "无截止日期",
        "upload": "上传新版本",
        "uploadFirst": "上传文件",
        "download": "下载",
        "view": "查看",
        "uploading": "正在上传…",
        "uploaded": "文件已上传，正在等待客户确认。"
    },
    "components/dashboard/NonConformityCard#LOCAL": {
        "title": "未关闭的不合格项",
        "hint": "由您的客户登记，客户将就处理事宜与您联系。",
        "declared": "报告于 {date}",
        "priority": "优先级 {level}"
    },
    "components/dashboard/NotificationList#NOTIFICATION_LABELS": {
        "title": "我的通知",
        "empty": "无通知",
        "emptyHint": "目前没有需要您关注的事项。",
        "overdue": "逾期 {days} 天",
        "expiresIn": "{days} 天后",
        "types": {
            "task.overdue": "逾期任务",
            "document.expired": "已过期文件",
            "document.expiring": "待更新文件",
            "document.missing": "缺失文件",
            "document.refused": "被拒绝的文件"
        },
        "assigned": "分配给我",
        "mandatory": "必需",
        "isNew": "新",
        "scopeEmpty": {
            "noSupplierIdentity": "您的账户未关联任何供应商，因此无法识别您的文件。仅列出您的任务。请告知您在客户处的联系人。",
            "internalAccount": "内部账户：文件提醒跟随应提供文件的供应商，因此您的铃铛仅列出您的任务。整个供应商库的视图位于“文件合规性”中。",
            "fallback": "您的账户范围为空：部分提醒无法计算。"
        },
        "countTitle": "共 {total} 项待处理 · 下方为最紧急的 {shown} 项"
    },
    "components/dashboard/ProductList#LOCAL": {
        "title": "我的产品",
        "empty": "无产品",
        "emptyHint": "客户委托给您的产品将显示在此处。",
        "all": "查看全部",
        "updatedOn": "更新于 {date}",
        "request": "申请更新",
        "noCompletion": "未评分",
        "completion": "完整度"
    },
    "components/dashboard/ProductList#STATE_LABELS": {
        "Valid": "已批准",
        "ToValidate": "待批准",
        "Refused": "待修正",
        "Simulation": "模拟",
        "Stopped": "已停止",
        "Archived": "已归档"
    },
    "components/dashboard/TaskList#LOCAL": {
        "title": "我的任务",
        "empty": "无进行中的任务",
        "emptyHint": "一切均已更新。客户的新请求将显示在此处。",
        "all": "查看全部",
        "overdue": "逾期 {days} 天",
        "overdueToday": "今天到期",
        "dueIn": "{days} 天后",
        "noDue": "无截止日期",
        "priorityHigh": "高",
        "priorityMedium": "中",
        "priorityLow": "低",
        "progress": "进度",
        "untitled": "未命名任务"
    },
    "components/datalist/RowFormModal#LABELS": {
        "title": "编辑行",
        "create": "新行",
        "save": "保存",
        "cancel": "取消",
        "refused": "该行未保存。请检查必填字段后重试。"
    },
    "components/datalist/renderers/signals#RENDERER_LABELS": {
        "formulated": "配方计算值",
        "requirementBroken": "未满足要求",
        "claimDescription": "声称说明",
        "nutrientDetails": "营养素详情（{country}）",
        "roundedFor": "按法规修约的值：{country}",
        "valueLine": "值: {value}",
        "toleranceMin": "最小公差：{value}",
        "toleranceMax": "最大公差：{value}",
        "minimum": "最小值：{value}",
        "maximum": "最大值：{value}",
        "gda": "% NRV：{value}",
        "perServing": "每份值：{value}",
        "missingSources": "{count} 个来源无此声称",
        "missingSourcesList": "无此声称的来源：",
        "omitted": "声明中省略的配料",
        "packagingLevel": {
            "Primary": "初级包装",
            "Inner": "内包装",
            "Secondary": "二级包装",
            "Tertiary": "三级包装"
        }
    },
    "components/datalist/useDataList#DATALIST_LABELS": {
        "rows": "{count} 行",
        "addRow": "添加行",
        "deleteRow": "删除行",
        "editRow": "编辑行",
        "moveUp": "上移",
        "moveDown": "下移",
        "actions": "操作",
        "order": "顺序",
        "row": "第 {index} 行",
        "newRow": "新行",
        "totalRow": "合计行，由 beCPG 计算",
        "incomplete": "填写必填字段以保存此行",
        "sortBy": "按 {column} 排序",
        "saving": "正在保存…",
        "saved": "已保存",
        "discard": "放弃更改",
        "failed": "保存失败",
        "retry": "重试",
        "deleting": "正在删除…",
        "search": "在列表中搜索",
        "readOnly": "只读",
        "frozenTitle": "列表已由客户确认",
        "frozenText": "客户已确认此列表：列表现已冻结，无法再修改。如需更正，请通过项目讨论申请重新开放。",
        "readAccessTitle": "仅查看",
        "readAccessText": "您对此实体仅有读取权限。",
        "noTaskTitle": "无未完成任务",
        "noTaskText": "仅当有任务分配给您时才可编辑。此列表仍可查看。",
        "wizardReadOnlyTitle": "只读向导",
        "wizardReadOnlyText": "此向导配置为仅供查看：无法进行任何更改。",
        "protectedTitle": "受保护字段",
        "protectedText": "“{column}”列受保护：其数值用于客户的合规性检查。请确认您要修改它。",
        "protectedUnlock": "仍然修改",
        "protectedLocked": "受保护字段 — 点击解锁",
        "deleteTitle": "删除此行？",
        "deleteText": "此行将从列表中永久删除。",
        "expand": "显示详情",
        "collapse": "隐藏详情",
        "nestedEmpty": "无条目",
        "empty": "此列表为空",
        "emptyHint": "添加第一行以开始。",
        "emptyReadOnly": "客户不要求此列表中有任何行。",
        "mandatory": "必填字段",
        "detail": "详情",
        "duplicate": "复制此行",
        "select": "选择",
        "selectRow": "选择第 {index} 行",
        "selectAll": "选择本页所有行",
        "selected": "已选择 {count} 行",
        "clearSelection": "清除选择",
        "bulkMoveUp": "上移",
        "bulkMoveUpLong": "上移所选行",
        "bulkMoveDown": "下移",
        "bulkMoveDownLong": "下移所选行",
        "bulkDuplicate": "复制",
        "bulkDuplicateLong": "复制所选行",
        "bulkDelete": "删除",
        "bulkDeleteLong": "删除所选行",
        "accessDenied": "访问被拒绝",
        "accessDeniedRow": "此行包含您的账户无权读取的特性：无法在此编辑。",
        "bulkEdit": "编辑",
        "bulkEditLong": "编辑所选行",
        "bulkEditTitle": "编辑 {count} 行",
        "bulkEditPickFields": "要填写的字段",
        "bulkEditSearchField": "搜索字段",
        "bulkEditApply": "应用到 {count} 行",
        "bulkEditCancel": "取消",
        "bulkEditEmptyClears": "已勾选但留空的字段会清除所有行上的值。",
        "bulkEditSkipped": "有 {count} 个所选行无法编辑，将保持原样。",
        "bulkEditTooMany": "已选择 {count} 行，最多 {max} 行。请缩小选择范围。",
        "bulkEditNoColumn": "此列表中没有可批量填写的列。",
        "deleteSelectedTitle": "删除 {count} 行？",
        "deleteSelectedText": "这些行将从列表中永久删除。",
        "rowsPerPage": "每页行数",
        "shortcuts": "键盘快捷键",
        "shortcutsTitle": "使用键盘输入",
        "shortcutList": [
            [
                "Tab / Shift+Tab",
                "下一个 / 上一个单元格"
            ],
            [
                "Enter",
                "保存该行并移至同一列的下一行"
            ],
            [
                "在最后一行按 Enter",
                "添加一行"
            ],
            [
                "↑ / ↓",
                "同一列的上一行 / 下一行"
            ],
            [
                "Esc",
                "放弃正在编辑行的更改"
            ],
            [
                "Ctrl+Enter",
                "添加一行"
            ],
            [
                "Ctrl+D",
                "复制当前行"
            ],
            [
                "Ctrl+V",
                "粘贴电子表格中的单元格区域"
            ]
        ],
        "pasteTitle": "已从电子表格粘贴",
        "pasteApplied": "已在 {rows} 行中粘贴 {cells} 个值，其中 {created} 行为新建。",
        "pasteNothing": "没有可粘贴的内容。",
        "pasteUndo": "撤销粘贴",
        "pasteSave": "保存 {count} 行",
        "pasteResolving": "正在查找标签…",
        "pasteUnmatched": "{count} 个值未导入 — 请手动修正：",
        "pasteExtraColumns": "有 {count} 个粘贴列超出列表最后一列：已忽略。",
        "pasteRefusedRows": "有 {count} 行超出列表末尾：此列表不接受新行。",
        "pasteLine": "第 {line} 行",
        "pasteReasons": {
            "number": "应为数字",
            "integer": "应为整数",
            "boolean": "应为 是 / 否",
            "date": "应为日期（dd/mm/yyyy）",
            "list": "值不在提供的列表中",
            "readonly": "该列不可修改",
            "association": "参考数据中无精确匹配"
        }
    },
    "components/documents/AiVerdictContest#LABELS": {
        "advisory": "仅为 AI 建议：不会阻止完成，由您的客户决定。",
        "contest": "对分析提出异议",
        "contestFor": "对“{document}”的 AI 分析提出异议",
        "reasonLabel": "为何该分析不适用于此文件",
        "reasonPlaceholder": "例如：清真证书既不含配料表，也不含净含量。",
        "send": "发送给我的客户",
        "cancel": "取消",
        "sent": "异议已发送给您的客户",
        "contested": "已提出异议 - 等待您的客户处理",
        "messageIntro": "我对文件“{document}”的自动分析提出异议。",
        "messageVerdict": "AI 结论：",
        "messageReason": "我的说明："
    },
    "components/documents/DepositedDocuments#LABELS": {
        "title": "已上传文件",
        "subtitle": "此产品文件夹中的所有文件，不论类型。",
        "empty": "未上传文件",
        "emptyHint": "此产品文件夹中尚无文件。",
        "signed": "已签署",
        "download": "下载",
        "consult": "查看",
        "modified": "修改于 {date}",
        "actionOn": "{action}：{document}"
    },
    "components/documents/DocumentUpload#LABELS": {
        "drop": "将文件拖放到此处",
        "or": "或",
        "browse": "浏览",
        "deposit": "上传",
        "renew": "更新",
        "replace": "替换",
        "uploading": "正在上传…",
        "analysing": "正在分析文件…",
        "done": "文件已上传",
        "doneHint": "客户将对其进行审核。您无需再做任何操作。",
        "retry": "重试",
        "cancel": "取消",
        "tooLarge": "文件过大（{size}）。最大：{max}。",
        "badType": "不支持的格式（{name}）。支持：{accept}。",
        "empty": "文件为空。",
        "failed": "上传失败。",
        "locked": "无法上传",
        "accepted": "格式：{accept} — 最大 {max}",
        "aiValid": "已经 AI 检查",
        "aiToValidate": "待检查",
        "aiRefused": "被 AI 拒绝",
        "aiOn": "分析于 {date}",
        "selected": "所选文件",
        "validityHint": "文件上印制的有效期。",
        "validityInverted": "结束日期早于开始日期。",
        "validityMissing": "上传文件前请填写有效期截止日期。",
        "validityPast": "有效期截止日期已过：该文件仍将处于过期状态。",
        "fileInput": "选择要上传的文件",
        "validityNotApplied": "文件已上传，但有效期未保存。请在文件所在行填写。"
    },
    "components/documents/DocumentValidity#LABELS": {
        "fromTo": "有效期 {from} 至 {to}",
        "from": "自 {from} 起有效",
        "to": "有效期至 {to}",
        "none": "无有效期",
        "required": "需填写有效期",
        "expired": "有效期已于 {to} 届满",
        "fromLabel": "有效期自",
        "toLabel": "有效期至",
        "edit": "编辑",
        "setDates": "填写",
        "save": "保存",
        "cancel": "取消",
        "saved": "有效期已保存",
        "inverted": "结束日期早于开始日期。",
        "hint": "您所上传文件上印制的日期。"
    },
    "components/documents/DocumentViewer#LABELS": {
        "title": "文件",
        "download": "下载",
        "close": "关闭",
        "unsupported": "此文件类型无法预览",
        "unsupportedHint": "此格式无法在浏览器中预览。请下载后查看。",
        "failed": "无法显示文件",
        "failedHint": "仍可下载该文件。",
        "signed": "已电子签名",
        "signedBy": "{name}，{date}",
        "pending": "签名进行中",
        "validated": "已于 {date} 验证",
        "validatedBy": "由 {name} 于 {date} 验证"
    },
    "components/documents/ExpiryPill#LABELS": {
        "missing": "待提供",
        "refused": "已拒绝",
        "toValidate": "审核中",
        "valid": "有效",
        "validUntil": "有效期至 {date}",
        "expiredOn": "已于 {date} 过期",
        "expiredSince": "已过期 {days} 天",
        "expiresToday": "今天过期",
        "expiresIn": "{days} 天后过期",
        "noDate": "无有效期",
        "from": "自",
        "to": "至",
        "since": "自",
        "until": "至"
    },
    "components/documents/RequirementChecklist#LABELS": {
        "mandatory": "必需",
        "satisfied": "已提供",
        "upload": "上传",
        "renew": "更新",
        "replace": "替换",
        "download": "下载",
        "consult": "查看",
        "details": "详情",
        "hide": "隐藏",
        "of": "必需文件 {done} / {total}",
        "allDone": "一切均已更新",
        "allDoneHint": "目前无需您处理任何事项。",
        "nothing": "无文件要求",
        "nothingHint": "客户尚未为此范围定义任何所需文件。",
        "openCount": "{count} 项待处理",
        "blockingCount": "{count} 项必需文件待修正",
        "category": "类别",
        "readOnly": "此资料表已关闭上传。",
        "noEntity": "供应商文件",
        "aiHints": "分析备注",
        "deposit": "上传文件",
        "file": "文件",
        "actionOn": "{action}：{document}"
    },
    "components/documents/SignedDocumentList#LABELS": {
        "document": "已签署文件",
        "signedAt": "签署日期",
        "download": "下载",
        "search": "搜索已签署文件",
        "empty": "无已签署文件",
        "emptyHint": "您通过任务签署的文件会显示在此处。",
        "truncated": "列表不完整：并非所有已签署文件都能读取。"
    },
    "components/form/FieldRenderer#LABELS": {
        "add": "添加值",
        "remove": "删除此值"
    },
    "components/form/FormRenderer#LABELS": {
        "empty": "无需填写的字段",
        "emptyHint": "此表单的配置未返回任何字段。",
        "showEmpty": "已隐藏 {count} 个空字段 - 显示",
        "hideEmpty": "隐藏空字段"
    },
    "components/form/controls/AutocompleteControl#LABELS": {
        "search": "搜索…",
        "hint": "输入名称或代码以筛选数据",
        "loading": "正在搜索…",
        "noResult": "无结果",
        "clear": "清除",
        "remove": "移除",
        "browse": "显示可选值",
        "error": "搜索失败",
        "errorUnconfigured": "此字段未配置值列表。请告知您在客户处的联系人。",
        "showing": "显示第 1 - {count} 项，共 {total} 项",
        "favourite": "收藏"
    },
    "components/form/controls/BooleanControl#LABELS": {
        "yes": "是",
        "no": "否",
        "empty": "（空）"
    },
    "components/form/controls/MlTextControl#LABELS": {
        "more": "其他 {count} 种语言",
        "less": "隐藏其他语言",
        "required": "客户要求",
        "missing": "仍有 {count} 种必填语言为空"
    },
    "components/form/controls/NumberUnitControl#DURATION_SYMBOLS": {
        "d": "天",
        "mo": "个月",
        "y": "年"
    },
    "components/form/controls/NumberUnitControl#LABELS": {
        "unit": "单位"
    },
    "components/form/controls/ReadOnlyControl#LABELS": {
        "yes": "是",
        "no": "否",
        "empty": "—"
    },
    "components/form/controls/SelectControl#LABELS": {
        "placeholder": "请选择…",
        "offList": "值不在列表中",
        "empty": "无可选值"
    },
    "components/form/controls/SizeControl#LABELS": {
        "bytes": "字节"
    },
    "components/form/validation#VALIDATION_MESSAGES": {
        "validation.required": "此字段为必填项。",
        "validation.number": "请输入数字。",
        "validation.integer": "请输入整数。",
        "validation.date": "请输入有效日期。",
        "validation.boolean": "请输入 是 或 否。",
        "validation.list": "请从列表中选择一个值。",
        "validation.regex": "不符合要求的格式。",
        "validation.min": "数值必须大于或等于 {min}。",
        "validation.max": "数值必须小于或等于 {max}。",
        "validation.range": "数值必须介于 {min} 和 {max} 之间。",
        "validation.minLength": "请至少输入 {min} 个字符。",
        "validation.maxLength": "最多输入 {max} 个字符。"
    },
    "components/monitor/AiDrafts#LABELS": {
        "draft": "使用 AI 按供应商个性化",
        "drafting": "正在起草消息…",
        "unavailable": "此实例上无法使用 AI 助手。",
        "common": "返回统一消息",
        "none": "AI 未提出任何消息。",
        "help": "每个供应商一条消息，使用其语言，依据其逾期或缺失的内容生成。发送前请审阅并编辑。"
    },
    "components/monitor/BulkActionBar#LABELS": {
        "selected": "已选择 {count} 个供应商",
        "selectedPlural": "已选择 {count} 个供应商",
        "clear": "清除选择",
        "overflow": "仅处理前 {max} 个。",
        "loading": "正在加载操作…",
        "unavailable": "您的配置文件没有可用的操作。",
        "actions": {
            "remind": "提醒",
            "escalate": "升级",
            "suspend": "暂停"
        },
        "targets": "相关供应商",
        "report": "操作结果",
        "reportOk": "已成功处理 {count} 个供应商。",
        "reportKo": "{count} 项失败：",
        "reportSkipped": "有 {count} 个供应商未处理：超出 {max} 个的上限。",
        "reportNone": "未处理任何供应商。",
        "close": "关闭",
        "errors": {
            "notFound": "供应商超出您的范围"
        }
    },
    "components/monitor/CampaignList#LABELS": {
        "columns": {
            "campaign": "项目",
            "suppliers": "供应商",
            "response": "回复率",
            "age": "时长",
            "silence": "最近提醒",
            "due": "截止日期",
            "reminders": "提醒",
            "follow": "跟进",
            "manager": "负责人"
        },
        "days": "{count} 天",
        "since": "已开启 {count} 天",
        "lastActivity": "最近活动 {date}",
        "silenceDays": "{count} 天前",
        "silenceToday": "今天",
        "silenceHint": "beCPG 不保存提醒日志：此列显示的是项目的最近活动（cm:modified），这是实际可获得的最接近的信息。",
        "noSilence": "无带日期的活动",
        "noAnswer": "无回复",
        "late": "逾期",
        "onTrack": "按计划进行",
        "toRemind": "待提醒",
        "toEscalate": "待升级",
        "lateTasks": "{late} / {open} 项任务逾期",
        "noTasks": "无未完成任务",
        "dueIn": "{count} 天后",
        "overdue": "逾期 {count} 天",
        "noDue": "无截止日期",
        "others": "+{count}",
        "empty": "此范围内无进行中的项目",
        "projectStates": {
            "Planned": "已计划",
            "InProgress": "进行中",
            "OnHold": "暂停中",
            "Completed": "已完成",
            "Cancelled": "已取消"
        }
    },
    "components/monitor/DocumentMatrix#LABELS": {
        "supplier": "供应商",
        "types": "{count} 种文件类型",
        "notApplicable": "不适用于此供应商",
        "mandatory": "必需",
        "legend": "图例",
        "expected": "需 {count} 份",
        "selectRow": "选择 {name}",
        "selectCell": "为 {name} 选择 {type}",
        "download": "下载",
        "preview": "查看",
        "empty": "此范围内无供应商",
        "emptyHint": "请放宽筛选条件以查看矩阵。",
        "noColumns": "此范围内未生成任何文件类型",
        "noColumnsHint": "beCPG 在配方计算时生成所需文件：如果未配置任何文件要求，矩阵将为空。",
        "toggle": "显示文件",
        "summary": "{missing} 份缺失 · {expired} 份已过期 · {expiring} 份待更新",
        "completeness": "{value} % 合规",
        "status": {
            "missing": "缺失",
            "expired": "已过期",
            "refused": "已拒绝",
            "expiring": "待更新",
            "toValidate": "待验证",
            "valid": "有效"
        }
    },
    "components/monitor/DocumentScene#LABELS": {
        "relief": "浮雕",
        "constellation": "星座",
        "mode": "显示模式",
        "filters": "显示的状态",
        "statuses": {
            "expired": "已过期",
            "missing": "缺失",
            "refused": "已拒绝",
            "expiring": "即将过期",
            "toValidate": "待验证",
            "valid": "有效"
        },
        "aria": "供应商及预期文件的三维视图",
        "rotate": "拖动以旋转",
        "zoom": "滚动以缩放",
        "pick": "点击供应商以执行操作",
        "pickTitle": "请点击场景中的供应商",
        "waiting": "{count} 份文件待处理",
        "waitingAxis": "待处理",
        "family": "系列",
        "severity": "严重程度",
        "noFamily": "无系列",
        "openSheet": "打开资料表",
        "view": "查看",
        "empty": "此范围内无预期文件"
    },
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Valid": "有效",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation": "模拟",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate": "待确认",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Refused": "已拒绝",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Archived": "已归档",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped": "已停止",
    "components/monitor/MonitorFilters#LABELS": {
        "search": "搜索供应商、代码、法定名称…",
        "toggle": "更多筛选",
        "reset": "重置",
        "close": "隐藏筛选",
        "legend": "供应商库筛选",
        "family": "类别",
        "subFamily": "子类别",
        "site": "工厂",
        "subsidiary": "子公司",
        "market": "市场",
        "state": "供应商状态",
        "any": "全部",
        "windowScoped": "仅限窗口",
        "windowScopedHelp": "Alfresco 不索引关联：此筛选仅适用于已读取的供应商，而非整个供应商库。",
        "unsupported": "未配置",
        "unsupportedHelp": "没有标准 beCPG 属性承载此概念。请在监控配置中声明该属性，在客户端启用。",
        "noVocabulary": "已加载范围内无值",
        "active": "{count} 个筛选已启用",
        "activePlural": "{count} 个筛选已启用",
        "clearOne": "移除此筛选",
        "anyFamily": "所有类别",
        "anySubFamily": "所有子类别",
        "anyState": "所有状态"
    },
    "components/monitor/NonConformityList#LABELS": {
        "columns": {
            "nc": "不合格项",
            "suppliers": "供应商",
            "state": "状态",
            "priority": "优先级",
            "delay": "处理时长",
            "actions": "纠正措施",
            "cost": "成本"
        },
        "states": {
            "new": "新建",
            "analysis": "分析",
            "treatment": "处理",
            "response": "回复",
            "classification": "分类",
            "closing": "关闭中",
            "closed": "已关闭"
        },
        "types": {
            "NonConformity": "不合格项",
            "Claim": "客户投诉"
        },
        "priorities": {
            "1": "高",
            "2": "中",
            "3": "低"
        },
        "blocking": "阻断性",
        "blockingHint": "高优先级且仍未关闭：正是这一点使推导出的认证状态变为“已暂停”（计算得出，从不存储）。",
        "days": "{count} 天",
        "openSince": "已开启 {count} 天",
        "overdue": "超出处理目标期限",
        "closedIn": "{count} 天内处理完毕",
        "closedApprox": "beCPG 不保存关闭日期：已关闭 NC 的时长按其创建与最后修改之间的时间计算。",
        "createdOn": "创建于 {date}",
        "noDelay": "无创建日期",
        "actionsCount": "{done} / {total}",
        "actionsLate": "{count} 项逾期",
        "noActions": "无措施",
        "noActionsHint": "beCPG 中没有与此 NC 关联的处理任务 — 行动计划尚未开启。",
        "actionState": {
            "done": "已完成",
            "late": "逾期",
            "open": "进行中"
        },
        "andMore": "…… 以及另外 {count} 项",
        "others": "+{count}",
        "noSupplier": "未关联供应商",
        "empty": "此范围内无不合格项",
        "open": "打开此不合格项"
    },
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label": "质量",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus": "文件合规性、不合格项、认证、审核",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label": "采购",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus": "认证状态（阻止下单）、评分、响应速度",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label": "研发",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus": "技术数据完整度、目录、规格书",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label": "CSR",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus": "认证、产地、CSR 问卷",
    "components/monitor/ProfileSwitcher#LABELS": {
        "legend": "业务视图",
        "hint": "同一供应商库，四种解读。重新排列卡片和列。"
    },
    "components/monitor/RiskList#RISK_REASONS.documentExpired": "{count} 份文件已过期",
    "components/monitor/RiskList#RISK_REASONS.documentExpiring": "{count} 份文件即将过期",
    "components/monitor/RiskList#RISK_REASONS.documentMissing": "{count} 份文件缺失",
    "components/monitor/RiskList#RISK_REASONS.blockingNc": "{count} 项阻断性 NC",
    "components/monitor/RiskList#RISK_REASONS.openNc": "{count} 项未关闭 NC",
    "components/monitor/RiskList#RISK_REASONS.campaignNoAnswer": "{count} 个项目无回复",
    "components/monitor/RiskList#RISK_REASONS.lateTask": "{count} 项任务逾期",
    "components/monitor/RiskList#RISK_REASONS.lowCompletion": "完整度低（{score} %）",
    "components/monitor/RiskList#RISK_REASONS.scoreDropping": "评分下降",
    "components/monitor/RiskList#RISK_REASONS.openProject": "{count} 项准入进行中",
    "components/monitor/RiskList#RISK_REASONS.blockingCatalog": "阻断性目录未满足",
    "components/monitor/RiskList#RISK_LEVELS.critical": "严重",
    "components/monitor/RiskList#RISK_LEVELS.high": "高",
    "components/monitor/RiskList#RISK_LEVELS.medium": "中",
    "components/monitor/RiskList#RISK_LEVELS.low": "低",
    "components/monitor/RiskList#LABELS": {
        "title": "风险最高的 10 个供应商",
        "empty": "此范围内无风险供应商",
        "emptyHint": "未检测到已过期文件、阻断性 NC 或无回复的项目。",
        "riskScore": "风险评分 {score}",
        "level": "{level}风险",
        "lastActivity": "最近活动于 {date}",
        "completion": "完整度 {value} %",
        "openSheet": "打开资料表",
        "actions": {
            "remind": "提醒",
            "escalate": "升级",
            "suspend": "暂停"
        },
        "dialog": {
            "remindTitle": "提醒 {target}",
            "escalateTitle": "升级 {target}",
            "suspendTitle": "暂停 {target}",
            "messageLabel": "消息",
            "messageHelp": "发布在供应商讨论串中，供应商可在门户和 beCPG 中查看。",
            "escalateHelp": "在供应商的进行中项目内部发布，绝不会发布在供应商可见的讨论串中。",
            "messageLang": "消息语言",
            "supplierLang": "供应商语言",
            "messageRequired": "必须填写消息。",
            "suspendWarning": "认证状态是实时推导的，从不存储：此操作不会写入“已暂停”。它会启动客户的暂停流程。一旦 beCPG 中存在阻断性 NC，状态会自动切换。",
            "suspendIrreversible": "已发起的流程无法在门户中取消。请检查所选内容。",
            "process": "要发起的流程",
            "noProcess": "此实例不允许任何暂停流程（PORTAL_PROCESS_TEMPLATES）。",
            "targets": "涉及 {count} 个供应商：",
            "send": "发送",
            "suspendConfirm": "发起暂停"
        },
        "result": {
            "ok": "已执行 {count} 项操作。",
            "partial": "{ok} 项成功，{failed} 项失败。",
            "failed": "没有操作成功。"
        },
        "defaults": {
            "remind": "您好：\n\n您的供应商档案需要更新：{reasons}。\n请登录门户完成更新。\n\n此致敬礼",
            "escalate": "升级：尽管已多次提醒，该供应商档案仍存在异常（{reasons}）。\n请接手处理。",
            "genericReasons": "待处理的文件和截止日期"
        }
    },
    "components/monitor/StartCampaignDialog#LABELS": {
        "title": "发起项目",
        "supplier": "供应商",
        "scope": "范围",
        "scopeSupplier": "供应商记录本身",
        "scopeAll": "该供应商的所有产品",
        "scopeOne": "单个产品",
        "entity": "产品",
        "entityPlaceholder": "选择产品…",
        "process": "项目模板",
        "processPlaceholder": "选择模板…",
        "start": "发起",
        "cancel": "取消",
        "starting": "正在发起…",
        "noEntity": "此供应商未关联任何产品：无可发送的内容。",
        "noProcess": "此实例未向门户开放任何项目模板。",
        "countAll": "将发送 {count} 个产品，每个产品一个项目。",
        "done": "已发起 {count} 个项目",
        "partial": "{done} 个已发起，{failed} 个失败",
        "failedTitle": "以下产品未能发起",
        "countTruncated": "此处只能列出 {total} 个产品中的 {count} 个：只有这些产品会被发送。",
        "suppliersTruncated": "仅提供 {total} 个供应商中的 {count} 个。如未列出，请从供应商页面发起项目。",
        "atLeast": "至少 {count} 个",
        "loadFailed": "无法加载列表。",
        "retry": "重试"
    },
    "components/monitor/StartNcDialog#LABELS": {
        "title": "发起不合格项",
        "supplier": "供应商",
        "product": "产品",
        "productNone": "无特定产品",
        "batch": "批次",
        "priority": "优先级",
        "priorities": {
            "1": "高（阻断性）",
            "2": "中",
            "3": "低"
        },
        "dueDate": "截止日期",
        "description": "描述",
        "cancel": "取消",
        "start": "发起",
        "started": "不合格项已发起：beCPG 将其登记并开启分析。"
    },
    "components/monitor/SupplierPicker#LOCAL": {
        "search": "搜索供应商（名称、代码）…",
        "none": "没有匹配的供应商。",
        "more": "还有 {count} 个：请细化搜索。",
        "clear": "更换供应商",
        "loading": "正在加载供应商…"
    },
    "components/monitor/SupplierScorecard#LABELS": {
        "title": "评分卡",
        "subtitle": "标准、权重和评分 — 在客户端配置",
        "weighted": "加权评分",
        "weightedHint": "{count} 项标准 · 总权重 {weight}",
        "criterion": "标准",
        "weight": "权重 {weight}",
        "weightShare": "占总数的 {share} %",
        "range": "评分范围 {range}",
        "noScore": "未评分",
        "scaleNote": "评分范围根据配置（或观察到的最高分）推断：始终显示原始分数。",
        "unavailable": "此供应商无评分卡",
        "unavailableHint": "评分卡数据来自供应商项目中的评分。在您的范围内未找到已评分的项目。",
        "completion": "目录完整度",
        "completionSubtitle": "供应商实体上的有效目录",
        "completionEmpty": "此供应商无有效目录",
        "completionScore": "平均完整度",
        "approval": "认证状态",
        "approvalDerived": "每次显示时重新计算",
        "history": "趋势",
        "historyUnavailable": "历史不可用",
        "historyWhy": "beCPG 决策模块无法提供历史数据。",
        "historyWhyBy": {
            "supplierAxisUnavailable": "BI 模块已运行，但尚不能区分供应商：需要将供应商维度添加到多维数据集并重新加载架构。",
            "supplierUnresolved": "此供应商尚未纳入 BI 模块：将在下次重建时出现。",
            "noData": "BI 模块已识别此供应商，但该期间尚无数据点：历史数据将随录入逐步填充。",
            "unknownQuery": "所请求的序列未在门户中声明：这是配置缺陷，而非数据缺失。",
            "unreachable": "beCPG 决策模块无响应：此实例未启用该模块，或其服务器无法访问。",
            "denied": "您的账户无权访问 beCPG 决策模块。"
        },
        "historyNeeds": "BI 端启用此功能所需的条件",
        "dimensions": "维度",
        "measures": "度量",
        "statusPartial": "部分",
        "statusMissing": "待创建",
        "trendLast": "最新数据点：{date} 为 {value}",
        "trendCaption": "加权评分随时间变化"
    },
    "components/monitor/SupplierTable#LABELS": {
        "caption": "供应商库中的供应商、认证状态及推导指标",
        "columns": {
            "name": "供应商",
            "code": "代码",
            "status": "认证",
            "risk": "风险",
            "completion": "完整度",
            "documentsExpired": "已过期文件",
            "documentsExpiring": "即将过期文件",
            "documentsMissing": "缺失文件",
            "openNc": "未关闭 NC",
            "openProjects": "项目",
            "family": "类别",
            "sites": "工厂",
            "lastActivity": "最近活动"
        },
        "metrics": {
            "documentsExpired": "{count} 份必需文件已过期",
            "documentsExpiring": "{count} 份文件即将到期",
            "documentsMissing": "{count} 份必需文件未提供",
            "openNc": "{count} 项未关闭的不合格项",
            "openProjects": "{count} 个进行中的项目"
        },
        "none": "—",
        "empty": "此范围内无供应商",
        "emptyHint": "请放宽筛选条件，或检查您的采购员范围。",
        "emptyFiltered": "没有符合这些筛选条件的供应商。",
        "compare": "比较",
        "compareTitle": "比较 {count} 个供应商",
        "compareCapped": "比较仅限于前 {max} 个所选供应商 — 超出后列将难以阅读。",
        "compareRows": {
            "status": "认证状态",
            "reasons": "原因",
            "risk": "风险评分",
            "completion": "完整度（目录）",
            "documentsExpired": "已过期文件",
            "documentsExpiring": "即将过期文件",
            "documentsMissing": "缺失文件",
            "openNc": "未关闭 NC",
            "openProjects": "进行中的项目",
            "state": "beCPG 状态",
            "family": "类别",
            "sites": "工厂",
            "lastActivity": "最近活动"
        },
        "openSheet": "打开资料表",
        "selected": "已选择 {count} 个",
        "clear": "清除选择",
        "close": "关闭",
        "noReason": "无风险原因"
    },
    "components/monitor/WorkflowTasks#LABELS": {
        "title": "进行中的任务",
        "none": "无进行中的任务",
        "pooled": "待认领",
        "unassigned": "未分配",
        "due": "截止",
        "open": "打开",
        "history": "历史记录（{count}）",
        "hideHistory": "隐藏历史记录",
        "doneBy": "执行人：{who}"
    },
    "components/monitor/cockpit/AssistantTab#LABELS": {
        "priorities": "本周优先事项",
        "prioritiesHelp": "按规则对风险最高的供应商计算：存在阻断性不合格的严重风险需升级；文件过期、至少五份文件缺失或项目未答复需催办。",
        "kinds": {
            "escalate": "待升级",
            "remind": "待催办"
        },
        "score": "风险 {score}",
        "openSheet": "打开档案",
        "none": "本周此范围内没有优先事项。",
        "copilot": "副驾驶",
        "wire": "待在 beCPG 中接入",
        "copilotSoon": "副驾驶接入 beCPG 助手后，将回答有关您供应商库的问题。",
        "ask": "询问有关您供应商库的问题…",
        "askLabel": "向副驾驶提问"
    },
    "components/monitor/cockpit/CsrTab#LABELS": {
        "expected": "应提供的证书",
        "expectedHelp": "标签包含“证书”的文件类型，每个相关供应商一份。",
        "valid": "有效证书",
        "outOf": "/ {total}",
        "origins": "申报原产地",
        "surveys": "企业社会责任问卷",
        "notWired": "beCPG 尚未向门户提供此信息。",
        "byType": "按文件类型的合规情况",
        "byTypeAria": "按类型的文件状态",
        "byTypeHelp": "每种文件类型，每个相关供应商一个状态：取其文件中最不利的状态。",
        "map": "采购来源地",
        "mapEmpty": "原产国和供应商场地地图。",
        "csv": {
            "type": "文件类型",
            "expected": "应提供"
        }
    },
    "components/monitor/cockpit/PurchasingTab#LABELS": {
        "approved": "已准入供应商",
        "outOf": "/ {total}",
        "openProjects": "未结项目",
        "answered": "已答复",
        "unanswered": "未答复",
        "openProjectsHelp": "整个实例中的未结供应商项目：项目不归属于某个供应商，因此供应商库筛选不适用。",
        "responseRate": "答复率",
        "meanCompletion": "平均进度 {value} %",
        "lateTasks": "逾期任务",
        "lateProjects": "{count} 个逾期项目",
        "composition": "供应商库构成",
        "compositionAria": "按类别、子类别和准入状态的供应商",
        "compositionHelp": "内环：类别。中环：子类别。外环：准入状态。点击类别可展开。",
        "reactivity": "供应商响应速度",
        "reactivityAria": "每年任务数与平均答复时长",
        "reactivityHelp": "柱：按结束年份的供应商项目任务（对数刻度）。线：平均答复天数。",
        "tasks": "任务",
        "delay": "平均答复时长（天）",
        "days": "天数",
        "taskStates": "供应商项目任务",
        "taskStatesAria": "按状态的任务",
        "taskStatesHelp": "从决策模块读取的所有供应商项目任务，按状态（对数刻度）。"
    },
    "components/monitor/cockpit/QualityTab#LABELS": {
        "health": "供应商库健康度",
        "healthAria": "健康指数 {value}/100",
        "healthOutOf": "/ 100",
        "healthHelp": "满分 100 的指数：准入率 35 %，文件合规 35 %，项目答复率 20 %，无阻断性不合格供应商占比 10 %。",
        "healthPartial": "部分计算，权重已重新分配：{missing} 不可用。",
        "weights": {
            "approval": "准入 {weight} %",
            "compliance": "合规 {weight} %",
            "response": "答复 {weight} %",
            "noBlockingNc": "无阻断性不合格 {weight} %"
        },
        "inputs": {
            "approval": "准入率",
            "compliance": "文件合规",
            "response": "答复率",
            "noBlockingNc": "无阻断性不合格占比"
        },
        "compliance": "文件合规",
        "compliant": "合规",
        "complianceHelp": "有效必备文件占范围内应提供必备文件的比例。",
        "complianceNoRate": "比率不可用：某计数器已达到 beCPG 的读取上限。",
        "openNc": "未关闭不合格",
        "suspended": "已暂停供应商",
        "outOf": "/ {total}",
        "toReview": "待复核文件",
        "toReviewHelp": "待审核和已过期的文件，每个供应商和文件类型一份。",
        "riskMap": "风险图",
        "riskMapAria": "按风险评分和未结项目的供应商",
        "riskMapHelp": "横轴：未结项目。纵轴：风险评分。大小：异常（缺失和过期文件、阻断性不合格）。点击供应商可打开其档案。",
        "openProjects": "未结项目",
        "riskScore": "风险评分",
        "anomalies": "大小：异常",
        "priorities": "优先区域",
        "bubble": "风险 {score} · {projects} 个未结项目 · {anomalies} 个异常",
        "ncAge": "未关闭不合格的时长",
        "ncAgeAria": "按时长的未关闭不合格",
        "ncUndated": "{count} 个不合格无创建日期",
        "csv": {
            "rank": "排名",
            "supplier": "供应商",
            "code": "代码",
            "status": "准入",
            "level": "风险等级",
            "score": "风险评分",
            "reasons": "原因",
            "openProjects": "未结项目",
            "anomalies": "异常"
        }
    },
    "components/monitor/cockpit/RndTab#LABELS": {
        "progress": "{year} 年平均进度",
        "progressNoYear": "平均进度",
        "projects": "{count} 个项目",
        "tasksInProgress": "进行中任务",
        "tasksPlanned": "{count} 个已计划",
        "technicalSheets": "缺失的技术规格书",
        "technicalSheetsHint": "{toValidate} 个待审核 · {expired} 个已过期",
        "technicalSheetsHelp": "标签包含“技术规格书”的文件类型，每个相关供应商一份。",
        "activeFiles": "活跃档案",
        "activeSince": "自 {date} 起有最近活动",
        "activeHelp": "自上一季度初以来有修改的供应商。",
        "projectProgress": "项目进度",
        "projectProgressAria": "每年项目数量与平均进度",
        "projectProgressHelp": "柱：按最后修改年份的项目。线：平均进度（%）。",
        "projectsSeries": "项目",
        "averageSeries": "平均进度（%）",
        "landscape": "供应商库概览",
        "landscapeAria": "按类别和准入状态的供应商",
        "landscapeHelp": "按类别和准入状态的供应商。浏览器支持时显示 3D 视图，否则显示分组柱状图。",
        "freshness": "档案新鲜度",
        "freshnessAria": "按最近活动月份的供应商",
        "recent": "自 {date} 起活跃",
        "older": "更早",
        "undated": "{count} 家供应商无活动日期",
        "fromCube": "读取自 beCPG 决策模块，按批次加载。"
    },
    "components/monitor/cockpit/parts#LABELS": {
        "export": "导出",
        "soon": "待接入",
        "decisionModule": "决策模块",
        "chartFailed": "无法加载图表。",
        "window": "扫描窗口：数据仅覆盖已读取的供应商。",
        "unavailable": "数据不可用",
        "empty": "无可显示内容",
        "reasons": {
            "denied": "beCPG 拒绝访问此信息。",
            "notFound": "在 beCPG 中未找到此信息。",
            "unavailable": "beCPG 未对此区块作出响应。请稍后重试。",
            "noMatchingDocumentType": "此范围内没有匹配的文件类型。",
            "noData": "此范围内无数据。"
        }
    },
    "components/monitor/cockpit/vocabulary#VOCABULARY": {
        "approval": {
            "approved": "已准入",
            "inProgress": "进行中",
            "toRenew": "待续期",
            "suspended": "已暂停"
        },
        "documents": {
            "valid": "有效",
            "expiring": "即将到期",
            "toValidate": "待审核",
            "expired": "已过期",
            "refused": "已拒绝",
            "missing": "缺失"
        },
        "taskStates": {
            "planned": "已计划",
            "inProgress": "进行中",
            "completed": "已完成",
            "cancelled": "已取消",
            "refused": "已拒绝",
            "onHold": "搁置中"
        },
        "ncAges": {
            "under3Months": "< 3 个月",
            "from3To12Months": "3-12 个月",
            "from1To2Years": "1-2 年",
            "over2Years": "> 2 年"
        },
        "nc": {
            "blocking": "阻断性",
            "nonBlocking": "非阻断性"
        },
        "noFamily": "无类别",
        "noSubFamily": "无子类别"
    },
    "components/monitor/supplier/ActivityChart#LABELS": {
        "tasks": "任务",
        "delay": "平均响应时长（天）",
        "days": "天",
        "aria": "该供应商每年的任务数和平均响应时长"
    },
    "components/monitor/supplier/RiskScore#LABELS": {
        "ring": "风险评分 {score}/100，等级 {level}",
        "none": "无风险原因",
        "scale": "等级标尺",
        "contributions": "评分构成",
        "points": "+{points}"
    },
    "components/monitor/supplier/SheetLists#LABELS": {
        "documents": {
            "search": "搜索文件",
            "document": "文件",
            "mandatory": "必需",
            "validity": "有效期",
            "status": "状态",
            "entity": "关联对象",
            "download": "下载",
            "empty": "无预期或已提供的文件",
            "file": "supplier-documents",
            "yes": "是",
            "no": "否"
        },
        "products": {
            "search": "搜索产品",
            "product": "产品",
            "code": "代码",
            "state": "状态",
            "completion": "完整度",
            "modified": "更新时间",
            "empty": "无关联产品",
            "file": "supplier-products"
        },
        "subSuppliers": {
            "search": "搜索下级供应商",
            "supplier": "下级供应商",
            "code": "代码",
            "state": "beCPG 状态",
            "file": "sub-suppliers"
        },
        "activity": {
            "empty": "无往来记录",
            "message": "消息",
            "activity": "活动"
        },
        "unavailable": "beCPG 无法返回此列表：它不代表该供应商的任何情况。"
    },
    "components/monitor/supplier/StatusLadder#LABELS": {
        "current": "满足的规则",
        "next": "其次",
        "approvedWhen": "认证条件",
        "approvedNow": "所有条件均已满足",
        "seeAll": "查看全部 {count} 项",
        "days": "{count} 天",
        "on": "于 {name}",
        "conditions": {
            "documentExpired": "无过期的必需文件",
            "blockingNc": "无阻断性 NC",
            "documentExpiring": "无需续期的文件",
            "openProject": "无进行中的项目",
            "documentMissing": "无缺失的必需文件",
            "blockingCatalog": "阻断性目录已满足"
        },
        "met": "已满足",
        "unmet": "未满足",
        "progress": "已满足 {met}/{total} 项条件"
    },
    "components/monitor/supplier/SupplierBand#LABELS": {
        "erp": "ERP {code}",
        "risk": "风险 {level} · {score}",
        "created": "创建于",
        "lastActivity": "最近活动",
        "startProject": "启动项目",
        "openInBecpg": "在 beCPG 中打开",
        "actions": "供应商操作",
        "parent": "隶属于",
        "group": "{count} 个下级供应商"
    },
    "components/products/CatalogPanel#LABELS": {
        "title": "合规性",
        "overall": "完整度",
        "complete": "完整",
        "incomplete": "不完整",
        "missing": "缺失字段",
        "missingCount": "{count} 个字段缺失",
        "duplicates": "已被使用的值",
        "duplicateOn": "已被以下产品使用",
        "duplicateUnnamed": "其他 {count} 个产品",
        "protectedFields": "此目录中有 {count} 个字段由客户填写",
        "protectedFieldsHint": "它们计入评分，但不要求您填写：由客户而非您来输入。",
        "none": "无适用目录",
        "noneHint": "此产品未配置合规目录，因此无需通过完整度检查。",
        "allComplete": "所有目录均已完整",
        "allCompleteHint": "在数据方面，没有任何内容阻碍此产品的确认。",
        "missingHint": "填写以下字段以达到 100 % — 正是这些字段阻碍了确认。",
        "goToField": "前往该字段",
        "notScored": "未评分"
    },
    "components/products/CompletionMeter#LABELS": {
        "title": "完整度",
        "noScore": "尚未评估",
        "notCounted": "不计入得分",
        "more": "另有 {count} 个目录"
    },
    "components/products/ProductHeader#LABELS": {
        "code": "代码",
        "branch": "更新进行中",
        "branchFrom": "版本 {version} 的更新",
        "branchTitle": "此资料表是为准入创建的工作副本。",
        "branchTitleLocked": "此资料表是为准入创建的工作副本。已批准版本存在于客户端，但您无权读取。",
        "erpCode": "ERP 代码",
        "supplier": "供应商",
        "subsidiary": "子公司",
        "project": "项目",
        "modified": "更新日期",
        "created": "创建日期",
        "version": "版本",
        "legalName": "法定名称",
        "back": "我的产品",
        "types": {
            "bcpg:rawMaterial": "原料",
            "bcpg:finishedProduct": "成品",
            "bcpg:semiFinishedProduct": "半成品",
            "bcpg:localSemiFinishedProduct": "本地半成品",
            "bcpg:packagingMaterial": "包装材料",
            "bcpg:packagingKit": "包装套件",
            "bcpg:supplier": "供应商",
            "bcpg:productSpecification": "规格书",
            "qa:nc": "不合格项"
        }
    },
    "components/products/ProductSections#LABELS": {
        "sheet": "资料表",
        "compliance": "合规性",
        "documents": "文件",
        "specs": "规格书",
        "sections": "资料表各部分",
        "noProperties": "无可显示的属性",
        "noPropertiesHint": "此产品的属性未在向导配置中开放。",
        "rawProperties": "属性",
        "rawNotice": "技术标签：此产品没有可用的向导配置。",
        "noData": "未提供数据",
        "noDataHint": "此部分没有此产品的数据行。",
        "configTitle": "配置不可用",
        "configHint": "无法加载此部分的配置。其他标签页仍可使用。",
        "yes": "是",
        "no": "否",
        "versionLoading": "正在读取版本…",
        "versionUnavailable": "未保存在版本中",
        "versionUnavailableHint": "此部分请在资料表的当前版本中查看。",
        "versionRows": "{count} 行"
    },
    "components/products/ProductTaskBanner#LABELS": {
        "one": "此资料表有一项未完成的任务",
        "many": "此资料表有多项未完成的任务",
        "open": "打开任务",
        "all": "查看此产品的任务",
        "untitled": "未命名任务"
    },
    "components/products/UpdateRequestDialog#LABELS": {
        "title": "申请更新",
        "template": "申请类型",
        "templatePlaceholder": "请选择…",
        "noTemplate": "您的客户尚未向供应商开放任何申请类型。请通过“消息”与其联系。",
        "reason": "申请原因",
        "reasonHint": "新配方、新产地、新生产基地、新技术规格书…",
        "submit": "发送申请",
        "sent": "申请已发送。已为您创建一项更新任务。"
    },
    "components/products/VersionPicker#LABELS": {
        "open": "资料表版本",
        "current": "当前",
        "failed": "无法读取历史记录。",
        "none": "无早期版本",
        "by": "作者：{author}"
    },
    "components/review/AiPrecheck#LABELS": {
        "title": "AI 预验证",
        "running": "正在读取资料表…",
        "verdicts": {
            "blocking": "确认前需更正",
            "toCheck": "待核对要点",
            "clear": "无阻断性要点"
        },
        "severities": {
            "error": "错误",
            "warning": "待核对",
            "ok": "合规"
        },
        "addToFeedback": "添加到反馈",
        "added": "已添加",
        "open": "打开该部分",
        "proposed": "建议给供应商的反馈",
        "reformulate": "改写",
        "translate": "翻译",
        "useMessage": "使用此消息",
        "help": "AI 会先于您审阅资料表：数值一致性、物料平衡、过敏原、必需文件。AI 不做任何决定：每个要点都需核对，由您决定是否添加到反馈。",
        "failed": "预验证未完成。",
        "retry": "重试"
    },
    "components/review/ReviewChanges#LABELS": {
        "title": "自基准以来 {count} 处变更",
        "none": "自基准以来无变更",
        "added": "已添加",
        "removed": "已移除",
        "empty": "空",
        "flag": "标记",
        "flagged": "已标记",
        "flagText": "待核对（{before} → {after}）",
        "addedText": "新增行，待核对",
        "removedText": "删除行，待核对",
        "show": "显示变更",
        "hide": "隐藏变更"
    },
    "components/review/ReviewWorkspace#LABELS": {
        "due": "截止：{date}",
        "late": "逾期",
        "comparedBranch": "与已确认的资料表比较",
        "comparedVersion": "与 {date} 的版本 {label} 比较",
        "noReference": "首个版本：无可比较内容",
        "progress": "已审阅 {done}/{total} 个部分",
        "validateHint": "每个部分均被接受后，“确认资料表”即可使用",
        "sendBack": "退回给供应商（{count}）",
        "validate": "确认资料表",
        "sections": "待审阅部分",
        "compliance": "合规",
        "accepted": "已接受",
        "returned": "已要求更正",
        "toRead": "待审阅",
        "legendChanged": "自基准以来的变更",
        "aiPoints": "AI 指出的要点",
        "trailChanges": "{count} 处变更",
        "frozen": "已确认列表",
        "accept": "接受并继续",
        "acceptLast": "接受",
        "askCorrection": "要求更正",
        "correctionPlaceholder": "供应商需在此部分更正的内容…",
        "addRemark": "添加到反馈",
        "cancel": "取消",
        "returnTitle": "给供应商的反馈",
        "returnEmpty": "未要求更正。请标记一行，或对某个部分要求更正。",
        "remove": "移除",
        "messageLabel": "发送给供应商的消息",
        "messageIntro": "您好：\n\n在确认资料表“{name}”之前，请更正以下内容：",
        "messageOutro": "\n\n此致",
        "sendBackTitle": "将资料表退回给供应商？",
        "sendBackConfirm": "退回",
        "validateTitle": "确认资料表？",
        "validateMessage": "任务完成，项目进入下一步。",
        "sent": "资料表已退回给供应商。",
        "validated": "资料表已确认。",
        "discussion": "与供应商的交流",
        "closed": "此任务已关闭：审阅为只读。"
    },
    "components/shell/Header#LOCAL_LABELS": {
        "menu": "打开菜单",
        "account": "我的账户",
        "home": "beCPG — 门户首页"
    },
    "components/shell/Nav#LOCAL_LABELS": {
        "more": "更多",
        "menu": "菜单",
        "close": "关闭菜单",
        "supplierSpace": "供应商空间",
        "monitorSpace": "监控空间",
        "collapse": "折叠菜单",
        "expand": "展开菜单"
    },
    "components/shell/NotificationBell#LOCAL": {
        "open": "通知",
        "panel": "通知",
        "close": "关闭",
        "refresh": "刷新",
        "markRead": "标记为已读",
        "countOne": "1 条待处理通知",
        "countMany": "{count} 条待处理通知",
        "countNone": "无通知",
        "updatedAt": "更新于 {time}",
        "more": "另有 {count} 条 — 请查看“我的文件”和“我的任务”",
        "moreTasks": "另有 {count} 条 — 请查看“我的任务”",
        "allTasks": "我的任务",
        "allDocuments": "我的文件"
    },
    "components/shell/SupplierSwitcher#LABELS": {
        "all": "所有供应商",
        "change": "切换供应商",
        "current": "所选供应商",
        "group": "我的供应商档案",
        "scope": "范围"
    },
    "components/signature/PdfViewer#LABELS": {
        "previous": "上一页",
        "next": "下一页",
        "page": "页",
        "of": "共 {pages} 页",
        "zoomIn": "放大",
        "zoomOut": "缩小",
        "fit": "适合宽度",
        "download": "下载 PDF",
        "loading": "正在加载文件…",
        "pageLoading": "正在加载第 {page} 页…",
        "error": "无法显示此文件",
        "errorHint": "该文件可能受保护或暂时不可用。您可以重试，或下载后查看。",
        "retry": "重试",
        "pinch": "双指缩放"
    },
    "components/signature/SignatureDocument#LABELS": {
        "zonesHint": "方框标示了您的签名和简签将被放置的位置。",
        "counter": "第 {index} 份文件，共 {total} 份",
        "read": "已读",
        "unavailable": "文件不可用",
        "unavailableHint": "此文件在 beCPG 中已无法访问：可能在签署后已被替换，或您的访问权限已被移除。如需副本，请向客户索取。"
    },
    "components/signature/SignatureFlow#LABELS": {
        "title": "签名",
        "back": "我的任务",
        "loading": "正在打开文件…",
        "notFound": "无待签署文件",
        "notFoundHint": "此任务未引用可签署的文件。交付物可能仍在准备中 — 请通过项目讨论联系您的客户。",
        "readTitle": "阅读文件",
        "progress": "已阅读 {seen} / {pages} 页",
        "progressDone": "已阅读整份文件",
        "progressHint": "所有页面都查看后，签署按钮才会解锁。",
        "readyHint": "准备就绪：您的签名将被应用到文件上。",
        "goToPage": "从第 {page} 页继续",
        "goToDocumentPage": "从第 {document} 份文件第 {page} 页继续",
        "documentCount": "{count} 份待签署文件",
        "toSignature": "前往签名",
        "signTitle": "您的签名",
        "initialsTitle": "您的简签",
        "initialsHint": "简签将应用于每页底部。",
        "consent": "我已阅读整份文件，并同意以电子方式签署。我确认此签名与手写签名具有同等效力。",
        "sign": "签署文件",
        "signing": "正在签署…",
        "blockedRead": "请阅读所有页面后再签署。",
        "blockedSignature": "请添加您的签名。",
        "blockedInitials": "请添加您的简签。",
        "blockedConsent": "请勾选同意框。",
        "successTitle": "文件已签署",
        "successBody": "您的签名已记录。beCPG 将其应用到文件上，并通过邮件向您发送副本。您也可以在“我的文件 › 已签署”中找到它。",
        "successNext": "您无需再做任何操作：任务将关闭，客户会收到通知。",
        "successDownload": "下载文件",
        "successBack": "返回我的任务",
        "signedTitle": "此文件已签署",
        "signedBody": "此任务已记录签名。无需重新签署 — 您可以下载该文件。",
        "signedBodyNoCopy": "此任务已记录签名。无需重新签署。该文件已无法从门户访问；如需副本，请向客户索取。",
        "signedView": "查看文件",
        "signedComplete": "完成任务",
        "signedCompleteDone": "任务已完成。",
        "signedCompleteError": "无法完成任务。",
        "cancelledTitle": "签名已取消",
        "cancelledBody": "此签名请求已被客户取消。您无需进行任何操作。",
        "closedTitle": "任务已处理",
        "closedBody": "此任务已不再开放。如果您认为有误，请联系客户。",
        "externalTitle": "在您的服务商处签名",
        "externalBody": "您的客户使用外部签名服务。文件将在新标签页中打开；完成后请返回此处。",
        "externalOpen": "打开签名",
        "failed": "无法记录签名。",
        "failedNetwork": "上传过程中连接中断。您的签名不会丢失：请重试，签名不会被重复记录。",
        "retry": "重试",
        "refresh": "刷新",
        "leaving": "签名正在发送。此时离开可能会中断发送。",
        "document": "文件"
    },
    "components/signature/SignaturePad#LABELS": {
        "draw": "手绘",
        "type": "输入我的姓名",
        "drawHint": "请用手指、手写笔或鼠标在框内签名。",
        "typeHint": "您的姓名将作为签名应用。",
        "namePlaceholder": "姓名",
        "nameLabel": "签署人姓名",
        "clear": "清除",
        "undo": "撤销上一笔",
        "preview": "签名预览",
        "empty": "尚未签名",
        "required": "需要您的签名才能继续。",
        "initialsType": "输入我的姓名缩写",
        "initialsDrawHint": "请在框内绘制您的简签。",
        "initialsTypeHint": "这些缩写将作为简签应用。",
        "initialsNameLabel": "姓名缩写",
        "initialsPlaceholder": "VL",
        "initialsPreview": "简签预览",
        "initialsEmpty": "尚无简签"
    },
    "components/signature/SignatureZones#DEFAULT_LABELS": {
        "signature": "签名",
        "initials": "简签",
        "date": "日期",
        "text": "文字"
    },
    "components/specs/SpecPanel#LABELS": {
        "title": "规格书",
        "subtitle": "适用于您产品的参考文件",
        "consult": "查看",
        "open": "打开",
        "download": "下载",
        "appliesTo": "适用于",
        "andOthers": "以及另外 {count} 个",
        "updated": "更新于 {date}",
        "search": "搜索规格书",
        "none": "无规格书",
        "noneHint": "此范围没有关联的规格书。如有适用的规格书，客户会与您共享。",
        "noResult": "没有符合此搜索的规格书",
        "count": "{count} 份文件",
        "readFirst": "填写前请先阅读",
        "unreadable": "有 {count} 份规格书适用于您的产品，但您的账户无法打开。请向客户申请访问权限。"
    },
    "components/survey/DecisionTree#LABELS": {
        "required": "必答问题",
        "noAnswer": "未回答",
        "choose": "请选择答案",
        "openLink": "打开链接",
        "answer": "答案",
        "blank": "此必答问题仍未作答。"
    },
    "components/tasks/NcAssist#LABELS": {
        "title": "AI 辅助",
        "help": "AI 根据不合格项、产品、供应商及以往不合格项提出的建议。在您回复任务之前，不会保存任何内容。",
        "answers": "建议的回复",
        "apply": "采用",
        "applied": "已采用",
        "applyAll": "全部采用",
        "causes": "可能的根本原因",
        "actions": "建议的纠正措施",
        "addToComment": "添加到评论",
        "similar": "类似的不合格项",
        "likelihood": {
            "high": "很可能",
            "medium": "可能",
            "low": "不太可能"
        },
        "yes": "是",
        "no": "否"
    },
    "components/tasks/TaskActions#LABELS": {
        "complete": "完成任务",
        "refuse": "拒绝",
        "completeTitle": "完成此任务？",
        "completeMessage": "任务将被标记为已完成，项目将进入下一步。",
        "refuseTitle": "拒绝此任务？",
        "refuseReason": "拒绝理由",
        "refuseReasonHint": "此文本将发送给供应商：请告知需要更正的内容。",
        "refuseReasonRequired": "拒绝时必须填写理由。",
        "cancel": "取消",
        "completed": "任务已完成。",
        "refused": "任务已拒绝。"
    },
    "components/tasks/WorkflowTaskScreen#LABELS": {
        "back": "我的任务",
        "assignee": "分配给",
        "pooled": "待认领",
        "due": "截止",
        "startedBy": "发起人",
        "concerns": "涉及",
        "answer": "您的回复",
        "claim": "认领任务",
        "release": "释放回任务池",
        "claimed": "任务已归您处理",
        "released": "任务已释放回任务池",
        "save": "保存",
        "saved": "回复已保存",
        "done": "任务已完成",
        "completed": "任务已完成，工作流继续进行",
        "claimFirst": "请先认领任务再回复。",
        "closed": "此任务已完成。",
        "discussion": "讨论"
    },
    "components/ui/DataTable#LOCAL_LABELS": {
        "selectAll": "全选",
        "selectRow": "选择行",
        "columns": "显示的列",
        "rowsPerPage": "每页行数",
        "export": "导出",
        "legend": "图例"
    },
    "components/ui/EmptyState#SENTENCES": {
        "empty": "此处暂无内容。条目一经创建或提交即会显示。",
        "search": "没有符合搜索条件的条目。请尝试减少关键词，或移除一个筛选条件。"
    },
    "components/ui/TabScroller#LOCAL": {
        "previous": "上一组标签页",
        "next": "下一组标签页"
    },
    "components/wizard/AutoSaveIndicator#LABELS": {
        "pending": "有待保存的更改",
        "saving": "正在保存…",
        "saved": "已于 {time} 保存",
        "savedShort": "已保存",
        "error": "无法保存",
        "retry": "重试",
        "unsaved": "您的更改不会丢失：系统将重新发送。"
    },
    "components/wizard/SuggestionSources#LABELS": {
        "source": "来源",
        "conflict": "文件给出的值不一致",
        "choose": "应用此选择",
        "version": "v{version}"
    },
    "components/wizard/TechnicalSheetBanner#LABELS": {
        "title": "技术资料表",
        "deposited": "上传于 {date}",
        "replace": "替换",
        "replaceSheet": "替换技术资料表",
        "cancel": "取消",
        "missing": "缺少技术资料表",
        "missingHint": "上传您的技术资料表以启用 AI 建议。",
        "missingClosed": "此资料表未上传技术资料表。"
    },
    "components/wizard/Wizard#LABELS": {
        "context": "背景信息",
        "discussion": "讨论",
        "documents": "文件",
        "technicalSheet": "技术资料表",
        "suggestions": "建议",
        "compliance": "合规性",
        "properties": "属性",
        "list": "列表",
        "survey": "问卷",
        "readOnly": "只读",
        "readOnlyReasons": {
            "readAccess": "您对此资料表仅有读取权限。",
            "noAssignedTask": "此资料表上没有分配给您的任务：已关闭录入。",
            "wizardReadOnly": "此向导配置为只读。"
        },
        "finish": "完成",
        "finished": "任务已发送给客户",
        "finishBlocked": "请填写“合规性”步骤中缺失的字段以完成。",
        "finishMissingStep": "“{step}”：缺少 {count} 个必答答案。",
        "finishGapStep": "{step} · {count} 个字段",
        "finishGapCatalog": "{step} · 需 {count} 项",
        "finishGapCatalogPlain": "{step} 待完成",
        "notFound": "未找到资料表",
        "notFoundHint": "此资料表不存在，或不在您的范围内。",
        "unknownWizard": "录入向导未配置",
        "unknownWizardHint": "此任务需要向导“{wizard}”，但该向导未在此实例上声明。请告知您的 beCPG 管理员。",
        "backToTasks": "返回任务",
        "uploadSheet": "上传技术资料表",
        "renewSheet": "技术资料表的新版本",
        "addDocument": "添加补充文件",
        "delegated": "您正在代表 {supplier} 填写",
        "due": "截止日期 {date}",
        "step": "步骤",
        "widen": "扩大输入区域",
        "widenHint": "隐藏侧面板，并将步骤缩小为图标。",
        "restore": "恢复面板",
        "steps": "步骤"
    },
    "components/wizard/WizardFooter#LABELS": {
        "previous": "上一步",
        "next": "下一步",
        "finish": "完成",
        "finishing": "正在发送…",
        "formulating": "正在重新计算…",
        "blocked": "暂无法完成",
        "incomplete": "资料表不完整"
    },
    "components/wizard/WizardStepper#LABELS": {
        "title": "步骤",
        "step": "第 {index} 步，共 {total} 步",
        "open": "选择步骤",
        "frozen": "已由客户确认",
        "readOnly": "只读",
        "done": "已访问",
        "complete": "完整",
        "current": "当前步骤",
        "todo": "尚未访问",
        "locked": "稍后可用",
        "incomplete": "缺少 {count} 个必填项",
        "catalogGap": "目录要求的 {count} 个字段",
        "remaining": "{count} 个部分待完成",
        "remainingNone": "未报告缺失项",
        "remainingHint": "客户正在等待这些信息以确认资料表。",
        "remainingHintNone": "您可以随时返回任何步骤。",
        "collapse": "折叠步骤",
        "expand": "展开步骤"
    },
    "components/wizard/compliance/ComplianceOverview#LABELS": {
        "blockingTitle": "发送前有 {count} 个阻断性要点",
        "toCompleteTitle": "{count} 个待完善要点",
        "readyTitle": "可以发送",
        "blocking": "阻断性",
        "toComplete": "待完善",
        "document": "文件",
        "blockingCount": "{count} 个阻断",
        "toCompleteCount": "{count} 个待完善",
        "messagesCount": "{count} 条消息",
        "start": "从 {step} 开始",
        "messages": "目录消息",
        "rule": "规则",
        "duplicate": "重复",
        "usedBy": "已被 {names} 使用",
        "usedByOthers": "{count} 条其他记录",
        "byStep": "按步骤",
        "byStepAria": "按步骤列出的待处理要点",
        "byCatalog": "按目录",
        "byCatalogAria": "按目录的完整度评分",
        "expected": "预期的字段和文件",
        "all": "全部（{count}）",
        "blockingOnly": "阻断性（{count}）",
        "other": "其他",
        "goToStep": "前往该步骤",
        "goToField": "前往该字段",
        "renew": "续期",
        "missing": "缺失",
        "expired": "已于 {date} 过期",
        "refused": "已拒绝"
    },
    "components/wizard/panels/CommentsPanel#LABELS": {
        "title": "讨论",
        "subtitle": "您与客户关于此资料表的交流",
        "subtitleInternal": "您与供应商关于此资料表的交流",
        "emptyHintInternal": "向供应商提问，或回复供应商的备注。",
        "placeholder": "输入消息…",
        "send": "发送",
        "empty": "无消息",
        "emptyHint": "向客户提问，或回复客户的备注。",
        "emptyAnchored": "此条目无消息",
        "subject": "主题",
        "whole": "整个资料表",
        "onField": "字段：{label}",
        "onRow": "行：{label}",
        "onRowOfList": "“{list}”中的“{label}”行",
        "inList": "“{list}”中的一行",
        "row": "一行",
        "anchored": "关于 {label}",
        "clear": "移除关联",
        "readOnly": "讨论为只读。",
        "posting": "正在发送…",
        "count": "{count} 条消息",
        "denyReasons": {
            "noAssignedTask": "准入已结束：此讨论为只读。",
            "readAccess": "您对此资料表仅有读取权限。",
            "noPermission": "您无权在此讨论中发言。"
        }
    },
    "components/wizard/panels/HelpPanel#LABELS": {
        "title": "背景信息",
        "suggestions": "AI 建议",
        "specs": "规格书",
        "specsUnreadable": "此资料表关联了一份规格书，但您的账户无法打开。",
        "refusals": "以往的退回记录",
        "refusedBy": "被 {by} 拒绝",
        "refused": "已拒绝",
        "more": "另外 +{count} 项"
    },
    "components/wizard/steps/DataListStep#LABELS": {
        "row": "第 {index} 行"
    },
    "components/wizard/steps/DocumentsStep#LABELS": {
        "title": "所需文件",
        "otherTitle": "其他文件",
        "otherSubtitle": "文件夹中不对应上述任何要求的文件。可在此上传任何有用的文件（照片、分析报告……）。",
        "blocking": "缺少 {count} 份必需文件",
        "allGood": "所有必需文件均已提供",
        "readOnly": "您无法在此资料表上上传文件。"
    },
    "components/wizard/steps/FormStep#LABELS": {
        "comment": "对此字段发表评论",
        "comments": "此字段有 {count} 条消息",
        "catalogGap": "客户目录要求填写",
        "catalogGapLocale": "客户目录要求以 {locale} 填写",
        "frozenTitle": "该部分已由客户确认",
        "frozenText": "客户已确认这些信息：已冻结，无法再修改。如需更正，请通过讨论申请重新开放。",
        "readAccessTitle": "只读",
        "readAccessText": "您对此资料表没有写入权限。",
        "noTaskTitle": "无未完成任务",
        "noTaskText": "此资料表目前未分配给您：您可以查看，但不能修改。",
        "readOnlyTitle": "只读",
        "readOnlyText": "此步骤无法修改。"
    },
    "components/wizard/steps/ReviewStep#LABELS": {
        "reviewTitle": "只读资料表",
        "reviewSubtitle": "您正在查看此资料表：无法进行任何修改。",
        "expand": "显示",
        "collapse": "隐藏",
        "expandAll": "全部展开",
        "collapseAll": "全部折叠",
        "reviewed": "该部分已审阅",
        "reviewedHint": "请逐一勾选各部分：已审阅 {done} / {total}。",
        "empty": "无可显示的内容"
    },
    "components/wizard/steps/SuggestionsStep#LABELS": {
        "title": "自动提取",
        "subtitle": "这些值读取自您上传的文件。请核对：决定权在您。",
        "applied": "已自动应用",
        "appliedHint": "高置信度：该值已填入，您可以撤销。",
        "toConfirm": "待确认",
        "toConfirmHint": "请核对建议值，然后应用。",
        "flagged": "请自行输入",
        "flaggedHint": "提取结果不够可靠：建议您自行输入。",
        "unscored": "建议",
        "unscoredHint": "这些建议没有置信度评分。",
        "apply": "应用",
        "expand": "展开",
        "applyAnyway": "仍然应用",
        "revoke": "撤销",
        "restore": "重新查看",
        "applying": "正在应用…",
        "appliedAt": "已应用",
        "revoked": "已撤销",
        "dismissed": "已忽略",
        "notRevocable": "无法自动恢复先前的值：如有需要，请直接编辑该字段。",
        "empty": "无建议",
        "emptyShort": "此步骤无可提供的建议。",
        "emptyHint": "此步骤无可提供的建议。技术资料表已在上方上传：提取功能会建议从中找到的值。",
        "emptyEntityLevel": "分析已运行，但仅根据资料表本身得出推断，没有任何文件作为依据：因此不向您提供。",
        "analysing": "正在分析",
        "analysingHint": "门户正在读取您的文件。建议会自动显示在此处，无需离开页面：读取一份技术资料表通常不到一分钟。",
        "analysingPlugins": "正在运行：{plugins}",
        "refresh": "重新运行分析",
        "readOnly": "此资料表为只读：无法应用建议。",
        "source": "来源",
        "changes": "{count} 个值",
        "error": "应用建议失败。",
        "reading": "正在读取建议…",
        "searchingElsewhere": "此步骤暂无内容。正在其他步骤中查找建议…",
        "elsewhere": "此步骤暂无建议，但其他步骤中有 {count} 条建议：",
        "elsewhereStep": "{label}（{count}）",
        "runningElsewhere": "此步骤暂无内容：其他步骤的分析仍在进行。",
        "nothingFound": "分析未在您的文件中找到可提供的建议。",
        "runDone": "分析完成：此步骤有 {count} 条建议。",
        "readAt": "建议读取于 {time}",
        "extractedFrom": "读取自“{document}”的值{type}",
        "imageFrom": "在“{document}”中找到的图片{type}",
        "documentFieldsFrom": "文件“{document}”的信息{type}"
    },
    "components/wizard/steps/SurveyStep#LABELS": {
        "discuss": "讨论",
        "answered": "已回答 {answered} / {total}",
        "empty": "无问题",
        "emptyHint": "客户尚未为此资料表发布问卷。",
        "check": "检查我的答案",
        "complete": "问卷已完成",
        "missingTitle": "{count} 个必答问题仍未作答",
        "missingHint": "选择一个即可跳转。您的其他答案已保存。",
        "readOnly": "仅查看",
        "noneAnswered": "未记录任何答案",
        "noneAnsweredHint": "问卷会随着您的作答逐步展开。",
        "dropped": "客户没有为您的 {count} 个答案提供存储位置：{questions}。这些答案未保存 — 请告知客户。"
    },
    "lib/adapters/monitor#CSV_HEADERS": {
        "code": "代码",
        "name": "供应商",
        "legalName": "法定名称",
        "approvalStatus": "认证状态",
        "approvalReasons": "原因",
        "completion": "完整度（%）",
        "risk": "风险",
        "riskLevel": "风险等级",
        "documentsExpired": "已过期文件",
        "documentsExpiring": "即将过期文件",
        "documentsMissing": "缺失文件",
        "openNc": "未关闭 NC",
        "openProjects": "进行中的项目",
        "family": "类别",
        "lastActivity": "最近活动",
        "state": "状态",
        "compliance": "合规性（%）"
    },
    "config/messages#messages": {
        "app.title": "供应商门户",
        "app.shortTitle": "门户",
        "app.tenantSuffix": "供应商空间",
        "app.description": "beCPG 供应商门户 — 准入、文件与合规",
        "nav.dashboard": "仪表板",
        "nav.tasks": "我的任务",
        "nav.products": "我的产品",
        "nav.documents": "我的文件",
        "nav.company": "我的企业",
        "nav.specs": "规格书",
        "nav.messages": "讨论",
        "nav.notifications": "通知",
        "nav.help": "帮助",
        "nav.monitor": "监控",
        "nav.monitor.suppliers": "供应商",
        "nav.monitor.products": "供应商产品",
        "nav.monitor.documents": "文件合规性",
        "nav.monitor.campaigns": "项目",
        "nav.monitor.quality": "不合格项",
        "nav.monitor.reports": "报告",
        "nav.monitor.tasks": "我的任务",
        "account.profile": "我的资料",
        "account.language": "语言",
        "account.login": "登录",
        "account.logout": "退出登录",
        "account.tenant": "客户",
        "account.suppliers": "我的供应商档案",
        "account.allSuppliers": "所有供应商",
        "action.save": "保存",
        "action.cancel": "取消",
        "action.close": "关闭",
        "action.back": "返回",
        "action.next": "下一步",
        "action.previous": "上一步",
        "action.submit": "提交",
        "action.confirm": "确认",
        "action.delete": "删除",
        "action.download": "下载",
        "action.upload": "上传文件",
        "action.retry": "重试",
        "action.search": "搜索",
        "action.filter": "筛选",
        "action.reset": "重置",
        "action.export": "导出",
        "action.sign": "签署",
        "action.showMore": "另外 {count} 项",
        "action.showLess": "收起",
        "suggestion.replaces": "替换 {value}",
        "state.loading": "正在加载…",
        "state.saving": "正在保存…",
        "state.saved": "已保存",
        "state.empty": "无可显示的内容",
        "state.noResults": "此搜索无结果",
        "state.required": "必填字段",
        "state.of": "第 {from}-{to} 项，共 {total} 项",
        "state.page": "第 {page} 页，共 {pages} 页",
        "state.atLeast": "至少 {total} 项",
        "error.title": "出现问题",
        "error.generic": "出现问题。请重试。",
        "error.network": "无法连接服务器。",
        "error.upstream": "beCPG 返回了错误。请重试；如问题仍然存在，请告知您的管理员。",
        "error.unauthorized": "您的会话已过期。请重新登录。",
        "error.forbidden": "您无权执行此操作。",
        "error.notFound": "此页面或条目不存在。",
        "error.tenant": "您的账户未关联任何客户。",
        "error.upload": "文件上传失败。",
        "error.projectAlreadyOpen": "此记录已有一个进行中的准入项目。请先关闭该项目，再发起新项目。",
        "error.http": "错误 {status}：{message}",
        "status.approved": "已认证",
        "status.inProgress": "进行中",
        "status.toRenew": "待更新",
        "status.suspended": "已暂停",
        "status.valid": "有效",
        "status.expiring": "即将过期",
        "status.expired": "已过期",
        "status.missing": "缺失",
        "status.validityMissing": "需填写有效期",
        "status.rejected": "已拒绝",
        "status.pending": "待处理",
        "status.completed": "已完成",
        "status.late": "逾期",
        "status.draft": "模拟",
        "status.notApplicable": "不适用",
        "test.banner": "TEST 实例 — 在此输入的数据不具有合同效力",
        "test.badge": "测试",
        "app.monitorSuffix": "供应商管理"
    },
    "components/monitor/HistoryPanel#LABELS": {
        "title": "趋势",
        "help": "读取自 beCPG 决策模块，按批次加载：数据可能来自上次加载。",
        "period": "期间",
        "measures": {
            "stepsNumber": "任务",
            "averageActualDurations": "平均实际时长（天）",
            "refusalRate": "拒绝率",
            "avgResponseDelay": "平均响应时长（天）",
            "averageProgress": "平均进度",
            "projectsNumber": "项目"
        }
    },
    "components/ui/useListExport#LABELS": {
        "done": "已导出 {count} 行。",
        "cut": "部分导出：{count} 行，已达导出上限。请缩小筛选范围以导出其余部分。"
    }
};

export default LOCALE;
