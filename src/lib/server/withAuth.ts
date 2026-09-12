import { NextRequest, NextResponse } from "next/server";
import { getBearerUserId } from "./auth";

export type AuthedHandler = (req: NextRequest, userId: string) => Promise<NextResponse>;

export function withAuth(handler: AuthedHandler): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const userId = getBearerUserId(req.headers.get("authorization"));
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return handler(req, userId);
  };
}
