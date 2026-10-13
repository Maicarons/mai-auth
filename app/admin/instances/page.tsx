import { clerkClient } from "@clerk/nextjs/server";

export default async function AdminInstances() {
  const env = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const instance = env.includes("pk_test") ? "Development" : env.includes("pk_live") ? "Production" : "未知";
  const domain = process.env.NEXT_PUBLIC_APP_URL ?? "—";

  return (
    <div className="card">
      <h3>实例信息</h3>
      <div className="row"><span>Clerk 实例类型</span><span>{instance}</span></div>
      <div className="row"><span>主域名 (Primary)</span><span className="muted">{domain}</span></div>
      <div className="row"><span>Publishable Key 前缀</span><span className="muted">{env.slice(0, 12) || "未配置"}…</span></div>
      <div className="notice" style={{ marginTop: 12 }}>
        所有 Satellite 子项目共用同一套 <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> 与 <code>CLERK_SECRET_KEY</code>。
        Satellite 在 <code>ClerkProvider</code> 上设置 <code>isSatellite</code> 并把 <code>signInUrl</code> 指回本域名即可接入。
      </div>
    </div>
  );
}
