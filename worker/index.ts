
interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  GEMINI_API_KEY?: string;
}

type Data = Record<string, any>;

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

async function body(req: Request): Promise<Data | null> {
  const length = Number(req.headers.get("content-length") || 0);

  if (length > 16000) return null;

  try {
    const text = await req.text();

    if (text.length > 16000) return null;

    const value = JSON.parse(text);

    return value &&
      typeof value === "object" &&
      !Array.isArray(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRow(row: Data): Data {
  const result = { ...row };

  if ("interests" in result) {
    result.interests = parseArray(result.interests);
  }

  if ("defaultPlatforms" in result) {
    result.defaultPlatforms = parseArray(
      result.defaultPlatforms
    );
  }

  if ("hashtags" in result) {
    result.hashtags = parseArray(result.hashtags);
  }

  if ("requireApproval" in result) {
    result.requireApproval = Boolean(
      result.requireApproval
    );
  }

  if ("autoPublish" in result) {
    result.autoPublish = Boolean(result.autoPublish);
  }

  return result;
}

function validPlatform(platform: unknown): boolean {
  return (
    platform === "LINKEDIN" ||
    platform === "X" ||
    platform === "INSTAGRAM"
  );
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // HEALTH CHECK

    if (path === "/api/health") {
      return json({
        status: "ok",
        app: "SocialFlow AI",
        version: "personal-linkedin-v2",
      });
    }

    // TEMPORARY GEMINI DIAGNOSTIC

    if (path === "/api/gemini-check") {
      return json({
        secretConfigured: Boolean(
          env.GEMINI_API_KEY
        ),
        deploymentMarker: "gemini-check-v2",
      });
    }

    // DATABASE HEALTH

    if (path === "/api/db-health") {
      try {
        const result = await env.DB.prepare(
          "SELECT 1 AS connected"
        ).first<{ connected: number }>();

        return json({
          status: "ok",
          database: "Cloudflare D1",
          connected: result?.connected === 1,
        });
      } catch {
        return json(
          {
            status: "error",
            connected: false,
          },
          503
        );
      }
    }

    // SERVE REACT FRONTEND

    if (!path.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // TEMPORARY PUBLIC DEMO.
    // Authentication and server-side rate limiting
    // are not yet implemented.
    // Do not use sensitive information.

    try {
      // GET WORKSPACES

      if (
        path === "/api/workspaces" &&
        method === "GET"
      ) {
        const result = await env.DB.prepare(
          `SELECT *
           FROM workspaces
           ORDER BY createdAt DESC`
        ).all<Data>();

        return json(result.results.map(mapRow));
      }

      // CREATE WORKSPACE

      if (
        path === "/api/workspaces" &&
        method === "POST"
      ) {
        const b = await body(request);

        if (
          !b ||
          typeof b.name !== "string" ||
          !b.name.trim() ||
          b.name.length > 120 ||
          !["PERSONAL", "COMPANY"].includes(b.type)
        ) {
          return json(
            { error: "Invalid workspace" },
            400
          );
        }

        const id = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO workspaces
           (
             id,
             name,
             type,
             description,
             interests,
             targetAudience,
             language,
             writingStyle,
             defaultPlatforms,
             requireApproval,
             autoPublish
           )
           VALUES (?,?,?,?,?,?,?,?,?,1,0)`
        )
          .bind(
            id,
            b.name.trim(),
            b.type,
            String(b.description || "").slice(0, 500),
            JSON.stringify(
              Array.isArray(b.interests)
                ? b.interests
                : []
            ),
            String(b.targetAudience || "").slice(
              0,
              300
            ),
            String(b.language || "English"),
            String(b.writingStyle || "").slice(
              0,
              300
            ),
            JSON.stringify(
              Array.isArray(b.defaultPlatforms)
                ? b.defaultPlatforms
                : ["LINKEDIN"]
            )
          )
          .run();

        return json({ id }, 201);
      }

      // UPDATE WORKSPACE SETTINGS

      const workspaceMatch = path.match(
        /^\/api\/workspaces\/([^/]+)$/
      );

      if (
        workspaceMatch &&
        method === "PUT"
      ) {
        const b = await body(request);

        if (
          !b ||
          typeof b.requireApproval !== "boolean"
        ) {
          return json(
            { error: "Invalid setting" },
            400
          );
        }

        const result = await env.DB.prepare(
          `UPDATE workspaces
           SET requireApproval=?
           WHERE id=?`
        )
          .bind(
            b.requireApproval ? 1 : 0,
            workspaceMatch[1]
          )
          .run();

        return result.meta.changes
          ? json({ success: true })
          : json(
              { error: "Workspace not found" },
              404
            );
      }

      // GET POSTS

      if (
        path === "/api/posts" &&
        method === "GET"
      ) {
        const workspaceId =
          url.searchParams.get("workspaceId");

        if (!workspaceId) {
          return json(
            { error: "workspaceId required" },
            400
          );
        }

        const result = await env.DB.prepare(
          `SELECT *
           FROM posts
           WHERE workspaceId=?
           ORDER BY createdAt DESC`
        )
          .bind(workspaceId)
          .all<Data>();

        return json(result.results.map(mapRow));
      }

      // CREATE MANUAL POST

      if (
        path === "/api/posts" &&
        method === "POST"
      ) {
        const b = await body(request);

        if (
          !b ||
          typeof b.workspaceId !== "string" ||
          typeof b.topic !== "string" ||
          !b.topic.trim() ||
          typeof b.content !== "string" ||
          !b.content.trim() ||
          !validPlatform(b.platform)
        ) {
          return json(
            { error: "Invalid post" },
            400
          );
        }

        const id = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO posts
           (
             id,
             workspaceId,
             topic,
             platform,
             content,
             hashtags,
             status
           )
           VALUES (?,?,?,?,?,?,?)`
        )
          .bind(
            id,
            b.workspaceId,
            b.topic.slice(0, 200),
            b.platform,
            b.content.slice(0, 10000),
            JSON.stringify(
              Array.isArray(b.hashtags)
                ? b.hashtags.slice(0, 15)
                : []
            ),
            "PENDING_APPROVAL"
          )
          .run();

        return json({ id }, 201);
      }

      // POST APPROVAL, REJECTION, SCHEDULING

      const postAction = path.match(
        /^\/api\/posts\/([^/]+)\/(approve|reject|schedule)$/
      );

      if (
        postAction &&
        method === "POST"
      ) {
        const id = postAction[1];
        const action = postAction[2];

        if (action === "schedule") {
          const b = await body(request);
          const time = b?.scheduledTime;

          if (
            typeof time !== "string" ||
            !Number.isFinite(Date.parse(time)) ||
            Date.parse(time) <= Date.now()
          ) {
            return json(
              { error: "Choose a future time" },
              400
            );
          }

          const result = await env.DB.prepare(
            `UPDATE posts
             SET status='SCHEDULED',
                 scheduledTime=?,
                 version=version+1
             WHERE id=?
               AND status='APPROVED'`
          )
            .bind(time, id)
            .run();

          return result.meta.changes
            ? json({ success: true })
            : json(
                {
                  error:
                    "Approve the post before scheduling",
                },
                409
              );
        }

        const nextStatus =
          action === "approve"
            ? "APPROVED"
            : "REJECTED";

        const result = await env.DB.prepare(
          `UPDATE posts
           SET status=?,
               version=version+1
           WHERE id=?
             AND status='PENDING_APPROVAL'`
        )
          .bind(nextStatus, id)
          .run();

        return result.meta.changes
          ? json({ success: true })
          : json(
              {
                error:
                  "Post is not pending approval",
              },
              409
            );
      }

      // GEMINI AI GENERATION

      if (
        path === "/api/ai/command" &&
        method === "POST"
      ) {
        if (!env.GEMINI_API_KEY) {
          return json(
            {
              error:
                "Gemini API key not configured",
            },
            503
          );
        }

        const b = await body(request);

        if (
          !b ||
          typeof b.command !== "string" ||
          !b.command.trim() ||
          b.command.length > 500 ||
          typeof b.workspaceId !== "string"
        ) {
          return json(
            { error: "Invalid AI command" },
            400
          );
        }

        const workspace = await env.DB.prepare(
          `SELECT *
           FROM workspaces
           WHERE id=?`
        )
          .bind(b.workspaceId)
          .first<Data>();

        if (!workspace) {
          return json(
            { error: "Workspace not found" },
            404
          );
        }

        const prompt = `
You are a professional personal LinkedIn
content writing assistant.

Your task is to create one original LinkedIn
post for an individual.

Profile: ${workspace.name}
Interests: ${workspace.interests}
Audience: ${workspace.targetAudience}
Writing style: ${workspace.writingStyle}
Language: ${workspace.language}

User request:
${b.command}

Requirements:
- Write one original LinkedIn post.
- Follow the requested topic.
- Use a natural, insightful tone.
- Avoid generic motivational filler.
- Begin with an interesting hook.
- Use short readable paragraphs.
- Include a practical insight or example.
- Do not invent statistics or sources.
- Do not invent personal experiences.
- Do not claim to have researched trends.
- Include 3 to 5 relevant hashtags.
- Platform must be LINKEDIN.
- Return valid JSON only.

JSON format:
{
  "posts": [
    {
      "topic": "Topic title",
      "platform": "LINKEDIN",
      "content": "Full LinkedIn post",
      "hashtags": [
        "#AI",
        "#Technology"
      ]
    }
  ]
}
`;

        const controller =
          new AbortController();

        const timeout = setTimeout(
          () => controller.abort(),
          60000
        );

        let geminiResponse: Response;

        try {
          geminiResponse = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                "x-goog-api-key":
                  env.GEMINI_API_KEY,
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt }
                    ],
                  },
                ],
                generationConfig: {
                  responseMimeType:
                    "application/json",
                  temperature: 0.8,
                  maxOutputTokens: 2048,
                },
              }),
              signal: controller.signal,
            }
          );
        } finally {
          clearTimeout(timeout);
        }

        if (!geminiResponse.ok) {
          const errorText =
            await geminiResponse.text();

          console.error(
            "Gemini API request failed",
            geminiResponse.status,
            errorText.slice(0, 1500)
          );

          return json(
            {
              error:
                "Gemini generation failed",
              httpStatus:
                geminiResponse.status,
              details:
                "Check Cloudflare Worker logs",
            },
            502
          );
        }

        const geminiData =
          (await geminiResponse.json()) as Data;

        const generatedText =
          geminiData.candidates?.[0]
            ?.content?.parts?.[0]?.text;

        if (
          typeof generatedText !== "string"
        ) {
          return json(
            {
              error:
                "Gemini returned no content",
            },
            502
          );
        }

        let parsed: Data;

        try {
          parsed = JSON.parse(
            generatedText
          );
        } catch {
          return json(
            {
              error:
                "Invalid Gemini JSON response",
            },
            502
          );
        }

        const generatedPosts =
          Array.isArray(parsed.posts)
            ? parsed.posts.slice(0, 1)
            : [];

        const savedPosts: Data[] = [];

        for (const post of generatedPosts) {
          if (
            !post ||
            typeof post.content !== "string" ||
            !post.content.trim()
          ) {
            continue;
          }

          const id = crypto.randomUUID();

          const topic = String(
            post.topic || b.command
          ).slice(0, 200);

          const content =
            post.content.slice(0, 10000);

          const hashtags =
            Array.isArray(post.hashtags)
              ? post.hashtags
                  .filter(
                    (h: unknown) =>
                      typeof h === "string"
                  )
                  .slice(0, 5)
              : [];

          await env.DB.prepare(
            `INSERT INTO posts
             (
               id,
               workspaceId,
               topic,
               platform,
               content,
               hashtags,
               status
             )
             VALUES (?,?,?,?,?,?,?)`
          )
            .bind(
              id,
              b.workspaceId,
              topic,
              "LINKEDIN",
              content,
              JSON.stringify(hashtags),
              "PENDING_APPROVAL"
            )
            .run();

          savedPosts.push({
            id,
            workspaceId: b.workspaceId,
            topic,
            platform: "LINKEDIN",
            content,
            hashtags,
            status: "PENDING_APPROVAL",
            scheduledTime: null,
            approvalMode: "MANUAL",
            publishingMode: "MANUAL",
            version: 1,
            createdAt:
              new Date().toISOString(),
          });
        }

        return json({
          reply: savedPosts.length
            ? "Created a new LinkedIn draft using Gemini. Review it before publishing."
            : "Gemini returned no usable posts.",
          savedPosts,
        });
      }

      // ANALYTICS

      if (
        path === "/api/analytics" &&
        method === "GET"
      ) {
        const workspaceId =
          url.searchParams.get(
            "workspaceId"
          );

        if (!workspaceId) {
          return json(
            {
              error:
                "workspaceId required",
            },
            400
          );
        }

        const result = await env.DB.prepare(
          `SELECT status,
                  COUNT(*) AS count
           FROM posts
           WHERE workspaceId=?
           GROUP BY status`
        )
          .bind(workspaceId)
          .all<Data>();

        const counts: Data = {};

        for (
          const row of result.results
        ) {
          counts[row.status] =
            row.count;
        }

        return json({
          publishedCount: 0,
          pendingCount:
            counts.PENDING_APPROVAL || 0,
          totalImpressions: 0,
          totalEngagement: 0,
          engagementRate: "N/A",
          topTopics: [],
          platformBreakdown: {
            LINKEDIN: 0,
            X: 0,
            INSTAGRAM: 0,
          },
        });
      }

      // UNCONNECTED FEATURES

      if (
        (
          path === "/api/accounts" ||
          path === "/api/research"
        ) &&
        method === "GET"
      ) {
        return json([]);
      }

      // LINKEDIN PUBLISHING NOT CONNECTED

      if (
        path.endsWith("/publish")
      ) {
        return json(
          {
            error:
              "LinkedIn publishing is not connected. No post was published.",
          },
          501
        );
      }

      return json(
        {
          error:
            "Endpoint not implemented yet",
        },
        501
      );
    } catch (error) {
      console.error(
        "SocialFlow AI backend error",
        error
      );

      return json(
        {
          error:
            "Backend operation failed",
        },
        500
      );
    }
  },
};
