# yosvu 跨域 SSO 客户端接入套件（速览）

> **权威完整手册在 `../skills/yosvu-sso-integration.md`**（含多框架代码、安全硬约束、验收清单、排错表、
> 以及「注册新子项目」的标准 Agent 流程）。本文件是给人类开发者的快速上手版，agent 接入请直接读 skills 手册。

`user.yosvu.cn` 已充当 IdP（身份提供方）。任意子项目（flutter.yosvu.cn / yoscn.yosvu.cn / blog.yosvu.cn …）
都能通过这套重定向握手实现「一次在 user.yosvu.cn 登录，处处免登录」，**不需要 Clerk Pro / Satellite**。

原理：用户在 IdP 登录 → IdP 用共享密钥签发一个 `audience=子项目origin` 的短期 JWT →
302 跳回子项目的 callback → 子项目服务端用「同一个密钥」验签 → 落自己的登录态（cookie / session）。
JWT 带 `aud` 限制，无法被其它子项目复用；5 分钟过期。

---

## 0. 前提（在 IdP 的 Vercel 环境变量里做）

1. 给 `user.yosvu.cn` 的 Vercel 环境变量 `YOSVU_SSO_SECRET` 设一个**高强度随机串**
   （本地 `.env.local` 的占位只是开发用）。
2. 把子项目的 origin 加进 IdP 的 `YOSVU_SSO_CLIENT_ORIGINS`
   （逗号分隔，如 `https://flutter.yosvu.cn,https://blog.yosvu.cn`）。
   不填则开发期放行全部，生产务必填。

## 1. 子项目环境变量

```
YOSVU_SSO_SECRET=<和 IdP 完全相同的那个随机串>
YOSVU_IDP_URL=https://user.yosvu.cn
YOSVU_THIS_ORIGIN=https://flutter.yosvu.cn   # 子项目自己的 origin
```

> ⚠️ 密钥只在**服务端**使用。浏览器/纯前端页面绝不能拿到 `YOSVU_SSO_SECRET`，
> 所以验签必须由子项目的服务端 endpoint 完成（见下文）。

## 2. 登录入口（前端）

任意「使用 yosvu 账号登录」按钮：

```js
function startYosvuSso() {
  const idp = process.env.YOSVU_IDP_URL;            // https://user.yosvu.cn
  const cb  = process.env.YOSVU_THIS_ORIGIN + "/sso/callback";
  const state = crypto.randomUUID();                // 防 CSRF，可存 sessionStorage
  const url = `${idp}/sso/authorize?redirect_uri=${encodeURIComponent(cb)}&state=${state}`;
  location.href = url;
}
```

## 3. 回调页（前端）：把 token 交给服务端

IdP 会 302 回 `YOUR_ORIGIN/sso/callback#token=xxx`。前端只负责把 token 发给自己的服务端：

```js
// /sso/callback
const token = new URLSearchParams(location.hash.slice(1)).get("token");
if (token) {
  fetch("/api/sso/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
    credentials: "same-origin",
  }).then((r) => (r.ok ? (location.href = "/") : alert("SSO 失败")));
}
```

## 4. 服务端验签 endpoint（子项目必须持有密钥）

### Next.js (App Router) — `app/api/sso/verify/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.YOSVU_SSO_SECRET!);
const IDP = process.env.YOSVU_IDP_URL!;          // https://user.yosvu.cn
const AUD = process.env.YOSVU_THIS_ORIGIN!;       // 自己的 origin

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: IDP, audience: AUD });
    // payload.sub / email / name / image_url / providers
    // ✅ 验签通过：在这里落你自己的登录态（设 httpOnly cookie / 写 session）
    // 例：const session = await createSession(payload.sub);
    //     cookies().set("yosvu_session", session, { httpOnly: true });
    return NextResponse.json({ ok: true, user: payload });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
```

### 非 Next / 纯后端（Node + Express 同理，依赖 `jose`）

```bash
npm i jose
```

```js
import { jwtVerify } from "jose";
app.post("/api/sso/verify", async (req, res) => {
  const secret = new TextEncoder().encode(process.env.YOSVU_SSO_SECRET);
  try {
    const { payload } = await jwtVerify(req.body.token, secret, {
      issuer: process.env.YOSVU_IDP_URL,
      audience: process.env.YOSVU_THIS_ORIGIN,
    });
    // 落登录态……
    res.json({ ok: true, user: payload });
  } catch { res.status(401).json({ ok: false }); }
});
```

## 5. 登出

子项目清除自己的 session 即可；如需「全局登出」，可顺带跳转
`https://user.yosvu.cn/sign-out`（Clerk 托管的登出）。

---

## 安全要点

- `YOSVU_SSO_SECRET` 仅在**服务端**配置，绝对不要 `NEXT_PUBLIC_` 暴露给浏览器。
- `YOSVU_SSO_CLIENT_ORIGINS` 生产环境必须填全，禁止留空放行。
- JWT 5 分钟过期且绑定 `aud`，即便泄露也无法跨子项目复用。
- 子项目应校验 `state` 防 CSRF（登录前存、回调后比对）。
