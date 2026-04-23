import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { ConnectPlatformsClient } from "./client";

const ConnectPlatformsPage = async () => {
  const user = await getCurrent();

  if (!user) {
    redirect("/sign-in");
  }

  return <ConnectPlatformsClient />;
};

export default ConnectPlatformsPage;
