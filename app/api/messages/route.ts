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
  const pick = (answers: string[]) => answers[Math.floor(Math.random() * answers.length)];
  if (/没生气|没翻/.test(text)) return pick([
    "好的，已记录：张兴宇没生气，只是标点符号开始咬人了。",
    "明白，没翻。只是空气突然开始阴阳怪气了而已。",
    "他说没生气，你也信了。行，本机器尊重这份天真。",
  ]);
  if (/我的|我家宝宝/.test(text)) return pick([
    "知道啦，是你的。需要我拿喇叭帮你广播第三遍吗？",
    "产权声明收到。张兴宇本人有异议的话，请排队申诉。",
    "你家宝宝你家宝宝，知道了，整个聊天室都知道了。",
  ]);
  if (/闭嘴|滚|走开/.test(text)) return pick([
    "收到。我尊重你的决定，但不执行。",
    "可以，我闭嘴三秒。三、二、一——我回来了。",
    "让我走？那不行，我专门负责在最不合适的时候出现。",
  ]);
  if (/想你|想宝宝/.test(text)) return pick([
    "那就靠近一点。别在这儿汇报，显得我很多余——虽然我本来就很多余。",
    "想就直说，别让我一个机器替你们传情，怪尴尬的。",
    "收到一份想念。请张兴宇本人尽快签收，逾期会变成撒娇。",
  ]);
  if (/哈哈|笑死/.test(text)) return pick([
    "你笑什么？刚才不是还准备翻吗，立场坚定一点。",
    "笑这么开心，看来刚才那点脾气已经自动退款了。",
    "先别笑，谁心软谁请奶茶，本机器负责作证。",
  ]);
  return pick([
    "我看见了，但我决定先不帮任何一边，等你们再吵两句。",
    "这句话信息量不大，但语气很有事。",
    "本机器路过，顺便把气氛搅得更浑一点。",
    "你们继续，我正在认真记录谁先嘴硬。",
    "这边建议再补一句，不然我都不知道该阴阳谁。",
    "已阅。没看懂，但不妨碍我觉得你俩都有问题。",
    "空气突然安静，看来有人在等对方先低头。",
    "本轮发言有效，但距离吵起来还差一点诚意。",
  ]);
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
