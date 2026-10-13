import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { TopNav } from "@/components/TopNav";

export default function Home() {
  return (
    <main>
      <TopNav />
      <section className="hero">
        <h1>Yosvu 统一账户中心</h1>
        <p>一次登录，通行你在 yosvu.cn 旗下的所有项目。管理你的资料、社交绑定与已授权应用，全部集中在此。</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <SignedOut>
            <SignInButton mode="redirect"><a className="btn">登录</a></SignInButton>
            <SignUpButton mode="redirect"><a className="btn ghost">注册</a></SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/user" className="btn">进入我的账户</Link>
          </SignedIn>
        </div>
      </section>
      <div className="container">
        <div className="notice">
          这是 <b>Primary 登录中心</b>（Clerk 主域名）。所有 <code>*.yosvu.cn</code> 子项目都作为 Satellite 接入这里，
          用户体系、组织、OAuth 登录只在此配置一次，全站共享。
        </div>
      </div>
    </main>
  );
}
