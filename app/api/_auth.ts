import { env } from "cloudflare:workers";
export const COOKIE_NAME = "room_session";
export type RoomRole = "宝贝" | "张兴宇" | "别人";
function secrets() {
  const values = env as typeof env & { OWNER_PASSWORD?: string; ZHANG_PASSWORD?: string; GUEST_PASSWORD?: string };
  if (!values.OWNER_PASSWORD || !values.ZHANG_PASSWORD || !values.GUEST_PASSWORD) throw new Error("Room passwords are not configured");
  return [{ role: "宝贝" as const, password: values.OWNER_PASSWORD },{ role: "张兴宇" as const, password: values.ZHANG_PASSWORD },{ role: "别人" as const, password: values.GUEST_PASSWORD }];
}
async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`zhang-room:${value}`));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function roleForPassword(value: string): Promise<RoomRole | null> {
  for (const item of secrets()) if ((await digest(value)) === (await digest(item.password))) return item.role;
  return null;
}
export async function roleForRequest(request: Request): Promise<RoomRole | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  for (const item of secrets()) if (token === await digest(`${item.role}:${item.password}`)) return item.role;
  return null;
}
export async function sessionCookie(role: RoomRole) {
  const item = secrets().find((candidate) => candidate.role === role)!;
  return `${COOKIE_NAME}=${await digest(`${role}:${item.password}`)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`;
}
