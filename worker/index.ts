
interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Check Cloudflare Worker
    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405 }
        );
      }

      return Response.json({
        status: "ok",
        application: "SocialFlow AI",
        backend: "Cloudflare Workers",
        mode: "development"
      });
    }

    // Check Cloudflare D1 database
    if (url.pathname === "/api/db-health") {
      if (request.method !== "GET") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405 }
        );
      }

      try {
        const result = await env.DB
          .prepare("SELECT 1 AS connected")
          .first<{ connected: number }>();

        return Response.json({
          status: "ok",
          database: "Cloudflare D1",
          connected: result?.connected === 1
        });
      } catch {
        return Response.json(
          {
            status: "error",
            database: "Cloudflare D1",
            connected: false
          },
          { status: 503 }
        );
      }
    }

    // APIs that have not been migrated yet
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          error: "Endpoint not implemented",
          message: "Backend migration in progress"
        },
        { status: 404 }
      );
    }

    // Serve React frontend
    return env.ASSETS.fetch(request);
  }
};
