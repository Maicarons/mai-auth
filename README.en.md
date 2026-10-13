# mai-auth

> A cross-domain unified login (SSO) bridge for the yosvu fleet — using Clerk as the identity source, with a shared-secret short-lived JWT to onboard any sub-project into single sign-on.
> **No Clerk Pro / Satellite required.**

`user.yosvu.cn` is already deployed as the **IdP (identity provider)**. Any `*.yosvu.cn` sub-project (or any site bound to yosvu) can achieve "sign in once at user.yosvu.cn, signed in everywhere" through this **redirect handshake**.

## Why not Satellite

Clerk's Satellite multi-domain shared-session feature requires a **Pro subscription**. This project achieves the same effect more lightly: the user signs in at the IdP → the IdP issues an `HS256` short-lived JWT with `audience = sub-project origin` (5-minute expiry) → 302 redirect back to the sub-project → the sub-project's **server** verifies it with the same shared secret → it establishes its own session. The token is bound to `aud`, so it cannot be replayed by another sub-project.

## Architecture

```
user.yosvu.cn            <- IdP (Clerk Primary login center, this project)
  ├─ /sso/authorize      <- IdP authorization endpoint
  └─ /sign-in /sign-up   <- Clerk-hosted sign-in / sign-up

*.yosvu.cn sub-projects  <- SSO clients (each holding its own session)
  ├─ login button        -> redirect to IdP /sso/authorize
  └─ /sso/callback       -> receive token and hand it to its own server to verify
```

## Features

- **User page (`/user`)**: profile, linked social accounts, owned Yosvu projects (binding status auto-detected).
- **Admin page (`/admin`)**: user list / user detail (social bindings, metadata, activity), Clerk instance info.
- **SSO bridge**: `/sso/authorize` endpoint + `lib/sso.ts` shared-secret JWT sign/verify.
- **Login center**: `/sign-in`, `/sign-up` (Clerk-hosted UI).

## Local development

```bash
cp .env.local.example .env.local   # fill in your Clerk API Keys
npm install
npm run dev
```

> ⚠️ Real secrets (`CLERK_SECRET_KEY`, `YOSVU_SSO_SECRET`, etc.) should live only in **Vercel environment variables** and your local `.env.local` (gitignored) — **never** commit them.

## Deploy (Vercel)

```bash
vercel            # first time: link / create project
vercel --prod     # production deploy
```

Configure all variables from `.env.local.example` in the Vercel project env, and set `user.yosvu.cn` as the custom domain (configure CNAME in the Clerk Dashboard). The two SSO-related variables:

| Variable | Description |
|---|---|
| `YOSVU_SSO_SECRET` | Shared SSO secret (high-entropy random string). All clients use the same value. **Server-side only.** |
| `YOSVU_SSO_CLIENT_ORIGINS` | Allow-list of sub-project origins that may initiate SSO, comma-separated, must include protocol. Required in production. |

## Onboard a new sub-project

See [`skills/yosvu-sso-integration.md`](skills/yosvu-sso-integration.md) for the full multi-framework integration manual (security constraints, acceptance checklist, troubleshooting — ready for agents to call directly), and [`sso-kit/README.md`](sso-kit/README.md) for a quick start.

Short version — three pieces:

1. **Login entry** (frontend): redirect to `https://user.yosvu.cn/sso/authorize?redirect_uri=<sub-project/callback>&state=<random>`.
2. **Callback page** (frontend): read `token` from `location.hash` and `POST /api/sso/verify`.
3. **Verify endpoint** (server): verify with `YOSVU_SSO_SECRET` (`iss=https://user.yosvu.cn`, `aud=sub-project origin`, check `exp`); on success, set the sub-project's own session.

## License

[GNU Affero General Public License v3.0](LICENSE)
