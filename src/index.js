const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function slugify(value) {
  return value.toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function id(prefix = "orb") {
  return prefix + "_" + crypto.randomUUID().replaceAll("-", "");
}

function publicContentWhere() {
  return `status = 'published'
    AND (release_at IS NULL OR release_at <= datetime('now'))`;
}

async function listContent(env, url, admin = false) {
  const type = url.searchParams.get("type");
  const q = url.searchParams.get("q");
  const where = [];
  const args = [];

  if (type === "movie" || type === "show") {
    where.push("type = ?");
    args.push(type);
  }

  if (q) {
    where.push("(title LIKE ? OR description LIKE ?)");
    args.push("%" + q + "%", "%" + q + "%");
  }

  if (!admin) where.push(publicContentWhere());

  const sql = `
    SELECT id, type, title, slug, description, year, runtime_minutes, rating,
           poster_url, backdrop_url, trailer_url, video_url, featured,
           status, release_at, created_at, updated_at
    FROM content
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY featured DESC, COALESCE(release_at, created_at) DESC, title ASC
  `;

  const result = await env.DB.prepare(sql).bind(...args).all();
  return json({ content: result.results || [] });
}

async function saveContent(request, env) {
  const body = await request.json();
  const type = body.type === "show" ? "show" : "movie";
  const title = String(body.title || "").trim();

  if (!title) return json({ error: "Title is required." }, 400);

  const contentId = body.id || id("content");
  const slug = slugify(body.slug || title) || contentId;
  const status = ["draft", "scheduled", "published"].includes(body.status)
    ? body.status
    : "draft";

  const releaseAt = body.release_at || null;
  const genres = Array.isArray(body.genres) ? body.genres : [];

  await env.DB.prepare(`
    INSERT INTO content (
      id, type, title, slug, description, year, runtime_minutes, rating,
      poster_url, backdrop_url, trailer_url, video_url, featured,
      status, release_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      type=excluded.type,
      title=excluded.title,
      slug=excluded.slug,
      description=excluded.description,
      year=excluded.year,
      runtime_minutes=excluded.runtime_minutes,
      rating=excluded.rating,
      poster_url=excluded.poster_url,
      backdrop_url=excluded.backdrop_url,
      trailer_url=excluded.trailer_url,
      video_url=excluded.video_url,
      featured=excluded.featured,
      status=excluded.status,
      release_at=excluded.release_at,
      updated_at=datetime('now')
  `).bind(
    contentId,
    type,
    title,
    slug,
    String(body.description || ""),
    body.year ? Number(body.year) : null,
    body.runtime_minutes ? Number(body.runtime_minutes) : null,
    String(body.rating || ""),
    String(body.poster_url || ""),
    String(body.backdrop_url || ""),
    String(body.trailer_url || ""),
    String(body.video_url || ""),
    body.featured ? 1 : 0,
    status,
    releaseAt
  ).run();

  await env.DB.prepare("DELETE FROM content_genres WHERE content_id = ?")
    .bind(contentId).run();

  for (const genre of genres) {
    const name = String(genre || "").trim();
    if (!name) continue;
    const genreSlug = slugify(name);
    const genreId = id("genre");

    await env.DB.prepare(`
      INSERT INTO genres (id, name, slug)
      VALUES (?, ?, ?)
      ON CONFLICT(slug) DO NOTHING
    `).bind(genreId, name, genreSlug).run();

    const savedGenre = await env.DB.prepare(
      "SELECT id FROM genres WHERE slug = ?"
    ).bind(genreSlug).first();

    await env.DB.prepare(`
      INSERT OR IGNORE INTO content_genres (content_id, genre_id)
      VALUES (?, ?)
    `).bind(contentId, savedGenre.id).run();
  }

  return json({ ok: true, id: contentId });
}

async function deleteContent(request, env) {
  const body = await request.json();
  if (!body.id) return json({ error: "Content ID is required." }, 400);
  await env.DB.prepare("DELETE FROM content WHERE id = ?").bind(body.id).run();
  return json({ ok: true });
}

async function getGenres(env) {
  const result = await env.DB.prepare(
    "SELECT id, name, slug FROM genres ORDER BY name ASC"
  ).all();
  return json({ genres: result.results || [] });
}

async function getSeasons(env, showId) {
  const result = await env.DB.prepare(`
    SELECT id, show_id, season_number, title, description
    FROM seasons
    WHERE show_id = ?
    ORDER BY season_number ASC
  `).bind(showId).all();
  return json({ seasons: result.results || [] });
}

async function saveSeason(request, env) {
  const body = await request.json();
  if (!body.show_id) return json({ error: "Show is required." }, 400);

  const seasonId = body.id || id("season");
  await env.DB.prepare(`
    INSERT INTO seasons (id, show_id, season_number, title, description, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      season_number=excluded.season_number,
      title=excluded.title,
      description=excluded.description,
      updated_at=datetime('now')
  `).bind(
    seasonId,
    body.show_id,
    Number(body.season_number || 1),
    String(body.title || ""),
    String(body.description || "")
  ).run();

  return json({ ok: true, id: seasonId });
}

async function getEpisodes(env, seasonId) {
  const result = await env.DB.prepare(`
    SELECT id, season_id, episode_number, title, description, runtime_minutes,
           thumbnail_url, video_url, status, release_at
    FROM episodes
    WHERE season_id = ?
    ORDER BY episode_number ASC
  `).bind(seasonId).all();
  return json({ episodes: result.results || [] });
}

async function saveEpisode(request, env) {
  const body = await request.json();
  if (!body.season_id || !body.title) {
    return json({ error: "Season and episode title are required." }, 400);
  }

  const episodeId = body.id || id("episode");
  const status = ["draft", "scheduled", "published"].includes(body.status)
    ? body.status
    : "draft";

  await env.DB.prepare(`
    INSERT INTO episodes (
      id, season_id, episode_number, title, description, runtime_minutes,
      thumbnail_url, video_url, status, release_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      episode_number=excluded.episode_number,
      title=excluded.title,
      description=excluded.description,
      runtime_minutes=excluded.runtime_minutes,
      thumbnail_url=excluded.thumbnail_url,
      video_url=excluded.video_url,
      status=excluded.status,
      release_at=excluded.release_at,
      updated_at=datetime('now')
  `).bind(
    episodeId,
    body.season_id,
    Number(body.episode_number || 1),
    String(body.title),
    String(body.description || ""),
    body.runtime_minutes ? Number(body.runtime_minutes) : null,
    String(body.thumbnail_url || ""),
    String(body.video_url || ""),
    status,
    body.release_at || null
  ).run();

  return json({ ok: true, id: episodeId });
}

async function upload(request, env) {
  if (!env.MEDIA) {
    return json({
      error: "Media storage is not enabled yet. The Cloudflare R2 bucket still needs to be enabled."
    }, 503);
  }

  const url = new URL(request.url);
  const folder = (url.searchParams.get("folder") || "uploads")
    .replace(/[^a-z0-9_-]/gi, "");
  const filename = (url.searchParams.get("filename") || "file")
    .replace(/[^a-z0-9._-]/gi, "_");
  const key = folder + "/" + crypto.randomUUID() + "-" + filename;

  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const object = await env.MEDIA.put(key, request.body, {
    httpMetadata: { contentType }
  });

  return json({
    ok: true,
    key,
    size: object.size,
    message: "Uploaded to OrbitX media storage."
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return env.ASSETS.fetch(new Request(new URL("/admin.html", url), request));
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/content" && request.method === "GET") {
          return listContent(env, url, true);
        }

        if (url.pathname === "/api/public/content" && request.method === "GET") {
          return listContent(env, url, false);
        }

        if (url.pathname === "/api/content" && request.method === "POST") {
          return saveContent(request, env);
        }

        if (url.pathname === "/api/content/delete" && request.method === "POST") {
          return deleteContent(request, env);
        }

        if (url.pathname === "/api/genres" && request.method === "GET") {
          return getGenres(env);
        }

        if (url.pathname === "/api/seasons" && request.method === "GET") {
          return getSeasons(env, url.searchParams.get("show_id"));
        }

        if (url.pathname === "/api/seasons" && request.method === "POST") {
          return saveSeason(request, env);
        }

        if (url.pathname === "/api/episodes" && request.method === "GET") {
          return getEpisodes(env, url.searchParams.get("season_id"));
        }

        if (url.pathname === "/api/episodes" && request.method === "POST") {
          return saveEpisode(request, env);
        }

        if (url.pathname === "/api/upload" && request.method === "POST") {
          return upload(request, env);
        }

        return json({ error: "API route not found." }, 404);
      } catch (error) {
        console.error(error);
        return json({ error: error.message || "Server error." }, 500);
      }
    }

    if (url.pathname === "/schema.sql" || url.pathname.startsWith("/src/")) {
      return new Response("Not found", { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};
