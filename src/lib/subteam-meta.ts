import type { Subteam } from "@/types";

export const SUBTEAM_META: Record<Subteam, { label: string; color: string }> = {
  mechanical: { label: "Mechanical", color: "var(--mech)" },
  electrical: { label: "Electrical", color: "var(--elec)" },
  programming: { label: "Programming", color: "var(--prog)" },
  cad: { label: "CAD / Design", color: "var(--cad)" },
  outreach: { label: "Outreach", color: "var(--outreach)" },
  finance: { label: "Finance", color: "var(--finance)" },
};
