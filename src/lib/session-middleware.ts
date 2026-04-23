import "server-only";
import { AUTH_COOKIE } from "@/features/auth/constants";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

import {
  Account,
  Client, TablesDB,
  Storage,
  type Account as AccountType, type TablesDB as TablesDBType,
  type Storage as StorageType,
  type Users as UsersType,
  Models
} from "node-appwrite";

type AdditionalContext = {
  Variables: {
    account: AccountType;
    tables: TablesDBType; 
    storage: StorageType;
    users: UsersType;
    user: Models.User<Models.Preferences>;
  };
};

export const sessionMiddleware = createMiddleware<AdditionalContext>(
  async (c, next) => {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

    const cookie = getCookie(c, AUTH_COOKIE);

    if (!cookie) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    client.setSession(cookie);

    const account = new Account(client);
    const tables = new TablesDB(client);
    const storage = new Storage(client);

    const user = await account.get();

    c.set("account", account);
    c.set("tables", tables);
    c.set("storage", storage);
    c.set("user", user);

    await next();
  }
);
