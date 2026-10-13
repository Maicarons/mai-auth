# user.yosvu.cn — Yosvu 统一账户中心

Clerk **Primary** 登录中心：一处登录，通行 yosvu.cn 旗下所有项目。

## 能力

- **用户端 (`/user`)**：查看账户资料、已绑定社交账号、名下 Yosvu 项目（绑定状态自动判定）。
- **管理员端 (`/admin`)**：用户列表 / 用户详情（社交绑定、元数据、活跃时间）、Clerk 实例信息。
- **登录中心**：`/sign-in`、`/sign-up`（Clerk 托管 UI），作为所有 Satellite 子项目的认证源。

## 架构

```
user.yosvu.cn           <- Primary（本项目）
  ├─ *.yosvu.cn 子项目   <- Satellite: ClerkProvider 设 isSatellite + signInUrl 指回本域名
  └─ localhost:3000      <- 开发 Satellite
```

所有项目共用同一套 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`。

## 本地开发

```bash
cp .env.local.example .env.local   # 填入 Clerk API Keys
npm install
npm run dev
```

## 部署（Vercel）

```bash
vercel            # 首次：关联/新建项目
vercel --prod     # 生产部署
```

在 Vercel 项目环境变量中配置 `.env.local.example` 里的全部变量，并把 `user.yosvu.cn` 设为本应用自定义域名（Clerk Dashboard 配 CNAME）。

## 接入新的 Satellite 项目（示例）

```tsx
<ClerkProvider
  publishableKey={SAME_KEY_AS_PRIMARY}
  isSatellite
  signInUrl="https://user.yosvu.cn/sign-in"
  signUpUrl="https://user.yosvu.cn/sign-up"
/>
```
