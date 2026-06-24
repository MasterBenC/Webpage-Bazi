# 宸垚命馆网页部署说明

## 服务器要求

- 推荐系统：Ubuntu 22.04 / 24.04
- Node.js：建议 22.x 或以上；本项目使用 `node:sqlite`
- 需要一个可持久保存的项目目录，因为 SQLite 数据库会写入 `data/chenyao.sqlite`

## 1. 上传项目

把整个 `bazi-ai-web` 项目上传到服务器，例如：

```bash
/var/www/chenyao-bazi-web
```

不要把本地 `.env` 明文发给不可信的人；服务器上单独创建 `.env`。

## 2. 安装依赖并构建

```bash
cd /var/www/chenyao-bazi-web
npm ci
npm run build
```

## 3. 创建服务器环境变量

在项目根目录创建 `.env`：

```bash
DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_THINKING=disabled
DEEPSEEK_TEMPERATURE=0.6
DEEPSEEK_MAX_TOKENS=1800
```

如果已经配置 HTTPS，可以再加：

```bash
COOKIE_SECURE=true
```

如果只是先用服务器 IP + HTTP 测试，不要加 `COOKIE_SECURE=true`，否则后台登录 Cookie 可能不会生效。

## 4. 用 PM2 常驻运行

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

按 `pm2 startup` 输出的命令再执行一次，让服务器重启后自动恢复。

检查状态：

```bash
pm2 status
pm2 logs chenyao-bazi-web
```

本机服务器内验证：

```bash
curl http://127.0.0.1:8787/api/health
```

## 5. Nginx 反向代理

安装 Nginx：

```bash
sudo apt update
sudo apt install -y nginx
```

创建站点配置：

```nginx
server {
    listen 80;
    server_name 你的域名或服务器IP;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/chat {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置后：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

如果有域名，建议配置 HTTPS：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

HTTPS 成功后，在 `.env` 加：

```bash
COOKIE_SECURE=true
```

然后重启：

```bash
pm2 restart chenyao-bazi-web
```

## 7. 验收地址

- 客户端：首页 `/`
- 管理端：`/admin`
- 健康检查：`/api/health`

