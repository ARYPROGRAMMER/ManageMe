import { Query } from "node-appwrite";
import { DATABASE_ID, MEMBERS_ID, WORKSPACES_ID } from "@/config";
import { createSessionClient } from "@/lib/appwrite";

export const getWorkspaces = async () => {
  const { tables, account } = await createSessionClient();

  const user = await account.get();

  const members = await tables.listRows(DATABASE_ID, MEMBERS_ID, [
    Query.equal("userId", user.$id),
  ]);

  if (members.total === 0) {
    return { rows: [], total: 0 };
  }
  const workspaceIds = members.rows.map((member) => member.workspaceId);

  const workspaces = await tables.listRows(DATABASE_ID, WORKSPACES_ID, [
    Query.orderDesc("$createdAt"),
    Query.contains("$id", workspaceIds),
  ]);

  return workspaces;
};

