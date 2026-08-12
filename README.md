# 食物库存 PWA

## 上传到 GitHub Pages
1. 新建一个 GitHub Repository。
2. 把 ZIP 解压后的所有文件上传到仓库根目录。
3. GitHub → Settings → Pages。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，Folder 选择 `/ (root)`，保存。
6. 等待 GitHub Pages 地址生成后打开即可。

## iPhone 安装
Safari 打开 GitHub Pages 地址 → 分享 → 添加到主屏幕。

## 数据保存机制
- 日常增删改：自动保存到当前浏览器的 LocalStorage。
- `food-data.json`：独立纯文本数据文件，可用任何文本编辑器打开。
- 在“数据同步”里可以导出 / 导入 `food-data.json`。
- 新设备第一次打开时会尝试读取网站根目录的 `food-data.json`。
- 已经使用过的设备，可进入“数据同步”手动点击“从本站 food-data.json 读取”。

## 跨设备同步建议
无后端、纯 GitHub Pages 的情况下，网页不能直接自动修改 GitHub 仓库文件。
推荐流程：
1. A 设备：导出 `food-data.json`。
2. 把文件保存到 iCloud Drive / Google Drive，或替换 GitHub 仓库里的 `food-data.json`。
3. B 设备：导入该文件，或点击“从本站 food-data.json 读取”。

桌面 Chrome / Edge 还可使用“绑定本地文件”功能，直接读写一个 JSON 文件；Safari/iPhone 通常不支持 File System Access API。

## 数据字段
每条食物大致包含：
- id
- name
- storage: fridge / snacks / cabinet
- zone: chiller / freezer（仅冰箱）
- category
- qty
- unit
- expiry
- note
- addedAt / updatedAt


## v2 更新
- 修复添加窗口因必填名称导致无法关闭/取消的问题。
- 备注改为独立浅色 Tag，和到期信息区分。
- 整体背景提亮。
- 分类改为必须主动选择，避免默认误归到肉类。
- 增加豆制品标签；保留并强化饮料标签。

## v3 修复
- 修复部分浏览器/PWA 中点击保存无反应的问题。
- 新建食物默认标签为“其他”，仍可点选任意分类。
- 增加兼容性 ID 生成与保存错误提示。
- Service Worker 缓存版本升级为 v3。

## v4 更新
- 单位新增“块”。
- 新增“未开封 / 已开封”开关式标签，独立保存为 `opened` 布尔字段。
- 旧数据自动兼容；旧备注若仅为“已开封”，会自动识别开封状态并清理该重复备注。
- 库存卡片显示开封状态。
- 日期提醒按紧急程度排序。
- “吃什么”对 7 天内到期食材的类别增加轻量优先级。
- 数量最小值调整为 0.1，避免登记 0 件库存。
- Service Worker 缓存升级到 v4。

## v5 更新
- 搜索图标固定为 24×24 px，并同步放大字形。
- 更新 App 图标：180 / 192 / 512 / 1024 px。
- iPhone 添加到主屏幕使用独立 180×180 Apple Touch Icon。
- Service Worker 缓存升级到 v5。

## v6 更新
- App 图标改为用户提供的冰箱插画。
- 已更新 180 / 192 / 512 / 1024 px 图标资源。
- “用完”按钮新增确认弹窗，避免误删库存。
- Service Worker 缓存升级到 v6。

## v7 更新
- 新增独立离线菜谱库 `recipe-data.js`，共 397 道常见菜式。
- 菜谱只作为灵感：只显示菜名与库存匹配情况，不显示步骤。
- 从“分类标签匹配”升级为“具体食材名称 + 常见别名匹配”。
- 例如：番茄/西红柿 + 鸡蛋 → 番茄炒蛋；猪肉 + 青椒 → 青椒炒肉/青椒肉丝。
- 支持蔬菜、肉类、海鲜、豆制品、主食、水果、甜品等常见组合。
- 临期食材会在匹配排序中获得轻量优先级。
- `recipe-data.js` 已加入 Service Worker 预缓存，可离线使用。

## v8 更新
- 修复大量库存时推荐被少数高频食材占满的问题。
- 默认综合推荐采用库存覆盖优先的轮询算法。
- 完全匹配时，多食材菜谱优先于单食材菜谱。
- 新增按库存食材查看，每种食材显示可匹配菜谱数量。
- 食物名称会忽略常见数量、单位、冷冻/冷藏/速冻等附加文字。
- 没有菜谱覆盖的库存会显示为 0，便于继续补充后台库。
- 首屏推荐提升至最多 18 条。
