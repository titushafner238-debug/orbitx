var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}
__name(json, "json");
async function b2Native(env) {
  if (!env.B2_KEY_ID || !env.B2_APP_KEY) throw new Error("Backblaze B2 credentials are not configured.");
  const auth = await fetch("https://api.backblazeb2.com/b2api/v4/b2_authorize_account", { headers: { Authorization: "Basic " + btoa(env.B2_KEY_ID + ":" + env.B2_APP_KEY) } });
  if (!auth.ok) throw new Error("Backblaze authorization failed: " + auth.status + " " + await auth.text());
  const a = await auth.json();
  const allowedBuckets = Array.isArray(a.allowed?.buckets) ? a.allowed.buckets : [];
  let bucket = allowedBuckets[0] ? { bucketId: allowedBuckets[0].bucketId || allowedBuckets[0].id, bucketName: allowedBuckets[0].bucketName || allowedBuckets[0].name } : null;
  if (!bucket) {
    const list = await fetch(a.apiUrl + "/b2api/v4/b2_list_buckets", {
      method: "POST",
      headers: { Authorization: a.authorizationToken, "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: a.accountId })
    });
    if (!list.ok) throw new Error("Could not discover the Backblaze bucket: " + list.status + " " + await list.text());
    const data = await list.json();
    {
      const raw = data.buckets?.[0];
      bucket = raw ? { bucketId: raw.bucketId || raw.id, bucketName: raw.bucketName || raw.name } : null;
    }
  }
  if (!bucket) throw new Error("No Backblaze B2 bucket is available to this application key.");
  return { auth: a, bucket };
}
__name(b2Native, "b2Native");
async function b2UploadBytes(env, key, bytes, contentType = "application/octet-stream") {
  const b = await b2Native(env);
  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const u = await fetch(b.auth.apiUrl + "/b2api/v4/b2_get_upload_url", {
    method: "POST",
    headers: { Authorization: b.auth.authorizationToken, "Content-Type": "application/json" },
    body: JSON.stringify({ bucketId: b.bucket.bucketId })
  });
  if (!u.ok) throw new Error("Backblaze upload URL failed (" + u.status + "): " + await u.text());
  const info = await u.json();
  const res = await fetch(info.uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": info.authorizationToken,
      "X-Bz-File-Name": encodeURIComponent(key),
      "Content-Type": contentType || "b2/x-auto",
      "Content-Length": String(body.byteLength),
      "X-Bz-Content-Sha1": "do_not_verify"
    },
    body
  });
  if (!res.ok) throw new Error("Backblaze file upload failed (" + res.status + "): " + await res.text());
  return { bucket: b.bucket, auth: b.auth, result: await res.json() };
}
__name(b2UploadBytes, "b2UploadBytes");
async function b2UploadStream(env, key, stream, contentType = "application/octet-stream", contentLength = null) {
  const b = await b2Native(env);
  const u = await fetch(b.auth.apiUrl + "/b2api/v4/b2_get_upload_url", {
    method: "POST",
    headers: { Authorization: b.auth.authorizationToken, "Content-Type": "application/json" },
    body: JSON.stringify({ bucketId: b.bucket.bucketId })
  });
  if (!u.ok) throw new Error("Backblaze upload URL failed (" + u.status + "): " + await u.text());
  const info = await u.json();
  const fileName = encodeURIComponent(key);
  const length = Number(contentLength);
  if (!Number.isSafeInteger(length) || length < 0) throw new Error("The upload size was not available.");
  if (!stream) throw new Error("The upload body was empty.");
  const fixed = new FixedLengthStream(length);
  await stream.pipeTo(fixed.writable);
  const res = await fetch(info.uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": info.authorizationToken,
      "X-Bz-File-Name": fileName,
      "Content-Type": contentType || "b2/x-auto",
      "X-Bz-Content-Sha1": "do_not_verify"
    },
    body: fixed.readable
  });
  if (!res.ok) throw new Error("Backblaze file upload failed (" + res.status + "): " + await res.text());
  return { bucket: b.bucket, auth: b.auth, result: await res.json() };
}
__name(b2UploadStream, "b2UploadStream");
async function b2DownloadUrl(env, key) {
  const b = await b2Native(env);
  const u = await fetch(b.auth.apiUrl + "/b2api/v4/b2_get_download_authorization", { method: "POST", headers: { Authorization: b.auth.authorizationToken, "Content-Type": "application/json" }, body: JSON.stringify({ bucketId: b.bucket.bucketId, fileNamePrefix: key, validDurationInSeconds: 3600 }) });
  if (!u.ok) throw new Error("Could not authorize Backblaze download: " + u.status + " " + await u.text());
  const d = await u.json();
  return b.auth.downloadUrl + "/file/" + encodeURIComponent(b.bucket.bucketName) + "/" + key.split("/").map(encodeURIComponent).join("/") + "?Authorization=" + encodeURIComponent(d.authorizationToken);
}
__name(b2DownloadUrl, "b2DownloadUrl");
async function b2SignedGet(env, key) {
  return b2DownloadUrl(env, key);
}
__name(b2SignedGet, "b2SignedGet");
async function b2SignedPutStream(env, key, stream, contentType = "application/octet-stream", contentLength = null) {
  await b2UploadStream(env, key, stream, contentType, contentLength);
}
__name(b2SignedPutStream, "b2SignedPutStream");
function slugify(value) {
  return value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}
