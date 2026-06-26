# 不会代码实验室

「不会代码实验室」官网。

当前版本方向：浅色高级创作者工作台风格，强调普通人用 AI 做工具、网页和内容工作流的真实过程。

## 当前首页

- 纯静态 HTML / CSS / JavaScript
- 不使用 React / Vue / Next
- 首页主视觉使用 `assets/hero-workspace.png`
- 小小绘本机文件保留，但暂不在官网入口展示
- 共创区目前是前端占位表单，后续再接邮件、飞书或企业微信通知

## 文件结构

```text
nocode-lab-site/
├── index.html
├── style.css
├── script.js
├── assets/
│   └── hero-workspace.png
├── picture-book.html
├── picture-book.js
├── server.mjs
├── .env.example
├── CNAME
└── README.md
```

## 本地预览

首页可以直接双击 `index.html` 预览，也可以用本地服务：

```bash
python3 -m http.server 8126
```

然后打开：

```text
http://127.0.0.1:8126/
```

## 备案信息

- ICP：津ICP备2026007920号-1
- 公安备案：津公网安备12022302001034号

## 后续计划

- 接入真实想法收集通知
- 等素材和录屏准备好后，再上线具体作品入口
- 保持静态官网为主，不引入复杂框架
