// yosvu 旗下项目总表（Master Catalog）。
// 未来接入真实数据库时，把这里换成查询即可，页面无需改动。
export type YosvuProject = {
  id: string;
  name: string;
  desc: string;
  domain: string;
  path?: string; // 路径前缀（用于跳转）
  // 该项目登录所依赖的社交 provider；用户若已关联该 provider 即视为“已绑定”
  linkedProvider?: string;
  status: "online" | "beta" | "coming";
};

export const YOSVU_PROJECTS: YosvuProject[] = [
  {
    id: "flutter-yosvu",
    name: "Flutter 组件库",
    desc: "yosvu Flutter 通用组件与模板站",
    domain: "https://flutter.yosvu.cn",
    linkedProvider: undefined,
    status: "online",
  },
  {
    id: "yoscn-site",
    name: "YOSCN 官网",
    desc: "yosvu 中文社区门户",
    domain: "https://yoscn.yosvu.cn",
    status: "online",
  },
  {
    id: "blog",
    name: "Yosvu 博客",
    desc: "技术分享与更新日志",
    domain: "https://blog.yosvu.cn",
    status: "beta",
  },
  {
    id: "studio",
    name: "Yosvu Studio",
    desc: "AI 创作工作台（内测）",
    domain: "https://studio.yosvu.cn",
    status: "beta",
  },
  {
    id: "github",
    name: "GitHub 关联",
    desc: "通过 GitHub 账号联动开发者权限",
    domain: "https://github.com/maicarons",
    linkedProvider: "github",
    status: "online",
  },
  {
    id: "google",
    name: "Google 关联",
    desc: "通过 Google 账号单点登录",
    domain: "https://user.yosvu.cn",
    linkedProvider: "google",
    status: "online",
  },
];

// 判断某一项目对当前用户是否已“绑定/可访问”
export function isProjectBound(p: YosvuProject, ctx: {
  providers: string[];        // 用户已关联的社交 provider
  accessibleProjectIds: string[]; // 用户在 publicMetadata.projects 中显式授权的项目
}): boolean {
  if (ctx.accessibleProjectIds.includes(p.id)) return true;
  if (p.linkedProvider && ctx.providers.includes(p.linkedProvider)) return true;
  // 没有强制绑定 provider 的内部项目，登录即视为可用
  if (!p.linkedProvider) return true;
  return false;
}