__name(slugify, "slugify");
function id(prefix = "orb") {
  return prefix + "_" + crypto.randomUUID().replaceAll("-", "");
}
__name(id, "id");
function publicContentWhere() {
  return `status = 'published'
    AND (release_at IS NULL OR release_at <= datetime('now'))`;
}
__name(publicContentWhere, "publicContentWhere");
async function posterProxy(url) {
  const posters = {
    "flying-deuces": [
      { url: "https://www.impawards.com/1939/posters/flying_deuces.jpg", referer: "https://www.impawards.com/1939/" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Flying_Deuces_(1939)_1.jpg", referer: "https://commons.wikimedia.org/" }
    ],
    "impact": [
      { url: "https://www.impawards.com/1949/posters/impact.jpg", referer: "https://www.impawards.com/1949/" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/Charles_Coburn-Helen_Walker_in_Impact.jpg", referer: "https://commons.wikimedia.org/" }
    ],
    "a-fair-exchange": [
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/Getting_acquainted.jpg", referer: "https://commons.wikimedia.org/" }
    ],
    "mclintock": [
      { url: "https://www.impawards.com/1963/posters/mclintock.jpg", referer: "https://www.impawards.com/1963/" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/H.W._Gim_in_McLintock!_(1963).jpg", referer: "https://commons.wikimedia.org/" }
    ],
    "royal-wedding": [
      { url: "https://www.impawards.com/1951/posters/royal_wedding.jpg", referer: "https://www.impawards.com/1951/" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/Royal_Wedding_(1951)_1.jpg", referer: "https://commons.wikimedia.org/" }
    ],
    "my-favorite-brunette": [
      { url: "https://www.impawards.com/1947/posters/my_favorite_brunette.jpg", referer: "https://www.impawards.com/1947/" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/Charles_Arnt_My_Favorite_Brunette_(1947).jpg", referer: "https://commons.wikimedia.org/" }
    ],
    "santa-fe-trail": [
      { url: "https://www.impawards.com/1940/posters/santa_fe_trail.jpg", referer: "https://www.impawards.com/1940/" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/Santa_Fe_Trail.jpg", referer: "https://commons.wikimedia.org/" }
    ],
    "tarzan-green-goddess": [
      { url: "https://www.erbzine.com/mag5/grgodh3.jpg", referer: "https://www.erbzine.com/mag63/0584.html" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/Tarzan_and_the_Green_Goddess.jpg", referer: "https://commons.wikimedia.org/" }
    ],
    "new-adventures-tarzan": [
      { url: "https://www.erbzine.com/mag5/mvnadvh4.jpg", referer: "https://www.erbzine.com/mag63/0584.html" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/NewAdventuresTarzan_title.png", referer: "https://commons.wikimedia.org/" }
    ],
    "sherlock-secret-weapon": [
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/Sherlock_Holmes_and_the_Secret_Weapon_3.jpg", referer: "https://commons.wikimedia.org/" },
      { url: "https://commons.wikimedia.org/wiki/Special:FilePath/William_Post_Jr._in_Sherlock_Holmes_and_the_Secret_Weapon_(1942).png", referer: "https://commons.wikimedia.org/" }
    ]
  };
  const key = url.searchParams.get("key") || "";
  const sources = posters[key];
  if (!sources) return new Response("Poster not found.", { status: 404, headers: { "Cache-Control": "no-store" } });
  for (const item of sources) {
    try {
      const upstream = await fetch(item.url, {
        headers: {
          "User-Agent": "ORBIT-X/1.0 (poster image proxy)",
          "Referer": item.referer,
          "Accept": "image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8"
        },
        redirect: "follow"
      });
      if (!upstream.ok || !upstream.body) continue;
      const type = (upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      const bytes = await upstream.arrayBuffer();
      const b = new Uint8Array(bytes);
      const looksLikeImage = b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255 || b.length >= 8 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 || b.length >= 6 && String.fromCharCode(...b.slice(0, 6)).startsWith("GIF8") || b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP";
      if (!looksLikeImage && !type.startsWith("image/")) continue;
      const contentType = type.startsWith("image/") ? type : b[0] === 255 ? "image/jpeg" : "application/octet-stream";
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(bytes, { status: 200, headers });
    } catch (error) {
    }
  }
  return new Response("Poster source unavailable.", { status: 502, headers: { "Cache-Control": "no-store" } });
}
__name(posterProxy, "posterProxy");
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
           status, release_at, created_at, updated_at,
           COALESCE((SELECT group_concat(g.name, '||') FROM content_genres cg JOIN genres g ON g.id = cg.genre_id WHERE cg.content_id = content.id), '') AS genres
    FROM content
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY featured DESC, COALESCE(release_at, created_at) DESC, title ASC
  `;
  const result = await env.DB.prepare(sql).bind(...args).all();
  return json({ content: result.results || [] });
}
__name(listContent, "listContent");
async function saveContent(request, env) {
  const body = await request.json();
  const type = body.type === "show" ? "show" : "movie";
  const title = String(body.title || "").trim();
  if (!title) return json({ error: "Title is required." }, 400);
  const contentId = body.id || id("content");
  const slug = slugify(body.slug || title) || contentId;
  const status = ["draft", "scheduled", "published"].includes(body.status) ? body.status : "draft";
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
    // A YouTube thumbnail is never a movie poster. Keep it out of poster_url.
    String(body.poster_url || "").includes("i.ytimg.com/vi/") ? "" : String(body.poster_url || "").trim(),
    // YouTube thumbnails may be used as widescreen backdrops only.
    String(body.backdrop_url || "").trim() || (() => {
      const u = String(body.video_url || "");
      const m = u.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      return m ? "https://i.ytimg.com/vi/" + m[1] + "/hqdefault.jpg" : "";
    })(),
    String(body.trailer_url || ""),
    String(body.video_url || ""),
    body.featured ? 1 : 0,
    status,
    releaseAt
  ).run();
  await env.DB.prepare("DELETE FROM content_genres WHERE content_id = ?").bind(contentId).run();
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
__name(saveContent, "saveContent");
async function deleteContent(request, env) {
  const body = await request.json();
  if (!body.id) return json({ error: "Content ID is required." }, 400);
  await env.DB.prepare("DELETE FROM content WHERE id = ?").bind(body.id).run();
  return json({ ok: true });
}
__name(deleteContent, "deleteContent");
async function getGenres(env) {
  const result = await env.DB.prepare(
    "SELECT id, name, slug FROM genres ORDER BY name ASC"
  ).all();
  return json({ genres: result.results || [] });
}
__name(getGenres, "getGenres");
async function getSeasons(env, showId) {
  const result = await env.DB.prepare(`
    SELECT id, show_id, season_number, title, description
    FROM seasons
    WHERE show_id = ?
    ORDER BY season_number ASC
  `).bind(showId).all();
  return json({ seasons: result.results || [] });
}
__name(getSeasons, "getSeasons");
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
__name(saveSeason, "saveSeason");
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
__name(getEpisodes, "getEpisodes");
async function saveEpisode(request, env) {
  const body = await request.json();
  if (!body.season_id || !body.title) {
    return json({ error: "Season and episode title are required." }, 400);
  }
  const episodeId = body.id || id("episode");
  const status = ["draft", "scheduled", "published"].includes(body.status) ? body.status : "draft";
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
__name(saveEpisode, "saveEpisode");
async function upload(request, env) {
  const u = new URL(request.url);
  const folder = (u.searchParams.get("folder") || "uploads").replace(/[^a-z0-9_-]/gi, "") || "uploads";
  const filename = (u.searchParams.get("filename") || "file").replace(/[^a-z0-9._-]/gi, "_");
  const key = folder + "/" + crypto.randomUUID() + "-" + filename;
  const length = Number(request.headers.get("content-length") || 0);
  const maxSmall = 25 * 1024 * 1024;
  if (!length || length > maxSmall) return json({ ok: false, error: "This upload is missing a usable size or is over 25 MB. Posters and backdrops must be 25 MB or smaller." }, 413);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength !== length) return json({ ok: false, error: "Upload size changed while receiving the file." }, 400);
  try {
    const out = await b2UploadBytes(env, key, bytes, request.headers.get("content-type") || "application/octet-stream");
    return json({ ok: true, key, url: "/media/" + encodeURIComponent(key), fileId: out.result?.fileId, contentLength: out.result?.contentLength });
  } catch (e) {
    console.error("ORBIT_UPLOAD_ERROR", e);
    return json({ ok: false, error: e.message || "Backblaze upload failed." }, 500);
  }
}
__name(upload, "upload");
async function uploadUrl(request, env) {
  const body = await request.json();
  const folder = String(body.folder || "uploads").replace(/[^a-z0-9_-]/gi, "");
  const filename = String(body.filename || "file").replace(/[^a-z0-9._-]/gi, "_");
  const key = folder + "/" + crypto.randomUUID() + "-" + filename;
  return json({ ok: true, key, url: "/media/" + encodeURIComponent(key), upload_through_worker: true });
}
__name(uploadUrl, "uploadUrl");
async function importUrl(request, env) {
  const body = await request.json(), sourceUrl = String(body.url || "").trim();
  if (!/^https?:\/\//i.test(sourceUrl)) return json({ error: "A direct http(s) video URL is required." }, 400);
  let source;
  try {
    source = await fetch(sourceUrl, { redirect: "follow" });
  } catch (e) {
    return json({ error: "The source could not be reached." }, 400);
  }
  if (!source.ok || !source.body) return json({ error: "The source could not be downloaded (" + source.status + ")." }, 400);
  const length = Number(source.headers.get("content-length") || 0), maxBytes = 20 * 1024 * 1024 * 1024;
  if (length && length > maxBytes) return json({ error: "The source file is larger than the current 20 GB import limit." }, 413);
  let name = String(body.filename || "").trim();
  if (!name) {
    try {
      name = decodeURIComponent(new URL(sourceUrl).pathname.split("/").pop() || "video.mp4");
    } catch {
    }
  }
  name = name.replace(/[^a-z0-9._-]/gi, "_") || "video.mp4";
  const folder = String(body.folder || "videos").replace(/[^a-z0-9_-]/gi, "") || "videos", key = folder + "/" + crypto.randomUUID() + "-" + name;
  await b2SignedPutStream(env, key, source.body, source.headers.get("content-type") || "video/mp4", length || null);
  return json({ ok: true, key, url: "/media/" + encodeURIComponent(key), content_type: source.headers.get("content-type") || "video/mp4", content_length: length || null });
}
__name(importUrl, "importUrl");
async function ensureSiteSettings(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')").run();
}
__name(ensureSiteSettings, "ensureSiteSettings");
async function getSiteSettings(env) {
  await ensureSiteSettings(env);
  const r = await env.DB.prepare("SELECT key,value FROM site_settings ORDER BY key").all();
  const out = {};
  for (const row of r.results || []) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      out[row.key] = row.value;
    }
  }
  return out;
}
__name(getSiteSettings, "getSiteSettings");
async function publicSiteSettings(env) {
  return json({ settings: await getSiteSettings(env) });
}
__name(publicSiteSettings, "publicSiteSettings");
async function saveSiteSettings(request, env) {
  await ensureSiteSettings(env);
  const body = await request.json();
  const allowed = ["logo_text", "logo_url", "logo_size", "background_color", "header_background", "card_background", "accent", "text_color", "muted_color", "button_color", "button_hover", "watch_button_text", "ad_enabled", "ad_text", "promo_ids", "watch_now_ids", "featured_ids", "recent_ids", "blocked_search_terms", "footer_about", "footer_contact", "footer_copyright",  --- TRUNCATED --- 125,452 chars