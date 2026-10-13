import { currentUser, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { YOSVU_PROJECTS, isProjectBound } from "@/lib/projects";

export default async function UserDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/user");

  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/user");

  // 已关联的社交登录方式（来自 Clerk externalAccounts）
  const linkedProviders = (user.externalAccounts ?? [])
    .map((a) => a.provider)
    .filter(Boolean) as string[];

  const accessMeta = (user.publicMetadata?.projects ?? []) as string[];

  const projects = YOSVU_PROJECTS.map((p) => ({
    ...p,
    bound: isProjectBound(p, { providers: linkedProviders, accessibleProjectIds: accessMeta }),
  }));

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "未命名用户";

  return (
    <main>
      <TopNav />
      <div className="container">
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>我的账户</h1>
        <p className="muted">查看你的资料、已绑定社交账号与已授权的 Yosvu 项目。</p>

        <div className="card">
          <h3>基本信息</h3>
          <div className="row"><span>用户 ID</span><span className="muted">{user.id}</span></div>
          <div className="row"><span>昵称</span><span>{fullName}</span></div>
          <div className="row"><span>用户名</span><span className="muted">{user.username ?? "—"}</span></div>
          <div className="row"><span>邮箱</span><span className="muted">{user.emailAddresses[0]?.emailAddress ?? "—"}</span></div>
          <div className="row"><span>手机号</span><span className="muted">{user.phoneNumbers[0]?.phoneNumber ?? "—"}</span></div>
          <div className="row"><span>注册时间</span><span className="muted">{user.createdAt ? new Date(user.createdAt).toLocaleString("zh-CN") : "—"}</span></div>
        </div>

        <div className="card">
          <h3>已绑定的社交账户（{linkedProviders.length}）</h3>
          {linkedProviders.length === 0 ? (
            <p className="muted">你还没有绑定任何社交账号。可在下方或 Clerk 资料页添加第三方登录。</p>
          ) : (
            linkedProviders.map((p) => (
              <div className="row" key={p}>
                <span style={{ textTransform: "capitalize" }}>{p}</span>
                <span className="pill ok">已绑定</span>
              </div>
            ))
          )}
          <div style={{ marginTop: 14 }}>
            <a
              className="btn ghost"
              href="https://user.yosvu.cn/user?legacy=/account"
              target="_blank"
              rel="noreferrer"
            >
              在 Clerk 管理社交绑定
            </a>
          </div>
        </div>

        <div className="card">
          <h3>已授权的 Yosvu 项目（{projects.filter((p) => p.bound).length}/{projects.length}）</h3>
          <div className="grid">
            {projects.map((p) => (
              <div className="proj" key={p.id}>
                <div className="name">{p.name}</div>
                <div className="desc">{p.desc}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className={`tag`}>{p.status}</span>
                  {p.bound ? (
                    <span className="pill ok">已绑定</span>
                  ) : (
                    <span className="pill warn">待绑定</span>
                  )}
                </div>
                <a
                  className="btn"
                  href={p.domain}
                  target="_blank"
                  rel="noreferrer"
                  style={p.bound ? undefined : { opacity: 0.5 }}
                >
                  打开
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
