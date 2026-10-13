import Link from "next/link";
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

export function TopNav() {
  return (
    <nav className="navbar">
      <Link href="/" className="brand">yosvu · 账户中心</Link>
      <div className="links">
        <Link href="/">首页</Link>
        <SignedIn>
          <Link href="/user">我的账户</Link>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="redirect">
            <a className="btn ghost">登录</a>
          </SignInButton>
          <SignUpButton mode="redirect">
            <a className="btn">注册</a>
          </SignUpButton>
        </SignedOut>
      </div>
    </nav>
  );
}
