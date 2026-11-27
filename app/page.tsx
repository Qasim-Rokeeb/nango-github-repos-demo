"use client";

import { useCallback, useEffect, useState } from "react";
import Nango from "@nangohq/frontend";

type Repo = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  private: boolean;
  description: string | null;
  updatedAt: string | null;
  language: string | null;
  stars: number;
};

type ConnectionStatus = {
  connected: boolean;
  connection: { providerConfigKey: string; createdAt: string } | null;
};

function isRepo(value: unknown): value is Repo {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "number" &&
    typeof r.name === "string" &&
    typeof r.fullName === "string" &&
    typeof r.url === "string" &&
    typeof r.private === "boolean" &&
    (typeof r.description === "string" || r.description === null) &&
    (typeof r.updatedAt === "string" || r.updatedAt === null) &&
    (typeof r.language === "string" || r.language === null) &&
    typeof r.stars === "number"
  );
}

function parseRepos(value: unknown): Repo[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid repository response: expected an array.");
  }
  const repos = value.filter(isRepo).slice(0, 5);
  if (value.length > 0 && repos.length === 0) {
    throw new Error("Invalid repository response: no valid repository records found.");
  }
  return repos;
}

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [hasFetchedRepos, setHasFetchedRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/nango/connection", { cache: "no-store" });
      const data = (await res.json()) as ConnectionStatus & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load connection status.");
      setStatus({ connected: data.connected, connection: data.connection });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load connection status.");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleConnect = async () => {
    setError(null);
    setSuccess(null);
    setConnectLoading(true);

    try {
      const sessionRes = await fetch("/api/nango/session", { method: "POST" });
      const sessionData = (await sessionRes.json()) as {
        sessionToken?: string;
        error?: string;
        details?: string;
      };
      if (!sessionRes.ok || !sessionData.sessionToken) {
        throw new Error(sessionData.details || sessionData.error || "Could not create connect session.");
      }

      const nango = new Nango();
      const connect = nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === "connect") {
            const payload = (event as { payload?: { connectionId?: string; providerConfigKey?: string } }).payload;
            const connectionId = payload?.connectionId;
            const providerConfigKey = payload?.providerConfigKey;
            if (!connectionId || !providerConfigKey) {
              setError("Connected, but Nango did not return connection details. Check logs and try again.");
              setConnectLoading(false);
              return;
            }

            void (async () => {
              try {
                const saveRes = await fetch("/api/nango/connection", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ connectionId, providerConfigKey }),
                });
                const saveData = (await saveRes.json()) as { error?: string; details?: string };
                if (!saveRes.ok) {
                  throw new Error(saveData.details || saveData.error || "Failed to store connection.");
                }
                setSuccess("GitHub account connected for this local demo session.");
                await refreshStatus();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to store connection.");
              } finally {
                setConnectLoading(false);
              }
            })();
          } else if (event.type === "close") {
            setConnectLoading(false);
          }
        },
      });

      connect.setSessionToken(sessionData.sessionToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start GitHub connection.");
      setConnectLoading(false);
    }
  };

  const handleFetchRepos = async () => {
    setError(null);
    setSuccess(null);
    setReposLoading(true);
    try {
      const res = await fetch("/api/github/repos", { cache: "no-store" });
      const data = (await res.json()) as { repos?: unknown; error?: string; details?: string };
      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to fetch repositories.");
      }
      const parsedRepos = parseRepos(data.repos);
      setRepos(parsedRepos);
      setHasFetchedRepos(true);
      setSuccess(
        parsedRepos.length === 0
          ? "Request succeeded, but no repositories were returned."
          : `Retrieved ${parsedRepos.length} repository(ies).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch repositories.");
      setRepos([]);
      setHasFetchedRepos(true);
    } finally {
      setReposLoading(false);
    }
  };

  const connected = Boolean(status?.connected);

  return (
    <main>
      <div className="panel">
        <header>
          <p className="small" style={{ margin: 0, fontWeight: 600, color: "var(--accent)" }}>
            Day 4 — AI Developer Experience
          </p>
          <h1>Nango GitHub Repos Demo</h1>
          <p className="muted">
            A minimal Next.js + TypeScript example that connects a GitHub account through Nango and retrieves up to five
            repositories with an authenticated request.
          </p>
        </header>

        <section aria-labelledby="connection-status-heading" style={{ marginTop: 20 }}>
          <h2 id="connection-status-heading" style={{ fontSize: "1rem", marginBottom: 8 }}>
            Connection status
          </h2>
          <div className="status" role="status" aria-live="polite">
            <strong>Status:</strong>{" "}
            {statusLoading ? "Checking connection..." : connected ? "Connected (demo session)" : "Not connected"}
            {status?.connection?.providerConfigKey ? (
              <span className="muted">
                {" "}
                — integration: <code>{status.connection.providerConfigKey}</code>
              </span>
            ) : null}
          </div>
        </section>

        <section aria-label="Actions" className="row">
          <button type="button" onClick={handleConnect} disabled={connectLoading}>
            {connectLoading ? "Connecting..." : connected ? "Reconnect GitHub" : "Connect GitHub"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleFetchRepos}
            disabled={reposLoading || !connected || statusLoading}
          >
            {reposLoading ? "Loading repositories..." : "Fetch repositories"}
          </button>
          <button type="button" className="secondary" onClick={refreshStatus} disabled={statusLoading}>
            Refresh status
          </button>
        </section>

        <div aria-live="polite">
          {error ? (
            <div className="error" role="alert">
              <strong>Error:</strong> {error}
            </div>
          ) : null}
          {success ? (
            <div className="success" role="status">
              <strong>Success:</strong> {success}
            </div>
          ) : null}
        </div>

        {!connected && !statusLoading ? (
          <div className="notice" role="status">
            Connect a GitHub account first. After authorization, fetch repositories to make an authenticated request.
          </div>
        ) : null}

        <section aria-labelledby="repos-heading" style={{ marginTop: 28 }}>
          <h2 id="repos-heading" style={{ marginBottom: 0, fontSize: "1.15rem" }}>
            Repositories
          </h2>
          <p className="small">
            Shows up to 5 repositories fetched through the server-side Nango proxy from{" "}
            <code>GET /user/repos?per_page=5&amp;sort=updated&amp;direction=desc</code>.
          </p>

          {reposLoading ? (
            <p className="status" role="status" aria-live="polite">
              Loading repositories...
            </p>
          ) : repos.length > 0 ? (
            <ul className="repo-list" aria-label="Repository list">
              {repos.map((repo) => (
                <li key={repo.id} className="repo">
                  <h3 style={{ marginBottom: 4 }}>
                    <a href={repo.url} target="_blank" rel="noreferrer noopener">
                      {repo.fullName}
                    </a>
                    {repo.private ? <span className="muted"> (private)</span> : null}
                  </h3>
                  <p style={{ margin: "6px 0" }}>{repo.description || "No description provided."}</p>
                  <div className="meta" aria-label={`Repository metadata for ${repo.fullName}`}>
                    <span>Language: {repo.language || "n/a"}</span>
                    <span>Stars: {repo.stars}</span>
                    <span>Updated: {repo.updatedAt ? new Date(repo.updatedAt).toLocaleString() : "n/a"}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : hasFetchedRepos ? (
            <p className="status" role="status">
              No repositories found for this account, or none were returned by the request.
            </p>
          ) : (
            <p className="muted" role="status">
              No repositories loaded yet. Connect GitHub and click “Fetch repositories”.
            </p>
          )}
        </section>

        <footer className="small" style={{ marginTop: 24 }}>
          <strong>Demo limitation:</strong> This example has no real user authentication or database-backed connection
          ownership checks. The connection ID is stored in an in-memory server-side demo session and is not accepted as
          arbitrary client input. It is intended for local evaluation only.
        </footer>
      </div>
    </main>
  );
}
