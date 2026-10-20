
interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);

    // Public health check: no secrets or user data
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

    // All other API routes are intentionally disabled
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          error: "Endpoint not implemented",
          message: "Backend migration in progress"
        },
        { status: 404 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
