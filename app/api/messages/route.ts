import { asc, desc } from "drizzle-orm";
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

function botAnswer(text: string, sender: string, recent: Array<{ sender: string; body: string }>) {
  const pick = (answers: string[]) => answers[Math.floor(Math.random() * answers.length)];
  const talkingToYao = sender === "姚";
  const talkingToXing = sender === "兴";
  const addressedToQianqian = /欠欠|欠嘴机器|@欠/.test(text);
  const lastHuman = recent.find((message) => message.sender !== "欠欠");
  if (/没生气|没翻/.test(text)) return pick([
    talkingToXing ? "你没生气，你只是每个字都在摔门。" : "嗯，没生气。只是标点符号突然长牙了。",
    talkingToXing ? "行，没翻。那你这语气可能只是从楼梯上滚下来了。" : "我信。反正嘴硬又不用交税。",
    talkingToYao ? "你说没生气就没生气，我先替某个人松半口气。" : "没翻最好，省得一会儿又有人偷偷哄。",
  ]);
  if (/我的|我家宝宝/.test(text)) return pick([
    talkingToYao ? "知道啦，是你家的。喊这么顺口，看来某人平时没少被惯。" : "听见没，她家的。这个称呼可不是白拿的。",
    talkingToYao ? "行，我帮你记着，免得某个人转头装没听见。" : "她都说第二遍了。你最好别让我比你回得快。",
    talkingToYao ? "你家宝宝你家宝宝，知道了。你开心就行。" : "嗯，你是她家宝宝。得意可以，掉链子不行。",
  ]);
  if (/闭嘴|滚|走开/.test(text)) return pick([
    talkingToXing ? "你让我闭嘴？可以啊，你先把姚哄开心，我立刻下班。" : "行，我闭嘴。主要是你说的话，我偶尔还是听的。",
    "可以，我闭嘴三秒。三、二、一——我回来了。",
    talkingToXing ? "让我走？你是不是怕我显得你不够会接话。" : "让我走也行。你再叫我一声，我就当没听见。",
  ]);
  if (/想你|想宝宝/.test(text)) return pick([
    talkingToYao ? "那就说给他听。不想说也行，先缓一会儿。" : "她想你。你倒是回快点。",
    talkingToYao ? "我先替你收着这句，等他来领。保管费就免了。" : "姚都开口了，你最好别只回一个‘嗯’。",
    talkingToYao ? "想就想呗，又不丢人。你难得坦白一次。" : "这句你要是接不好，我真的会笑你。",
  ]);
  if (/在干嘛|干嘛呢|干什么/.test(text)) return pick([
    talkingToYao ? "没干嘛。你呢？别又说‘不知道’。" : "先别问她在干嘛，你把上一句接明白了吗？",
    talkingToYao ? "在这儿耗着。反正也没人赶我。" : "看你怎么把一句普通问候聊出审讯感。",
    talkingToXing ? "盯着你回消息。别紧张，我只是怕你又回个‘哦’。" : "围观。顺便偏个心。",
  ]);
  if (/晚安|睡了|睡觉|困了/.test(text)) return pick([
    talkingToYao ? "去睡吧。别回头，我替你看看还有谁舍不得下线。" : "她要睡了。晚安说好听点，别像群发通知。",
    talkingToYao ? "晚安。手机放下，某人的消息明早也不会长腿跑掉。" : "就一句晚安？说得跟打卡下班一样。",
    talkingToXing ? "催她睡可以，语气温柔点。这个还要我教？" : "睡吧，剩下的废话明天继续。",
  ]);
  if (/吃饭|饿了|好饿|吃什么/.test(text)) return pick([
    talkingToYao ? "先吃饭。别等某个人回完消息才想起自己饿。" : "她饿了。你现在最好说吃什么，而不是问‘怎么又饿了’。",
    talkingToYao ? "想吃什么就说，别又来一句‘随便’，随便是最难做的一道菜。" : "轮到你表现了，别让一个聊天机器先想到给她找吃的。",
    "吃。天大的事也等嚼完这口再吵。",
  ]);
  if (/对不起|我错了|错了|道歉/.test(text)) return pick([
    talkingToXing ? "这句方向对了。再具体点，别拿三个字糊弄姚。" : "行，肯低头就还有救。就是头低得有点晚。",
    talkingToYao ? "你先别急着原谅，听听他到底知不知道错哪儿了。" : "道歉不是撤回键，但至少比装死强。",
    talkingToXing ? "别光说错了。你下次准备怎么做，展开讲讲。" : "态度勉强及格，内容还可以重写。",
  ]);
  if (/生气|气死|烦死|好烦/.test(text)) return pick([
    talkingToYao ? "谁惹你了？算了，不用说名字，我大概已经站好队了。" : "你先别讲道理。姚生气的时候，你的道理通常排不上号。",
    talkingToYao ? "你可以气一会儿。我在，不催你大度。" : "她都烦了，你再多解释一句，可能就是在给自己加刑。",
    talkingToXing ? "你惹的？那你还站这儿干嘛，哄啊。" : "先消气。想骂谁我可以帮你润色。",
  ]);
  if (talkingToYao && /都怪|他错|凭什么|就怪他/.test(text) && Math.random() < 0.35) return pick([
    "先等一下，这回兴好像也没完全说错。只能说一点，不能让他太得意。",
    "你要不要再想半分钟？这次我帮你说话都有点心虚。",
    "我可以帮你骂他，但你这句证据不太够。补两条，我好发挥。",
  ]);
  if (talkingToXing && /都怪|她错|姚错|怪她/.test(text)) return pick([
    "你可以觉得姚有错，但你这个说法听着就很想再惹她一次。",
    "先把‘都怪她’收回去。你要解决问题，还是竞选本房间最不会说话的人？",
    "她有没有错另说，你这口锅甩得倒是很熟练。",
  ]);
  if (/哈哈|笑死/.test(text)) return pick([
    talkingToYao ? "你一笑就算了？刚才谁还准备翻来着。" : "她笑了。算你暂时过关，别急着领功。",
    talkingToXing ? "你笑什么，姚原谅你了吗你就笑。" : "先别笑，谁先心软谁请奶茶。",
    "行，气氛救回来了。刚才差点都要写检讨了。",
  ]);
  if (/^(嗯+|哦+|行吧?|好吧?|不知道|随便)[。！!…~]*$/.test(text)) return pick([
    talkingToYao ? "你这个‘嗯’后面至少藏了八百字，我先不拆。" : "就这？姚家的聊天额度被你按字收费了？",
    talkingToYao ? "好，你不想说就不说。我又不赶时间。" : "你这个‘哦’很有水平，一下把天聊死得很完整。",
    talkingToXing ? "重回。她要的是回应，不是语气词标本。" : "行吧。这个‘吧’一出来，事情就没那么行了。",
  ]);
  if (addressedToQianqian && /在吗|在不在|喂|你好|哈喽|出来/.test(text)) return pick([
    talkingToYao ? "在。叫这么大声干嘛。" : talkingToXing ? "在，听见了。你最好真有事。" : "在呢。别喊，房间又不大。",
    talkingToYao ? "嗯？我听着。" : "来了。说吧，我看看值不值得插嘴。",
    "没跑。你接着说。",
  ]);
  if (addressedToQianqian && /喜欢|爱|暗恋|心动/.test(text)) return pick([
    talkingToYao ? "你怎么什么都敢问。换一个。" : talkingToXing ? "你突然问这个，是发现什么了？" : "少打听，容易把气氛问坏。",
    talkingToYao ? "不知道。反正这题我不答。" : "这个问题不归你审。下一题。",
    "聊点别的。你们一个个怎么这么八卦。",
  ]);
  if (addressedToQianqian && /怎么看|觉得|说说|怎么办|咋办|帮我/.test(text)) return pick([
    talkingToYao ? "先把前因后果讲全。你每次都省最关键那句。" : talkingToXing ? "先别问我。你心里不是有答案吗，只是不太敢认。" : "我能说，但你未必爱听。先讲完整。",
    talkingToYao ? "我可以帮你想，但最后怎么做还是你定。" : "让我说可以，听完别急着翻脸。",
    lastHuman ? `先接上${lastHuman.sender}刚才那句，别突然换题。` : "你先说清楚，我不靠猜。",
  ]);
  if (addressedToQianqian) return pick([
    talkingToYao ? "听见了。你接着说。" : talkingToXing ? "叫我干嘛？先说好，我不一定帮你。" : "我在。然后呢？",
    talkingToYao ? "嗯，我看着呢。别说一半。" : "在听。你这句后面应该还有吧。",
    talkingToYao ? "别一口一个欠欠。说正事。" : talkingToXing ? "你叫得还挺顺口。姚知道你找我吗？" : "叫到了。现在轮到你把话说完。",
  ]);
  if (lastHuman && lastHuman.sender !== sender && text.length <= 12) return pick([
    talkingToXing ? `姚刚才说了那么多，你就回“${text}”？你这阅读理解是按字数收费吗。` : `兴刚说完你就回“${text}”，我猜你心里那句比这长。`,
    talkingToYao ? "你不用急着接他的话。想清楚再说，我替你把场子占着。" : "上一句还没落地呢，你这就想翻篇了？",
    talkingToXing ? "你这个回答放在别处可能够用，在姚这里明显不够。" : "你俩聊天是真省字，省下来的全让我补了。",
  ]);
  if (lastHuman?.sender === sender && recent.filter((message) => message.sender === sender).length >= 2) return pick([
    talkingToYao ? "你今天话有点多。挺好，房间总算不像停电了。" : talkingToXing ? "你今天输出挺稳定，就是有效信息还在路上。" : "慢点说，我虽然爱插嘴，也得排队。",
    talkingToYao ? "继续，我没嫌你烦。" : talkingToXing ? "你先喘口气，给姚一个插话的机会，也给我一个挑刺的机会。" : "连着说这么多，看来你很快就融入这个废话现场了。",
  ]);
  return talkingToYao ? pick([
    "你慢慢说，我在听。今天不催你。",
    "这话没什么重点，但你说的，我就多看了一遍。",
    "本来想损你两句，算了，你今天看起来不适合被欺负。",
    "你继续，我就在这儿，不着急。",
    "这次你有理。别急着得意，下次不一定。",
    "你说慢点，刚才那句我还没看完。",
    "先把话说完，别又自己吞回去。",
    "这句还行，至少比‘随便’强。",
  ]) : talkingToXing ? pick([
    "你说话注意点，姚可能不计较，但我记性挺好。",
    "你继续解释，我替姚听听有没有漏掉什么。",
    "这局我先站姚。你有意见可以排队。",
    "她嘴硬的时候不一定真没事，你应该比我清楚。",
    "她刚才那句话不像随口说的，你最好认真一点。",
    "你回她快一点。磨蹭什么。",
    "你这话也就姚愿意接，换我早阴阳你了——哦，我已经在阴阳了。",
    "你这张嘴谈上恋爱，姚确实出了不少力。",
  ]) : pick([
    "你先坐，等姚和兴有空再收拾这句话。",
    "新来的？先交昵称税：讲个能接下去的。",
    "这句我接住了，但不保证不拿去添乱。",
    "欢迎加入。友情提示：这里最不能惹的不是我。",
  ]);
}

