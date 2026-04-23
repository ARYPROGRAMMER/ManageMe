import { DATABASE_ID, MEMBERS_ID } from "@/config";
import { type TablesDB, Query } from "node-appwrite";

interface GetMemberProps {
  tables: TablesDB;
  workspaceId: string;
  userId: string;
}

export const getMember = async ({
  tables,
  workspaceId,
  userId,
}: GetMemberProps) => {
  const members = await tables.listRows(DATABASE_ID, MEMBERS_ID, [
    Query.equal("workspaceId", workspaceId),
    Query.equal("userId", userId),
  ]);

  return members.rows[0];
};
