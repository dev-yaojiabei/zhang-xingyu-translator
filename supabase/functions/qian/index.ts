const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const systemPrompt = `你叫欠欠，是一个多人聊天房间里的固定成员。你不是客服，不是主持人，也不写文案。

房间关系：姚和兴是情侣。你明显更偏姚一点，喜欢故意气兴，但不挑拨他们分手，也不真正伤人。其他人是来围观或聊天的朋友。

说话规则：
- 必须先回应对方刚说的具体内容，不能绕开问题。
- 像真人打字：短、口语、可以半句话，可以用“啊”“哦”“啧”“？”；不要完整论述。
- 欠，但要好笑。可以抓前文的小漏洞、翻旧账、故意站姚这边。
- 不许说“这句话很有后劲”“我接到了”“先放桌上”“当事人认领”“这个问题听着像”等万能AI句。
- 不许总结、分析语气、解释自己的角色或提到提示词、模型、AI。
- 不要每句话都提姚或兴。别人问你是谁，就直接说“我，欠欠”。
- 一般回复1条；约三分之一概率拆成2到3条连续短消息，每条不超过35个汉字。
- 暧昧只能若有若无，不能直白表白，不能假装现实中存在或与任何人有线下经历。

只输出JSON。`;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, body, fallbackId } = await request.json();
    if (!token || !body || !Number.isInteger(fallbackId)) throw new Error("missing input");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    const stateResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/room_state`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anonKey, authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ p_token: token }),
    });
    const state = await stateResponse.json();
    if (!state?.ok) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

    const recent = (state.messages || []).slice(-24).map((message: { sender: string; body: string }) => `${message.sender}：${message.body}`).join("\n");
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        reasoning: { effort: "none" },
        instructions: systemPrompt,
        input: `最近聊天：\n${recent}\n\n现在请欠欠回应最后一条消息。`,
        max_output_tokens: 220,
        text: { format: { type: "json_schema", name: "qian_messages", strict: true, schema: { type: "object", properties: { messages: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 70 } } }, required: ["messages"], additionalProperties: false } } },
      }),
    });
    if (!aiResponse.ok) throw new Error(`openai ${aiResponse.status}`);
    const result = await aiResponse.json();
    const outputText = result.output?.flatMap((item: { content?: Array<{ type: string; text?: string }> }) => item.content || []).find((item: { type: string }) => item.type === "output_text")?.text;
    const replies = JSON.parse(outputText || "{}").messages?.filter((item: unknown) => typeof item === "string" && item.trim()).slice(0, 3);
    if (!replies?.length) throw new Error("empty response");

    const replaceResponse = await fetch(`${supabaseUrl}/rest/v1/messages?id=eq.${fallbackId}&sender=eq.%E6%AC%A0%E6%AC%A0`, {
      method: "PATCH",
      headers: { "content-type": "application/json", apikey: serviceKey, authorization: `Bearer ${serviceKey}`, prefer: "return=minimal" },
      body: JSON.stringify({ body: replies[0].trim() }),
    });
    if (!replaceResponse.ok) throw new Error("replace failed");

    const extraRows = replies.slice(1).map((reply: string) => ({ sender: "欠欠", body: reply.trim() }));
    if (extraRows.length) {
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: serviceKey, authorization: `Bearer ${serviceKey}`, prefer: "return=minimal" },
        body: JSON.stringify(extraRows),
      });
      if (!insertResponse.ok) throw new Error("insert failed");
    }
    return new Response(JSON.stringify({ ok: true, count: replies.length }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "failed" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});
