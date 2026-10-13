# Yosvu 跨域 SSO 接入手册（Agent 可用版）

> 适用对象：需要把任意 `*.yosvu.cn` 子项目（或任何绑定到 yosvu 的站点）接入统一登录的
> 开发者 / agent。**IdP（身份提供方）已就绪**，本手册教你在子项目侧完成接入。
> 本方案 **不需要 Clerk Pro / Satellite**，纯靠共享密钥 + 短期 JWT 实现跨域单点登录。

---

## 0. 一句话原理

```
用户点「用 yosvu 账号登录」
   → 跳转 https://user.yosvu.cn/sso/authorize?redirect_uri=<子项目/callback>&state=xxx
   → IdP 用 HS256 签发 audience=<子项目 origin> 的 JWT（5 分钟过期）
   → 302 跳回 <子项目/callback#token=xxx>
   → 子项目【服务端】用同一把密钥验签 → 落自己的登录态（cookie/session）
```

token 带 `aud` 限制，无法被其它子项目复用；即便泄露也 5 分钟失效。

---

## 1. 资产清单（接入前先认领）

| 角色 | 地址 / 仓库 | 现状 |
|---|---|---|
| **IdP（已就绪）** | `https://user.yosvu.cn` | 已部署，含 `/sso/authorize` 端点 |
| IdP 仓库 | `Maicarons/user.yosvu.cn`（私有） | `lib/sso.ts` + `app/sso/authorize/route.ts` 已存在 |
| 子项目（你来加） | 任意 `*.yosvu.cn` 或绑定站点 | **本文档目标**：加入三件套 |

### IdP 关键代码（只读参考，勿改）

- `lib/sso.ts`
  - `signSsoToken(claims, audience, ttl=300)` —— IdP 侧签发，audience 必传为目标子项目 origin。
  - `verifySsoToken(token, expectedAudience)` —— 子项目侧可**直接复用**同一函数（同一密钥、同 `ISSUER`）。
  - `isAllowedRedirectUri(uri)` —— 校验 `redirect_uri` 是否在 `YOSVU_SSO_CLIENT_ORIGINS` 白名单。
  - 常量：`ISSUER = process.env.NEXT_PUBLIC_APP_URL || "https://user.yosvu.cn"`。
- `app/sso/authorize/route.ts`
  - `GET /sso/authorize`：未登录先跳 Clerk `/sign-in?redirect_url=<本请求URL>`；已登录签 token 并 `back.hash = "token=..."` 跳回。
  - **token 通过 URL hash 回传（非 query），避免被服务器日志/referer 记录。**

---

## 2. 环境变量（双方必须一致）

### 2.1 IdP 侧（`user.yosvu.cn`，Vercel 环境变量）

| 变量 | 值 | 说明 |
|---|---|---|
| `YOSVU_SSO_SECRET` | 高强度随机串 | **根密钥**，所有子项目共用同一个值。本地 `.env.local` 占位 `dev_only_change_me_in_vercel` 仅开发用。 |
| `YOSVU_SSO_CLIENT_ORIGINS` | `https://a.yosvu.cn,https://b.yosvu.cn` | 允许发起 SSO 的子项目 origin 白名单，**逗号分隔，必须含协议**。生产环境**必填**，留空=开发期放行全部。 |
| `NEXT_PUBLIC_APP_URL` | `https://user.yosvu.cn` | 用作 JWT `issuer`，已存在。 |

> 生产部署前：把 `YOSVU_SSO_SECRET` 换成 `openssl rand -hex 32` 之类的强随机串，并在
> `YOSVU_SSO_CLIENT_ORIGINS` 填全所有子项目 origin。改完**重新部署** IdP。

### 2.2 子项目侧（每个子项目自己的环境变量）

| 变量 | 示例 | 约束 |
|---|---|---|
| `YOSVU_SSO_SECRET` | 与 IdP **完全相同** | **仅服务端**，禁止 `NEXT_PUBLIC_` 前缀，禁止进前端打包。 |
| `YOSVU_IDP_URL` | `https://user.yosvu.cn` | IdP 基地址。 |
| `YOSVU_THIS_ORIGIN` | `https://flutter.yosvu.cn` | 子项目**自己的** origin，用作 JWT `audience`，必须与白名单中的条目完全一致。 |

---

## 3. 子项目三件套（必须全部具备）

1. **登录入口**（前端）：发起重定向。
2. **回调页**（前端）：从 hash 取 token 并 POST 给自己的服务端。
3. **验签 endpoint**（服务端）：用 `YOSVU_SSO_SECRET` 验签并落登录态。

> 验签必须在**服务端**做，因为密钥不能给浏览器。前端只搬运 token，不解析。

