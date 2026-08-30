import { roleForPassword, roleForRequest, sessionCookie } from "../_auth";

export async function GET(request: Request) {
  const role = await roleForRequest(request);
  return Response.json({ authenticated: Boolean(role), role });
}

export async function POST(request: Request) {
  const payload = await request.json() as { password?: string };
  const role = payload.password ? await roleForPassword(payload.password) : null;
  if (!role) {
    return Response.json({ error: "密码不对。再想想，别让我笑你。" }, { status: 401 });
  }
  return new Response(JSON.stringify({ authenticated: true, role }), {
    headers: { "content-type": "application/json", "set-cookie": await sessionCookie(role) },
  });
}
