// yosvu 跨域 SSO 桥：由 user.yosvu.cn 充当 IdP。
// 用 HS256 对一个短期 JWT 签名，子项目拿到后用共享密钥验签并落自己的登录态。
// 不需要 Clerk Pro / Satellite —— 纯靠一个共享密钥完成跨域单点登录。
import { SignJWT, jwtVerify } from "jose";

const ISSUER = process.env.NEXT_PUBLIC_APP_URL || "https://user.yosvu.cn";

function getSecret(): Uint8Array {
  const s = process.env.YOSVU_SSO_SECRET;
  if (!s) throw new Error("YOSVU_SSO_SECRET is not set");
  return new TextEncoder().encode(s);
}

// 允许作为 SSO 客户端的回调 origin 白名单（逗号分隔，写全 origin 含协议）。
// 留空 = 开发期放行所有 https/http（生产务必填全）。
export function getClientOrigins(): string[] {
  const raw = process.env.YOSVU_SSO_CLIENT_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const origins = getClientOrigins();
    if (origins.length === 0) return true; // 未配置时放行（仅开发期）
    return origins.includes(url.origin);
  } catch {
    return false;
  }
}

export type SsoClaims = {
  sub: string;
  email?: string;
  name?: string;
  imageUrl?: string;
  providers: string[];
  state?: string;
};

// IdP 侧签发：audience 固定为目标子项目的 origin，杜绝 token 被其它客户端复用。
export async function signSsoToken(
  claims: SsoClaims,
  audience: string,
  ttlSeconds = 300
): Promise<string> {
  return await new SignJWT({
    email: claims.email,
    name: claims.name,
    image_url: claims.imageUrl,
    providers: claims.providers,
    state: claims.state,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecret());
}

// 子项目侧验签：必须传自己的 origin 作为 expectedAudience，并校验 issuer/exp。
export async function verifySsoToken(token: string, expectedAudience: string) {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: expectedAudience,
  });
  return payload as {
    sub: string;
    email?: string;
    name?: string;
    image_url?: string;
    providers?: string[];
    state?: string;
    iss: string;
    aud: string | string[];
    exp: number;
    iat: number;
  };
}
