# iOS 快捷指令配置指南：MyOS 闪念胶囊速记

本指南用于在 iPhone / iPad 上创建一个「**MyOS 闪念胶囊**」快捷指令。创建后可以放在桌面、锁屏小组件、或者 iPhone 15 Pro/16 的**操作按钮（Action Button）**上一键呼出，抬手即记。

---

## 准备工作

1. 确认你的 MyOS 线上地址（例如：`https://myos.yourdomain.com` 或内网穿透地址）。
2. 在 MyOS 的 `.env.local` 或服务端环境变量中配置好 `MYOS_QUICK_API_TOKEN`（例如 `myos-secret-token-888`）。

---

## 3 分钟快捷指令搭建步骤

打开 iPhone 自带的 **「快捷指令」** (Shortcuts) App，点击右上角 **「+」** 新建一个快捷指令，按顺序添加以下动作：

### 动作 1：要求输入（文字或语音）
- 搜索并添加动作：**「要求输入」** (Ask for Input)
- 提示文本填写：`闪念胶囊：有什么灵感或待办？`
- 输入类型选择：**「文本」** (Text)
- *(可选：如果你想要语音输入，也可以将此动作替换为「听写文本」)*

### 动作 2：定义常量与 JSON 请求体
- 搜索并添加动作：**「词典」** (Dictionary)
- 在词典中添加键值：
  - 键名 `title` (文本类型) -> 点击输入值，选择 **「提供的输入」** (即动作 1 的结果)
  - 键名 `type` (文本类型) -> 填写 `idea`
  - 键名 `category` (文本类型) -> 填写 `inbox`

### 动作 3：发送网络请求到 MyOS
- 搜索并添加动作：**「获取 URL 内容」** (Get Contents of URL)
- **URL** 填写：`https://你的域名/api/quick-capture`
- 点击展开详细设置：
  - **方法** (Method)：`POST`
  - **请求头** (Headers)：
    - 添加标头：`Authorization` -> 值：`Bearer YOUR_MYOS_QUICK_API_TOKEN`
    - 添加标头：`Content-Type` -> 值：`application/json`
  - **请求体** (Request Body)：选择 **「词典」** (Dictionary) -> 选动作 2 的词典

### 动作 4：成功提示与触感反馈
- 搜索并添加动作：**「设备振动」** (Vibrate Device)
- 搜索并添加动作：**「显示通知」** (Show Notification)
  - 标题：`MyOS`
  - 正文：`已成功记录到收件箱 📥`

---

## 触发与使用方式

1. **iPhone 15 Pro / 16 操作按钮 (Action Button)**：
   - 打开系统设置 -> 操作按钮 -> 选择「快捷指令」 -> 绑定此「MyOS 闪念胶囊」。
2. **iOS 锁屏小组件 / 控制中心**：
   - 长按锁屏壁纸 -> 自定义 -> 添加快捷指令小组件。
   - iOS 18 控制中心也支持直接添加快捷指令按钮。
3. **桌面图标**：
   - 在快捷指令 App 中点击此指令右上角「...」 -> 分享 -> 「添加到主屏幕」。
