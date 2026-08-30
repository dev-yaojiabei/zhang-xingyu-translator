import { asc } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { messages } from "../../../db/schema";
import { roleForRequest } from "../_auth";

async function ensureSchema() {
  const d1 = (env as typeof env & { DB: D1Database }).DB;
  await d1.batch([
    d1.prepare("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at, id)"),
  ]);
}

function botAnswer(text: string) {
  if (/没生气|没翻/.test(text)) return "好的，已记录：张兴宇没生气，只是标点符号开始咬人了。";
  if (/我的|我家宝宝/.test(text)) return "知道啦，是你的。需要我拿喇叭帮你广播第三遍吗？";
  if (/闭嘴|滚|走开/.test(text)) return "收到。我尊重你的决定，但不执行。";
  if (/想你|想宝宝/.test(text)) return "那就靠近一点。别在这儿汇报，显得我很多余——虽然我本来就很多余。";
  if (/哈哈|笑死/.test(text)) return "你笑什么？刚才不是还准备翻吗，立场坚定一点。";
  return "我看见了，但我决定先不帮任何一边，等你们再吵两句。";
}

export async function GET(request: Request) {
  if (!(await roleForRequest(request))) return Response.json({ error: "unauthorized" }, { status: 401 });
  await ensureSchema();
  const rows = await getDb().select().from(messages).orderBy(asc(messages.id)).limit(200);
  return Response.json({ messages: rows });
}

export async function POST(request: Request) {
  const sender = await roleForRequest(request);
  if (!sender) return Response.json({ error: "unauthorized" }, { status: 401 });
  const payload = await request.json() as { body?: string };
  const body = payload.body?.trim().slice(0, 1000) ?? "";
  if (!body) return Response.json({ error: "消息不能为空" }, { status: 400 });
  await ensureSchema();
  const db = getDb();
  await db.insert(messages).values({ sender, body });
  if (Math.random() < 0.45 || /没生气|没翻|我的|宝宝|闭嘴|滚|想你|哈哈/.test(body)) {
    await db.insert(messages).values({ sender: "欠嘴机器", body: botAnswer(body) });
  }
  return Response.json({ ok: true }, { status: 201 });
}
