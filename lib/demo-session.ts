import { cookies } from "next/headers";
import { randomUUID } from "crypto";

/**
 * DEMO-ONLY local session store.
 *
 * Limitation: this is in-memory and has no real user authentication or
 * persistent ownership checks. It prevents arbitrary client-supplied
 * connection IDs from being used by API routes in this local demo, but it is
 * NOT suitable for a secure public multi-user application. In production, bind
 * Nango connections to authenticated users/tenants in your own database and
 * verify ownership on every request.
 */
type DemoConnection = {
  connectionId: string;
  providerConfigKey: string;
  createdAt: string;
};

const SESSION_COOKIE = "nango_demo_session";
const demoConnections = new Map<string, DemoConnection>();

export function getOrCreateDemoSessionId() {
  const cookieStore = cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return id;
}

export function getDemoSessionId() {
  return cookies().get(SESSION_COOKIE)?.value;
}

export function setDemoConnection(connection: DemoConnection) {
  const sessionId = getOrCreateDemoSessionId();
  demoConnections.set(sessionId, connection);
}

export function getDemoConnection() {
  const sessionId = getDemoSessionId();
  if (!sessionId) return undefined;
  return demoConnections.get(sessionId);
}

export function clearDemoConnection() {
  const sessionId = getDemoSessionId();
  if (sessionId) demoConnections.delete(sessionId);
}
