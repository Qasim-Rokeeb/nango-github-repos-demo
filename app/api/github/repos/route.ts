import { NextResponse } from "next/server";
import { getNangoClient } from "@/lib/nango";
import { getDemoConnection } from "@/lib/demo-session";

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  updated_at: string | null;
  language: string | null;
  stargazers_count?: number;
};

export async function GET() {
  try {
    const connection = getDemoConnection();
    if (!connection) {
      return NextResponse.json(
        { error: "No GitHub connection found for this demo session. Connect GitHub first." },
        { status: 401 },
      );
    }

    const nango = getNangoClient();

    // Authenticated request through Nango proxy.
    // GitHub endpoint: GET /user/repos (authenticated user repositories)
    // Docs: https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user
    const res = await nango.get({
      endpoint: "/user/repos",
      providerConfigKey: connection.providerConfigKey,
      connectionId: connection.connectionId,
      params: {
        per_page: 5,
        sort: "updated",
        direction: "desc",
      },
    });

    const data = Array.isArray(res.data) ? (res.data as GitHubRepo[]) : [];
    const repos = data.slice(0, 5).map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      private: repo.private,
      description: repo.description,
      updatedAt: repo.updated_at,
      language: repo.language,
      stars: repo.stargazers_count ?? 0,
    }));

    return NextResponse.json({ repos });
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      response?: { data?: unknown; status?: number };
    };
    const status = typeof err?.response?.status === "number" ? err.response.status : 500;
    const details =
      typeof err?.response?.data === "string"
        ? err.response.data
        : err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message || "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to fetch repositories from GitHub through Nango.",
        details,
      },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
