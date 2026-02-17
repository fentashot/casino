import { createAuthClient } from "better-auth/client";
const authClient = createAuthClient();

export const { signIn, signUp, signOut, getSession } = authClient;
