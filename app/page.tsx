import { Workspace } from "@/components/workspace/Workspace";
import customersData from "@/data/customers.json";
import commentsData from "@/data/comments.json";
import usersData from "@/data/users.json";
import workspaceData from "@/data/workspace.json";
import {
  customersSchema,
  commentsSchema,
  appUsersSchema,
  workspaceSchema,
} from "@/lib/schema";

export default function Page() {
  const custResult = customersSchema.safeParse(customersData);
  const commResult = commentsSchema.safeParse(commentsData);
  const usersResult = appUsersSchema.safeParse(usersData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (!custResult.success || !commResult.success || !usersResult.success || !wsResult.success) {
    const errors = [
      !custResult.success &&
        `customers.json: ${custResult.error.issues[0]?.message}`,
      !commResult.success &&
        `comments.json: ${commResult.error.issues[0]?.message}`,
      !usersResult.success &&
        `users.json: ${usersResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <Workspace
      initialCustomers={custResult.data}
      initialComments={commResult.data}
      initialUsers={usersResult.data}
      workspace={wsResult.data}
    />
  );
}
