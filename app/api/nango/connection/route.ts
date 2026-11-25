import { NextResponse } from "next/server";
import { getIntegrationId } from "@/lib/nango";
import { clearDemoConnection, getDemoConnection, setDemoConnection } from "@/lib/demo-session";

export async function GET() {
  const connection = getDemoConnection();
  return NextResponse.json({
    connected: Boolean(connection),
    connection: connection
      ? {
          // Return only non-sensitive display info. Connection ID is not exposed.
          providerConfigKey: connection.providerConfigKey,
          createdAt: connection.createdAt,
        }
      : null,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      connectionId?: unknown;
      providerConfigKey?: unknown;
    };

    const connectionId =
      typeof body.connectionId === "string" ? body.connectionId.trim() : "";
    const providerConfigKey =
      typeof body.providerConfigKey === "string" ? body.providerConfigKey.trim() : "";

    if (!connectionId || !providerConfigKey) {
      return NextResponse.json(
        { error: "Missing connectionId or providerConfigKey." },
        { status: 400 },
      );
    }

    const expectedIntegrationId = getIntegrationId();
    if (providerConfigKey !== expectedIntegrationId) {
      return NextResponse.json(
        { error: "Unexpected integration for this demo." },
        { status: 400 },
      );
    }

    // Store the connection for this local demo session only.
    // Do NOT trust arbitrary client-supplied connection IDs in a real app;
    // bind connections to authenticated users and verify ownership server-side.
    setDemoConnection({
      connectionId,
      providerConfigKey,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json(
      { error: "Could not store demo connection.", details: message },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  clearDemoConnection();
  return NextResponse.json({ ok: true });
}
