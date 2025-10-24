import { z } from "better-auth";
import { auth } from "./auth";

export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session;

export interface Vars {
  Variables: {
    user: User | null;
    session: Session | null;
  };
}

export interface SpinResponse {
  result: { number: number; color: 'red' | 'black' | 'green' };
  totalWin: number;
  provablyFair: {
    clientSeed: string;
    serverSeedHash: string;
    nonce: number;
    hmac: string;
  };
}
