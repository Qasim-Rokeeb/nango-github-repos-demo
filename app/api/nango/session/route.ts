import { NextResponse } from "next/server";
import { getIntegrationId, getNangoClient } from "@/lib/nango";
import { getOrCreateDemoSessionId } from "@/lib/demo-session";

export async function POST() {
  try {
    const nango = getNangoClient();
    const integrationId = getIntegrationId();
    const demoUserId = getOrCreateDemoSessionId();

    // Create a short-lived Connect session token for the frontend.
    // Docs: https://nango.dev/docs/guides/auth/setup
    // Note: current Nango docs prefer `tags`; this uses `end_user` for
    // compatibility with the installed @nangohq/node SDK types.
    const { data } = await nango.createConnectSession({
      end_user: {
        id: demoUserId,
      },
      allowed_integrations: [integrationId],
    });

    return NextResponse.json({ sessionToken: data.token });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create connect session.";
    return NextResponse.json(
      { error: "Could not create Nango connect session.", details: message },
      { status: 500 },
    );
  }
}