### 3.1 登录入口（任意前端，通用）

```js
function startYosvuSso() {
  const idp = process.env.YOSVU_IDP_URL;                 // https://user.yosvu.cn
  const cb  = process.env.YOSVU_THIS_ORIGIN + "/sso/callback";
  const state = crypto.randomUUID();                     // 防 CSRF
  sessionStorage.setItem("yosvu_sso_state", state);      // 回调后比对
  const url = `${idp}/sso/authorize?redirect_uri=${encodeURIComponent(cb)}&state=${state}`;
  location.href = url;
}
```

### 3.2 回调页（前端）—— 把 token 交给自己服务端

IdP 回跳地址形如 `<YOUR_ORIGIN>/sso/callback#token=eyJ...`。

```js
// 页面路径：/sso/callback
const params = new URLSearchParams(location.hash.slice(1)); // 注意用 hash，不是 search
const token = params.get("token");
const returnedState = params.get("state");
const expectedState = sessionStorage.getItem("yosvu_sso_state");

if (!token) { /* 无 token，跳转登录失败页 */ }

// 可选但推荐：校验 state 防 CSRF
if (returnedState && expectedState && returnedState !== expectedState) {
  alert("SSO state 校验失败"); location.href = "/";
}

fetch("/api/sso/verify", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token }),
  credentials: "same-origin",
}).then((r) =>
  r.ok ? (location.href = "/") : alert("SSO 登录失败")
);
```

### 3.3 验签 endpoint（服务端，按框架选一个）

#### A) Next.js App Router —— `app/api/sso/verify/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.YOSVU_SSO_SECRET!);
const IDP = process.env.YOSVU_IDP_URL!;        // https://user.yosvu.cn
const AUD = process.env.YOSVU_THIS_ORIGIN!;     // 自己的 origin（= 白名单条目）

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: IDP,
      audience: AUD,
    });
    // payload: { sub, email?, name?, image_url?, providers?, state?, iss, aud, exp, iat }
    // ✅ 验签通过 —— 在这里落子项目自己的登录态：
    //    await setMySession(payload.sub, payload);   // 例：写 httpOnly cookie / DB session
    return NextResponse.json({ ok: true, user: payload });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
```

#### B) Next.js Pages Router —— `pages/api/sso/verify.ts`

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { jwtVerify } from "jose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = new TextEncoder().encode(process.env.YOSVU_SSO_SECRET!);
  try {
    const { payload } = await jwtVerify(req.body.token, secret, {
      issuer: process.env.YOSVU_IDP_URL,
      audience: process.env.YOSVU_THIS_ORIGIN,
    });
    // 落登录态，例如 res.setHeader("Set-Cookie", `sid=...; HttpOnly; Path=/; SameSite=Lax`);
    res.status(200).json({ ok: true, user: payload });
  } catch {
    res.status(401).json({ ok: false });
  }
}
```

#### C) Node + Express（或其它 Node 后端，依赖 `jose`）

```bash
npm i jose
```

```js
import express from "express";
import { jwtVerify } from "jose";
const app = express();
app.use(express.json());

app.post("/api/sso/verify", async (req, res) => {
  const secret = new TextEncoder().encode(process.env.YOSVU_SSO_SECRET);
  try {
    const { payload } = await jwtVerify(req.body.token, secret, {
      issuer: process.env.YOSVU_IDP_URL,
      audience: process.env.YOSVU_THIS_ORIGIN,
    });
    // 落登录态（写 session / 设 cookie）
    res.json({ ok: true, user: payload });
  } catch {
    res.status(401).json({ ok: false });
  }
});
```

#### D) 其它语言后端（Python / Go / Rust 等）

只要能 `HS256` 验签并校验 `iss` / `aud` / `exp` 即可。可复用 IdP 同一把 `YOSVU_SSO_SECRET`。
参考标准库：`PyJWT`（Python）、`github.com/golang-jwt/jwt`（Go）、`jsonwebtoken`（Rust）。
验签参数必须：算法 `HS256`、密钥 = `YOSVU_SSO_SECRET`、issuer = `YOSVU_IDP_URL`、audience = `YOSVU_THIS_ORIGIN`。

---

## 4. 注册一个全新子项目的标准流程（Agent 检查清单）

