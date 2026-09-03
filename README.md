# 像素回廊 · 摄影集

> 一间装在浏览器里的像素画廊，挂着我拍下的光。

一个**纯静态**的像素风摄影展览网站：没有框架、没有构建步骤、没有任何运行时依赖，
打开 `index.html` 就是一座可以左右走动的像素美术馆。

**线上地址：** https://jesse1024.github.io/pixel-gallery/

---

## ✨ 功能

- 🖼 **展厅式浏览**：每个摄影专题是一间展厅，方向键 / 滑动 / 按钮在展厅间走动，有像素小人在展厅里散步
- 🐱 **环境动效**：按展厅主题自动生成微尘、爱心、云、大雁、风筝、炊烟、落叶、蝴蝶、星尘、流星、猫与参观者
- 🔍 **作品档案**：点击画作弹出档案卡，自动解析 JPEG EXIF（相机 / 镜头 / 光圈 / 快门 / 感光度 / 焦距 / 拍摄日期）
- ⤢ **原大查看**：一键放大到原始分辨率，支持拖拽平移、长按自动滚动
- 🎵 **背景音乐**：循环 BGM，兼容微信内置浏览器的自动播放限制
- 🛠 **管理模式**：浏览器内直接删除照片、上传新照片（自动压缩、读 EXIF、更新清单）
- 📱 **移动端适配**：手机竖屏可正常浏览、滚动、查看档案

## 🚀 本地运行

无任何构建依赖，任选其一：

```powershell
# 方式一：Python
python -m http.server 8000

# 方式二：Node
npx serve .

# 方式三：VS Code 装 Live Server 插件，右键 index.html → Open with Live Server
```

然后访问 http://localhost:8000

> 直接双击 index.html 也能看，但「管理」功能需要 Chrome / Edge 且建议走 http(s)。

## 🛠 管理模式（在网页里改）

点击右下角 **「管理」** 进入管理模式：

- **删除照片**：点画框上的 ✕，会同时删除图片文件并更新 `js/photos-data.js`
- **添加照片**：点某间展厅角落的 **「＋ 添加照片」**，选图后自动压缩（最长边 1800px / 质量 88）、
  读取 EXIF 拍摄日期与参数、存入 `assets/series/<专题>/` 并更新清单
- 首次使用需在 Chrome / Edge 中授权网站文件夹（本地目录读写）

## 📦 批量导入（tools/）

面向「一次导入几百张」的场景，Windows PowerShell 工具链：

| 脚本 | 用途 |
| --- | --- |
| `tools/series-config.json` | 定义专题（id / 标题 / 简介 / 主题配色 / 原图来源文件夹） |
| `tools/build_manifest.ps1` | 按配置批量压缩原图 → `assets/series/`，并生成 `js/photos-data.js` |
| `tools/apply_captions.js` | 把 `tools/captions.json` 里的图注批量写进清单（需 Node） |
| `tools/make_thumbs.ps1` | 为指定专题生成小样图，方便核对 |
| `tools/gen_assets.ps1` / `gen_cat.ps1` / `gen_visitors.ps1` | 生成像素猫、参观者等装饰素材 PNG |

典型流程：

```powershell
# 1. 在 series-config.json 里加一个专题（source 指向你的原图文件夹）
# 2. 批量导入
powershell -File tools\build_manifest.ps1
# 3. （可选）批量写图注：先编辑 captions.json
node tools\apply_captions.js
```

## 📁 目录结构

```
pixel-gallery/
├── index.html              # 唯一页面
├── css/
│   ├── style.css           # 全部样式（含移动端适配 @media 760px）
│   └── fonts.css           # 像素字体自托管 @font-face
├── js/
│   ├── main.js             # 全部交互逻辑（单文件，无依赖）
│   └── photos-data.js      # 照片清单（window.SERIES，由工具或管理模式维护）
├── assets/
│   ├── series/             # 各专题照片（如 tuanyuanyuan / canalpark / foxiang / yihua / dream）
│   ├── fonts/              # Fusion Pixel 字体文件
│   ├── music/              # 背景音乐
│   └── *.png / *.jpg       # 像素装饰素材、头像、光标
└── tools/                  # 批量导入 / 素材生成脚本
```

## 🌐 部署

- **GitHub Pages**：推送到 `main` 分支即自动发布（仓库 Settings → Pages → Deploy from branch）
- 更新流程：改完本地文件后
  ```powershell
  git add -A; git commit -m "更新"; git push
  ```
  约 1 分钟后线上生效
- **微信内访问**：`*.github.io` 在国内部分网络不稳定；如需国内直连，可另外配置
  腾讯云 COS / EdgeOne Pages（自定义域名需备案）。字体已自托管、音乐已做微信兼容，
  换托管平台无需改代码。

## 🎨 素材与字体

- 像素字体：[Fusion Pixel 12px Proportional SC](https://github.com/TakWolf/fusion-pixel-font)（OFL 许可，已自托管于 `assets/fonts/`）
- 装饰素材：由 `tools/gen_*.ps1` 程序化生成的像素画
- 照片与内容：© 南山怪客

---

*策展人：南山怪客 · 常年寻找好看的光*
