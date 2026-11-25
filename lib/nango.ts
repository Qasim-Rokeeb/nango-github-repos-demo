import { Nango } from "@nangohq/node";

export function getNangoClient() {
  // Current Nango docs use NANGO_API_KEY; older SDKs used secretKey.
  // Support both env names for local compatibility.
  const apiKey = process.env.NANGO_API_KEY || process.env.NANGO_SECRET_KEY;
  if (!apiKey) {
    throw new Error("Missing NANGO_API_KEY server environment variable.");
  }

  // Installed @nangohq/node v0.60.x types expect `secretKey`.
  // Newer SDKs also accept `secretKey`/`apiKey` depending on version.
  return new Nango({ secretKey: apiKey });
}

export function getIntegrationId() {
  const integrationId = process.env.NANGO_INTEGRATION_ID;
  if (!integrationId) {
    throw new Error("Missing NANGO_INTEGRATION_ID server environment variable.");
  }
  return integrationId;
}
