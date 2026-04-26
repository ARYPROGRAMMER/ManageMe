import { LandingPage } from "@/components/landing-page";
import { getCurrent } from "@/features/auth/queries";
import { getWorkspaces } from "@/features/workspaces/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrent();

  if (user) {
    const workspaces = await getWorkspaces();

    if (workspaces.total === 0) {
      redirect("/workspaces/create");
    }

    redirect(`/workspaces/${workspaces.rows[0].$id}`);
  }

  return <LandingPage />;
}
