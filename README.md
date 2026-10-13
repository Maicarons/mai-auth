# mai-auth

> yosvu 跨域统一登录（SSO）桥 —— 基于 Clerk 作为身份源，用共享密钥签发的短期 JWT 把任意子项目接入统一登录。
> **无需 Clerk Pro / Satellite**。

`user.yosvu.cn` 作为 IdP（身份提供方）已经部署就绪。任意 `*.yosvu.cn` 子项目（或任何绑定到 yosvu 的站点）都能通过这套**重定向握手**实现「一次在 user.yosvu.cn 登录，处处免登录」。

## 为什么不用 Satellite

Clerk 的 Satellite 多域共享 session 方案需要 **Pro 订阅**。本项目用一条更轻的路子达到同样效果：用户在 IdP 登录 → IdP 用 `HS256` 签发一个 `audience=子项目 origin` 的短期 JWT（5 分钟过期）→ 302 跳回子项目 → 子项目**服务端**用同一把共享密钥验签 → 落自己的登录态。token 带 `aud` 限制，无法被其它子项目复用。

## 架构

```
user.yosvu.cn            <- IdP（Clerk Primary 登录中心，本项目）
  ├─ /sso/authorize      <- IdP 授权端点
  └─ /sign-in /sign-up   <- Clerk 托管登录/注册

*.yosvu.cn 子项目        <- SSO 客户端（各自持有会话）
  ├─ 登录按钮            -> 跳转 IdP /sso/authorize
  └─ /sso/callback       -> 接收 token 并交给自己的服务端验签
```

## 能力

- **用户端 (`/user`)**：账户资料、已绑定社交账号、名下 Yosvu 项目（绑定状态自动判定）。
- **管理员端 (`/admin`)**：用户列表 / 用户详情（社交绑定、元数据、活跃时间）、Clerk 实例信息。
- **SSO 桥**：`/sso/authorize` 端点 + `lib/sso.ts` 共享密钥 JWT 签/验。
- **登录中心**：`/sign-in`、`/sign-up`（Clerk 托管 UI）。

## 本地开发

```bash
cp .env.local.example .env.local   # 填入 Clerk API Keys
npm install
npm run dev
```

> ⚠️ 真实密钥（`CLERK_SECRET_KEY`、`YOSVU_SSO_SECRET` 等）只应配置在 **Vercel 环境变量**与本地 `.env.local`（已被 git 忽略），**不要**提交到仓库。

## 部署（Vercel）

```bash
vercel            # 首次：关联/新建项目
vercel --prod     # 生产部署
```

在 Vercel 项目环境变量中配置 `.env.local.example` 里的全部变量，并把 `user.yosvu.cn` 设为本应用自定义域名（Clerk Dashboard 配 CNAME）。SSO 相关的两个关键变量：

| 变量 | 说明 |
|---|---|
| `YOSVU_SSO_SECRET` | 跨域 SSO 共享密钥（高强度随机串），所有客户端共用同一值。**服务端专用**。 |
| `YOSVU_SSO_CLIENT_ORIGINS` | 允许发起 SSO 的子项目 origin 白名单，逗号分隔，必须含协议。生产必填。 |

## 接入一个新子项目

详见 [`skills/yosvu-sso-integration.md`](skills/yosvu-sso-integration.md)（完整的多框架接入手册、安全约束、验收清单、排错表，供 agent 直接调用），以及 [`sso-kit/README.md`](sso-kit/README.md)（速览版）。

简版三件套：

1. **登录入口**（前端）：跳转 `https://user.yosvu.cn/sso/authorize?redirect_uri=<子项目/callback>&state=<random>`。
2. **回调页**（前端）：从 `location.hash` 取出 `token` 并 `POST /api/sso/verify`。
3. **验签 endpoint**（服务端）：用 `YOSVU_SSO_SECRET` 验签（`iss=https://user.yosvu.cn`，`aud=子项目 origin`，校验 `exp`），通过则落子项目自己的 session。

## License

[GNU Affero General Public License v3.0](LICENSE)
