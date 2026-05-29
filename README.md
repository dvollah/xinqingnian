# 新青年足球队管理系统

新青年足球队比赛管理 & 接龙系统

## 技术栈

- Node.js + Express
- 前端：原生 HTML/CSS/JS（单页应用）
- 数据存储：本地 JSON 文件

## 本地运行

```bash
npm install
npm start
```

访问 http://localhost:3456

## Railway 部署

1. 推送代码到 GitHub
2. 在 Railway 连接该仓库
3. 自动部署完成后绑定 xqn.net 域名

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3456 |

## 管理员密码

默认管理员密码：`admin123`

> ⚠️ 注意：Railway 免费实例重启后，上传的图片文件会丢失（uploads 目录不持久化）。JSON 数据文件同样不持久化。如需持久化数据，请升级到 Railway 付费计划并挂载 Volume。
