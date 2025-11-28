import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, OrganizationMember } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getOrganizationMemberByUserId } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  organizationMember: OrganizationMember | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let organizationMember: OrganizationMember | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    
    // Si el usuario está autenticado, obtener su membership
    if (user) {
      organizationMember = await getOrganizationMemberByUserId(user.id) || null;
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
    organizationMember = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    organizationMember,
  };
}
