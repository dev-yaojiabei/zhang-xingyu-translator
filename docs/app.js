const config = window.ROOM_CONFIG;
const app = document.querySelector("#app");
let role = null;
let token = localStorage.getItem("room_token") || "";
let messages = [];
let participantCount = 0;
let timer;
let draft = "";

async function rpc(name, params) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: config.anonKey, authorization: `Bearer ${config.anonKey}` },
    body: JSON.stringify(params)
  });
  if (!response.ok) throw new Error("连接失败");
  return response.json();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

function gate(error = "", nicknameNeeded = false) {
  clearInterval(timer);
  app.innerHTML = `<section class="gate"><div class="gate-icon">欠</div><p class="eyebrow">仅限知道密码的人</p><h1>张兴宇翻译器</h1><p class="gate-copy">门锁换好了。拿链接和密码进来，别在门口装路人。</p><form id="login-form"><input id="password" type="password" inputmode="numeric" placeholder="输入密码" aria-label="房间密码" required>${nicknameNeeded ? '<input id="nickname" maxlength="16" placeholder="访客昵称" aria-label="访客昵称" required>' : ''}<button>进去</button></form>${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}<p class="privacy">姚和兴使用各自密码；访客使用公共密码后输入昵称。</p></section>`;
  document.querySelector("#login-form").addEventListener("submit", login);
}

async function login(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  try {
    const data = await rpc("room_login", { p_password: document.querySelector("#password").value, p_nickname: document.querySelector("#nickname")?.value || null });
    if (!data.ok) return gate(data.error, data.code === "nickname_required");
    role = data.role; token = data.token; localStorage.setItem("room_token", token);
    await load(); timer = setInterval(load, 2000);
  } catch { gate("门好像卡住了，等两秒再试。", Boolean(document.querySelector("#nickname"))); }
}

async function load() {
  try {
    const data = await rpc("room_state", { p_token: token });
    if (!data.ok) { localStorage.removeItem("room_token"); token = ""; return gate(data.error); }
    const messageInput = document.querySelector("#message");
    if (messageInput) draft = messageInput.value;
    role = data.role; messages = data.messages || []; participantCount = data.participantCount || 0;
    if (document.querySelector(".phone")) return refreshRoom();
    room();
  } catch {
    const notice = document.querySelector(".notice");
    if (notice) notice.textContent = "信号打了个喷嚏，正在重连…";
  }
}

function messageRows() {
  return messages.map(message => `<div class="row ${message.sender === role ? "you" : "bot"}">${message.sender !== role ? `<div class="mini-avatar sender-${escapeHtml(message.sender)}">${message.sender === "欠欠" ? "欠" : escapeHtml(message.sender.slice(0,1))}</div>` : ""}<div><div class="sender-name">${message.sender === role ? "你" : escapeHtml(message.sender)}</div><div class="bubble">${escapeHtml(message.body)}</div></div></div>`).join("");
}

function refreshRoom() {
  const count = document.querySelector("#participant-count");
  if (count) count.textContent = String(participantCount);
  const chat = document.querySelector(".chat");
  if (chat) chat.innerHTML = `<div class="day">废话现场</div>${messageRows() || '<div class="empty">还没人说话。你先来，别怂。</div>'}<div id="bottom"></div>`;
  document.querySelector("#bottom")?.scrollIntoView({block:"end"});
}

function room() {
  const rows = messageRows();
  app.innerHTML = `<section class="phone" aria-label="共享聊天室"><header class="topbar"><div class="avatar">欠</div><div class="identity"><h1>张兴宇翻译器</h1><p><span class="dot"></span> 房间人数：<span id="participant-count">${participantCount}</span></p></div><div class="status">你是：${escapeHtml(role)}</div></header><div class="notice">密码决定身份 · 消息每两秒同步 · 欠欠一直在</div><div class="chat" aria-live="polite"><div class="day">废话现场</div>${rows || '<div class="empty">还没人说话。你先来，别怂。</div>'}<div id="bottom"></div></div><form class="composer" id="send-form"><input id="message" value="${escapeHtml(draft)}" placeholder="以‘${escapeHtml(role)}’的身份说点什么…" maxlength="1000" autocomplete="off"><button>发送</button></form></section><button class="about" id="about-qian" aria-label="关于欠欠">关于欠欠</button>`;
  document.querySelector("#send-form").addEventListener("submit", send);
  document.querySelector("#message").addEventListener("input", event => { draft = event.target.value; });
  document.querySelector("#about-qian").addEventListener("click", () => alert("欠欠是这个房间里的自动回复角色。他有自己的脾气，但不是真人在另一端打字。"));
  document.querySelector("#bottom")?.scrollIntoView({block:"end"});
}

async function send(event) {
  event.preventDefault();
  const input = document.querySelector("#message");
  const body = input.value.trim();
  if (!body) return;
  draft = "";
  input.value = "";
  input.blur();
  try {
    const sent = await rpc("room_send", { p_token: token, p_body: body });
    await load();
    if (sent.askQian) askQian(body);
  }
  catch {
    draft = body;
    input.value = body;
    const notice = document.querySelector(".notice");
    if (notice) notice.textContent = "刚才没发出去，再点一次。";
  }
}

async function askQian(body) {
  const notice = document.querySelector(".notice");
  if (notice) notice.textContent = "欠欠正在打字…";
  try {
    const response = await fetch(`${config.supabaseUrl}/functions/v1/qian`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: config.anonKey, authorization: `Bearer ${config.anonKey}` },
      body: JSON.stringify({ token, body })
    });
    if (!response.ok) throw new Error("qian unavailable");
  } catch {
    await rpc("room_qian_fallback", { p_token: token, p_body: body });
  }
  await load();
  const currentNotice = document.querySelector(".notice");
  if (currentNotice) currentNotice.textContent = "密码决定身份 · 消息每两秒同步 · 欠欠一直在";
}

if (!config?.supabaseUrl || config.supabaseUrl.startsWith("__")) app.innerHTML = '<div class="checking">聊天室还差最后一根网线。</div>';
else if (token) load().then(() => { if (token) timer = setInterval(load, 2000); });
else gate();
