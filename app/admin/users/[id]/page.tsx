import { clerkClient } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AdminUserDetail({ params }: { params: { id: string } }) {
  const client = await clerkClient();
  let user;
  try {
    user = await client.users.getUser(params.id);
  } catch {
    notFound();
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "未命名";
  const providers = (user.externalAccounts ?? []).map((a) => ({
    provider: a.provider,
    email: a.emailAddress,
    username: a.username,
  }));
  const meta = user.publicMetadata ?? {};
  const privateMeta = user.privateMetadata ?? {};

  return (
    <>
      <Link href="/admin" className="muted">← 返回用户列表</Link>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>用户详情</h3>
        <div className="row"><span>User ID</span><span className="muted">{user.id}</span></div>
        <div className="row"><span>昵称</span><span>{name}</span></div>
        <div className="row"><span>用户名</span><span className="muted">{user.username ?? "—"}</span></div>
        <div className="row"><span>邮箱</span><span className="muted">{user.emailAddresses[0]?.emailAddress ?? "—"}</span></div>
        <div className="row"><span>手机号</span><span className="muted">{user.phoneNumbers[0]?.phoneNumber ?? "—"}</span></div>
        <div className="row"><span>角色 (publicMetadata.role)</span><span className="pill">{(meta.role as string) || "user"}</span></div>
        <div className="row"><span>注册时间</span><span className="muted">{user.createdAt ? new Date(user.createdAt).toLocaleString("zh-CN") : "—"}</span></div>
        <div className="row"><span>最后活跃</span><span className="muted">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString("zh-CN") : "—"}</span></div>
      </div>

      <div className="card">
        <h3>已绑定社交账户（{providers.length}）</h3>
        {providers.length === 0 ? (
          <p className="muted">无</p>
        ) : (
          providers.map((p, i) => (
            <div className="row" key={i}>
              <span style={{ textTransform: "capitalize" }}>{p.provider}</span>
              <span className="muted">{p.email || p.username || "—"}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>元数据 (Metadata)</h3>
        <div className="row"><span>publicMetadata</span></div>
        <pre className="muted" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(meta, null, 2)}</pre>
        <div className="row"><span>privateMetadata</span></div>
        <pre className="muted" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(privateMeta, null, 2)}</pre>
      </div>
    </>
  );
}
