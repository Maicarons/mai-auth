// GET /sso/authorize?redirect_uri=https://子项目/callback&state=xxx
// IdP 侧：校验用户已登录（Clerk）→ 校验 redirect_uri 白名单 →
// 签发 audience=子项目origin 的短期 JWT → 302 跳转回 redirect_uri#token=xxx
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAllowedRedirectUri, signSsoToken } from "@/lib/sso";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const redirectUri = searchParams.get("redirect_uri") || "";
  const state = searchParams.get("state") || "";

  if (!redirectUri || !isAllowedRedirectUri(redirectUri)) {
    return new NextResponse(
      "invalid redirect_uri (not in YOSVU_SSO_CLIENT_ORIGINS)",
      { status: 400 }
    );
  }

  const user = await currentUser();
  if (!user) {
    // 未登录：先去 Clerk 登录，回来带上同样的参数
    const signInUrl = new URL("/sign-in", origin);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  const targetOrigin = new URL(redirectUri).origin;
  const token = await signSsoToken(
    {
      sub: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      imageUrl: user.imageUrl,
      providers: user.externalAccounts.map((a) => a.provider),
      state,
    },
    targetOrigin
  );

  const back = new URL(redirectUri);
  back.hash = `token=${token}`;
  return NextResponse.redirect(back);
}
