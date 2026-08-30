import { roleForPassword, roleForRequest, sessionCookie } from "../_auth";
import { env } from "cloudflare:workers";

const reservedNames = new Set(["姚", "兴", "访客", "欠嘴机器"]);

async function registerParticipant(name: string) {
  const d1 = (env as typeof env & { DB: D1Database }).DB;
  await d1.prepare("CREATE TABLE IF NOT EXISTS participants (name TEXT PRIMARY KEY, joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await d1.prepare("INSERT OR IGNORE INTO participants (name) VALUES (?)").bind(name).run();
}

export async function GET(request: Request) {
  const role = await roleForRequest(request);
  return Response.json({ authenticated: Boolean(role), role });
}

export async function POST(request: Request) {
  const payload = await request.json() as { password?: string; nickname?: string };
  const role = payload.password ? await roleForPassword(payload.password) : null;
  if (!role) {
    return Response.json({ error: "密码不对。再想想，别让我笑你。" }, { status: 401 });
  }
  const nickname = payload.nickname?.trim().replace(/\s+/g, " ").slice(0, 16) ?? "";
  if (role === "访客" && (!nickname || reservedNames.has(nickname))) {
    return Response.json({ error: nickname ? "这个昵称被占用了，换一个。" : "访客需要先给自己起个昵称。", code: "nickname_required" }, { status: 400 });
  }
  const identity = role === "访客" ? nickname : role;
  await registerParticipant(identity);
  return new Response(JSON.stringify({ authenticated: true, role: identity }), {
    headers: { "content-type": "application/json", "set-cookie": await sessionCookie(role, nickname) },
  });
}