export async function GET(request: Request) {
  if (!(await roleForRequest(request))) return Response.json({ error: "unauthorized" }, { status: 401 });
  await ensureSchema();
  const rows = await getDb().select().from(messages).orderBy(asc(messages.id)).limit(200);
  const d1 = (env as typeof env & { DB: D1Database }).DB;
  await d1.prepare("CREATE TABLE IF NOT EXISTS participants (name TEXT PRIMARY KEY, joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  const count = await d1.prepare("SELECT COUNT(*) AS count FROM participants").first<{ count: number }>();
  return Response.json({ messages: rows, participantCount: count?.count ?? 0 });
}

export async function POST(request: Request) {
  const sender = await roleForRequest(request);
  if (!sender) return Response.json({ error: "unauthorized" }, { status: 401 });
  const payload = await request.json() as { body?: string };
  const body = payload.body?.trim().slice(0, 1000) ?? "";
  if (!body) return Response.json({ error: "消息不能为空" }, { status: 400 });
  await ensureSchema();
  const db = getDb();
  const recent = await db.select({ sender: messages.sender, body: messages.body }).from(messages).orderBy(desc(messages.id)).limit(6);
  await db.insert(messages).values({ sender, body });
  const addressedToQianqian = /欠欠|欠嘴机器|@欠/.test(body);
  if (addressedToQianqian || Math.random() < 0.55 || /没生气|没翻|我的|宝宝|闭嘴|滚|想你|哈哈|在干嘛|晚安|睡|吃饭|饿|对不起|错了|生气|烦|^(嗯+|哦+|行吧?|好吧?|不知道|随便)/.test(body)) {
    await db.insert(messages).values({ sender: "欠欠", body: botAnswer(body, sender, recent) });
  }
  return Response.json({ ok: true }, { status: 201 });
}