1. **确认域名**：拿到子项目的正式 origin（如 `https://flutter.yosvu.cn`）。
2. **IdP 白名单**：在 `user.yosvu.cn` 的 Vercel 环境变量里，把该 origin 追加进 `YOSVU_SSO_CLIENT_ORIGINS`（逗号分隔）。
3. **共享密钥**：确保 IdP 的 `YOSVU_SSO_SECRET` 已是强随机串；把它**原样**配置到子项目的服务端环境变量。
4. **子项目环境变量**：设置 `YOSVU_IDP_URL`、`YOSVU_THIS_ORIGIN`（= 自己的 origin，必须与第 2 步白名单条目逐字一致，含 `https://`）。
5. **加三件套**：登录入口 + 回调页 + 服务端验签 endpoint（按 §3 选框架）。
6. **落登录态**：在验签 endpoint 内写子项目自己的 session/cookie；回调成功跳首页。
7. **登出**：清子项目自己的 session；如需全局登出，额外跳转 `https://user.yosvu.cn/sign-out`。
8. **部署 & 验证**（见 §6）。

> ⚠️ 常见坑：`YOSVU_THIS_ORIGIN` 与白名单差一个字符（多了 `/`、少了 `https://`、大小写）都会导致
> `redirect_uri` 校验 400 或 `aud` 不匹配 401。务必逐字一致。

---

## 5. 安全硬约束（违反即视为实现错误）

- [ ] `YOSVU_SSO_SECRET` **只能**出现在服务端环境变量，绝不 `NEXT_PUBLIC_`、绝不进前端 bundle、绝不写进前端可读的配置接口。
- [ ] 生产环境 `YOSVU_SSO_CLIENT_ORIGINS` **必须填全**，禁止留空放行。
- [ ] 验签 endpoint 必须校验 `iss` + `aud` + `exp`（库默认会校验 exp；iss/aud 在 `jwtVerify` 选项里显式传）。
- [ ] token 回传走 **URL hash**，子项目回调页也只能从 hash 读取，避免写入服务器日志。
- [ ] 子项目应实现 `state` 防 CSRF（登录前存、回调后比对）。
- [ ] 子项目落登录态的 cookie 应为 `HttpOnly` + `SameSite=Lax`（或 `Strict`）+ `Secure`（生产）。

---

## 6. 验收清单（接入后逐项确认）

- [ ] 未登录访问子项目 → 点登录 → 跳转到 `user.yosvu.cn` 且 URL 带 `redirect_uri` 与 `state`。
- [ ] 在 IdP 登录/注册后 → 自动跳回子项目 `/sso/callback#token=...`。
- [ ] 子项目 `/api/sso/verify` 返回 `200 {ok:true}`，且子项目进入已登录态。
- [ ] 刷新子项目页面仍保持登录（说明 session 已落）。
- [ ] 用**错误/过期** token POST `/api/sso/verify` → 返回 `401`。
- [ ] 用**另一个子项目 origin** 当 `audience` 验签 → 返回 `401`（确认 aud 隔离）。
- [ ] 白名单外 origin 发起 `/sso/authorize` → IdP 返回 `400 invalid redirect_uri`。

---

## 7. 排错表

| 现象 | 根因 | 修法 |
|---|---|---|
| IdP 返回 `400 invalid redirect_uri` | `redirect_uri` 的 origin 不在 `YOSVU_SSO_CLIENT_ORIGINS` | 把子项目 origin 加进白名单；确认含 `https://` 且无多余 `/` |
| 子项目验签 `401` | `aud` 不匹配 | `YOSVU_THIS_ORIGIN` 必须与白名单条目逐字一致 |
| 子项目验签 `401`（iss 错） | `YOSVU_IDP_URL` 与 IdP `NEXT_PUBLIC_APP_URL` 不一致 | 对齐为 `https://user.yosvu.cn` |
| 子项目验签 `401`（密钥错） | 两端 `YOSVU_SSO_SECRET` 不一致 | 用同一串 |
| 浏览器拿不到用户信息 | 前端试图解析 JWT | 不要在前端解码；交由服务端验签后回传 |
| token 在回调页读不到 | 从 `search` 而非 `hash` 读取 | 改用 `location.hash.slice(1)` |
| 登录后没保持 | 验签通过但没落 session | 在 endpoint 内写 cookie/session |

---

## 8. 其它 agent 如何使用本手册

- 当任务包含「把某个 yosvu 项目接入统一登录 / SSO / 单点登录」时，定位到本文件并按 §4 流程执行。
- IdP 已部署，**不要**重造 `/sso/authorize` 或改动 `lib/sso.ts`；只在子项目侧加三件套。
- 若子项目需要展示「用户已关联的社交账号 / 名下项目」，可参考 IdP 仓库的 `lib/projects.ts` 与 `/user` 页逻辑复用 `payload.providers`。
- 任何涉及 `YOSVU_SSO_SECRET` 的改动都必须同步 IdP 与所有子项目，并重新部署。
