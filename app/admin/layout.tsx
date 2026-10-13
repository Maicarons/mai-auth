import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";

function isAdmin(userId: string | null | undefined, role?: string) {
  if (role === "admin") return true;
  const ids = (process.env.CLERK_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return !!userId && ids.includes(userId);
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/admin");
  if (!isAdmin(user.id, user.publicMetadata?.role as string | undefined)) {
    return (
      <main>
        <TopNav />
        <div className="container">
          <div className="card">
            <h3>无权访问</h3>
            <p className="muted">你不是管理员。如需开通管理后台，请让现有管理员把你的 User ID 加入 <code>CLERK_ADMIN_USER_IDS</code>，或在 Clerk 后台把你的 <code>publicMetadata.role</code> 设为 <code>admin</code>。</p>
            <p className="muted">你的 User ID：<code>{user.id}</code></p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <TopNav />
      <div className="container">
        <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>管理员后台</h1>
          <span className="muted">用户系统管理</span>
        </div>
        <div className="links" style={{ marginBottom: 16 }}>
          <Link href="/admin">用户列表</Link>
          <Link href="/admin/instances">实例信息</Link>
        </div>
        {children}
      </div>
    </main>
  );
}
