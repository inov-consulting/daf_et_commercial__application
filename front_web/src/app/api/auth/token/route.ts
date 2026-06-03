import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.username || !body?.password) {
    return NextResponse.json(
      { error: "username et password sont requis" },
      { status: 400 },
    );
  }

  const { username, password } = body as { username: string; password: string };

  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET; // server-only, jamais exposé

  if (!keycloakUrl || !realm || !clientId) {
    return NextResponse.json(
      { error: "Configuration Keycloak manquante côté serveur" },
      { status: 500 },
    );
  }

  const params: Record<string, string> = {
    grant_type: "password",
    client_id: clientId,
    username,
    password,
  };
  if (clientSecret) params.client_secret = clientSecret;

  const kcRes = await fetch(
    `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    },
  );

  const data = await kcRes.json();

  if (!kcRes.ok) {
    return NextResponse.json(
      { error: data.error_description ?? "Identifiants invalides" },
      { status: kcRes.status },
    );
  }

  return NextResponse.json(data);
}
