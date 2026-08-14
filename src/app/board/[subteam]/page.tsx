import { SUBTEAMS, type Subteam } from "@/types";
import { SubteamBoardClient } from "./subteam-board-client";

// output: "export" requires every possible value of the dynamic segment to
// be known at build time — there's no server to resolve arbitrary ones.
export function generateStaticParams() {
  return SUBTEAMS.map((subteam) => ({ subteam }));
}

export default async function SubteamBoardPage({
  params,
}: {
  params: Promise<{ subteam: string }>;
}) {
  const { subteam } = await params;
  return <SubteamBoardClient subteam={subteam as Subteam} />;
}
