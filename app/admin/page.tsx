import { clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams?.page ?? "1", 10) || 1;
  const client = await clerkClient();
  const { data: users, totalCount } = await client.users.getUserList({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    orderBy: "-created_at",
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <>
      <div className="card">
        <h3>用户总数：{totalCount}</h3>
        {users.map((u) => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "未命名";
          const providers = (u.externalAccounts ?? []).map((a) => a.provider).filter(Boolean);
          const role = (u.publicMetadata?.role as string) || "user";
          return (
            <div className="row" key={u.id}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span>{name} <span className="muted">({u.username ?? u.id})</span></span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {u.emailAddresses[0]?.emailAddress ?? "—"}
                  {providers.length > 0 && " · 绑定: " + providers.join(", ")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`pill ${role === "admin" ? "ok" : ""}`}>{role}</span>
                <Link className="btn ghost" href={`/admin/users/${u.id}`}>详情</Link>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {page > 1 && <Link className="btn ghost" href={`/admin?page=${page - 1}`}>上一页</Link>}
        <span className="muted">第 {page} / {totalPages} 页</span>
        {page < totalPages && <Link className="btn ghost" href={`/admin?page=${page + 1}`}>下一页</Link>}
      </div>
    </>
  );
}
