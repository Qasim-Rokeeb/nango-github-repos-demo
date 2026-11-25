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

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
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
      const data = (await res.json()) as { repos?: Repo[]; error?: string; details?: string };
      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to fetch repositories.");
      }
      setRepos(data.repos ?? []);
      setSuccess(`Retrieved ${data.repos?.length ?? 0} repository(ies).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch repositories.");
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  };

  const connected = Boolean(status?.connected);

  return (
    <main>
      <div className="panel">
        <h1>Nango GitHub Repos Demo</h1>
        <p className="muted">
          Minimal Next.js + TypeScript example using Nango to connect a GitHub account and retrieve up to five
          repositories through an authenticated API request.
        </p>

        <div className="status">
          <strong>Connection status:</strong>{" "}
          {statusLoading ? "Checking..." : connected ? "Connected (demo session)" : "Not connected"}
          {status?.connection?.providerConfigKey ? (
            <span className="muted"> — integration: <code>{status.connection.providerConfigKey}</code></span>
          ) : null}
        </div>

        <div className="row">
          <button onClick={handleConnect} disabled={connectLoading}>
            {connectLoading ? "Connecting..." : connected ? "Reconnect GitHub" : "Connect GitHub"}
          </button>
          <button className="secondary" onClick={handleFetchRepos} disabled={reposLoading || !connected}>
            {reposLoading ? "Loading repositories..." : "Fetch repositories"}
          </button>
          <button className="secondary" onClick={refreshStatus} disabled={statusLoading}>
            Refresh status
          </button>
        </div>

        {error ? <div className="error"><strong>Error:</strong> {error}</div> : null}
        {success ? <div className="success"><strong>Success:</strong> {success}</div> : null}
        {!connected && !statusLoading ? (
          <div className="notice">
            Connect GitHub first. After authorization, use “Fetch repositories” to make an authenticated request.
          </div>
        ) : null}

        <h2 style={{ marginTop: 28, marginBottom: 0, fontSize: "1.15rem" }}>Repositories (up to 5)</h2>
        <p className="small">
          Fetched via server-side Nango proxy from <code>GET /user/repos?per_page=5&amp;sort=updated</code>. The
          connection ID is stored server-side for this local demo session and is not accepted from arbitrary client input.
        </p>

        {repos.length > 0 ? (
          <ul className="repo-list">
            {repos.map((repo) => (
              <li key={repo.id} className="repo">
                <h3>
                  <a href={repo.url} target="_blank" rel="noreferrer">{repo.fullName}</a>
                  {repo.private ? " (private)" : ""}
                </h3>
                <p style={{ margin: "6px 0" }}>{repo.description || "No description."}</p>
                <div className="meta">
                  <span>Language: {repo.language || "n/a"}</span>
                  <span>Stars: {repo.stars}</span>
                  <span>Updated: {repo.updatedAt ? new Date(repo.updatedAt).toLocaleString() : "n/a"}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No repositories loaded yet.</p>
        )}

        <p className="small" style={{ marginTop: 24 }}>
          <strong>Demo limitation:</strong> This example has no real user authentication or database-backed connection
          ownership checks. It is intended for local evaluation only, not as a secure public app.
        </p>
      </div>
    </main>
  );
}
