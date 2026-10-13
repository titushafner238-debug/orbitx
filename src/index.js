var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __defProp22 = Object.defineProperty;
var __name22 = /* @__PURE__ */ __name2((target, value) => __defProp22(target, "name", { value, configurable: true }), "__name");
var __defProp222 = Object.defineProperty;
var __name222 = /* @__PURE__ */ __name22((target, value) => __defProp222(target, "name", { value, configurable: true }), "__name");
var __defProp2222 = Object.defineProperty;
var __name2222 = /* @__PURE__ */ __name222((target, value) => __defProp2222(target, "name", { value, configurable: true }), "__name");
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
__name2(json, "json");
__name22(json, "json");
__name222(json, "json");
__name2222(json, "json");
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
__name2(b2Native, "b2Native");
__name22(b2Native, "b2Native");
__name222(b2Native, "b2Native");
__name2222(b2Native, "b2Native");
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
__name2(b2UploadBytes, "b2UploadBytes");
__name22(b2UploadBytes, "b2UploadBytes");
__name222(b2UploadBytes, "b2UploadBytes");
__name2222(b2UploadBytes, "b2UploadBytes");
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
__name2(b2UploadStream, "b2UploadStream");
__name22(b2UploadStream, "b2UploadStream");
__name222(b2UploadStream, "b2UploadStream");
__name2222(b2UploadStream, "b2UploadStream");
async function b2DownloadUrl(env, key) {
  const b = await b2Native(env);
  const u = await fetch(b.auth.apiUrl + "/b2api/v4/b2_get_download_authorization", { method: "POST", headers: { Authorization: b.auth.authorizationToken, "Content-Type": "application/json" }, body: JSON.stringify({ bucketId: b.bucket.bucketId, fileNamePrefix: key, validDurationInSeconds: 3600 }) });
  if (!u.ok) throw new Error("Could not authorize Backblaze download: " + u.status + " " + await u.text());
  const d = await u.json();
  return b.auth.downloadUrl + "/file/" + encodeURIComponent(b.bucket.bucketName) + "/" + key.split("/").map(encodeURIComponent).join("/") + "?Authorization=" + encodeURIComponent(d.authorizationToken);
}
__name(b2DownloadUrl, "b2DownloadUrl");
__name2(b2DownloadUrl, "b2DownloadUrl");
__name22(b2DownloadUrl, "b2DownloadUrl");
__name222(b2DownloadUrl, "b2DownloadUrl");
__name2222(b2DownloadUrl, "b2DownloadUrl");
async function b2SignedGet(env, key) {
  return b2DownloadUrl(env, key);
}
__name(b2SignedGet, "b2SignedGet");
__name2(b2SignedGet, "b2SignedGet");
__name22(b2SignedGet, "b2SignedGet");
__name222(b2SignedGet, "b2SignedGet");
__name2222(b2SignedGet, "b2SignedGet");
async function b2SignedPutStream(env, key, stream, contentType = "application/octet-stream", contentLength = null) {
  await b2UploadStream(env, key, stream, contentType, contentLength);
}
__name(b2SignedPutStream, "b2SignedPutStream");
__name2(b2SignedPutStream, "b2SignedPutStream");
__name22(b2SignedPutStream, "b2SignedPutStream");
__name222(b2SignedPutStream, "b2SignedPutStream");
__name2222(b2SignedPutStream, "b2SignedPutStream");
function slugify(value) {
  return value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}
__name(slugify, "slugify");
__name2(slugify, "slugify");
__name22(slugify, "slugify");
__name222(slugify, "slugify");
__name2222(slugify, "slugify");
function id(prefix = "orb") {
  return prefix + "_" + crypto.randomUUID().replaceAll("-", "");
}
__name(id, "id");
__name2(id, "id");
__name22(id, "id");
__name222(id, "id");
__name2222(id, "id");
function publicContentWhere() {
  return `status = 'published'
    AND (release_at IS NULL OR release_at <= datetime('now'))`;
}
__name(publicContentWhere, "publicContentWhere");
__name2(publicContentWhere, "publicContentWhere");
__name22(publicContentWhere, "publicContentWhere");
__name222(publicContentWhere, "publicContentWhere");
__name2222(publicContentWhere, "publicContentWhere");
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
  if (key === "sherlock-secret-weapon") {
    try {
      const meta = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/Sherlock_Holmes_and_the_Secret_Weapon", { headers: { "User-Agent": "ORBIT-X/1.0 (poster image proxy)", "Accept": "application/json" } });
      if (meta.ok) {
        const data = await meta.json();
        const posterUrl = data.originalimage?.source || data.thumbnail?.source;
        if (posterUrl && Array.isArray(posters[key])) posters[key].unshift({ url: posterUrl, referer: "https://en.wikipedia.org/wiki/Sherlock_Holmes_and_the_Secret_Weapon" });
      }
    } catch {}
  }
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
__name2(posterProxy, "posterProxy");
__name22(posterProxy, "posterProxy");
__name222(posterProxy, "posterProxy");
__name2222(posterProxy, "posterProxy");
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
           poster_url, backdrop_url, trailer_url, video_url, captions_url, featured,
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
__name2(listContent, "listContent");
__name22(listContent, "listContent");
__name222(listContent, "listContent");
__name2222(listContent, "listContent");
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
      poster_url, backdrop_url, trailer_url, video_url, captions_url, featured,
      status, release_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
      captions_url=excluded.captions_url,
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
    String(body.captions_url || ""),
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
__name2(saveContent, "saveContent");
__name22(saveContent, "saveContent");
__name222(saveContent, "saveContent");
__name2222(saveContent, "saveContent");
async function deleteContent(request, env) {
  const body = await request.json();
  if (!body.id) return json({ error: "Content ID is required." }, 400);
  await env.DB.prepare("DELETE FROM content WHERE id = ?").bind(body.id).run();
  return json({ ok: true });
}
__name(deleteContent, "deleteContent");
__name2(deleteContent, "deleteContent");
__name22(deleteContent, "deleteContent");
__name222(deleteContent, "deleteContent");
__name2222(deleteContent, "deleteContent");
async function getGenres(env) {
  const result = await env.DB.prepare(
    "SELECT id, name, slug FROM genres ORDER BY name ASC"
  ).all();
  return json({ genres: result.results || [] });
}
__name(getGenres, "getGenres");
__name2(getGenres, "getGenres");
__name22(getGenres, "getGenres");
__name222(getGenres, "getGenres");
__name2222(getGenres, "getGenres");
async function getSeasons(env, showId, admin = false) {
  const sql = admin ? `
    SELECT s.id, s.show_id, s.season_number, s.title, s.description
    FROM seasons s
    WHERE s.show_id = ?
    ORDER BY s.season_number ASC
  ` : `
    SELECT s.id, s.show_id, s.season_number, s.title, s.description
    FROM seasons s
    JOIN content c ON c.id = s.show_id
    WHERE s.show_id = ?
      AND c.status = 'published'
      AND (c.release_at IS NULL OR c.release_at <= datetime('now'))
    ORDER BY s.season_number ASC
  `;
  const result = await env.DB.prepare(sql).bind(showId).all();
  return json({ seasons: result.results || [] });
}
__name(getSeasons, "getSeasons");
__name2(getSeasons, "getSeasons");
__name22(getSeasons, "getSeasons");
__name222(getSeasons, "getSeasons");
__name2222(getSeasons, "getSeasons");
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
__name2(saveSeason, "saveSeason");
__name22(saveSeason, "saveSeason");
__name222(saveSeason, "saveSeason");
__name2222(saveSeason, "saveSeason");
async function getEpisodes(env, seasonId, admin = false) {
  const sql = admin ? `
    SELECT e.id, e.season_id, e.episode_number, e.title, e.description, e.runtime_minutes,
           e.thumbnail_url, e.video_url, e.captions_url, e.status, e.release_at
    FROM episodes e
    WHERE e.season_id = ?
    ORDER BY e.episode_number ASC
  ` : `
    SELECT e.id, e.season_id, e.episode_number, e.title, e.description, e.runtime_minutes,
           e.thumbnail_url, e.video_url, e.captions_url, e.status, e.release_at
    FROM episodes e
    JOIN seasons s ON s.id = e.season_id
    JOIN content c ON c.id = s.show_id
    WHERE e.season_id = ?
      AND c.status = 'published'
      AND (c.release_at IS NULL OR c.release_at <= datetime('now'))
      AND e.status = 'published'
      AND (e.release_at IS NULL OR e.release_at <= datetime('now'))
    ORDER BY e.episode_number ASC
  `;
  const result = await env.DB.prepare(sql).bind(seasonId).all();
  return json({ episodes: result.results || [] });
}
__name(getEpisodes, "getEpisodes");
__name2(getEpisodes, "getEpisodes");
__name22(getEpisodes, "getEpisodes");
__name222(getEpisodes, "getEpisodes");
__name2222(getEpisodes, "getEpisodes");
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
      thumbnail_url, video_url, captions_url, status, release_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      episode_number=excluded.episode_number,
      title=excluded.title,
      description=excluded.description,
      runtime_minutes=excluded.runtime_minutes,
      thumbnail_url=excluded.thumbnail_url,
      video_url=excluded.video_url,
      captions_url=excluded.captions_url,
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
    String(body.captions_url || ""),
    status,
    body.release_at || null
  ).run();
  return json({ ok: true, id: episodeId });
}
__name(saveEpisode, "saveEpisode");
__name2(saveEpisode, "saveEpisode");
__name22(saveEpisode, "saveEpisode");
__name222(saveEpisode, "saveEpisode");
__name2222(saveEpisode, "saveEpisode");
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
__name2(upload, "upload");
__name22(upload, "upload");
__name222(upload, "upload");
__name2222(upload, "upload");
async function uploadUrl(request, env) {
  const body = await request.json();
  const folder = String(body.folder || "uploads").replace(/[^a-z0-9_-]/gi, "");
  const filename = String(body.filename || "file").replace(/[^a-z0-9._-]/gi, "_");
  const key = folder + "/" + crypto.randomUUID() + "-" + filename;
  return json({ ok: true, key, url: "/media/" + encodeURIComponent(key), upload_through_worker: true });
}
__name(uploadUrl, "uploadUrl");
__name2(uploadUrl, "uploadUrl");
__name22(uploadUrl, "uploadUrl");
__name222(uploadUrl, "uploadUrl");
__name2222(uploadUrl, "uploadUrl");
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
__name2(importUrl, "importUrl");
__name22(importUrl, "importUrl");
__name222(importUrl, "importUrl");
__name2222(importUrl, "importUrl");
async function ensureSiteSettings(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')").run();
}
__name(ensureSiteSettings, "ensureSiteSettings");
__name2(ensureSiteSettings, "ensureSiteSettings");
__name22(ensureSiteSettings, "ensureSiteSettings");
__name222(ensureSiteSettings, "ensureSiteSettings");
__name2222(ensureSiteSettings, "ensureSiteSettings");
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
__name2(getSiteSettings, "getSiteSettings");
__name22(getSiteSettings, "getSiteSettings");
__name222(getSiteSettings, "getSiteSettings");
__name2222(getSiteSettings, "getSiteSettings");
async function publicSiteSettings(env) {
  return json({ settings: await getSiteSettings(env) });
}
__name(publicSiteSettings, "publicSiteSettings");
__name2(publicSiteSettings, "publicSiteSettings");
__name22(publicSiteSettings, "publicSiteSettings");
__name222(publicSiteSettings, "publicSiteSettings");
__name2222(publicSiteSettings, "publicSiteSettings");
async function saveSiteSettings(request, env) {
  await ensureSiteSettings(env);
  const body = await request.json();
  const allowed = ["logo_text", "logo_url", "logo_size", "background_color", "header_background", "card_background", "accent", "text_color", "muted_color", "button_color", "button_hover", "watch_button_text", "ad_enabled", "ad_text", "promo_ids", "watch_now_ids", "featured_ids", "recent_ids", "blocked_search_terms", "footer_about", "footer_contact", "footer_copyright", "footer_privacy", "hero_title", "hero_description", "hero_backdrop", "featured_title", "recent_title", "watch_now_title", "tv_title", "max_width"];
  for (const key of allowed) {
    if (!(key in body)) continue;
    const value = typeof body[key] === "string" ? body[key] : JSON.stringify(body[key]);
    await env.DB.prepare("INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key, value).run();
  }
  return json({ ok: true, settings: await getSiteSettings(env) });
}
__name(saveSiteSettings, "saveSiteSettings");
__name2(saveSiteSettings, "saveSiteSettings");
__name22(saveSiteSettings, "saveSiteSettings");
__name222(saveSiteSettings, "saveSiteSettings");
__name2222(saveSiteSettings, "saveSiteSettings");
async function requireAdmin(request, env) {
  const u = await currentUser(request, env);
  if (!u) return null;
  return Number(u.is_admin) === 1 ? u : null;
}
__name(requireAdmin, "requireAdmin");
__name2(requireAdmin, "requireAdmin");
__name22(requireAdmin, "requireAdmin");
__name222(requireAdmin, "requireAdmin");
__name2222(requireAdmin, "requireAdmin");
async function adminUsers(env) {
  const r = await env.DB.prepare(`SELECT u.id,u.email,u.created_at,u.disabled,u.is_admin,COUNT(p.id) AS profiles FROM users u LEFT JOIN profiles p ON p.user_id=u.id GROUP BY u.id ORDER BY u.created_at DESC`).all();
  return json({ users: r.results || [] });
}
__name(adminUsers, "adminUsers");
__name2(adminUsers, "adminUsers");
__name22(adminUsers, "adminUsers");
__name222(adminUsers, "adminUsers");
__name2222(adminUsers, "adminUsers");
var AUTH_COOKIE = "orbit_session";
var SESSION_DAYS = 30;
function avatarSvg(kind) {
  const colors = { cat: "#b9d6ff", fox: "#ffb37a", monster: "#c8a8ff", robot: "#9ee7dc", bunny: "#ffd1e3", bear: "#d9b58c", star: "#ffe48a", alien: "#a7f3b0", dog: "#c9b08a", frog: "#8be28d", panda: "#e8e8e8", dragon: "#ff9d9d" };
  const c = colors[kind] || "#cbd5e1";
  const eyes = kind === "robot" ? "<rect x='28' y='31' width='8' height='8' rx='2' fill='#111'/><rect x='44' y='31' width='8' height='8' rx='2' fill='#111'/>" : "<circle cx='31' cy='35' r='4' fill='#111'/><circle cx='49' cy='35' r='4' fill='#111'/>";
  const ears = kind === "bunny" ? "<path d='M25 22 Q18 3 29 5 Q36 8 35 25 M45 25 Q44 8 51 5 Q62 3 55 22' fill='" + c + "' stroke='#111' stroke-width='3'/>" : kind === "cat" || kind === "fox" || kind === "dog" || kind === "dragon" ? "<path d='M22 27 L19 10 L34 20 M52 20 L67 10 L64 28' fill='" + c + "' stroke='#111' stroke-width='3'/>" : "";
  const horn = kind === "star" || kind === "alien" || kind === "dragon" ? "<path d='M40 17 L45 5 L50 18' fill='" + c + "' stroke='#111' stroke-width='3'/>" : "";
  return "<svg viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg' aria-hidden='true' focusable='false'>" + horn + ears + "<rect x='18' y='18' width='44' height='48' rx='20' fill='" + c + "' stroke='#111' stroke-width='3'/>" + eyes + "<path d='M31 50 Q40 57 49 50' fill='none' stroke='#111' stroke-width='3' stroke-linecap='round'/></svg>";
}
__name(avatarSvg, "avatarSvg");
__name2(avatarSvg, "avatarSvg");
__name22(avatarSvg, "avatarSvg");
__name222(avatarSvg, "avatarSvg");
__name2222(avatarSvg, "avatarSvg");
var AVATARS = [
  { id: "orbit-cat", name: "Cosmo Cat", icon: avatarSvg("cat") },
  { id: "orbit-fox", name: "Nova Fox", icon: avatarSvg("fox") },
  { id: "orbit-monster", name: "Orbit Monster", icon: avatarSvg("monster") },
  { id: "orbit-robot", name: "Pixel Bot", icon: avatarSvg("robot") },
  { id: "orbit-bunny", name: "Moon Bunny", icon: avatarSvg("bunny") },
  { id: "orbit-bear", name: "Comet Bear", icon: avatarSvg("bear") },
  { id: "orbit-unicorn", name: "Star Friend", icon: avatarSvg("star") },
  { id: "orbit-alien", name: "Zippy Alien", icon: avatarSvg("alien") },
  { id: "orbit-dog", name: "Rocket Pup", icon: avatarSvg("dog") },
  { id: "orbit-frog", name: "Cosmic Frog", icon: avatarSvg("frog") },
  { id: "orbit-panda", name: "Galaxy Panda", icon: avatarSvg("panda") },
  { id: "orbit-dragon", name: "Little Dragon", icon: avatarSvg("dragon") }
];
function b64u(bytes) {
  let s = "";
  const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(b64u, "b64u");
__name2(b64u, "b64u");
__name22(b64u, "b64u");
__name222(b64u, "b64u");
__name2222(b64u, "b64u");
function fromB64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const b = atob(s), o = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i);
  return o;
}
__name(fromB64u, "fromB64u");
__name2(fromB64u, "fromB64u");
__name22(fromB64u, "fromB64u");
__name222(fromB64u, "fromB64u");
__name2222(fromB64u, "fromB64u");
async function sha256Text(v) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
}
__name(sha256Text, "sha256Text");
__name2(sha256Text, "sha256Text");
__name22(sha256Text, "sha256Text");
__name222(sha256Text, "sha256Text");
__name2222(sha256Text, "sha256Text");
async function hashPassword(p) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(p), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 1e5, hash: "SHA-256" }, k, 256);
  return "pbkdf2$100000$" + b64u(salt) + "$" + b64u(bits);
}
__name(hashPassword, "hashPassword");
__name2(hashPassword, "hashPassword");
__name22(hashPassword, "hashPassword");
__name222(hashPassword, "hashPassword");
__name2222(hashPassword, "hashPassword");
async function verifyPassword(p, stored) {
  const x = String(stored || "").split("$");
  if (x.length !== 4 || x[0] !== "pbkdf2") return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(p), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromB64u(x[2]), iterations: Number(x[1]), hash: "SHA-256" }, k, 256);
  const storedHash = fromB64u(x[3]);
  const actual = new Uint8Array(bits);
  if (storedHash.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ storedHash[i];
  return diff === 0;
}
__name(verifyPassword, "verifyPassword");
__name2(verifyPassword, "verifyPassword");
__name22(verifyPassword, "verifyPassword");
__name222(verifyPassword, "verifyPassword");
__name2222(verifyPassword, "verifyPassword");
function passwordError(p) {
  if (typeof p !== "string" || p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(p)) return "Password needs at least one uppercase letter.";
  if (!/[a-z]/.test(p)) return "Password needs at least one lowercase letter.";
  if (!/[0-9]/.test(p)) return "Password needs at least one number.";
  if (!/[^A-Za-z0-9]/.test(p)) return "Password needs at least one special character.";
  return null;
}
__name(passwordError, "passwordError");
__name2(passwordError, "passwordError");
__name22(passwordError, "passwordError");
__name222(passwordError, "passwordError");
__name2222(passwordError, "passwordError");
function cookieValue(req, name) {
  const h = req.headers.get("Cookie") || "";
  const x = h.split(";").map((v) => v.trim()).find((v) => v.startsWith(name + "="));
  return x ? decodeURIComponent(x.slice(name.length + 1)) : null;
}
__name(cookieValue, "cookieValue");
__name2(cookieValue, "cookieValue");
__name22(cookieValue, "cookieValue");
__name222(cookieValue, "cookieValue");
__name2222(cookieValue, "cookieValue");
async function sessionTokenHash(t) {
  return b64u(await sha256Text(t));
}
__name(sessionTokenHash, "sessionTokenHash");
__name2(sessionTokenHash, "sessionTokenHash");
__name22(sessionTokenHash, "sessionTokenHash");
__name222(sessionTokenHash, "sessionTokenHash");
__name2222(sessionTokenHash, "sessionTokenHash");
async function createSession(userId, env) {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  const token = b64u(b), hash = await sessionTokenHash(token), expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)").bind(id("session"), userId, hash, expires).run();
  return { token, expires };
}
__name(createSession, "createSession");
__name2(createSession, "createSession");
__name22(createSession, "createSession");
__name222(createSession, "createSession");
__name2222(createSession, "createSession");
async function currentUser(req, env) {
  const token = cookieValue(req, AUTH_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare("SELECT u.id,u.email,u.created_at,u.email_verified,u.is_admin FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now') AND u.disabled=0").bind(await sessionTokenHash(token)).first();
  return row || null;
}
__name(currentUser, "currentUser");
__name2(currentUser, "currentUser");
__name22(currentUser, "currentUser");
__name222(currentUser, "currentUser");
__name2222(currentUser, "currentUser");
function sessionCookie(token, expires) {
  return AUTH_COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=" + new Date(expires).toUTCString();
}
__name(sessionCookie, "sessionCookie");
__name2(sessionCookie, "sessionCookie");
__name22(sessionCookie, "sessionCookie");
__name222(sessionCookie, "sessionCookie");
__name2222(sessionCookie, "sessionCookie");
function clearSessionCookie() {
  return AUTH_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
__name(clearSessionCookie, "clearSessionCookie");
__name2(clearSessionCookie, "clearSessionCookie");
__name22(clearSessionCookie, "clearSessionCookie");
__name222(clearSessionCookie, "clearSessionCookie");
__name2222(clearSessionCookie, "clearSessionCookie");
function authJson(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}
__name(authJson, "authJson");
__name2(authJson, "authJson");
__name22(authJson, "authJson");
__name222(authJson, "authJson");
__name2222(authJson, "authJson");
async function signup(req, env) {
  const b = await req.json(), email = String(b.email || "").trim().toLowerCase(), password = String(b.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authJson({ error: "Please enter a valid email address." }, 400);
  const pe = passwordError(password);
  if (pe) return authJson({ error: pe }, 400);
  if (await env.DB.prepare("SELECT id FROM users WHERE email=? COLLATE NOCASE").bind(email).first()) return authJson({ error: "An account with that email already exists." }, 409);
  const uid = id("user");
  await env.DB.prepare("INSERT INTO users (id,email,password_hash) VALUES (?,?,?)").bind(uid, email, await hashPassword(password)).run();
  await env.DB.prepare("INSERT INTO profiles (id,user_id,name,avatar_id) VALUES (?,?,?,?)").bind(id("profile"), uid, "My Profile", "orbit-cat").run();
  await env.DB.prepare("INSERT INTO user_settings (user_id) VALUES (?)").bind(uid).run();
  const s = await createSession(uid, env);
  return authJson({ ok: true, user: { id: uid, email }, message: "Welcome to ORBIT X." }, 201, { "Set-Cookie": sessionCookie(s.token, s.expires) });
}
__name(signup, "signup");
__name2(signup, "signup");
__name22(signup, "signup");
__name222(signup, "signup");
__name2222(signup, "signup");
async function login(req, env) {
  const b = await req.json(), email = String(b.email || "").trim().toLowerCase(), password = String(b.password || ""), u = await env.DB.prepare("SELECT id,email,password_hash FROM users WHERE email=? COLLATE NOCASE AND disabled=0").bind(email).first();
  if (!u || !await verifyPassword(password, u.password_hash)) return authJson({ error: "Email or password is incorrect." }, 401);
  const s = await createSession(u.id, env);
  return authJson({ ok: true, user: { id: u.id, email: u.email } }, 200, { "Set-Cookie": sessionCookie(s.token, s.expires) });
}
__name(login, "login");
__name2(login, "login");
__name22(login, "login");
__name222(login, "login");
__name2222(login, "login");
async function logout(req, env) {
  const t = cookieValue(req, AUTH_COOKIE);
  if (t) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sessionTokenHash(t)).run();
  return authJson({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
__name(logout, "logout");
__name2(logout, "logout");
__name22(logout, "logout");
__name222(logout, "logout");
__name2222(logout, "logout");
async function accountData(req, env) {
  const u = await currentUser(req, env);
  if (!u) return authJson({ authenticated: false, avatars: AVATARS });
  const profiles = (await env.DB.prepare("SELECT id,name,avatar_id FROM profiles WHERE user_id=? ORDER BY created_at ASC").bind(u.id).all()).results || [];
  const settings = await env.DB.prepare("SELECT language,sound_enabled,sound_volume,blind_mode FROM user_settings WHERE user_id=?").bind(u.id).first();
  return authJson({ authenticated: true, user: u, profiles, settings, avatars: AVATARS });
}
__name(accountData, "accountData");
__name2(accountData, "accountData");
__name22(accountData, "accountData");
__name222(accountData, "accountData");
__name2222(accountData, "accountData");
async function saveProfile(req, env) {
  const u = await currentUser(req, env);
  if (!u) return authJson({ error: "Please sign in." }, 401);
  const b = await req.json(), name = String(b.name || "").trim().slice(0, 24), avatar = String(b.avatar_id || "orbit-cat");
  if (!name) return authJson({ error: "Profile name is required." }, 400);
  if (!AVATARS.some((a) => a.id === avatar)) return authJson({ error: "Choose a valid avatar." }, 400);
  try {
    if (b.id) await env.DB.prepare("UPDATE profiles SET name=?,avatar_id=?,updated_at=datetime('now') WHERE id=? AND user_id=?").bind(name, avatar, b.id, u.id).run();
    else {
      const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM profiles WHERE user_id=?").bind(u.id).first();
      if (Number(c.n) >= 8) return authJson({ error: "You can have up to 8 family profiles." }, 400);
      await env.DB.prepare("INSERT INTO profiles (id,user_id,name,avatar_id) VALUES (?,?,?,?)").bind(id("profile"), u.id, name, avatar).run();
    }
  } catch (e) {
    return authJson({ error: "That profile name is already in use." }, 409);
  }
  return accountData(req, env);
}
__name(saveProfile, "saveProfile");
__name2(saveProfile, "saveProfile");
__name22(saveProfile, "saveProfile");
__name222(saveProfile, "saveProfile");
__name2222(saveProfile, "saveProfile");
async function deleteProfile(req, env) {
  const u = await currentUser(req, env);
  if (!u) return authJson({ error: "Please sign in." }, 401);
  const b = await req.json(), c = await env.DB.prepare("SELECT COUNT(*) AS n FROM profiles WHERE user_id=?").bind(u.id).first();
  if (Number(c.n) <= 1) return authJson({ error: "Keep at least one profile." }, 400);
  await env.DB.prepare("DELETE FROM profiles WHERE id=? AND user_id=?").bind(b.id, u.id).run();
  return accountData(req, env);
}
__name(deleteProfile, "deleteProfile");
__name2(deleteProfile, "deleteProfile");
__name22(deleteProfile, "deleteProfile");
__name222(deleteProfile, "deleteProfile");
__name2222(deleteProfile, "deleteProfile");
async function saveSettings(req, env) {
  const u = await currentUser(req, env);
  if (!u) return authJson({ error: "Please sign in." }, 401);
  const b = await req.json(), language = ["en", "es", "fr", "de", "pt"].includes(b.language) ? b.language : "en", se = b.sound_enabled ? 1 : 0, sv = Math.max(0, Math.min(100, Number(b.sound_volume ?? 55))), blind = b.blind_mode ? 1 : 0;
  await env.DB.prepare("INSERT INTO user_settings (user_id,language,sound_enabled,sound_volume,blind_mode) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET language=excluded.language,sound_enabled=excluded.sound_enabled,sound_volume=excluded.sound_volume,blind_mode=excluded.blind_mode").bind(u.id, language, se, sv, blind).run();
  return accountData(req, env);
}
__name(saveSettings, "saveSettings");
__name2(saveSettings, "saveSettings");
__name22(saveSettings, "saveSettings");
__name222(saveSettings, "saveSettings");
__name2222(saveSettings, "saveSettings");
var ACCOUNT_HTML = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>ORBIT X — Account</title>\n<style>\n:root{color-scheme:dark;--bg:#07080b;--panel:#11141a;--panel2:#171b23;--line:#2a303b;--text:#f5f7fb;--muted:#9da6b5;--accent:#fff}\n*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#1c2330,#07080b 55%);color:var(--text);font-family:Inter,system-ui,-apple-system,sans-serif;min-height:100vh}\na{color:inherit}.wrap{max-width:1050px;margin:auto;padding:28px 20px 70px}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:35px}.logo{font-weight:950;letter-spacing:.18em;font-size:25px}.back{text-decoration:none;color:var(--muted)}\n.card{background:rgba(17,20,26,.9);border:1px solid var(--line);border-radius:18px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.auth{max-width:520px;margin:40px auto}.tabs{display:flex;gap:8px;margin-bottom:20px}.tabs button,.btn{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:10px;padding:11px 16px;font-weight:750;cursor:pointer}.tabs button.active,.btn.primary{background:#fff;color:#08090b;border-color:#fff}\nh1,h2,h3{margin-top:0}label{display:block;margin:14px 0 7px;font-size:13px;font-weight:750}input,select{width:100%;padding:12px;border-radius:10px;background:#0a0c10;border:1px solid var(--line);color:var(--text);font:inherit}input:focus,select:focus{outline:2px solid #555}\n.rules{display:grid;gap:5px;color:var(--muted);font-size:13px;margin:10px 0 18px}.rules span.ok{color:#d8fbd8}.msg{min-height:22px;color:#ffb9c0;font-size:13px}.hidden{display:none!important}\n.profile-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}.profile{border:1px solid var(--line);background:#0d1015;border-radius:15px;padding:18px;cursor:pointer}.profile:hover{border-color:#555}.avatar{font-size:48px;width:78px;height:78px;border-radius:22px;background:#191e27;display:grid;place-items:center;margin-bottom:12px}.profile small{color:var(--muted)}\n.avatar-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.avatar-choice{border:1px solid var(--line);background:#0b0e13;border-radius:12px;padding:10px;text-align:center;cursor:pointer;font-size:27px}.avatar-choice.selected{border-color:#fff;background:#202630}.avatar-choice span{display:block;font-size:10px;color:var(--muted);margin-top:4px}\n.settings{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px}.setting{border:1px solid var(--line);border-radius:14px;padding:18px;background:#0d1015}.range{display:flex;gap:12px;align-items:center}.range input{padding:0}.switch{display:flex;gap:10px;align-items:center}.switch input{width:auto}\n.account-menu{display:flex;align-items:center;gap:10px}.footer{margin-top:30px;color:var(--muted);font-size:12px;text-align:center}\n@media(max-width:650px){.settings{grid-template-columns:1fr}.avatar-grid{grid-template-columns:repeat(4,1fr)}}\n</style>\n    <link rel=\"stylesheet\" href=\"/theme.css?v=20261011-lunar-purple\">\n</head>\n<body>\n<div class=\"wrap\">\n<div class=\"top\"><a class=\"logo\" href=\"/\"><img class=\"orbit-wordmark\" src=\"/orbitx-wordmark.svg\" alt=\"ORBIT X\"></a><div class=\"account-menu\"><a class=\"back\" href=\"/\">Home</a><button id=\"settingsJump\" class=\"btn\">Settings</button></div></div>\n<div id=\"authView\" class=\"card auth\">\n<h1 id=\"authTitle\">Welcome to ORBIT X</h1>\n<p style=\"color:var(--muted)\">Create one account, then make separate profiles for family members.</p>\n<div class=\"tabs\"><button id=\"loginTab\" class=\"active\">Sign In</button><button id=\"signupTab\">Create Account</button></div>\n<form id=\"authForm\">\n<label>Email</label><input id=\"email\" type=\"email\" autocomplete=\"email\" required>\n<label>Password</label><input id=\"password\" type=\"password\" autocomplete=\"current-password\" required>\n<div id=\"rules\" class=\"rules hidden\"><div id=\"r8\">○ At least 8 characters</div><div id=\"ru\">○ At least one uppercase letter</div><div id=\"rl\">○ At least one lowercase letter</div><div id=\"rn\">○ At least one number</div><div id=\"rs\">○ At least one special character</div></div>\n<button class=\"btn primary\" style=\"width:100%\" id=\"authSubmit\">Sign In</button>\n<div id=\"authMsg\" class=\"msg\"></div>\n</form>\n</div>\n<div id=\"accountView\" class=\"hidden\">\n<div class=\"card\">\n<div style=\"display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap\"><div><h1>Who's watching?</h1><p style=\"color:var(--muted)\">Choose a family profile or make a new one.</p></div><button id=\"logout\" class=\"btn\">Sign Out</button></div>\n<div id=\"profiles\" class=\"profile-grid\" style=\"margin-top:22px\"></div>\n</div>\n<div class=\"card\" style=\"margin-top:18px\">\n<h2>Family Profile</h2>\n<div class=\"two\" style=\"display:grid;grid-template-columns:1fr 1fr;gap:14px\"><div><label>Profile name</label><input id=\"profileName\" maxlength=\"24\" placeholder=\"e.g. Mom\"></div><div><label>Avatar</label><div id=\"avatarPreview\" class=\"avatar\"></div></div></div>\n<label>Pick a little ORBIT friend</label><div id=\"avatarGrid\" class=\"avatar-grid\"></div>\n<div style=\"display:flex;gap:10px;margin-top:16px;flex-wrap:wrap\"><button id=\"saveProfile\" class=\"btn primary\">Save Profile</button><button id=\"newProfile\" class=\"btn\">New Profile</button><button id=\"deleteProfile\" class=\"btn\" style=\"display:none\">Delete Profile</button></div>\n<div id=\"profileMsg\" class=\"msg\"></div>\n</div>\n<div class=\"card\" id=\"settings\" style=\"margin-top:18px\">\n<h2>Settings</h2>\n<div class=\"settings\">\n<div class=\"setting\"><h3>Language</h3><p style=\"color:var(--muted)\">Choose the language for ORBIT X controls and accessibility.</p><select id=\"language\"><option value=\"en\">English</option><option value=\"es\">Español</option><option value=\"fr\">Français</option><option value=\"de\">Deutsch</option><option value=\"pt\">Português</option></select></div>\n<div class=\"setting\"><h3>Peaceful Sounds</h3><label class=\"switch\"><input id=\"soundEnabled\" type=\"checkbox\"> Sound effects on</label><div class=\"range\"><input id=\"soundVolume\" type=\"range\" min=\"0\" max=\"100\"><output id=\"volumeOut\"></output></div><small style=\"color:var(--muted)\">Soft chimes for clicks, scrolling, opening and closing.</small></div>\n<div class=\"setting\"><h3>Blind Mode</h3><label class=\"switch\"><input id=\"blindMode\" type=\"checkbox\"> Read focused content aloud</label><p style=\"color:var(--muted)\">Uses your device's built-in speech voice to read the page text when you focus or select controls.</p></div><div class=\"setting\"><h3>Dark Mode</h3><label class=\"switch\"><input id=\"darkMode\" type=\"checkbox\" checked> Use dark appearance</label><p style=\"color:var(--muted)\">Keep ORBIT X dark and easy on the eyes.</p></div>\n</div>\n<button id=\"saveSettings\" class=\"btn primary\" style=\"margin-top:18px\">Save Settings</button><span id=\"settingsMsg\" style=\"margin-left:10px;color:#b8f5c0\"></span>\n</div>\n<div class=\"footer\">ORBIT X — Free Entertainment</div>\n</div>\n</div>\n<script src=\"/site.js\"></script>\n<script>\nconst $=id=>document.getElementById(id);let mode=\"login\",state=null,selectedAvatar=\"orbit-cat\",editingProfile=null;\nasync function api(url,opts={}){let r;try{r=await fetch(url,{credentials:\"include\",cache:\"no-store\",...opts,headers:{\"Content-Type\":\"application/json\",...(opts.headers||{})}})}catch(e){throw Error(\"Could not connect to ORBIT X. Please refresh and try again.\")}const text=await r.text();let d={};try{d=text?JSON.parse(text):{}}catch(e){}if(!r.ok)throw Error(d.error||(\"ORBIT X returned error \"+r.status+\".\"));return d}\nfunction showMsg(el,msg){$(el).textContent=msg}\nfunction rules(){const p=$(\"password\").value;const checks=[[\"r8\",p.length>=8],[\"ru\",/[A-Z]/.test(p)],[\"rl\",/[a-z]/.test(p)],[\"rn\",/[0-9]/.test(p)],[\"rs\",/[^A-Za-z0-9]/.test(p)]];checks.forEach(([id,ok])=>{$(id).textContent=(ok?\"✓ \":\"○ \")+$(id).textContent.slice(2);$(id).classList.toggle(\"ok\",ok)})}\nfunction setMode(m){mode=m;$(\"loginTab\").classList.toggle(\"active\",m===\"login\");$(\"signupTab\").classList.toggle(\"active\",m===\"signup\");$(\"authTitle\").textContent=m===\"login\"?\"Welcome back to ORBIT X\":\"Create your ORBIT X account\";$(\"authSubmit\").textContent=m===\"login\"?\"Sign In\":\"Create Account\";$(\"rules\").classList.toggle(\"hidden\",m!==\"signup\");$(\"password\").autocomplete=m===\"login\"?\"current-password\":\"new-password\";showMsg(\"authMsg\",\"\")}\n$(\"loginTab\").onclick=()=>setMode(\"login\");$(\"signupTab\").onclick=()=>setMode(\"signup\");$(\"password\").oninput=rules;\n$(\"authForm\").onsubmit=async e=>{e.preventDefault();showMsg(\"authMsg\",\"\");const btn=$(\"authSubmit\");btn.disabled=true;btn.textContent=mode===\"login\"?\"Signing In…\":\"Creating Account…\";try{const d=await api(mode===\"login\"?\"/api/auth/login\":\"/api/auth/signup\",{method:\"POST\",body:JSON.stringify({email:$(\"email\").value.trim(),password:$(\"password\").value})});if(!d.ok)throw Error(d.error||\"Account request failed.\");await showAccount();if(mode===\"signup\"){showMsg(\"authMsg\",\"Account created! You are now signed in.\")}else{showMsg(\"authMsg\",\"Signed in successfully.\")}}catch(err){showMsg(\"authMsg\",err.message)}finally{btn.disabled=false;btn.textContent=mode===\"login\"?\"Sign In\":\"Create Account\"}};\nasync function showAccount(){state=await api(\"/api/auth/me\");if(!state.authenticated){$(\"authView\").classList.remove(\"hidden\");$(\"accountView\").classList.add(\"hidden\");return}$(\"authView\").classList.add(\"hidden\");$(\"accountView\").classList.remove(\"hidden\");render()}\nfunction render(){const d=state;$(\"profiles\").innerHTML=(d.profiles||[]).map(p=>{const a=(d.avatars||[]).find(x=>x.id===p.avatar_id)||d.avatars[0];return '<button class=\"profile\" data-id=\"'+p.id+'\"><div class=\"avatar\">'+a.icon+'</div><strong>'+escapeHtml(p.name)+'</strong><br><small>Family profile</small></button>'}).join(\"\");document.querySelectorAll(\".profile\").forEach(x=>x.onclick=()=>edit(x.dataset.id));renderAvatars();const s=d.settings||{};$(\"language\").value=s.language||\"en\";$(\"soundEnabled\").checked=!!s.sound_enabled;$(\"soundVolume\").value=s.sound_volume??55;$(\"volumeOut\").value=($(\"soundVolume\").value)+\"%\";$(\"blindMode\").checked=!!s.blind_mode;$(\"darkMode\").checked=localStorage.getItem(\"orbitx-dark-mode\")!==\"off\";}\nfunction escapeHtml(s){return String(s).replace(/[&<>\"]/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\"}[c]))}\nfunction renderAvatars(){$(\"avatarGrid\").innerHTML=(state.avatars||[]).map(a=>'<button type=\"button\" class=\"avatar-choice '+(selectedAvatar===a.id?\"selected\":\"\")+'\" data-avatar=\"'+a.id+'\">'+a.icon+'<span>'+escapeHtml(a.name)+'</span></button>').join(\"\");document.querySelectorAll(\"[data-avatar]\").forEach(b=>b.onclick=()=>{selectedAvatar=b.dataset.avatar;renderAvatars();const a=state.avatars.find(x=>x.id===selectedAvatar);$(\"avatarPreview\").innerHTML=a.icon})}\nfunction edit(id){const p=state.profiles.find(x=>x.id===id);if(!p)return;editingProfile=p.id;$(\"profileName\").value=p.name;selectedAvatar=p.avatar_id;$(\"deleteProfile\").style.display=\"inline-block\";const a=state.avatars.find(x=>x.id===selectedAvatar);$(\"avatarPreview\").innerHTML=a?.icon||state?.avatars?.[0]?.icon||\"\";renderAvatars()}\n$(\"newProfile\").onclick=()=>{editingProfile=null;$(\"profileName\").value=\"\";selectedAvatar=\"orbit-cat\";$(\"deleteProfile\").style.display=\"none\";$(\"avatarPreview\").innerHTML=(state?.avatars?.[0]?.icon||\"\");renderAvatars()}\n$(\"saveProfile\").onclick=async()=>{try{state=await api(\"/api/profiles\",{method:\"POST\",body:JSON.stringify({id:editingProfile,name:$(\"profileName\").value,avatar_id:selectedAvatar})});showMsg(\"profileMsg\",\"Profile saved.\");render()}catch(e){showMsg(\"profileMsg\",e.message)}}\n$(\"deleteProfile\").onclick=async()=>{if(!editingProfile||!confirm(\"Delete this family profile?\"))return;try{state=await api(\"/api/profiles/delete\",{method:\"POST\",body:JSON.stringify({id:editingProfile})});editingProfile=null;$(\"profileName\").value=\"\";$(\"deleteProfile\").style.display=\"none\";render()}catch(e){showMsg(\"profileMsg\",e.message)}}\n$(\"soundVolume\").oninput=()=>{$(\"volumeOut\").value=$(\"soundVolume\").value+\"%\"};$(\"saveSettings\").onclick=async()=>{try{state=await api(\"/api/settings\",{method:\"POST\",body:JSON.stringify({language:$(\"language\").value,sound_enabled:$(\"soundEnabled\").checked,sound_volume:Number($(\"soundVolume\").value),blind_mode:$(\"blindMode\").checked})});localStorage.setItem(\"orbitx-dark-mode\",$(\"darkMode\").checked?\"on\":\"off\");document.documentElement.dataset.orbitTheme=$(\"darkMode\").checked?\"dark\":\"light\";showMsg(\"settingsMsg\",\"Saved.\");window.ORBITSound?.apply();window.ORBITBlind?.apply()}catch(e){showMsg(\"settingsMsg\",e.message)}};\n$(\"logout\").onclick=async()=>{await api(\"/api/auth/logout\",{method:\"POST\"});location.reload()};\n$(\"settingsJump\").onclick=()=>document.getElementById(\"settings\")?.scrollIntoView({behavior:\"smooth\"});if(location.hash===\"#settings\")setTimeout(()=>$(\"settingsJump\").click(),400);\nshowAccount().then(()=>{if(location.pathname===\"/settings\"||location.hash===\"#settings\")setTimeout(()=>$(\"settings\")?.scrollIntoView({behavior:\"smooth\"}),250)}).catch(e=>showMsg(\"authMsg\",e.message));\n</script>\n</body>\n</html>";
var SITE_JS = '(()=>{let settings={sound_enabled:true,sound_volume:55,blind_mode:false},ctx=null,lastY=scrollY,lastScrollSound=0;\nfunction load(){try{const s=JSON.parse(localStorage.getItem("orbitx-settings")||"{}");settings={...settings,...s}}catch{}}\nfunction tone(freq=440,dur=.08){if(!settings.sound_enabled||settings.sound_volume<=0)return;try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=freq;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(.018*(settings.sound_volume/55),ctx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur)}catch{}}\nfunction apply(){localStorage.setItem("orbitx-settings",JSON.stringify(settings));document.documentElement.dataset.sound=settings.sound_enabled?"on":"off"}\nfunction speak(text){if(!settings.blind_mode||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text||"").replace(/\\s+/g," ").trim().slice(0,500));u.rate=.95;u.pitch=1;window.speechSynthesis.speak(u)}\nwindow.ORBITSound={apply:()=>{load();apply()},tone};window.ORBITBlind={apply:()=>{load()}};\nload();document.addEventListener("click",e=>{if(e.target.closest("button,a,[role=button]"))tone(520,.07)});window.addEventListener("scroll",()=>{const now=Date.now();if(Math.abs(scrollY-lastY)>220&&now-lastScrollSound>900){tone(310,.05);lastScrollSound=now;lastY=scrollY}}, {passive:true});document.addEventListener("focusin",e=>{if(settings.blind_mode){const el=e.target;const text=el.getAttribute("aria-label")||el.innerText||el.value||el.placeholder||el.alt;speak(text)}});document.addEventListener("keydown",e=>{if(settings.blind_mode&&e.key==="Escape")window.speechSynthesis?.cancel()});apply()})();';
var ABOUT_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About \u2014 ORBIT X</title><style>body{margin:0;background:#080808;color:#fff;font-family:Arial,sans-serif}main{max-width:850px;margin:auto;padding:60px 24px;line-height:1.8}a{color:#fff}.logo{font-weight:900;letter-spacing:4px;font-size:28px}</style>    <link rel="stylesheet" href="/theme.css?v=20261011-lunar-purple">\n</head><body><main><a class="logo" href="/"><img class="orbit-wordmark" src="/orbitx-wordmark.svg" alt="ORBIT X"></a><h1>About ORBIT X</h1><p>ORBIT X is a free entertainment project built to make movies, television, independent work, and public-domain entertainment easy to discover.</p><p>Our goal is a peaceful, family-friendly viewing experience with profiles, accessibility tools, and a simple catalog.</p><p><a href="/">\u2190 Back to ORBIT X</a></p></main></body></html>';
var CONTACT_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact \u2014 ORBIT X</title><style>body{margin:0;background:#080808;color:#fff;font-family:Arial,sans-serif}main{max-width:850px;margin:auto;padding:60px 24px;line-height:1.8}a{color:#fff}.logo{font-weight:900;letter-spacing:4px;font-size:28px}</style>    <link rel="stylesheet" href="/theme.css?v=20261011-lunar-purple">\n</head><body><main><a class="logo" href="/"><img class="orbit-wordmark" src="/orbitx-wordmark.svg" alt="ORBIT X"></a><h1>Contact</h1><p>For Phase 1, ORBIT X contact information is:</p><p><strong>Phone:</strong> 804-599-9292</p><p><strong>Email:</strong> Email contact is being set up. We will add the official ORBIT X email address here when it is ready.</p><p><a href="/">\u2190 Back to ORBIT X</a></p></main></body></html>';
var COPYRIGHT_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Copyright \u2014 ORBIT X</title><style>body{margin:0;background:#080808;color:#fff;font-family:Arial,sans-serif}main{max-width:850px;margin:auto;padding:60px 24px;line-height:1.8}a{color:#fff}.logo{font-weight:900;letter-spacing:4px;font-size:28px}</style>    <link rel="stylesheet" href="/theme.css?v=20261011-lunar-purple">\n</head><body><main><a class="logo" href="/"><img class="orbit-wordmark" src="/orbitx-wordmark.svg" alt="ORBIT X"></a><h1>Copyright</h1><p>ORBIT X respects copyright. Content added to the catalog should be content you have permission to host, content in the public domain, or content made available under a license that permits the intended use.</p><p>If you believe material hosted by ORBIT X infringes your rights, contact us with enough information to identify the work and the claimed rights. We will review notices and respond according to applicable law.</p><p><a href="/">\u2190 Back to ORBIT X</a></p></main></body></html>';
var PRIVACY_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy \u2014 ORBIT X</title><style>body{margin:0;background:#080808;color:#fff;font-family:Arial,sans-serif}main{max-width:850px;margin:auto;padding:60px 24px;line-height:1.8}a{color:#fff}.logo{font-weight:900;letter-spacing:4px;font-size:28px}</style>    <link rel="stylesheet" href="/theme.css?v=20261011-lunar-purple">\n</head><body><main><a class="logo" href="/"><img class="orbit-wordmark" src="/orbitx-wordmark.svg" alt="ORBIT X"></a><h1>Privacy</h1><p>Phase 1 ORBIT X accounts store your email address, a securely derived password hash, family profile names and avatar choices, and your viewing preferences. Passwords are not stored as plain text.</p><p>Sessions use secure HTTP-only cookies. We do not sell account information. Email features will be added only when an email delivery system is configured.</p><p><strong>Note:</strong> This is an early project privacy page and should be reviewed for your final production launch.</p><p><a href="/">\u2190 Back to ORBIT X</a></p></main></body></html>';
var WATCH_HTML = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"color-scheme\" content=\"dark\">\n<title>Watch — ORBIT X</title>\n<link rel=\"stylesheet\" href=\"/theme.css?v=20261011-lunar-purple\">\n<style>\n:root{--bg:#08070C;--panel:#14111B;--violet:#A78BFA;--text:#F8F6FC;--muted:#B9B2C6}\n*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,Helvetica,sans-serif}\nheader{height:70px;padding:0 clamp(16px,4vw,56px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #342A43;background:rgba(8,7,12,.96);position:sticky;top:0;z-index:20}\n.logo img{display:block;width:205px;max-width:48vw;height:auto}.top-nav{display:flex;gap:22px;align-items:center}.top-nav a{color:#B9B2C6;text-decoration:none}.top-nav a:hover{color:#B9A4FF}\n.hero{min-height:520px;position:relative;background:#100D15 center/cover no-repeat}.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,7,12,.98) 3%,rgba(8,7,12,.85) 43%,rgba(8,7,12,.22) 100%),linear-gradient(0deg,#08070C 0%,transparent 60%)}\n.hero-content{position:relative;z-index:1;max-width:850px;padding:80px clamp(20px,7vw,100px) 64px}.back{display:inline-block;color:#D7CDEE;text-decoration:none;margin-bottom:25px}.back:hover{color:#fff}\n.kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#B9A4FF;font-weight:800;margin-bottom:12px}.title{font-size:clamp(38px,6vw,68px);line-height:1.03;margin:0 0 15px;letter-spacing:-.025em}.meta{color:#D2C9E0;margin-bottom:18px;display:flex;flex-wrap:wrap;gap:9px;align-items:center}.pill{border:1px solid #514162;border-radius:5px;padding:4px 8px;font-size:12px}.desc{font-size:17px;line-height:1.7;color:#E0D9E8;max-width:720px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:25px}.btn{border:1px solid #514162;border-radius:7px;background:#20172B;color:#F8F6FC;padding:12px 17px;font-weight:750;text-decoration:none;cursor:pointer;display:inline-flex;gap:9px;align-items:center}.btn.primary{background:#A78BFA;color:#08070C;border-color:#A78BFA}.btn:hover{background:#B9A4FF;color:#08070C;border-color:#B9A4FF}\nmain{max-width:1280px;margin:0 auto;padding:26px clamp(16px,4vw,56px) 70px}.section-title{font-size:24px;margin:0 0 15px}.player-section{margin:0 0 32px}.player{position:relative;width:100%;aspect-ratio:16/9;background:#000;border:1px solid #342A43;border-radius:12px;overflow:hidden}.player iframe,.player video{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}.empty{padding:24px;border:1px solid #342A43;border-radius:10px;background:#14111B;color:#B9B2C6;line-height:1.6}\n.episode-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:18px 0}.field label{display:block;font-size:13px;color:#B9B2C6;margin-bottom:7px}.field select{width:100%;background:#14111B;color:#F8F6FC;border:1px solid #514162;border-radius:7px;padding:12px;font:inherit}.episode-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:14px}.episode{border:1px solid #342A43;background:#14111B;border-radius:9px;padding:14px;text-align:left;color:#F8F6FC;cursor:pointer}.episode:hover,.episode.active{border-color:#A78BFA;background:#20172B}.episode small{display:block;color:#B9B2C6;margin-top:6px;line-height:1.4}\n.recommend-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:14px}.rec-card{background:#14111B;border:1px solid #342A43;border-radius:8px;overflow:hidden;color:inherit;text-decoration:none}.rec-card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:#20172B}.rec-card strong{display:block;padding:10px;font-size:13px;line-height:1.4}\n.modal{position:fixed;inset:0;background:rgba(3,2,6,.92);z-index:100;display:none;align-items:center;justify-content:center;padding:22px}.modal.open{display:flex}.modal-inner{width:min(100%,1000px);position:relative}.modal-close{position:absolute;right:0;bottom:calc(100% + 12px);border:1px solid #514162;border-radius:50%;background:#20172B;color:#fff;width:42px;height:42px;font-size:24px;cursor:pointer}.modal .player{border-radius:8px}.status{color:#B9A4FF;font-size:13px;min-height:20px;margin-top:12px}\nfooter{border-top:1px solid #342A43;padding:25px;text-align:center;color:#8E849D;font-size:13px}\n@media(max-width:650px){header{height:auto;min-height:64px;gap:12px;flex-wrap:wrap;padding:12px 16px}.logo img{width:165px}.top-nav{gap:13px;font-size:13px}.hero{min-height:430px}.hero-content{padding-top:50px}.desc{font-size:15px}.episode-controls{grid-template-columns:1fr}main{padding-top:22px}.recommend-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n\n .player-section{display:none!important}\n.cinema{position:fixed;inset:0;z-index:90;background:rgba(8,7,12,.97);display:flex;align-items:center;justify-content:center;padding:clamp(10px,2.4vw,30px);opacity:0;visibility:hidden;transition:opacity .28s ease,visibility .28s ease;backdrop-filter:blur(16px)}\n.cinema.open{opacity:1;visibility:visible}\n.cinema-panel{width:min(100%,1500px);transform:translateY(18px) scale(.985);transition:transform .34s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;gap:14px;max-height:100%}\n.cinema.open .cinema-panel{transform:translateY(0) scale(1)}\n.cinema-top{display:flex;align-items:center;justify-content:space-between;gap:18px;min-width:0}\n.cinema-title-wrap{min-width:0}.cinema-eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#B9A4FF;margin-bottom:5px}\n.cinema-title{font-size:clamp(18px,2.5vw,29px);font-weight:800;line-height:1.2;overflow-wrap:anywhere;margin:0}\n.cinema-meta{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:8px;color:#D2C9E0;font-size:12px}\n.cinema-meta .pill{border-color:#59466F;background:#20172B}.rating-pill{border-color:#A78BFA!important;color:#E7DEFF!important;background:rgba(167,139,250,.14)!important;font-weight:800}\n.cinema-close{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid #514162;background:#20172B;color:#F8F6FC;font-size:25px;cursor:pointer;transition:background .18s,transform .18s}\n.cinema-close:hover{background:#A78BFA;color:#08070C;transform:rotate(90deg)}\n.cinema-stage{position:relative;width:100%;aspect-ratio:16/9;max-height:calc(100vh - 190px);background:#000;border:1px solid #514162;border-radius:14px;overflow:hidden;box-shadow:0 22px 90px rgba(0,0,0,.5)}\n.cinema-stage video,.cinema-stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;object-fit:contain}\n.cinema-controls{position:absolute;left:0;right:0;bottom:0;padding:45px 20px 16px;background:linear-gradient(0deg,rgba(5,4,9,.97),rgba(5,4,9,.78) 55%,transparent);opacity:1;transition:opacity .25s}\n.cinema-controls.is-hidden{opacity:0;pointer-events:none}\n.cinema-seek{display:block;width:100%;height:5px;margin:0 0 13px;accent-color:#A78BFA;cursor:pointer}\n.cinema-control-row{display:flex;align-items:center;gap:12px}\n.cinema-control-btn{min-width:36px;height:36px;border:0;background:transparent;color:#F8F6FC;cursor:pointer;border-radius:8px;font-size:20px;display:inline-flex;align-items:center;justify-content:center}\n.cinema-control-btn:hover{background:#30233F;color:#C9B7FF}\n.cinema-time{font-size:12px;color:#E0D9E8;font-variant-numeric:tabular-nums;white-space:nowrap}\n.cinema-volume{width:90px;accent-color:#A78BFA}\n.cinema-control-spacer{flex:1}\n.cinema-hint{color:#AFA4BD;font-size:12px;text-align:center;line-height:1.5}\n@media(max-width:650px){.cinema{padding:12px}.cinema-panel{gap:12px}.cinema-stage{aspect-ratio:16/9;max-height:60vh;border-radius:9px}.cinema-title{font-size:18px}.cinema-top{align-items:flex-start}.cinema-close{width:40px;height:40px}.cinema-controls{padding:35px 10px 9px}.cinema-control-row{gap:5px}.cinema-volume{width:54px}.cinema-time{font-size:10px}.cinema-control-btn{min-width:31px;height:32px;font-size:18px}}\n@media(prefers-reduced-motion:reduce){.cinema,.cinema-panel,.cinema-close{transition:none}}\n\n</style>\n</head>\n<body>\n<header><a class=\"logo\" href=\"/\" aria-label=\"ORBIT X home\"><img src=\"/orbitx-wordmark.svg\" alt=\"ORBIT X\"></a><nav class=\"top-nav\" aria-label=\"Main navigation\"><a href=\"/\">Home</a><a href=\"/movies.html\">Movies</a><a href=\"/tv.html\">TV</a><a href=\"/search.html\">Search</a><a href=\"/account\">Profile</a></nav></header>\n<section class=\"hero\" id=\"hero\"><div class=\"shade\"></div><div class=\"hero-content\">\n<a class=\"back\" id=\"backLink\" href=\"/\">← Back to ORBIT X</a><div class=\"kicker\" id=\"kicker\">ORBIT X • NOW STREAMING</div><h1 class=\"title\" id=\"title\">Loading title…</h1><div class=\"meta\" id=\"meta\"></div><p class=\"desc\" id=\"desc\"></p>\n<div class=\"actions\" id=\"actions\"></div><div class=\"status\" id=\"status\" role=\"status\" aria-live=\"polite\"></div>\n</div></section>\n<main>\n<section id=\"episodeSection\" hidden>\n<h2 class=\"section-title\">Choose your episode</h2>\n<div class=\"episode-controls\"><div class=\"field\"><label for=\"seasonSelect\">Season</label><select id=\"seasonSelect\"><option>Loading seasons…</option></select></div><div class=\"field\"><label for=\"episodeSelect\">Episode</label><select id=\"episodeSelect\"><option>Choose an episode</option></select></div></div>\n<div id=\"episodeList\" class=\"episode-list\"></div>\n</section>\n<section class=\"player-section\" id=\"playerSection\"><h2 class=\"section-title\" id=\"playerHeading\">Watch</h2><div id=\"playerArea\" class=\"empty\">Choose Watch Now to start playback. If a title has no playable video attached, ORBIT X will tell you.</div></section>\n<section id=\"moreSection\" hidden><h2 class=\"section-title\">More to explore</h2><div id=\"moreGrid\" class=\"recommend-grid\"></div></section>\n</main>\n<div class=\"modal\" id=\"trailerModal\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Trailer\"><div class=\"modal-inner\"><button class=\"modal-close\" id=\"closeTrailer\" aria-label=\"Close trailer\">×</button><div id=\"trailerPlayer\"></div></div></div>\n\n<div class=\"cinema\" id=\"cinemaPlayer\" role=\"dialog\" aria-modal=\"true\" aria-label=\"ORBIT X video player\">\n  <div class=\"cinema-panel\">\n    <div class=\"cinema-top\">\n      <div class=\"cinema-title-wrap\">\n        <div class=\"cinema-eyebrow\">ORBIT X · NOW PLAYING</div>\n        <h2 class=\"cinema-title\" id=\"cinemaTitle\">Now Playing</h2>\n        <div class=\"cinema-meta\" id=\"cinemaMeta\"></div>\n      </div>\n      <button class=\"cinema-close\" id=\"closeCinema\" aria-label=\"Close player\">×</button>\n    </div>\n    <div class=\"cinema-stage\" id=\"cinemaStage\"></div>\n    <div class=\"cinema-hint\">ORBIT X · Lunar Purple player</div>\n  </div>\n</div>\n\n<footer>ORBIT X — Free Entertainment</footer>\n<script src=\"/site.js\"></script>\n<script>\n(()=> {\n const $=id=>document.getElementById(id);\n const esc=s=>String(s??\"\").replace(/[&<>\"']/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#039;\"}[c]));\n const params=new URLSearchParams(location.search),slug=params.get(\"slug\");\n const progressKey=\"orbitx-continue-watching\",listKey=\"orbitx-my-list\";\n let item=null,allItems=[],seasons=[],episodes=[],selectedEpisode=null,activeMediaUrl=\"\";\n function youtubeId(value){try{const u=new URL(String(value));const h=u.hostname.replace(/^www\\./,\"\").toLowerCase();if(h===\"youtu.be\")return u.pathname.split(\"/\").filter(Boolean)[0]||\"\";if([\"youtube.com\",\"m.youtube.com\",\"youtube-nocookie.com\"].includes(h)){if(u.pathname===\"/watch\")return u.searchParams.get(\"v\")||\"\";for(const p of [\"embed\",\"shorts\",\"live\"])if(u.pathname.startsWith(\"/\"+p+\"/\"))return u.pathname.split(\"/\")[2]||\"\"}}catch{}return\"\"}\n function videoEmbed(url,title,startAt=0,captionsUrl=\"\"){const id=youtubeId(url);if(id)return '<div class=\"player\"><iframe src=\"https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0&modestbranding=1&autoplay=1&enablejsapi=1&start='+Math.max(0,Math.floor(startAt))+'&cc_load_policy=1&cc_lang_pref=en\" title=\"'+esc(title)+'\" allow=\"autoplay; encrypted-media; picture-in-picture; fullscreen\" allowfullscreen></iframe></div>';return '<div class=\"player\"><video controls playsinline preload=\"metadata\" src=\"'+esc(url)+'\" aria-label=\"'+esc(title)+'\">'+(captionsUrl?'<track kind=\"captions\" src=\"'+esc(captionsUrl)+'\" srclang=\"en\" label=\"English\" default>':\"\")+\"</video></div>\"}\n function getList(){try{return JSON.parse(localStorage.getItem(listKey)||\"[]\")}catch{return[]}}\n function setStatus(text){$(\"status\").textContent=text||\"\"}\n function setContinue(entry){try{const current=JSON.parse(localStorage.getItem(progressKey)||\"[]\").filter(x=>x.slug!==entry.slug);current.unshift(entry);localStorage.setItem(progressKey,JSON.stringify(current.slice(0,30)))}catch{}}\n function renderActions(){const saved=getList().some(x=>x.slug===item.slug);let resume=false;try{const progress=JSON.parse(localStorage.getItem(progressKey)||\"[]\");resume=progress.some(x=>x.slug===item.slug||x.series_slug===item.slug)}catch{}const canWatch=!!(item.video_url||(item.type===\"show\"&&episodes.some(e=>e.video_url)));$(\"actions\").innerHTML=(canWatch?'<button class=\"btn primary\" id=\"watchNow\">▶ '+(resume?\"Resume\":\"Watch Now\")+'</button>':'')+(item.trailer_url?'<button class=\"btn\" id=\"trailerButton\">▷ Watch Trailer</button>':'')+'<button class=\"btn\" id=\"myListButton\">'+(saved?\"✓ In My List\":\"+ My List\")+'</button>'+(item.type===\"show\"?'':'<button class=\"btn\" id=\"shareButton\">↗ Share</button>');$(\"watchNow\")?.addEventListener(\"click\",()=>{if(item.type===\"show\"){if(selectedEpisode)playEpisode(selectedEpisode);else if(episodes[0]){selectEpisode(episodes[0]);playEpisode(episodes[0])}else setStatus(\"No published episodes with video are available yet.\")}else playUrl(item.video_url,item.title,item.slug)});$(\"trailerButton\")?.addEventListener(\"click\",openTrailer);$(\"myListButton\")?.addEventListener(\"click\",toggleList);$(\"shareButton\")?.addEventListener(\"click\",shareTitle)}\n function toggleList(){const list=getList(),idx=list.findIndex(x=>x.slug===item.slug);if(idx>=0)list.splice(idx,1);else list.unshift({slug:item.slug,title:item.title,poster_url:item.poster_url||\"\",type:item.type});localStorage.setItem(listKey,JSON.stringify(list));renderActions();setStatus(idx>=0?\"Removed from My List.\":\"Added to My List on this device.\")}\n async function shareTitle(){try{if(navigator.share)await navigator.share({title:item.title,url:location.href});else{await navigator.clipboard.writeText(location.href);setStatus(\"Title link copied.\")}}catch{}}\n function formatTime(seconds){if(!Number.isFinite(seconds)||seconds<0)return \"0:00\";const n=Math.floor(seconds);return Math.floor(n/3600)>0?Math.floor(n/3600)+\":\"+String(Math.floor(n/60)%60).padStart(2,\"0\")+\":\"+String(n%60).padStart(2,\"0\"):Math.floor(n/60)+\":\"+String(n%60).padStart(2,\"0\")}\n function openCinemaPlayer(url,title,startAt,captionsUrl=\"\"){\n  const overlay=$(\"cinemaPlayer\"),stage=$(\"cinemaStage\"),isYouTube=!!youtubeId(url);\n  $(\"cinemaTitle\").textContent=item.title;\n  const bits=[item.year,item.rating?(\"Rated \"+item.rating):\"\",item.runtime_minutes?item.runtime_minutes+\" min\":\"\",item.type===\"show\"&&selectedEpisode?(\"Season \"+selectedEpisode.season_number+\" · Episode \"+selectedEpisode.episode_number):\"\",item.type===\"show\"&&selectedEpisode?selectedEpisode.title:\"\"].filter(Boolean);\n  $(\"cinemaMeta\").innerHTML=bits.map((x,i)=>'<span class=\"pill '+(String(x).startsWith(\"Rated \")?'rating-pill':'')+'\">'+esc(x)+'</span>').join(\"\");\n  if(isYouTube){const id=youtubeId(url);stage.innerHTML='<iframe src=\"https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0&modestbranding=1&autoplay=1&enablejsapi=1&start='+Math.max(0,Math.floor(startAt))+'&cc_load_policy=1&cc_lang_pref=en\" title=\"'+esc(title)+'\" allow=\"autoplay; encrypted-media; picture-in-picture; fullscreen\" allowfullscreen></iframe>'}\n  else{\n   stage.innerHTML='<video id=\"cinemaVideo\" controls playsinline preload=\"auto\" src=\"'+esc(url)+'\" aria-label=\"'+esc(title)+'\">'+(captionsUrl?'<track kind=\"captions\" src=\"'+esc(captionsUrl)+'\" srclang=\"en\" label=\"English\" default>':\"\")+'</video><div class=\"cinema-controls\" id=\"cinemaControls\"><input class=\"cinema-seek\" id=\"cinemaSeek\" type=\"range\" min=\"0\" max=\"1000\" value=\"0\" aria-label=\"Seek video\"><div class=\"cinema-control-row\"><button class=\"cinema-control-btn\" id=\"cinemaPlayPause\" aria-label=\"Pause\">Ⅱ</button><span class=\"cinema-time\" id=\"cinemaCurrent\">0:00</span><span class=\"cinema-time\">/</span><span class=\"cinema-time\" id=\"cinemaDuration\">0:00</span><button class=\"cinema-control-btn\" id=\"cinemaMute\" aria-label=\"Mute\">♪</button><input class=\"cinema-volume\" id=\"cinemaVolume\" type=\"range\" min=\"0\" max=\"1\" step=\".05\" value=\"1\" aria-label=\"Volume\"><span class=\"cinema-control-spacer\"></span><button class=\"cinema-control-btn\" id=\"cinemaFullscreen\" aria-label=\"Fullscreen\">⛶</button></div></div>';\n   const v=$(\"cinemaVideo\"),controls=$(\"cinemaControls\"),seek=$(\"cinemaSeek\"),play=$(\"cinemaPlayPause\"),mute=$(\"cinemaMute\"),volume=$(\"cinemaVolume\");let hideTimer;\n   const showControls=()=>{controls.classList.remove(\"is-hidden\");clearTimeout(hideTimer);if(!v.paused)hideTimer=setTimeout(()=>controls.classList.add(\"is-hidden\"),2600)};\n   const sync=()=>{if(v.duration){seek.value=String(Math.round(v.currentTime/v.duration*1000));$(\"cinemaCurrent\").textContent=formatTime(v.currentTime);$(\"cinemaDuration\").textContent=formatTime(v.duration)}play.textContent=v.paused?\"▶\":\"Ⅱ\";play.setAttribute(\"aria-label\",v.paused?\"Play\":\"Pause\");mute.textContent=v.muted||v.volume===0?\"◖\":\"♪\"};\n   play.addEventListener(\"click\",()=>{if(v.paused)v.play().catch(()=>setStatus(\"Press Play to start this video.\"));else v.pause();showControls()});\n   v.addEventListener(\"click\",()=>{if(v.paused)v.play().catch(()=>{});else v.pause();showControls()});\n   v.addEventListener(\"play\",sync);v.addEventListener(\"pause\",()=>{sync();showControls()});v.addEventListener(\"timeupdate\",sync);v.addEventListener(\"loadedmetadata\",()=>{if(startAt>0&&startAt<v.duration-2)v.currentTime=startAt;sync()});\n   seek.addEventListener(\"input\",()=>{if(v.duration)v.currentTime=Number(seek.value)/1000*v.duration;showControls()});\n   mute.addEventListener(\"click\",()=>{v.muted=!v.muted;sync();showControls()});volume.addEventListener(\"input\",()=>{v.volume=Number(volume.value);v.muted=v.volume===0;sync();showControls()});\n   $(\"cinemaFullscreen\").addEventListener(\"click\",()=>{const target=$(\"cinemaStage\"),video=$(\"cinemaVideo\");if(document.fullscreenElement){document.exitFullscreen?.();return}if(video&&typeof video.webkitEnterFullscreen===\"function\"){video.webkitEnterFullscreen();return}const request=target.requestFullscreen||video?.requestFullscreen;if(request){Promise.resolve(request.call(target.requestFullscreen?target:video)).catch(()=>setStatus(\"Use your device’s video full-screen control.\"))}else setStatus(\"Full screen is not supported in this browser.\")});\n   stage.addEventListener(\"mousemove\",showControls);stage.addEventListener(\"touchstart\",showControls,{passive:true});\n   v.addEventListener(\"error\",()=>{const m=(activeMediaUrl||\"\").match(/archive\\.org\\/download\\/([^/]+)\\/(.+)$/);if(m){stage.innerHTML='<iframe src=\"https://archive.org/embed/'+m[1]+'?file='+encodeURIComponent(m[2])+'&autoplay=1\" title=\"'+esc(title)+'\" allow=\"autoplay; fullscreen\" allowfullscreen></iframe>';setStatus(\"Opened Archive.org fallback player.\")}else setStatus(\"Video failed to load. Check the direct file URL.\")},{once:true});\n   v.addEventListener(\"timeupdate\",()=>{if(v.duration&&Number.isFinite(v.duration)){try{const data=JSON.parse(localStorage.getItem(progressKey)||\"[]\"),entry=data.find(x=>x.slug===(progressSlugForPlayer||item.slug));if(entry){entry.current_time=v.currentTime;entry.duration=v.duration;localStorage.setItem(progressKey,JSON.stringify(data))}}catch{}}});\n   v.play().catch(()=>{play.textContent=\"▶\";play.setAttribute(\"aria-label\",\"Play\");setStatus(\"Tap Play to start the movie.\")});\n  }\n  overlay.classList.add(\"open\");document.body.style.overflow=\"hidden\";$(\"closeCinema\").focus();\n }\n let progressSlugForPlayer=item?.slug||\"\";\n function closeCinemaPlayer(){const overlay=$(\"cinemaPlayer\"),v=$(\"cinemaVideo\");if(v)v.pause();$(\"cinemaStage\").innerHTML=\"\";overlay.classList.remove(\"open\");document.body.style.overflow=\"\";$(\"watchNow\")?.focus()}\n $(\"closeCinema\").addEventListener(\"click\",closeCinemaPlayer);\n $(\"cinemaPlayer\").addEventListener(\"click\",e=>{if(e.target===$(\"cinemaPlayer\"))closeCinemaPlayer()});\n function playUrl(url,title,progressSlug){\n  if(!url){setStatus(\"A video has not been attached to this title yet.\");return}\n  const progressId=progressSlug||item.slug;progressSlugForPlayer=progressId;let previous=null;\n  try{previous=JSON.parse(localStorage.getItem(progressKey)||\"[]\").find(x=>x.slug===progressId||(item.type===\"show\"&&x.series_slug===item.slug&&Number(x.season_number)===Number(selectedEpisode?.season_number)&&Number(x.episode_number)===Number(selectedEpisode?.episode_number)))||null}catch{}\n  const startAt=previous&&Number(previous.current_time)>0&&(!previous.duration||Number(previous.current_time)<Number(previous.duration)-15)?Number(previous.current_time):0;\n  activeMediaUrl=url;$(\"playerHeading\").textContent=\"Now Playing\";$(\"playerArea\").className=\"empty\";$(\"playerArea\").textContent=\"\";$(\"playerSection\").hidden=true;\n  setContinue({slug:progressId,series_slug:item.type===\"show\"?item.slug:null,title:item.title,episode_title:selectedEpisode?.title||null,poster_url:item.poster_url||\"\",type:item.type,season_number:selectedEpisode?.season_number||null,episode_number:selectedEpisode?.episode_number||null,current_time:startAt,updated_at:Date.now(),url});\n  setStatus(startAt?\"Resuming from where you left off.\":\"Playback opened. Your continue-watching entry is saved on this device.\");\n  openCinemaPlayer(url,title,startAt,selectedEpisode?.captions_url||item.captions_url||item.subtitle_url||\"\");\n }\n function playEpisode(ep){selectedEpisode=ep;const epSlug=item.slug+\"-s\"+ep.season_number+\"e\"+ep.episode_number;playUrl(ep.video_url, item.title+\" — \"+ep.title, epSlug);$(\"playerHeading\").textContent=\"S\"+ep.season_number+\" E\"+ep.episode_number+\" · \"+ep.title}\n function selectEpisode(ep){selectedEpisode=ep;$(\"episodeSelect\").value=String(ep.id);$(\"episodeList\").querySelectorAll(\".episode\").forEach(b=>b.classList.toggle(\"active\",b.dataset.id===String(ep.id)));$(\"episodeSelect\").dispatchEvent(new Event(\"change\",{bubbles:false}));}\n function renderEpisodeOptions(){const s=$(\"seasonSelect\"),e=$(\"episodeSelect\");s.innerHTML=seasons.map(x=>'<option value=\"'+esc(x.id)+'\">Season '+esc(x.season_number)+(x.title?' — '+esc(x.title):\"\")+'</option>').join(\"\");const season=seasons.find(x=>String(x.id)===s.value)||seasons[0];episodes=season?season.episodes||[]:[];e.innerHTML=episodes.map(x=>'<option value=\"'+esc(x.id)+'\">Episode '+esc(x.episode_number)+': '+esc(x.title)+'</option>').join(\"\")||'<option value=\"\">No published episodes</option>';renderEpisodeList();const first=episodes[0];if(first)selectedEpisode=first}\n function renderEpisodeList(){$(\"episodeList\").innerHTML=episodes.map(ep=>'<button type=\"button\" class=\"episode '+(selectedEpisode&&String(selectedEpisode.id)===String(ep.id)?\"active\":\"\")+'\" data-id=\"'+esc(ep.id)+'\"><strong>S'+esc(ep.season_number)+' E'+esc(ep.episode_number)+' · '+esc(ep.title)+'</strong><small>'+esc(ep.description||\"\")+'</small></button>').join(\"\")||'<div class=\"empty\">No published episodes are available in this season yet.</div>';$(\"episodeList\").querySelectorAll(\"[data-id]\").forEach(b=>b.addEventListener(\"click\",()=>{const ep=episodes.find(x=>String(x.id)===b.dataset.id);if(ep){selectEpisode(ep);playEpisode(ep)}}))}\n async function loadShowSeasons(){const attempts=[\"/api/seasons?show_id=\"+encodeURIComponent(item.id),\"/api/public/seasons?show_id=\"+encodeURIComponent(item.id)];for(const url of attempts){try{const r=await fetch(url,{cache:\"no-store\"});if(!r.ok)continue;const d=await r.json();const raw=d.seasons||[];const got=[];for(const s of raw){let epData={episodes:[]};for(const eu of [\"/api/episodes?season_id=\"+encodeURIComponent(s.id),\"/api/public/episodes?season_id=\"+encodeURIComponent(s.id)]){try{const er=await fetch(eu,{cache:\"no-store\"});if(er.ok){epData=await er.json();break}}catch{}}got.push({...s,episodes:(epData.episodes||[]).filter(e=>e.status===\"published\"||!e.status).sort((a,b)=>a.episode_number-b.episode_number).map(e=>({...e,season_number:s.season_number}))})}seasons=got.sort((a,b)=>a.season_number-b.season_number);if(seasons.length)return true}catch{}}return false}\n function openTrailer(){const url=item.trailer_url;if(!url)return;const id=youtubeId(url);$(\"trailerPlayer\").innerHTML=id?'<div class=\"player\"><iframe src=\"https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0\" title=\"'+esc(item.title)+' trailer\" allow=\"autoplay; encrypted-media; picture-in-picture; fullscreen\" allowfullscreen></iframe></div>':'<div class=\"player\"><video controls autoplay playsinline src=\"'+esc(url)+'\"></video></div>';$(\"trailerModal\").classList.add(\"open\");$(\"closeTrailer\").focus()}\n function closeTrailer(){$(\"trailerModal\").classList.remove(\"open\");$(\"trailerPlayer\").innerHTML=\"\";$(\"trailerButton\")?.focus()}\n $(\"closeTrailer\").addEventListener(\"click\",closeTrailer);$(\"trailerModal\").addEventListener(\"click\",e=>{if(e.target===$(\"trailerModal\"))closeTrailer()});document.addEventListener(\"keydown\",e=>{if(e.key===\"Escape\"){if($(\"cinemaPlayer\").classList.contains(\"open\"))closeCinemaPlayer();else closeTrailer()}if(e.key===\" \"&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName||\"\")&&$(\"cinemaVideo\")){e.preventDefault();const v=$(\"cinemaVideo\");v.paused?v.play():v.pause()}})\n function renderMore(){const items=allItems.filter(x=>x.slug!==item.slug&&x.type===item.type).slice(0,8);if(!items.length)return;$(\"moreSection\").hidden=false;$(\"moreGrid\").innerHTML=items.map(x=>'<a class=\"rec-card\" href=\"/watch.html?slug='+encodeURIComponent(x.slug)+'\">'+(x.poster_url?'<img src=\"'+esc(x.poster_url)+'\" alt=\"\" loading=\"lazy\">':'<div style=\"aspect-ratio:2/3;background:#20172B\"></div>')+'<strong>'+esc(x.title)+'</strong></a>').join(\"\")}\n async function init(){if(!slug){$(\"title\").textContent=\"Title not found\";$(\"playerArea\").textContent=\"Open a title from Home, Movies, TV, or Search.\";return}try{const r=await fetch(\"/api/public/content\",{cache:\"no-store\"});if(!r.ok)throw Error(\"Content request failed (\"+r.status+\")\");const d=await r.json();allItems=d.content||[];item=allItems.find(x=>String(x.slug)===slug);if(!item){$(\"title\").textContent=\"Title not found\";$(\"desc\").textContent=\"This title may have been unpublished or its link may be out of date.\";return}document.title=\"ORBIT X — \"+item.title;$(\"title\").textContent=item.title;$(\"desc\").textContent=item.description||\"Discover this title on ORBIT X.\";$(\"kicker\").textContent=item.type===\"show\"?\"ORBIT X • SERIES\":\"ORBIT X • FEATURE\";$(\"meta\").innerHTML=[item.year,item.rating,item.runtime_minutes?item.runtime_minutes+\" min\":\"\",item.type===\"show\"?\"TV Series\":\"Movie\"].filter(Boolean).map(x=>'<span class=\"pill\">'+esc(x)+'</span>').join(\"\");const heroImage=item.backdrop_url||item.poster_url;if(heroImage)$(\"hero\").style.backgroundImage='url(\"'+String(heroImage).replace(/\"/g,\"%22\")+'\")';$(\"backLink\").href=item.type===\"show\"?\"/tv.html\":\"/movies.html\";$(\"backLink\").textContent=item.type===\"show\"?\"← Back to TV\":\"← Back to Movies\";\n if(item.type===\"show\"){$(\"episodeSection\").hidden=false;const ok=await loadShowSeasons();if(ok){let savedProgress=null;try{savedProgress=JSON.parse(localStorage.getItem(progressKey)||\"[]\").find(x=>x.series_slug===item.slug)||null}catch{}const requestedSeason=Number(params.get(\"season\")||savedProgress?.season_number||0),requestedEpisode=Number(params.get(\"episode\")||savedProgress?.episode_number||0);const wantedSeason=seasons.find(s=>Number(s.season_number)===requestedSeason);if(wantedSeason)$(\"seasonSelect\").value=String(wantedSeason.id);renderEpisodeOptions();const wantedEpisode=episodes.find(e=>Number(e.episode_number)===requestedEpisode);if(wantedEpisode)selectEpisode(wantedEpisode);$(\"seasonSelect\").addEventListener(\"change\",()=>{const s=seasons.find(x=>String(x.id)===$(\"seasonSelect\").value);episodes=s?.episodes||[];selectedEpisode=episodes[0]||null;renderEpisodeOptions();renderActions()});$(\"episodeSelect\").addEventListener(\"change\",()=>{selectedEpisode=episodes.find(x=>String(x.id)===$(\"episodeSelect\").value)||null;renderEpisodeList()})}else{$(\"seasonSelect\").innerHTML='<option value=\"\">Seasons not available</option>';$(\"episodeSelect\").innerHTML='<option value=\"\">No episode data returned</option>';$(\"episodeList\").innerHTML='<div class=\"empty\">This show page is ready for seasons and episodes, but the season/episode API could not be reached. Add and publish episodes in ORBIT Admin, then check that the public season and episode endpoints are enabled.</div>'}}\n renderActions();renderMore();let resume=null;try{resume=JSON.parse(localStorage.getItem(progressKey)||\"[]\").find(x=>x.slug===item.slug||x.series_slug===item.slug)||null}catch{}if(resume)setStatus(\"Continue watching is available on this device. Use Resume to pick up where you left off.\");}catch(e){console.error(\"ORBIT watch page:\",e);$(\"title\").textContent=\"Could not load title\";$(\"playerArea\").textContent=\"There was a problem loading this title. Please refresh and try again.\"}}\n init();\n})();\n</script>\n<script src=\"/orbit-sidebar.js?v=20261011-sidebar\"></script>\n<script src=\"/orbit-features.js?v=20261011-page-specific\"></script>\n</body>\n</html>";
function patchOrbitHtml(html) {
  if (typeof html !== "string") return html;
  if (html.includes('class="show-grid"') && !html.includes('id="orbit-now"')) html = html.replace("<footer>", '<section class="page" id="orbit-now"><div class="empty"><h3>Orbit Now</h3><p>Live channel schedules are not connected yet. This is where current and upcoming live programming will appear.</p></div></section><section class="page" id="live-tv"><div class="empty"><h3>Live TV</h3><p>Live channels are coming soon to ORBIT X.</p></div></section><footer>');
  html = html.replace(/<script src="\/orbit-features\.js[^"]*"><\/script>/g, "");
  html = html.replace(/<script src="\/orbit-sidebar\.js[^"]*"><\/script>/g, "");
  html = html.replace(/<style id="orbit-watch-button-fix">[\s\S]*?<\/style>/g, "");
  html = html.replace("</head>", '<style id="orbit-watch-button-fix">.watch-play-icon{display:none!important}</style></head>');
  return html.replace("</body>", '<script src="/orbit-sidebar.js?v=20261011-sidebar"><\/script><script src="/orbit-features.js?v=20261011-page-specific"><\/script></body>');
}
__name(patchOrbitHtml, "patchOrbitHtml");
__name2(patchOrbitHtml, "patchOrbitHtml");
__name22(patchOrbitHtml, "patchOrbitHtml");
var COLLECTIONS_HTML = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>ORBIT X — My Collections</title><link rel=\"stylesheet\" href=\"/theme.css?v=20261011-lunar-purple\"><style>\nbody{margin:0;background:#08070C;color:#F8F6FC;font-family:Inter,system-ui,sans-serif}.site-header{height:70px;border-bottom:1px solid #342A43}.collections-wrap{max-width:1200px;margin:auto;padding:30px 24px 70px}.collections-wrap h1{font-size:clamp(28px,4vw,42px);margin:0 0 8px}.collections-intro{color:#B9B2C6;margin:0 0 28px}.orbit-collection-empty{color:#8E849D;padding:8px 0 14px}.orbit-create-row{display:flex;gap:10px;max-width:620px;margin:16px 0;flex-wrap:wrap}.orbit-create-row input{flex:1;min-width:180px;padding:12px;border:1px solid #514162;border-radius:8px;background:#100D15;color:#F8F6FC}.orbit-save-button{padding:9px 13px;border:1px solid #514162;border-radius:8px;background:#20172B;color:#F8F6FC;cursor:pointer}.orbit-save-button:hover{border-color:#A78BFA;color:#B9A4FF}.orbit-playlist{padding:16px 0 24px;border-top:1px solid #342A43}.orbit-playlist-head{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:12px}.orbit-playlist-head h3{margin:0}.orbit-playlist-head p{color:#B9B2C6;margin:5px 0}.orbit-playlist-actions{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:600px){.collections-wrap{padding:22px 15px}.orbit-playlist-head{align-items:flex-start;flex-direction:column}}\n</style></head><body><header class=\"site-header\"><a class=\"logo\" href=\"/\"><img src=\"/orbitx-wordmark.svg\" alt=\"ORBIT X\" style=\"width:190px;max-width:42vw\"></a></header><main class=\"collections-wrap\"><h1>My Collections</h1><p class=\"collections-intro\">Your saved movies, shows, Watch Later list, and playlists—all in one place.</p><div id=\"orbitCollectionsMain\"><p>Loading your collections…</p></div></main><script src=\"/orbit-features.js\"></script><script src=\"/orbit-sidebar.js\"></script></body></html>";
var ORBIT_SIDEBAR_JS = "(()=>{if(location.pathname.startsWith(\"/admin\"))return;const applyTheme=()=>{document.documentElement.dataset.orbitTheme=localStorage.getItem(\"orbitx-dark-mode\")===\"off\"?\"light\":\"dark\"};applyTheme();const themeStyle=document.createElement(\"style\");themeStyle.textContent='html[data-orbit-theme=\"light\"] body{background:#F4F2F8!important;color:#17121F!important}html[data-orbit-theme=\"light\"] .card,html[data-orbit-theme=\"light\"] .orbit-personal-section,html[data-orbit-theme=\"light\"] .orbit-mini-card,html[data-orbit-theme=\"light\"] .orbit-sidebar,html[data-orbit-theme=\"light\"] .soon-card{background:#FFFFFF!important;color:#17121F!important}html[data-orbit-theme=\"light\"] .orbit-sidebar{border-color:#D7CEE4}html[data-orbit-theme=\"light\"] .orbit-side-link,html[data-orbit-theme=\"light\"] .orbit-watching-profile{color:#17121F!important}html[data-orbit-theme=\"light\"] input,html[data-orbit-theme=\"light\"] select{background:#FFFFFF!important;color:#17121F!important;border-color:#C9BED8!important}html[data-orbit-theme=\"light\"] p,html[data-orbit-theme=\"light\"] small{color:#62586D}html[data-orbit-theme=\"light\"] header{background:#F4F2F8!important}';document.head.appendChild(themeStyle);const h=document.querySelector(\"header\");if(!h||document.getElementById(\"orbit-global-header\"))return;let logo=h.querySelector(\".logo\");if(!logo){logo=document.createElement(\"a\");logo.className=\"logo\";logo.href=\"/\"}logo.href=\"/\";logo.setAttribute(\"aria-label\",\"ORBIT X home\");if(!logo.querySelector(\"img\"))logo.innerHTML='<img src=\"/orbitx-wordmark.svg\" alt=\"ORBIT X\">';const wrap=document.createElement(\"div\");wrap.id=\"orbit-global-header\";wrap.innerHTML='<button class=\"orbit-profile-trigger\" id=\"orbitProfileTrigger\" type=\"button\" aria-expanded=\"false\"><span class=\"orbit-avatar-outline\"></span><span>Profile</span></button><a class=\"orbit-centered-logo\" href=\"/\" aria-label=\"ORBIT X home\"></a><form class=\"orbit-global-search\" id=\"orbitGlobalSearch\" role=\"search\"><input id=\"orbitGlobalSearchInput\" type=\"search\" placeholder=\"Search ORBIT X\" aria-label=\"Search ORBIT X\"><button type=\"submit\" aria-label=\"Search\"><span class=\"orbit-search-glass\"></span></button></form>';wrap.querySelector(\".orbit-centered-logo\").appendChild(logo);h.replaceChildren(wrap);const layer=document.createElement(\"div\");layer.id=\"orbitDrawerLayer\";layer.innerHTML='<button class=\"orbit-drawer-scrim\" type=\"button\" aria-label=\"Close menu\"></button><aside class=\"orbit-sidebar\" id=\"orbitSidebar\" aria-label=\"ORBIT X menu\" aria-hidden=\"true\"><div class=\"orbit-sidebar-head\"><strong>Who’s watching?</strong><button type=\"button\" class=\"orbit-drawer-close\" aria-label=\"Close menu\">×</button></div><a class=\"orbit-watching-profile\" href=\"/account\"><span class=\"orbit-profile-avatar\" id=\"orbitProfileAvatar\">○</span><span><strong id=\"orbitProfileName\">Choose a profile</strong><small id=\"orbitProfileSub\">Manage profiles and account</small></span></a><div class=\"orbit-side-divider\"></div><a class=\"orbit-side-link\" href=\"/settings#settings\"><span>⚙</span>Settings</a><a class=\"orbit-side-link\" href=\"/collections\"><span>▤</span>My Collections</a><a class=\"orbit-side-link\" href=\"/orbit-now\"><span>◉</span>Orbit Now</a><div class=\"orbit-side-divider\"></div><a class=\"orbit-side-link\" href=\"/movies.html\"><span>▣</span>Movies</a><a class=\"orbit-side-link\" href=\"/tv.html\"><span>▤</span>TV Shows</a></aside>';document.body.appendChild(layer);const css=document.createElement(\"style\");css.textContent='#orbit-global-header{position:relative;width:100%;height:100%;min-height:64px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 clamp(14px,3.4vw,48px);gap:12px}header:has(#orbit-global-header){padding:0!important;gap:0!important;height:70px!important;min-height:64px!important;display:flex!important;justify-content:stretch!important;z-index:120!important}#orbit-global-header .orbit-profile-trigger{justify-self:start;display:inline-flex;align-items:center;gap:10px;background:transparent!important;color:#F8F6FC!important;border:0!important;padding:8px 10px;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer}#orbit-global-header .orbit-profile-trigger:hover{background:#20172B!important;color:#B9A4FF!important}.orbit-avatar-outline{width:28px;height:28px;border:1.5px solid #A78BFA;border-radius:50%;display:inline-block;position:relative}.orbit-avatar-outline:before{content:\"\";position:absolute;width:7px;height:7px;border:1.5px solid currentColor;border-radius:50%;left:8.5px;top:4px}.orbit-avatar-outline:after{content:\"\";position:absolute;width:14px;height:7px;border:1.5px solid currentColor;border-radius:9px 9px 6px 6px;left:5px;bottom:3px}.orbit-centered-logo{grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:center;text-decoration:none}.orbit-centered-logo .logo{display:flex!important;align-items:center;justify-content:center}.orbit-centered-logo .logo img{display:block;width:205px;max-width:42vw;height:auto}.orbit-global-search{grid-column:3;grid-row:1;justify-self:end;display:flex;align-items:center;gap:0;width:min(260px,28vw);height:40px;border:1px solid #342A43;border-radius:22px;background:#14111B;overflow:hidden}.orbit-global-search:focus-within{border-color:#A78BFA;box-shadow:0 0 0 2px rgba(167,139,250,.12)}.orbit-global-search input{min-width:0;width:100%;height:100%;padding:0 12px;border:0!important;outline:0;background:transparent!important;color:#F8F6FC;font-size:13px;box-shadow:none!important}.orbit-global-search input::placeholder{color:#8E849D}.orbit-global-search button{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border:0!important;border-radius:50%;color:#F8F6FC!important;background:transparent!important;cursor:pointer}.orbit-global-search button:hover{color:#B9A4FF!important;background:#20172B!important}.orbit-search-glass{width:14px;height:14px;border:2px solid currentColor;border-radius:50%;position:relative}.orbit-search-glass:after{content:\"\";position:absolute;width:7px;height:2px;background:currentColor;right:-5px;bottom:-3px;transform:rotate(45deg)}#orbitDrawerLayer{position:fixed;inset:0;z-index:9999;pointer-events:none}.orbit-drawer-scrim{position:absolute;inset:0;width:100%;height:100%;border:0!important;background:rgba(0,0,0,.55)!important;opacity:0;pointer-events:none}.orbit-sidebar{position:absolute;left:0;top:0;bottom:0;width:min(360px,88vw);overflow:auto;background:#100D15;border-right:1px solid #49385E;box-shadow:20px 0 65px rgba(0,0,0,.45);padding:23px 18px 28px;transform:translateX(-105%);transition:transform .22s ease;pointer-events:auto;color:#F8F6FC}.orbit-drawer-scrim{transition:opacity .2s}#orbitDrawerLayer.open{pointer-events:auto}#orbitDrawerLayer.open .orbit-drawer-scrim{opacity:1;pointer-events:auto}#orbitDrawerLayer.open .orbit-sidebar{transform:translateX(0)}.orbit-sidebar-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;font-size:17px}.orbit-drawer-close{width:34px;height:34px;border:1px solid #342A43!important;border-radius:50%;background:#20172B!important;color:#fff!important;font-size:23px;cursor:pointer}.orbit-watching-profile{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid #342A43;border-radius:11px;background:#171020;color:#F8F6FC;text-decoration:none}.orbit-profile-avatar{width:44px;height:44px;display:grid;place-items:center;flex:0 0 auto;border:1px solid #514162;border-radius:50%;background:#20172B;color:#B9A4FF;font-size:20px}.orbit-watching-profile strong,.orbit-watching-profile small{display:block}.orbit-watching-profile strong{font-size:14px}.orbit-watching-profile small{font-size:11px;color:#B9B2C6;margin-top:4px}.orbit-side-divider{height:1px;background:#342A43;margin:17px 3px}.orbit-side-link{min-height:44px;display:flex;align-items:center;gap:12px;padding:10px 12px;margin:3px 0;border-radius:8px;color:#E9E2F3;text-decoration:none;font-size:14px}.orbit-side-link:hover,.orbit-side-link:focus-visible{background:#20172B;color:#B9A4FF;outline:none}.orbit-side-link>span:first-child{width:23px;display:inline-flex;align-items:center;justify-content:center;color:#B9A4FF;font-size:19px;flex:0 0 auto}.orbit-coming{margin-left:auto;color:#8E849D;font-size:10px}.orbit-side-search{width:13px;height:13px;border:2px solid currentColor;border-radius:50%;position:relative;margin:0 5px}.orbit-side-search:after{content:\"\";position:absolute;width:6px;height:2px;background:currentColor;right:-5px;bottom:-3px;transform:rotate(45deg)}@media(max-width:600px){#orbit-global-header .orbit-centered-logo .logo img{width:135px}#orbit-global-header .orbit-profile-trigger{gap:5px;padding-left:2px;font-size:11px}.orbit-avatar-outline{width:23px;height:23px}#orbit-global-header .orbit-global-search{width:118px;height:36px}#orbit-global-header .orbit-global-search input{padding:0 7px;font-size:11px}#orbit-global-header .orbit-global-search button{width:32px;flex-basis:32px;height:34px}}';document.head.appendChild(css);const searchForm=document.getElementById(\"orbitGlobalSearch\");if(searchForm)searchForm.addEventListener(\"submit\",e=>{e.preventDefault();const q=document.getElementById(\"orbitGlobalSearchInput\").value.trim();location.href=\"/search.html\"+(q?\"?q=\"+encodeURIComponent(q):\"\")});const panel=document.getElementById(\"orbitSidebar\"),trigger=document.getElementById(\"orbitProfileTrigger\");function open(){layer.classList.add(\"open\");panel.setAttribute(\"aria-hidden\",\"false\");trigger.setAttribute(\"aria-expanded\",\"true\")}function close(){layer.classList.remove(\"open\");panel.setAttribute(\"aria-hidden\",\"true\");trigger.setAttribute(\"aria-expanded\",\"false\")}trigger.onclick=()=>layer.classList.contains(\"open\")?close():open();trigger.addEventListener(\"mouseenter\",()=>{if(window.matchMedia(\"(hover:hover) and (pointer:fine)\").matches)open()});panel.addEventListener(\"mouseleave\",()=>{if(window.matchMedia(\"(hover:hover) and (pointer:fine)\").matches)close()});layer.querySelector(\".orbit-drawer-scrim\").onclick=close;layer.querySelector(\".orbit-drawer-close\").onclick=close;document.addEventListener(\"keydown\",e=>{if(e.key===\"Escape\")close()});panel.querySelectorAll(\"a\").forEach(a=>a.onclick=close);fetch(\"/api/auth/me\",{cache:\"no-store\"}).then(r=>r.ok?r.json():null).then(d=>{if(!d)return;const p=d.profiles&&d.profiles[0];if(p){document.getElementById(\"orbitProfileName\").textContent=p.name||\"Profile\";const av=(d.avatars||[]).find(a=>a.id===p.avatar_id);if(av&&av.icon)document.getElementById(\"orbitProfileAvatar\").innerHTML=av.icon;document.getElementById(\"orbitProfileSub\").textContent=\"Manage profiles and account\"}else{document.getElementById(\"orbitProfileName\").textContent=\"Sign in or choose a profile\";document.getElementById(\"orbitProfileSub\").textContent=\"Open profile settings\"}}).catch(()=>{})})();";
var ORBIT_FEATURES_JS = "(()=>{const path=location.pathname;const read=k=>{try{const a=JSON.parse(localStorage.getItem(k)||\"[]\");return Array.isArray(a)?a:[]}catch{return[]}};const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};const esc=s=>String(s||\"\").replace(/[&<>\"']/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#039;\"}[c]));async function items(){try{const r=await fetch(\"/api/public/content\",{cache:\"no-store\"});if(r.ok)return(await r.json()).content||[]}catch{}return[]}function card(i){return '<a class=\"orbit-mini-card\" href=\"/watch.html?slug='+encodeURIComponent(i.series_slug||i.slug||\"\")+'\">'+(i.poster_url?'<img src=\"'+esc(i.poster_url)+'\" alt=\"\" loading=\"lazy\" onerror=\"this.remove()\">':'<span class=\"orbit-mini-art\">ORBIT X</span>')+'<span><strong>'+esc(i.episode_title?(i.title||\"TV Show\")+\" — \"+i.episode_title:i.title)+'</strong><small>'+esc(i.type===\"show\"?\"TV Series\":\"Movie\")+(i.year?\" · \"+esc(i.year):\"\")+'</small></span></a>'}const st=document.createElement(\"style\");st.textContent='.orbit-mini-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:13px}.orbit-mini-card{display:block;min-width:0;border:1px solid #342A43;border-radius:9px;overflow:hidden;background:#14111B;color:#F8F6FC;text-decoration:none;transition:transform .16s,border-color .16s}.orbit-mini-card:hover{transform:translateY(-3px);border-color:#A78BFA}.orbit-mini-card img,.orbit-mini-art{display:flex;width:100%;aspect-ratio:2/3;object-fit:cover;align-items:center;justify-content:center;background:#20172B;color:#B9A4FF;font-weight:800}.orbit-mini-card>span:last-child{display:block;padding:9px}.orbit-mini-card strong{display:block;font-size:12px;line-height:1.4}.orbit-mini-card small{display:block;color:#B9B2C6;font-size:11px;margin-top:5px}.orbit-personal-section{margin:0 0 30px;padding:20px 0;color:#F8F6FC}.orbit-personal-section h2{font-size:25px;margin:0 0 8px}.orbit-personal-section p{font-size:13px;color:#B9B2C6;margin:0 0 15px}.orbit-pick-box{padding:18px;border:1px solid #342A43;border-radius:12px;background:linear-gradient(135deg,#171020,#0D0A12);margin:0 0 28px}.orbit-pick-controls{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.orbit-pick-controls label{display:grid;gap:6px;flex:1;min-width:150px;font-size:12px;color:#B9B2C6}.orbit-pick-controls select{width:100%;padding:11px;background:#0D0A12;color:#F8F6FC;border:1px solid #514162;border-radius:7px}.orbit-pick-controls button,.orbit-save-button,.orbit-modal button{border:1px solid #A78BFA!important;border-radius:7px;background:#A78BFA!important;color:#08070C!important;padding:11px 14px;font-weight:800;cursor:pointer}.orbit-save-button{background:#20172B!important;color:#F8F6FC!important;border-color:#514162!important}.orbit-save-modal{position:fixed;inset:0;z-index:10020;background:rgba(3,2,6,.8);display:none;align-items:center;justify-content:center;padding:18px}.orbit-save-modal.open{display:flex}.orbit-modal{width:min(460px,100%);max-height:85vh;overflow:auto;background:#100D15;border:1px solid #514162;border-radius:14px;padding:22px;color:#F8F6FC}.orbit-modal h2{font-size:22px;margin:0 0 7px}.orbit-modal p{font-size:13px;color:#B9B2C6;line-height:1.5;margin:0 0 15px}.orbit-modal .orbit-choice{display:block;width:100%;margin:7px 0;text-align:left;background:#20172B!important;color:#F8F6FC!important;border-color:#514162!important}.orbit-account-personal{max-width:1300px;margin:20px auto;padding:0 clamp(16px,4vw,48px)}@media(max-width:600px){.orbit-mini-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.orbit-pick-box{padding:13px}}';document.head.appendChild(st);\nasync function home(){const anchor=document.querySelector(\".ad-space\")||document.getElementById(\"movies\");if(!anchor)return;const s=document.createElement(\"section\");s.className=\"section\";s.id=\"continue-watching\";s.innerHTML='<h2 class=\"section-title\">Continue Watching</h2><p class=\"section-subtitle\">Pick up where you left off.</p><div class=\"orbit-mini-grid\" id=\"orbitHomeProgress\"></div><p id=\"orbitHomeEmpty\" style=\"color:#8E849D;font-size:13px;margin-top:8px\">Your movies and shows will appear here after you start watching.</p>';anchor.parentNode.insertBefore(s,anchor);const all=await items(),saved=read(\"orbitx-continue-watching\");document.getElementById(\"orbitHomeProgress\").innerHTML=saved.map(p=>{const i=all.find(x=>x.slug===(p.series_slug||p.slug))||p;return card(Object.assign({},i,p,{slug:p.series_slug||p.slug}))}).join(\"\");document.getElementById(\"orbitHomeEmpty\").hidden=!!saved.length}\nasync function search(){const field=document.querySelector(\".search-field\");if(!field)return;const s=document.createElement(\"section\");s.className=\"orbit-pick-box\";s.innerHTML='<h2 style=\"font-size:23px;margin-bottom:7px\">Pick My Orbit</h2><p style=\"font-size:13px;color:#B9B2C6;margin-bottom:15px\">Choose your mood and runtime to find something to watch.</p><div class=\"orbit-pick-controls\"><label>Mood<select id=\"orbitMood\"><option value=\"any\">Surprise me</option><option value=\"funny\">Comedy</option><option value=\"mystery\">Mystery</option><option value=\"adventure\">Adventure</option><option value=\"family\">Family friendly</option><option value=\"scifi\">Sci-fi or fantasy</option><option value=\"drama\">Drama</option></select></label><label>Runtime<select id=\"orbitTime\"><option value=\"any\">Any runtime</option><option value=\"60\">Under 60 minutes</option><option value=\"90\">Under 90 minutes</option><option value=\"120\">Under 2 hours</option></select></label><button id=\"orbitPickButton\" type=\"button\">Find picks</button></div><div class=\"orbit-mini-grid\" id=\"orbitPickResults\" style=\"margin-top:16px\"></div><p id=\"orbitPickNote\" style=\"font-size:13px;color:#B9B2C6;margin-top:10px\"></p>';field.insertAdjacentElement(\"afterend\",s);const all=await items();document.getElementById(\"orbitPickButton\").onclick=()=>{const m=document.getElementById(\"orbitMood\").value,t=document.getElementById(\"orbitTime\").value,rx={funny:/comedy|funny|stooges|chaplin/i,mystery:/mystery|detective|crime|sherlock/i,adventure:/adventure|action|western|tarzan/i,family:/family|kids|children|animation|cartoon/i,scifi:/sci-fi|science fiction|fantasy|space|monster/i,drama:/drama|romance|war|history/i};let a=all.filter(i=>(m===\"any\"||rx[m].test([i.title,i.description,i.genres,i.rating].join(\" \")))&&(t===\"any\"||!i.runtime_minutes||Number(i.runtime_minutes)<=Number(t)));if(!a.length&&m!==\"any\")a=all.filter(i=>t===\"any\"||!i.runtime_minutes||Number(i.runtime_minutes)<=Number(t));a.sort(()=>Math.random()-.5);document.getElementById(\"orbitPickResults\").innerHTML=a.slice(0,6).map(card).join(\"\");document.getElementById(\"orbitPickNote\").textContent=a.length?\"Here are your picks.\":\"No matches yet. Try another mood or runtime.\"}}\nfunction watch(){if(path!==\"/watch.html\")return;const a=document.getElementById(\"actions\");if(!a)return;const add=()=>{if(document.getElementById(\"orbitSaveButton\"))return;const b=document.createElement(\"button\");b.id=\"orbitSaveButton\";b.className=\"btn orbit-save-button\";b.type=\"button\";b.textContent=\"+ Save\";a.appendChild(b);b.onclick=async()=>{const p=new URLSearchParams(location.search),slug=p.get(\"slug\"),all=await items(),item=all.find(i=>i.slug===slug)||{slug,title:document.getElementById(\"title\")?.textContent||\"Title\",type:\"movie\"};let modal=document.getElementById(\"orbitSaveModal\");if(!modal){modal=document.createElement(\"div\");modal.id=\"orbitSaveModal\";modal.className=\"orbit-save-modal\";modal.innerHTML='<div class=\"orbit-modal\" role=\"dialog\" aria-modal=\"true\"><h2>Save to your collection</h2><p>Choose My Collection, Watch Later, or one of your own playlists.</p><div id=\"orbitSaveChoices\"></div><label style=\"display:block;font-size:12px;color:#B9B2C6;margin-top:15px\">Create a new collection<input id=\"orbitNewCollection\" type=\"text\" maxlength=\"60\" placeholder=\"Collection name\" style=\"display:block;width:100%;padding:11px;background:#0D0A12;color:#fff;border:1px solid #514162;border-radius:7px;margin-top:7px\"></label><p id=\"orbitSaveNote\"></p><div style=\"display:flex;justify-content:flex-end;gap:8px\"><button type=\"button\" id=\"orbitSaveClose\" style=\"background:#20172B!important;color:#fff!important;border-color:#514162!important\">Close</button><button type=\"button\" id=\"orbitSaveCreate\">Create & Save</button></div></div>';document.body.appendChild(modal);modal.onclick=e=>{if(e.target===modal)modal.classList.remove(\"open\")};document.getElementById(\"orbitSaveClose\").onclick=()=>modal.classList.remove(\"open\")}const choices=document.getElementById(\"orbitSaveChoices\");const render=()=>{const list=read(\"orbitx-my-list\"),cs=read(\"orbitx-custom-collections\");choices.innerHTML='<button class=\"orbit-choice\" data-kind=\"later\" type=\"button\">＋ Watch Later</button><button class=\"orbit-choice\" data-kind=\"my\" type=\"button\">＋ My Collection</button>'+cs.map((c,i)=>'<button class=\"orbit-choice\" data-kind=\"custom\" data-i=\"'+i+'\" type=\"button\">＋ '+esc(c.name)+'</button>').join(\"\");choices.querySelectorAll(\"button\").forEach(x=>x.onclick=()=>{const entry={slug:item.slug,title:item.title,poster_url:item.poster_url||\"\",type:item.type||\"movie\",year:item.year||\"\"};if(x.dataset.kind===\"later\"){const v=read(\"orbitx-my-list\").filter(z=>z.slug!==item.slug);v.unshift(entry);write(\"orbitx-my-list\",v);x.textContent=\"✓ Saved to Watch Later\"}else if(x.dataset.kind===\"my\"){const v=read(\"orbitx-my-collection\").filter(z=>z.slug!==item.slug);v.unshift(entry);write(\"orbitx-my-collection\",v);x.textContent=\"✓ Saved to My Collection\"}else{const v=read(\"orbitx-custom-collections\"),name=v[Number(x.dataset.i)]?.name;let col=v.find(z=>z.name.toLowerCase()===String(name||\"\").toLowerCase());if(!col){col={name:name||\"Playlist\",slugs:[]};v.unshift(col)}if(!col.slugs.includes(item.slug))col.slugs.push(item.slug);write(\"orbitx-custom-collections\",v);x.textContent=\"✓ Saved to \"+col.name}})};render();document.getElementById(\"orbitSaveCreate\").onclick=()=>{const n=document.getElementById(\"orbitNewCollection\").value.trim();if(!n){document.getElementById(\"orbitSaveNote\").textContent=\"Enter a collection name first.\";return}const v=read(\"orbitx-custom-collections\");let c=v.find(z=>z.name.toLowerCase()===n.toLowerCase());if(!c){c={name:n,slugs:[]};v.unshift(c)}if(!c.slugs.includes(item.slug))c.slugs.push(item.slug);write(\"orbitx-custom-collections\",v);document.getElementById(\"orbitSaveNote\").textContent=\"Saved to \"+n;document.getElementById(\"orbitNewCollection\").value=\"\";render()};modal.classList.add(\"open\")}};new MutationObserver(add).observe(a,{childList:true});add()}\nasync function collections(){if(path!==\"/collections\"&&path!==\"/collections.html\")return;const main=document.getElementById(\"orbitCollectionsMain\");if(!main)return;const all=await items(),bySlug=slug=>all.find(i=>i.slug===slug),sharedParam=new URLSearchParams(location.search).get(\"orbitCollection\");let shared=null;if(sharedParam){try{shared=JSON.parse(sharedParam)}catch{}}const saved=read(\"orbitx-my-collection\"),later=read(\"orbitx-my-list\");const renderCards=arr=>arr.map(p=>card(Object.assign({},bySlug(p.slug)||p))).join(\"\")||'<p class=\"orbit-collection-empty\">Nothing here yet. Use Save on a movie or TV show.</p>';if(shared){main.innerHTML='<section class=\"orbit-personal-section\"><h2>Shared playlist: '+esc(shared.name||\"ORBIT X collection\")+'</h2><p>Titles shared by another ORBIT X viewer.</p><div class=\"orbit-mini-grid\">'+(shared.slugs||[]).map(bySlug).filter(Boolean).map(card).join(\"\")+'</div></section>';return}main.innerHTML='<section class=\"orbit-personal-section\"><h2>Watch Later</h2><p>Movies and shows you saved to watch later.</p><div class=\"orbit-mini-grid\">'+renderCards(later)+'</div></section><section class=\"orbit-personal-section\"><h2>My Collection</h2><p>Your saved titles.</p><div class=\"orbit-mini-grid\">'+renderCards(saved)+'</div></section><section class=\"orbit-personal-section\"><h2>Playlists</h2><div class=\"orbit-create-row\"><input id=\"orbitCollectionsNewName\" maxlength=\"60\" placeholder=\"Name your new playlist\"><button id=\"orbitCollectionsCreate\" class=\"orbit-save-button\" type=\"button\">Create playlist</button></div><p id=\"orbitCollectionsNote\" aria-live=\"polite\"></p><div id=\"orbitCollectionsPlaylists\"></div></section>';const note=()=>document.getElementById(\"orbitCollectionsNote\");const render=()=>{const cs=read(\"orbitx-custom-collections\");document.getElementById(\"orbitCollectionsPlaylists\").innerHTML=cs.map((col,n)=>'<article class=\"orbit-playlist\"><div class=\"orbit-playlist-head\"><div><h3>'+esc(col.name)+'</h3><p>'+col.slugs.length+' saved title(s)</p></div><div class=\"orbit-playlist-actions\"><button type=\"button\" class=\"orbit-save-button\" data-share=\"'+n+'\">Share</button><button type=\"button\" class=\"orbit-save-button\" data-delete=\"'+n+'\">Delete</button></div></div><div class=\"orbit-mini-grid\">'+col.slugs.map(bySlug).filter(Boolean).map(card).join(\"\")+'</div></article>').join(\"\")||'<p class=\"orbit-collection-empty\">Create a playlist to keep favorite movies and shows together.</p>';document.querySelectorAll(\"[data-delete]\").forEach(b=>b.onclick=()=>{const a=read(\"orbitx-custom-collections\");a.splice(Number(b.dataset.delete),1);write(\"orbitx-custom-collections\",a);render()});document.querySelectorAll(\"[data-share]\").forEach(b=>b.onclick=async()=>{const col=read(\"orbitx-custom-collections\")[Number(b.dataset.share)];if(!col)return;const link=location.origin+\"/collections?orbitCollection=\"+encodeURIComponent(JSON.stringify({name:col.name,slugs:col.slugs}));try{await navigator.clipboard.writeText(link);note().textContent=\"Share link copied.\"}catch{window.prompt(\"Copy this playlist link:\",link)}})};render();document.getElementById(\"orbitCollectionsCreate\").onclick=()=>{const name=document.getElementById(\"orbitCollectionsNewName\").value.trim();if(!name){note().textContent=\"Enter a playlist name.\";return}const cols=read(\"orbitx-custom-collections\");if(!cols.some(x=>x.name.toLowerCase()===name.toLowerCase()))cols.unshift({name,slugs:[]});write(\"orbitx-custom-collections\",cols);document.getElementById(\"orbitCollectionsNewName\").value=\"\";render()}}if(path===\"/\"||path===\"/index.html\")home();if(path===\"/search.html\")search();if(path===\"/watch.html\")watch();collections()})();";
var ORBIT_NOW_HTML = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>ORBIT X — Orbit Now</title><link rel=\"stylesheet\" href=\"/theme.css?v=20261011-lunar-purple\"><style>body{margin:0;background:#08070C;color:#F8F6FC;font-family:Inter,system-ui,sans-serif}.site-header{height:70px;border-bottom:1px solid #342A43}.soon{min-height:calc(100vh - 71px);display:grid;place-items:center;text-align:center;padding:24px}.soon-card{max-width:650px;padding:clamp(28px,6vw,58px);border:1px solid #342A43;border-radius:20px;background:radial-gradient(circle at top,#20172B,#100D15 70%)}.soon-mark{font-size:12px;letter-spacing:.25em;text-transform:uppercase;color:#B9A4FF}.soon h1{font-size:clamp(34px,7vw,64px);margin:16px 0}.soon p{font-size:17px;line-height:1.7;color:#B9B2C6;margin:0 0 24px}.soon a{display:inline-block;text-decoration:none;padding:12px 18px;background:#A78BFA;color:#08070C;border-radius:9px;font-weight:800}</style></head><body><header class=\"site-header\"><a class=\"logo\" href=\"/\"><img src=\"/orbitx-wordmark.svg\" alt=\"ORBIT X\" style=\"width:190px;max-width:42vw\"></a></header><main class=\"soon\"><section class=\"soon-card\"><div class=\"soon-mark\">ORBIT X · ORBIT NOW</div><h1>Coming Soon</h1><p>Orbit Now will be the home for live programming, channel discovery, and what’s on next. We’re getting it ready.</p><a href=\"/\">Back to Home</a></section></main><script src=\"/orbit-sidebar.js\"></script></body></html>";
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/orbit-sidebar.js") return new Response(ORBIT_SIDEBAR_JS, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/orbit-features.js") return new Response(ORBIT_FEATURES_JS, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/search.html") {
      const asset = await env.ASSETS.fetch(request);
      if (!asset.ok) return asset;
      const ct = asset.headers.get("content-type") || "";
      if (!ct.includes("text/html")) return asset;
      return new Response(patchOrbitHtml(await asset.text()), { status: asset.status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/movies.html" || url.pathname === "/movies" || url.pathname === "/movies/") {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/movies.html";
      const page = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: request.method, headers: request.headers }));
      if (page.ok) {
        const html = patchOrbitHtml(await page.text());
        return new Response(patchOrbitHtml(html), { status: page.status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      }
      return new Response("Movies page could not be loaded.", { status: 503 });
    }
    if (url.pathname === "/tv.html" || url.pathname === "/tv" || url.pathname === "/tv/") {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/tv.html";
      const page = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: request.method, headers: request.headers }));
      if (page.ok) {
        let html = await page.text();
        html = html.replace(/<title>ORBIT - (Movies|TV Shows)<\/title>/g, "<title>ORBIT X \u2014 $1</title>").replace(/<a href="index\.html" class="logo">\s*ORBIT\s*<\/a>/g, '<a href="/" class="logo" aria-label="ORBIT X home">ORBIT X</a>').replace(/<a href="index\.html" class="logo">\s*ORBIT X\s*<\/a>/g, '<a href="/" class="logo" aria-label="ORBIT X home">ORBIT X</a>').replace(/<p>\s*ORBIT — Free Entertainment\s*<\/p>/g, "<p>ORBIT X \u2014 Free Entertainment</p>");
        return new Response(html, { status: page.status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      }
      return new Response("TV Shows page could not be loaded.", { status: 503 });
    }
    if (url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/admin.html") {
      return new Response(ADMIN_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/watch.html") {
      return new Response(patchOrbitHtml(WATCH_HTML), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/collections" || url.pathname === "/collections/" || url.pathname === "/collections.html") {
      return new Response(COLLECTIONS_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/orbit-now" || url.pathname === "/orbit-now/" || url.pathname === "/orbit-now.html") {
      return new Response(ORBIT_NOW_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/settings" || url.pathname === "/settings/") {
      return new Response(patchOrbitHtml(ACCOUNT_HTML), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/account" || url.pathname === "/account/") {
      return new Response(patchOrbitHtml(ACCOUNT_HTML), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/poster" && request.method === "GET") return posterProxy(url);
        if (url.pathname === "/api/auth/signup" && request.method === "POST") return signup(request, env);
        if (url.pathname === "/api/auth/login" && request.method === "POST") return login(request, env);
        if (url.pathname === "/api/auth/logout" && request.method === "POST") return logout(request, env);
        if (url.pathname === "/api/auth/me" && request.method === "GET") return accountData(request, env);
        if (url.pathname === "/api/profiles" && request.method === "POST") return saveProfile(request, env);
        if (url.pathname === "/api/profiles/delete" && request.method === "POST") return deleteProfile(request, env);
        if (url.pathname === "/api/settings" && request.method === "POST") return saveSettings(request, env);
        if (url.pathname === "/api/site-settings" && request.method === "GET") return publicSiteSettings(env);
        if (url.pathname === "/api/site-settings" && request.method === "POST") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return saveSiteSettings(request, env);
        }
        if (url.pathname === "/api/admin/users" && request.method === "GET") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return adminUsers(env);
        }
        if (url.pathname === "/api/content" && request.method === "GET") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return listContent(env, url, true);
        }
        if (url.pathname === "/api/public/content" && request.method === "GET") {
          return listContent(env, url, false);
        }
        if (url.pathname === "/api/content" && request.method === "POST") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return saveContent(request, env);
        }
        if (url.pathname === "/api/content/delete" && request.method === "POST") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return deleteContent(request, env);
        }
        if (url.pathname === "/api/genres" && request.method === "GET") {
          return getGenres(env);
        }
        if (url.pathname === "/api/seasons" && request.method === "GET") {
          const admin = Boolean(await requireAdmin(request, env));
          return getSeasons(env, url.searchParams.get("show_id"), admin);
        }
        if (url.pathname === "/api/seasons" && request.method === "POST") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return saveSeason(request, env);
        }
        if (url.pathname === "/api/episodes" && request.method === "GET") {
          const admin = Boolean(await requireAdmin(request, env));
          return getEpisodes(env, url.searchParams.get("season_id"), admin);
        }
        if (url.pathname === "/api/episodes" && request.method === "POST") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return saveEpisode(request, env);
        }
        if (url.pathname === "/api/upload" && request.method === "POST") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return upload(request, env);
        }
        if (url.pathname === "/api/upload-url" && request.method === "POST") return uploadUrl(request, env);
        if (url.pathname === "/api/import-url" && request.method === "POST") {
          if (!await requireAdmin(request, env)) return authJson({ error: "Admin access required." }, 403);
          return importUrl(request, env);
        }
        return json({ error: "API route not found." }, 404);
      } catch (error) {
        console.error(error);
        return json({ error: error.message || "Server error." }, 500);
      }
    }
    if (url.pathname === "/site.js") return new Response(SITE_JS, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/books" || url.pathname === "/books/" || url.pathname === "/books.html") {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/books.html";
      const page = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: request.method, headers: request.headers }));
      if (page.ok) {
        return new Response(await page.text(), { status: page.status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      }
      console.error("Orbit X Books asset could not be loaded:", page.status);
      return new Response("Orbit X Books could not be loaded right now. Please try again shortly.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/about.html") return new Response(patchOrbitHtml(ABOUT_HTML), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/about") return new Response(patchOrbitHtml(ABOUT_HTML), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/contact.html") return new Response(patchOrbitHtml(CONTACT_HTML), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/contact") return new Response(patchOrbitHtml(CONTACT_HTML), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/copyright.html") return new Response(patchOrbitHtml(COPYRIGHT_HTML), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/copyright") return new Response(patchOrbitHtml(COPYRIGHT_HTML), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/privacy.html") return new Response(patchOrbitHtml(PRIVACY_HTML), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/privacy") return new Response(patchOrbitHtml(PRIVACY_HTML), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname.startsWith("/media/") && request.method === "GET") {
      const key = decodeURIComponent(url.pathname.slice(7));
      if (!key || key.includes("..")) return new Response("Not found", { status: 404 });
      return Response.redirect(await b2SignedGet(env, key), 302);
    }
    if (url.pathname === "/admin.js" && request.method === "GET") return new Response(ADMIN_JS, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/schema.sql" || url.pathname.startsWith("/src/")) {
      return new Response("Not found", { status: 404 });
    }
    return env.ASSETS.fetch(request);
  }
};
var ADMIN_HTML = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>ORBIT Admin</title>\n<style>\n:root{color-scheme:dark;--bg:#090a0d;--panel:#111319;--panel2:#171a21;--line:#292e38;--text:#f4f5f7;--muted:#9aa1ad;--accent:#fff}\n*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif}\nheader{padding:22px 30px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:rgba(9,10,13,.94);backdrop-filter:blur(12px);z-index:5}\n.logo{font-size:24px;font-weight:900;letter-spacing:.18em}.admin{color:var(--muted);font-size:13px}\nmain{max-width:1200px;margin:0 auto;padding:30px 20px 70px}.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:25px}\nbutton,.button{border:1px solid var(--line);background:var(--panel2);color:var(--text);padding:11px 16px;border-radius:8px;cursor:pointer;font-weight:700}\nbutton.primary{background:#fff;color:#08090b;border-color:#fff}button.danger{border-color:#67343a;color:#ffb6bd}\n.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:22px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px}\nh1,h2,h3{margin-top:0}.muted{color:var(--muted)}label{display:block;font-size:13px;font-weight:700;margin:14px 0 7px}\ninput,textarea,select{width:100%;background:#0b0d11;border:1px solid var(--line);color:var(--text);padding:11px;border-radius:8px;font:inherit}\ntextarea{min-height:120px;resize:vertical}.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}\n.checks{display:flex;flex-wrap:wrap;gap:8px}.chip{display:flex;align-items:center;gap:6px;background:#0b0d11;border:1px solid var(--line);padding:8px 10px;border-radius:999px;font-size:13px}\n.chip input{width:auto}.drop{border:1px dashed #414754;border-radius:10px;padding:16px;text-align:center;background:#0c0e12}.drop input{border:0;padding:8px}\n.preview{width:100%;aspect-ratio:16/9;background:#0a0b0e;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#666}.preview img{width:100%;height:100%;object-fit:cover}\n.poster-preview{aspect-ratio:2/3}.row{display:flex;gap:8px;align-items:center}.row>*{flex:1}.actions{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}\n.list{display:grid;gap:9px;max-height:600px;overflow:auto}.item{border:1px solid var(--line);background:#0c0e12;border-radius:10px;padding:13px;cursor:pointer}.item:hover{border-color:#555}\n.item strong{display:block}.item small{color:var(--muted)}.status{float:right;font-size:11px;border:1px solid var(--line);padding:3px 6px;border-radius:999px}\n#showTools{display:none}.notice{padding:12px;border-radius:9px;background:#181b22;border:1px solid var(--line);margin-bottom:15px;font-size:13px}\n@media(max-width:850px){.grid{grid-template-columns:1fr}.two,.three{grid-template-columns:1fr}}\n.builder-shell{max-width:1200px;margin:0 auto 22px;padding:0 20px}.builder-head{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;display:flex;justify-content:space-between;gap:18px;align-items:center}.eyebrow{font-size:11px;letter-spacing:.16em;color:var(--muted);font-weight:800}.builder-head h2{margin:5px 0}.builder-actions{display:flex;gap:9px;flex-wrap:wrap}.builder-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,.7fr);gap:18px;margin-top:18px}.builder-preview-wrap{background:#000;border:1px solid var(--line);border-radius:14px;overflow:hidden}.builder-preview-wrap iframe{width:100%;height:700px;border:0}.builder-controls{display:grid;gap:12px}.builder-card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}.builder-card h3{margin-bottom:8px}@media(max-width:900px){.builder-grid{grid-template-columns:1fr}.builder-head{flex-direction:column;align-items:flex-start}}\n</style>\n    <link rel="stylesheet" href="/theme.css?v=20261011-lunar-purple">\n</head>\n<body>\n<header><div class="logo"><img class="orbit-wordmark" src="/orbitx-wordmark.svg" alt="ORBIT X"></div><div class="admin">CONTENT ADMIN</div></header>\n<main>\n<div class="toolbar">\n<button class="primary" id="newMovie">+ Add Movie</button>\n<button id="newShow">+ Add TV Show</button>\n<button id="refresh">Refresh</button>\n<a class="button" href="/" style="text-decoration:none">View Site</a>\n</div>\n<section class="builder-shell"><div class="builder-head"><div><div class="eyebrow">ORBIT X SITE BUILDER</div><h2>Customize your website</h2><p class="muted">Edit the real site design here, preview it, then publish.</p></div><div class="builder-actions"><button type="button" id="builderRefresh">Reset Preview</button><button type="button" class="primary" id="builderSave">Publish Website Changes</button></div></div><div class="builder-grid"><div class="builder-preview-wrap"><iframe id="sitePreview" title="ORBIT X preview"></iframe></div><div class="builder-controls">\n<div class="builder-card"><h3>Brand</h3><label>Logo image</label><div class="row"><input id="builderLogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"><button type="button" id="builderLogoUpload">Upload Logo</button></div><div id="builderLogoStatus" class="muted"></div><input id="builderLogoUrl" type="hidden"><label>Logo text</label><input id="builderLogo"><label>Logo size</label><input id="builderLogoSize" type="range" min="18" max="70" value="28"><div class="muted"><span id="builderLogoSizeOut">28</span> px</div></div>\n<div class="builder-card"><h3>Colors</h3><div class="two"><div><label>Page</label><input id="builderBg" type="color"></div><div><label>Header</label><input id="builderHeaderBg" type="color"></div><div><label>Cards</label><input id="builderCardBg" type="color"></div><div><label>Accent</label><input id="builderAccent" type="color"></div><div><label>Text</label><input id="builderText" type="color"></div><div><label>Muted text</label><input id="builderMuted" type="color"></div><div><label>Buttons</label><input id="builderButton" type="color"></div><div><label>Button hover</label><input id="builderHover" type="color"></div></div></div>\n<div class="builder-card"><h3>Hero</h3><label>Headline</label><input id="builderHeroTitle"><label>Description</label><textarea id="builderHeroDescription"></textarea><label>Backdrop image</label><div class="row"><input id="builderHeroFile" type="file" accept="image/*"><button type="button" id="builderHeroUpload">Upload</button></div><label>Backdrop URL</label><input id="builderHeroBackdrop"></div>\n<div class="builder-card"><h3>Sections</h3><label>Featured</label><input id="builderFeaturedTitle"><label>Recently Added</label><input id="builderRecentTitle"><label>Watch Now</label><input id="builderWatchTitle"><label>TV Shows</label><input id="builderTvTitle"></div>\n<div class="builder-card"><h3>Buttons & Layout</h3><label>Watch button text</label><input id="builderWatchText"><label>Site width</label><input id="builderMaxWidth" type="range" min="900" max="1800" value="1280"><div class="muted"><span id="builderMaxWidthOut">1280</span> px</div><label class="chip"><input id="builderAdEnabled" type="checkbox"> Show advertisement</label><label>Advertisement text</label><input id="builderAdText"></div>\n<div class="builder-card"><h3>Footer</h3><label>About</label><textarea id="builderFooterAbout"></textarea><label>Contact</label><input id="builderFooterContact"><label>Copyright</label><input id="builderFooterCopyright"><label>Privacy</label><input id="builderFooterPrivacy"></div>\n</div></div></section><section class="panel" style="margin:0 0 22px">\n<h2>Bulk Import YouTube Movies</h2>\n<p class="muted">Paste one YouTube video link per line. ORBIT will look up each public video title and thumbnail, then add it to the catalog using YouTube playback. No video downloads.</p>\n<label for="youtubeBulkLinks">YouTube links</label>\n<textarea id="youtubeBulkLinks" rows="7" placeholder="https://www.youtube.com/watch?v=...">https://www.youtube.com/watch?v=JSj1mZ9-CAM\nhttps://www.youtube.com/watch?v=dAeVyZieW1U\nhttps://www.youtube.com/watch?v=f-vk0G5EWrk\nhttps://www.youtube.com/watch?v=cs6UK61vYqI\nhttps://www.youtube.com/watch?v=--ZAVwdQvoo\nhttps://www.youtube.com/watch?v=rjF63_-1548\nhttps://www.youtube.com/watch?v=t_wJ7p1d7kU\nhttps://www.youtube.com/watch?v=CLLYrGrcAso\nhttps://www.youtube.com/watch?v=7VIB6D3SwKk\nhttps://www.youtube.com/watch?v=7vodgxAiqc4\nhttps://www.youtube.com/watch?v=SlUnAOFcmu4\nhttps://www.youtube.com/watch?v=IPaLgJag3No\nhttps://www.youtube.com/watch?v=L3F-9ZfXl_M\nhttps://www.youtube.com/watch?v=V1Nlk_pBqfc\nhttps://www.youtube.com/watch?v=L9YVnTGxPHs\nhttps://www.youtube.com/watch?v=saQOrNranuc\nhttps://www.youtube.com/watch?v=-zvhMjGWTUI\nhttps://www.youtube.com/watch?v=T-a8NiBvSs4\nhttps://www.youtube.com/watch?v=sFUc5KMYvB0\nhttps://www.youtube.com/watch?v=zNLTmEdDAPA\nhttps://www.youtube.com/watch?v=tKr9udblGv0\nhttps://www.youtube.com/watch?v=7SIY5LrE3Ls\nhttps://www.youtube.com/watch?v=r86pYHAWwSs\nhttps://www.youtube.com/watch?v=88gild2bj4A\nhttps://www.youtube.com/watch?v=usJZRDI_g00\nhttps://www.youtube.com/watch?v=TbiQYkCQb6c\nhttps://www.youtube.com/watch?v=ea5vNEO6Tew\nhttps://www.youtube.com/watch?v=S5DwXvxAMFs\nhttps://www.youtube.com/watch?v=QnxjFNkEOQg\nhttps://www.youtube.com/watch?v=bDUouOsYaTM\nhttps://www.youtube.com/watch?v=J3AnhYnfY_U\nhttps://www.youtube.com/watch?v=ZcGHSZxrQnY\nhttps://www.youtube.com/watch?v=ijDfbGEfEts\nhttps://www.youtube.com/watch?v=mMwIUGYIyx0\nhttps://www.youtube.com/watch?v=OnEAbR7n1sw\nhttps://www.youtube.com/watch?v=lGPZTq7kxQI</textarea>\n<div class="actions"><button type="button" class="primary" id="youtubeBulkImport">Import YouTube Links</button></div>\n<div id="youtubeBulkStatus" class="muted" aria-live="polite"></div>\n</section>\n<div id="notice" class="notice">Build your catalog here. Changes are saved directly to OrbitX.</div>\n<div class="grid">\n<section class="panel">\n<h2 id="formTitle">Add Movie</h2>\n<form id="contentForm">\n<input type="hidden" id="contentId">\n<div class="two">\n<div><label>Title</label><input id="title" required></div>\n<div><label>Year</label><input id="year" type="number" min="1888" max="2100"></div>\n</div>\n<label>Movie / Show Summary</label><textarea id="description" placeholder="Write the description viewers will see."></textarea>\n<div class="three"><div><label>Featured</label><label class="chip"><input id="featured" type="checkbox"> Show on home</label></div>\n<div><label>Runtime (minutes)</label><input id="runtime" type="number" min="1"></div>\n<div><label>Rating</label><select id="rating"><option value="">Select</option><option>G</option><option>PG</option><option>PG-13</option><option>R</option><option>NC-17</option><option>TV-Y</option><option>TV-Y7</option><option>TV-G</option><option>TV-PG</option><option>TV-14</option><option>TV-MA</option></select></div>\n<div><label>Status</label><select id="status"><option value="draft">Draft</option><option value="published">Publish Now</option><option value="scheduled">Scheduled</option></select></div>\n</div>\n<label>Genres \u2014 choose as many as you want</label>\n<div class="checks" id="genres"></div>\n<div class="two">\n<div><label>New Genre</label><div class="row"><input id="newGenre" placeholder="e.g. Horror"><button type="button" id="addGenre">Add</button></div></div>\n<div><label>Release Date & Time</label><input id="releaseAt" type="datetime-local"></div>\n</div>\n\n<h3 style="margin-top:24px">Images</h3>\n<div class="two">\n<div><label>Poster / Cover</label><div class="drop"><input id="posterFile" type="file" accept="image/*"><div class="preview poster-preview" id="posterPreview">Poster preview</div></div><input id="posterUrl" placeholder="or paste poster URL"></div>\n<div><label>Backdrop / Hero</label><div class="drop"><input id="backdropFile" type="file" accept="image/*"><div class="preview" id="backdropPreview">Netflix-style backdrop preview</div></div><input id="backdropUrl" placeholder="or paste backdrop URL"></div>\n</div>\n\n<h3 style="margin-top:24px">Trailer & Video</h3>\n<label>Trailer URL</label><input id="trailerUrl" placeholder="YouTube or hosted trailer URL">\n<label>Movie / Episode Video URL</label><input id="videoUrl" placeholder="Stored video URL">\n<label>Captions / Subtitle File URL (optional .vtt)</label><input id="captionsUrl" placeholder="https://example.com/captions.vtt">\n<div class="drop" style="margin-top:10px;text-align:left">\n  <strong>Import video from a link</strong>\n  <div class="muted" style="margin:5px 0 10px">Paste a direct video file link. Orbit X will download and store it. Maximum target: 2 hours / 20 GB.</div>\n  <div class="row"><input id="videoImportUrl" placeholder="https://example.com/movie.mp4"><button type="button" id="importVideo">Import Video</button></div>\n  <div id="videoImportStatus" class="muted" style="margin-top:8px"></div>\n</div>\n<label>Or upload a video file</label>\n<input id="videoFile" type="file" accept="video/*">\n<div class="muted" style="margin-top:6px">Only upload or import videos you have permission to store and stream.</div>\n\n<div class="actions"><button type="submit" class="primary">Save</button><button type="button" id="saveDraft">Save Draft</button><button type="button" id="delete" class="danger">Delete</button></div>\n</form>\n\n<div id="showTools">\n<h3 style="margin-top:32px">TV Seasons & Episodes</h3>\n<div class="two"><input id="seasonNumber" type="number" min="1" value="1" placeholder="Season #"><input id="seasonTitle" placeholder="Season title"></div>\n<textarea id="seasonDescription" placeholder="Season description"></textarea>\n<button id="saveSeason" type="button">Save Season</button>\n<div id="seasonList" style="margin-top:12px"></div>\n<div id="episodeEditor" style="display:none;margin-top:16px">\n<h3>Episodes</h3>\n<div id="episodeList"></div>\n<div class="two"><input id="episodeNumber" type="number" min="1" value="1" placeholder="Episode #"><input id="episodeTitle" placeholder="Episode title"></div>\n<textarea id="episodeDescription" placeholder="Episode description"></textarea>\n<input id="episodeVideo" placeholder="Episode video URL">\n<label>Episode captions file URL (optional .vtt)</label><input id="episodeCaptionsUrl" placeholder="https://example.com/episode-captions.vtt">\n<div class="drop" style="margin-top:10px;text-align:left"><strong>Import episode video</strong><div class="row"><input id="episodeImportUrl" placeholder="https://example.com/episode.mp4"><button type="button" id="importEpisodeVideo">Import</button></div><div id="episodeImportStatus" class="muted" style="margin-top:8px"></div></div>\n<button id="saveEpisode" type="button">Save Episode</button>\n</div>\n</div>\n</section>\n\n<aside class="panel">\n<h2>Catalog</h2>\n<div class="two"><select id="filterType"><option value="">All</option><option value="movie">Movies</option><option value="show">TV Shows</option></select><input id="search" placeholder="Search title..."></div>\n<div class="list" id="contentList" style="margin-top:15px"></div>\n</aside>\n</div>\n\n<section class="panel" style="grid-column:1/-1"><h2>Site Control Center</h2><p class="muted">Change the website without editing code. These controls affect the live site.</p><div class="two">\n<div><label>Logo text</label><input id="siteLogo"></div><div><label>Watch button text</label><input id="siteWatchText"></div>\n<div><label>Accent color</label><input id="siteAccent" type="color" value="#ffffff"></div><div><label>Hover button color</label><input id="siteHover" type="color" value="#ffffff"></div>\n<div><label>Advertisement text</label><input id="siteAdText"></div><div><label class="chip"><input id="siteAdEnabled" type="checkbox" checked> Show advertisement area</label></div>\n</div>\n<label>Blocked search terms (comma separated)</label><input id="blockedSearchTerms" placeholder="term1, term2">\n<label>Featured movie IDs (comma separated)</label><input id="featuredIds" placeholder="content_x,...">\n<label>Watch Now movie IDs (comma separated)</label><input id="watchNowIds" placeholder="content_x,...">\n<label>Recently Added movie IDs (comma separated)</label><input id="recentIds" placeholder="content_x,...">\n<label>Top scrolling promo movie IDs (comma separated)</label><input id="promoIds" placeholder="content_x,...">\n<div class="actions"><button type="button" class="primary" id="saveSite">Save Site Settings</button><button type="button" id="loadUsers">Show Accounts</button></div><div id="usersPanel" class="list"></div></section>\n<section class="builder-section creative-section"><h2>Creative Effects</h2><div class="builder-grid">\n<label>Card radius <input id="builderRadius" type="range" min="0" max="28" value="12"><output id="builderRadiusOut">12px</output></label>\n<label>Card shadow <input id="builderShadow" type="range" min="0" max="40" value="18"><output id="builderShadowOut">18px</output></label>\n<label>Backdrop darkness <input id="builderHeroOverlay" type="range" min="0" max="90" value="35"><output id="builderHeroOverlayOut">35%</output></label>\n<label>Poster height <input id="builderPosterHeight" type="range" min="140" max="360" value="240"><output id="builderPosterHeightOut">240px</output></label>\n<label>Section spacing <input id="builderSectionGap" type="range" min="8" max="80" value="32"><output id="builderSectionGapOut">32px</output></label>\n<label>Page glow <input id="builderGlow" type="range" min="0" max="50" value="0"><output id="builderGlowOut">0px</output></label></div>\n<div class="creative-actions"><button type="button" id="builderThemeNight">Midnight</button><button type="button" id="builderThemeNeon">Neon</button><button type="button" id="builderThemeCinema">Cinema</button><button type="button" id="builderThemeClean">Clean</button></div></section></main>\n<script src="/admin.js"><\/script>\n</body>\n</html>';
var ADMIN_JS = `const $ = id => document.getElementById(id);
let currentType = "movie";
let contentItems = [];
let seasons = [];
let currentSeasonId = null;
let currentEpisodeId = null;
let currentEpisodeStatus = "draft";

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

async function loadGenres(selected = []) {
  const data = await api("/api/genres");
  $("genres").innerHTML = data.genres.map(g =>
    \`<label class="chip"><input type="checkbox" value="\${esc(g.name)}" \${selected.includes(g.name) ? "checked" : ""}> \${esc(g.name)}</label>\`
  ).join("") || '<span class="muted">Add your first genre below.</span>';
}

async function loadList() {
  const type = $("filterType").value;
  const q = $("search").value.trim();
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (q) params.set("q", q);
  const data = await api("/api/content?" + params);
  contentItems = data.content;
  $("contentList").innerHTML = contentItems.map(item =>
    \`<div class="item" data-id="\${item.id}">
      <span class="status">\${esc(item.status)}</span>
      <strong>\${esc(item.title)}</strong>
      <small>\${item.type === "show" ? "TV Show" : "Movie"} \xB7 \${esc(item.year || "")} \${item.rating ? "\xB7 " + esc(item.rating) : ""}</small>
    </div>\`
  ).join("") || '<p class="muted">No content yet.</p>';
  document.querySelectorAll(".item").forEach(el => {
    el.onclick = () => editContent(el.dataset.id);
  });
}

async function editContent(id) {
  const item = contentItems.find(x => x.id === id);
  if (!item) return;
  currentType = item.type;
  $("formTitle").textContent = item.type === "show" ? "Edit TV Show" : "Edit Movie";
  $("contentId").value = item.id;
  $("title").value = item.title || "";
  $("year").value = item.year || "";
  $("description").value = item.description || "";
  $("runtime").value = item.runtime_minutes || "";
  $("rating").value = item.rating || "";
  $("status").value = item.status || "draft";
  $("releaseAt").value = item.release_at ? item.release_at.slice(0,16) : "";
  $("posterUrl").value = item.poster_url || "";
  $("backdropUrl").value = item.backdrop_url || "";
  $("trailerUrl").value = item.trailer_url || "";
  $("videoUrl").value = item.video_url || "";
  $("captionsUrl").value = item.captions_url || "";
  $("featured").checked = !!item.featured;
  $("posterPreview").innerHTML = item.poster_url ? \`<img src="\${esc(item.poster_url)}">\` : "Poster preview";
  $("backdropPreview").innerHTML = item.backdrop_url ? \`<img src="\${esc(item.backdrop_url)}">\` : "Netflix-style backdrop preview";
  $("showTools").style.display = item.type === "show" ? "block" : "none";
  const genreData = await api("/api/genres");
  const selected = String(item.genres || "").split("||").filter(Boolean);
  const all = await api("/api/content?type=" + item.type);
  const full = all.content.find(x => x.id === id);
  // Genres are loaded separately below.
  await loadGenres(selected);
  if (item.type === "show") loadSeasons(item.id);
}

function resetForm(type = "movie") {
  currentType = type;
  $("contentForm").reset();
  $("contentId").value = "";
  $("formTitle").textContent = type === "show" ? "Add TV Show" : "Add Movie";
  $("showTools").style.display = type === "show" ? "block" : "none";
  $("posterPreview").textContent = "Poster preview";
  $("backdropPreview").textContent = "Netflix-style backdrop preview";
  $("status").value = "draft";
  $("releaseAt").value = "";
  loadGenres();
}

async function save(statusOverride) {
  const genres = [...document.querySelectorAll("#genres input:checked")].map(x => x.value);
  const body = {
    id: $("contentId").value || undefined,
    type: currentType,
    title: $("title").value.trim(),
    year: $("year").value || null,
    description: $("description").value,
    runtime_minutes: $("runtime").value || null,
    rating: $("rating").value,
    status: statusOverride || $("status").value,
    release_at: $("releaseAt").value ? new Date($("releaseAt").value).toISOString() : null,
    poster_url: $("posterUrl").value.trim(),
    backdrop_url: $("backdropUrl").value.trim(),
    trailer_url: $("trailerUrl").value.trim(),
    video_url: $("videoUrl").value.trim(),
    captions_url: $("captionsUrl").value.trim(),
    genres,
    featured: $("featured").checked
  };
  if (!body.title) return alert("Please enter a title.");
  const data = await api("/api/content", {method:"POST", body:JSON.stringify(body)});
  $("contentId").value = data.id;
  alert(statusOverride === "published" ? "Published." : "Saved.");
  await loadList();
  if (currentType === "show") await loadSeasons(data.id);
}

async function uploadFile(file, folder, targetInput, preview) {
  if (!file) return;
  try {
    $("notice").textContent = "Uploading " + file.name + " securely...";
    const res = await fetch("/api/upload?folder=" + encodeURIComponent(folder) + "&filename=" + encodeURIComponent(file.name), {
      method:"POST", headers:{"Content-Type":file.type || "application/octet-stream"}, body:file
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok || !data.url) throw new Error(data.error || ("Upload failed (" + res.status + ")"));
    targetInput.value = data.url;
    if (preview && file.type.startsWith("image/")) preview.innerHTML = '<img src="' + esc(data.url) + '" alt="">';
    $("notice").textContent = "Uploaded " + file.name + ". Click Save to attach it to this title.";
  } catch (err) {
    $("notice").textContent = "Upload failed: " + err.message;
    alert("Upload failed: " + err.message);
  }
}
async function importVideoUrl(inputId, targetId, statusId, folder) {
  const source = $(inputId).value.trim();
  if (!source) return alert("Paste a direct video file link first.");
  $(statusId).textContent = "Downloading video and storing it. Keep this page open while it transfers...";
  $(inputId).disabled = true;
  try {
    const data = await api("/api/import-url", {
      method:"POST",
      body:JSON.stringify({url:source, folder})
    });
    $(targetId).value = data.url || "";
    $(statusId).textContent = data.content_length
      ? "Video imported (" + Math.round(data.content_length/1048576) + " MB) and attached."
      : "Video imported and attached.";
  } catch (err) {
    $(statusId).textContent = "Import failed: " + err.message;
  } finally {
    $(inputId).disabled = false;
  }
}

$("newMovie").onclick = () => 
async function importYouTubeBulk() {
  const status = $("youtubeBulkStatus");
  const button = $("youtubeBulkImport");
  let raw = $("youtubeBulkLinks").value.trim();
  if (!raw) { alert("Paste the YouTube links first."); return; }
  try { raw = decodeURIComponent(raw); } catch (_) {}
  const links = [...new Set(raw.split(/\\s+/).map(x => x.trim()).filter(Boolean)
    .map(x => x.trim()))];
  const valid = [];
  for (const link of links) {
    try {
      const u = new URL(link);
      if (u.hostname !== "youtube.com" && !u.hostname.endsWith(".youtube.com") && u.hostname !== "youtu.be") continue;
      const parts = u.pathname.split("/").filter(Boolean);
      const id = u.hostname === "youtu.be" ? parts[0] : (u.searchParams.get("v") || (["embed", "shorts"].includes(parts[0]) ? parts[1] : ""));
      if (id) valid.push({id, url:"https://www.youtube.com/watch?v=" + id});
    } catch (_) {}
  }
  const unique = [...new Map(valid.map(x => [x.id, x])).values()];
  if (!unique.length) { alert("I couldn't find individual YouTube video links in that text."); return; }
  button.disabled = true;
  let added = 0, skipped = 0, drafts = 0, failed = 0;
  try {
    status.textContent = "Checking existing catalog entries...";
    const existingData = await api("/api/content?type=movie");
    const existing = existingData.content || [];
    for (let i = 0; i < unique.length; i++) {
      const item = unique[i];
      status.textContent = "Importing " + (i + 1) + " of " + unique.length + "...";
      if (existing.some(x => String(x.video_url || "").includes(item.id))) { skipped++; continue; }
      let meta = null;
      try {
        const response = await fetch("https://noembed.com/embed?url=" + encodeURIComponent(item.url));
        if (response.ok) {
          const data = await response.json();
          if (data && data.title) meta = data;
        }
      } catch (_) {}
      const title = meta?.title || ("YouTube Video " + item.id);
      const thumbnail = meta?.thumbnail_url || ("https://i.ytimg.com/vi/" + item.id + "/hqdefault.jpg");
      const payload = {
        type: "movie",
        title,
        description: "",
        year: null,
        runtime_minutes: null,
        rating: "",
        poster_url: thumbnail,
        backdrop_url: thumbnail,
        trailer_url: "",
        video_url: item.url,
        featured: false,
        status: meta ? "published" : "draft",
        release_at: null,
        genres: []
      };
      try {
        const saved = await api("/api/content", {method:"POST", body:JSON.stringify(payload)});
        existing.push({id:saved.id, title, video_url:item.url});
        added++;
        if (!meta) drafts++;
      } catch (e) { failed++; }
    }
    status.textContent = "Finished. Added " + added + ", skipped duplicates " + skipped + ", saved as drafts because title lookup failed " + drafts + ", failed " + failed + ".";
    $("notice").textContent = "YouTube import finished. Review the catalog list and edit any draft entries whose titles could not be retrieved.";
    await loadList();
  } catch (e) {
    status.textContent = "Import stopped: " + e.message;
  } finally {
    button.disabled = false;
  }
}
$("youtubeBulkImport").onclick = importYouTubeBulk;

resetForm("movie");
$("newShow").onclick = () => resetForm("show");
$("refresh").onclick = loadList;
$("filterType").onchange = loadList;
$("search").oninput = () => { clearTimeout(window.searchTimer); window.searchTimer = setTimeout(loadList, 250); };
$("contentForm").onsubmit = e => { e.preventDefault(); save(); };
$("saveDraft").onclick = () => save("draft");
$("delete").onclick = async () => {
  if (!$("contentId").value) return;
  if (!confirm("Delete this item?")) return;
  await api("/api/content/delete", {method:"POST",body:JSON.stringify({id:$("contentId").value})});
  resetForm(currentType); await loadList();
};
$("addGenre").onclick = async () => {
  const name = $("newGenre").value.trim();
  if (!name) return;
  // Genres are created automatically when a content item is saved.
  const chip = document.createElement("label");
  chip.className = "chip";
  chip.innerHTML = \`<input type="checkbox" checked value="\${esc(name)}"> \${esc(name)}\`;
  $("genres").appendChild(chip);
  $("newGenre").value = "";
};
$("posterFile").onchange = e => uploadFile(e.target.files[0], "posters", $("posterUrl"), $("posterPreview"));
$("videoFile").onchange = async e => { const f=e.target.files[0]; if(!f)return; if(f.size>25*1024*1024){alert("That video is over 25 MB. Use the video link importer for larger videos.");e.target.value="";return;} await uploadFile(f,"videos",$("videoUrl"),null); };
$("importVideo").onclick = () => importVideoUrl("videoImportUrl", "videoUrl", "videoImportStatus", "videos");
$("importEpisodeVideo").onclick = () => importVideoUrl("episodeImportUrl", "episodeVideo", "episodeImportStatus", "episodes");
$("backdropFile").onchange = e => uploadFile(e.target.files[0], "backdrops", $("backdropUrl"), $("backdropPreview"));

async function loadSeasons(showId) {
  const data = await api("/api/seasons?show_id=" + encodeURIComponent(showId));
  seasons = data.seasons;
  $("seasonList").innerHTML = seasons.map(s =>
    \`<div class="item" data-season="\${s.id}"><strong>Season \${s.season_number}</strong><small>\${esc(s.title || "")}</small></div>\`
  ).join("") || '<p class="muted">No seasons yet.</p>';
  document.querySelectorAll("[data-season]").forEach(el => el.onclick = () => loadEpisodes(el.dataset.season));
}
$("saveSeason").onclick = async () => {
  if (!$("contentId").value) return alert("Save the TV show first.");
  await api("/api/seasons", {method:"POST",body:JSON.stringify({
    show_id:$("contentId").value,
    season_number:$("seasonNumber").value,
    title:$("seasonTitle").value,
    description:$("seasonDescription").value
  })});
  await loadSeasons($("contentId").value);
};
async function loadEpisodes(seasonId) {
  currentSeasonId = seasonId;
  currentEpisodeId = null;
  currentEpisodeStatus = "draft";
  $("episodeEditor").style.display = "block";
  $("episodeNumber").value = "1";
  $("episodeTitle").value = "";
  $("episodeDescription").value = "";
  $("episodeVideo").value = "";
  $("episodeCaptionsUrl").value = "";
  $("saveEpisode").textContent = "Save Episode";
  const data = await api("/api/episodes?season_id=" + encodeURIComponent(seasonId));
  $("episodeList").innerHTML = data.episodes.map(e =>
    \`<div class="item" data-episode="\${esc(e.id)}"><strong>E\${e.episode_number}: \${esc(e.title)}</strong><small>\${esc(e.status)}</small></div>\`
  ).join("") || '<p class="muted">No episodes yet.</p>';
  document.querySelectorAll("[data-episode]").forEach(el => el.onclick = () => {
    const e = data.episodes.find(x => x.id === el.dataset.episode);
    if (!e) return;
    currentEpisodeId = e.id;
    currentEpisodeStatus = e.status || "draft";
    $("episodeNumber").value = e.episode_number || 1;
    $("episodeTitle").value = e.title || "";
    $("episodeDescription").value = e.description || "";
    $("episodeVideo").value = e.video_url || "";
    $("episodeCaptionsUrl").value = e.captions_url || "";
    $("saveEpisode").textContent = "Update Episode";
  });
}
$("saveEpisode").onclick = async () => {
  if (!currentSeasonId) return alert("Choose a season first.");
  await api("/api/episodes", {method:"POST",body:JSON.stringify({
    id:currentEpisodeId || undefined,
    season_id:currentSeasonId,
    episode_number:$("episodeNumber").value,
    title:$("episodeTitle").value,
    description:$("episodeDescription").value,
    video_url:$("episodeVideo").value,
    captions_url:$("episodeCaptionsUrl").value.trim(),
    status:currentEpisodeStatus || "draft"
  })});
  await loadEpisodes(currentSeasonId);
};

resetForm("movie");

async function loadSiteSettings(){const d=await api("/api/site-settings");const s=d.settings||{};$("siteLogo").value=s.logo_text||"ORBIT X";$("siteWatchText").value=s.watch_button_text||"Watch";$("siteAccent").value=s.accent||"#A78BFA";$("siteHover").value=s.button_hover||"#B9A4FF";$("siteAdText").value=s.ad_text||"ADVERTISEMENT";$("siteAdEnabled").checked=s.ad_enabled!==false;$("blockedSearchTerms").value=(s.blocked_search_terms||[]).join(", ");$("featuredIds").value=(s.featured_ids||[]).join(", ");$("watchNowIds").value=(s.watch_now_ids||[]).join(", ");$("recentIds").value=(s.recent_ids||[]).join(", ");$("promoIds").value=(s.promo_ids||[]).join(", ")}
$("saveSite").onclick=async()=>{
  try{
    $("notice").textContent="Saving site settings...";
    await api("/api/site-settings",{method:"POST",body:JSON.stringify({
      logo_text:$("siteLogo").value.trim(),
      watch_button_text:$("siteWatchText").value.trim(),
      accent:$("siteAccent").value,
      button_hover:$("siteHover").value,
      ad_text:$("siteAdText").value.trim(),
      ad_enabled:$("siteAdEnabled").checked,
      blocked_search_terms:$("blockedSearchTerms").value.split(",").map(x=>x.trim()).filter(Boolean),
      featured_ids:$("featuredIds").value.split(",").map(x=>x.trim()).filter(Boolean),
      watch_now_ids:$("watchNowIds").value.split(",").map(x=>x.trim()).filter(Boolean),
      recent_ids:$("recentIds").value.split(",").map(x=>x.trim()).filter(Boolean),
      promo_ids:$("promoIds").value.split(",").map(x=>x.trim()).filter(Boolean)
    })});
    $("notice").textContent="Site settings saved.";
    alert("Site settings saved.");
  }catch(err){ $("notice").textContent="Could not save site settings: "+err.message; alert("Could not save site settings: "+err.message); }
};
$("loadUsers").onclick=async()=>{const d=await api("/api/admin/users");$("usersPanel").innerHTML=d.users.map(u=>'<div class="item"><strong>'+esc(u.email)+'</strong><small>Created '+esc(u.created_at||"")+' \xB7 '+esc(u.profiles||0)+' profiles'+(u.is_admin?' \xB7 Admin':"")+(u.disabled?' \xB7 Disabled':"")+'</small></div>').join("")||'<p class="muted">No accounts yet.</p>'};
loadSiteSettings().catch(err => { $("notice").textContent = "Could not load site settings: " + err.message; });

async function uploadBuilderAsset(file,folder,targetId,statusId){if(!file)return;try{$(statusId).textContent="Uploading "+file.name+"...";const r=await fetch("/api/upload?folder="+encodeURIComponent(folder)+"&filename="+encodeURIComponent(file.name),{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream"},body:file});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||("Upload failed ("+r.status+")"));$(targetId).value=d.url;window.builderLogoUrl=$("builderLogoUrl").value;$(statusId).textContent="Uploaded. Publish to apply it.";refreshBuilder()}catch(e){$(statusId).textContent="Upload failed: "+e.message;alert("Upload failed: "+e.message)}} 
async function loadBuilder(){try{const d=await api("/api/site-settings"),s=d.settings||{};const v={builderLogo:s.logo_text||"ORBIT X",builderBg:s.background_color||"#080808",builderHeaderBg:s.header_background||"#0b0b0b",builderCardBg:s.card_background||"#151515",builderAccent:s.accent||"#ffffff",builderText:s.text_color||"#ffffff",builderMuted:s.muted_color||"#a0a0a0",builderButton:s.button_color||"#ffffff",builderHover:s.button_hover||"#dddddd",builderHeroTitle:s.hero_title||"ORBIT X",builderHeroDescription:s.hero_description||"",builderHeroBackdrop:s.hero_backdrop||"",builderFeaturedTitle:s.featured_title||"Featured Movies",builderRecentTitle:s.recent_title||"Recently Added",builderWatchTitle:s.watch_now_title||"Watch Now",builderTvTitle:s.tv_title||"TV Shows",builderWatchText:s.watch_button_text||"Watch",builderMaxWidth:s.max_width||1280,builderAdText:s.ad_text||"ADVERTISEMENT",builderFooterAbout:s.footer_about||"",builderFooterContact:s.footer_contact||"",builderFooterCopyright:s.footer_copyright||"",builderFooterPrivacy:s.footer_privacy||""};Object.keys(v).forEach(k=>{if($(k))$(k).value=v[k]});$("builderAdEnabled").checked=s.ad_enabled!==false;$("builderLogoSize").value=s.logo_size||28;$("builderMaxWidth").value=s.max_width||1280;$("builderLogoUrl").value=s.logo_url||"";window.builderLogoUrl=s.logo_url||"";updateBuilderOutputs();refreshBuilder()}catch(e){console.error(e)}}
function updateBuilderOutputs(){$("builderLogoSizeOut").textContent=$("builderLogoSize").value;$("builderMaxWidthOut").textContent=$("builderMaxWidth").value}
function builderPayload(){return{logo_text:$("builderLogo").value.trim(),logo_url:$("builderLogoUrl").value||window.builderLogoUrl||"",logo_size:Number($("builderLogoSize").value),background_color:$("builderBg").value,header_background:$("builderHeaderBg").value,card_background:$("builderCardBg").value,accent:$("builderAccent").value,text_color:$("builderText").value,muted_color:$("builderMuted").value,button_color:$("builderButton").value,button_hover:$("builderHover").value,hero_title:$("builderHeroTitle").value.trim(),hero_description:$("builderHeroDescription").value.trim(),hero_backdrop:$("builderHeroBackdrop").value.trim(),featured_title:$("builderFeaturedTitle").value.trim(),recent_title:$("builderRecentTitle").value.trim(),watch_now_title:$("builderWatchTitle").value.trim(),tv_title:$("builderTvTitle").value.trim(),watch_button_text:$("builderWatchText").value.trim(),max_width:Number($("builderMaxWidth").value),ad_enabled:$("builderAdEnabled").checked,ad_text:$("builderAdText").value.trim(),footer_about:$("builderFooterAbout").value,footer_contact:$("builderFooterContact").value,footer_copyright:$("builderFooterCopyright").value,footer_privacy:$("builderFooterPrivacy").value}}
function refreshBuilder(){const s=builderPayload(),f=$("sitePreview"),logo=s.logo_url?'<img src="'+s.logo_url+'" style="height:'+s.logo_size+'px;max-width:180px;object-fit:contain">':esc(s.logo_text);f.srcdoc='<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;background:'+s.background_color+';color:'+s.text_color+';font-family:Arial,sans-serif}.bar{height:68px;background:'+s.header_background+';display:flex;align-items:center;padding:0 25px;gap:24px}.hero{min-height:300px;padding:55px;background:linear-gradient(90deg,'+s.background_color+',rgba(0,0,0,.25)),url("'+s.hero_backdrop+'") center/cover}.hero h1{font-size:48px}.hero p{max-width:650px;color:'+s.muted_color+'}.btn{display:inline-block;background:'+s.button_color+';color:#000;padding:10px 15px;border-radius:7px}.section{max-width:'+s.max_width+'px;margin:auto;padding:28px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.card{height:160px;background:'+s.card_background+';border-radius:8px}.ad{margin:15px auto;padding:20px;max-width:'+s.max_width+'px;border:1px dashed #555;text-align:center;color:'+s.muted_color+'}</style></head><body><div class="bar"><div>'+logo+'</div><span>Home</span><span>Movies</span><span>TV</span><span style="margin-left:auto">Search</span></div><div class="hero"><h1>'+esc(s.hero_title)+'</h1><p>'+esc(s.hero_description)+'</p><span class="btn">'+esc(s.watch_button_text)+'</span></div>'+(s.ad_enabled?'<div class="ad">'+esc(s.ad_text)+'</div>':"")+'<div class="section"><h2>'+esc(s.featured_title)+'</h2><div class="grid"><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div></div></div><div class="section"><h2>'+esc(s.recent_title)+'</h2><div class="grid"><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div></div></div></body></html>'}
$("builderLogoUpload").onclick=()=>uploadBuilderAsset($("builderLogoFile").files[0],"site","builderLogoUrl","builderLogoStatus");$("builderHeroUpload").onclick=()=>uploadBuilderAsset($("builderHeroFile").files[0],"site-backgrounds","builderHeroBackdrop","builderLogoStatus");
["builderLogo","builderLogoSize","builderBg","builderHeaderBg","builderCardBg","builderAccent","builderText","builderMuted","builderButton","builderHover","builderHeroTitle","builderHeroDescription","builderHeroBackdrop","builderFeaturedTitle","builderRecentTitle","builderWatchTitle","builderTvTitle","builderWatchText","builderMaxWidth","builderAdEnabled","builderAdText","builderFooterAbout","builderFooterContact","builderFooterCopyright","builderFooterPrivacy"].forEach(id=>$(id)?.addEventListener("input",()=>{updateBuilderOutputs();refreshBuilder()}));$("builderRefresh").onclick=loadBuilder;$("builderSave").onclick=async()=>{try{await api("/api/site-settings",{method:"POST",body:JSON.stringify(builderPayload())});$("notice").textContent="Website changes published.";alert("Website changes published.")}catch(e){alert("Could not publish website changes: "+e.message)}};loadBuilder();
loadList().catch(err => {
  $("notice").textContent = "Admin API is being connected. " + err.message;
});

function bindCreativeControls(){const pairs=[["builderRadius","builderRadiusOut","px"],["builderShadow","builderShadowOut","px"],["builderHeroOverlay","builderHeroOverlayOut","%"],["builderPosterHeight","builderPosterHeightOut","px"],["builderSectionGap","builderSectionGapOut","px"],["builderGlow","builderGlowOut","px"]];const preview=()=>{pairs.forEach(([a,b,s])=>{const e=document.getElementById(a),o=document.getElementById(b);if(e&&o)o.textContent=e.value+s});const f=document.getElementById("builderPreview"),d=f&&f.contentDocument;if(d){d.documentElement.style.setProperty("--orbit-radius",(document.getElementById("builderRadius")?.value||12)+"px");d.documentElement.style.setProperty("--orbit-gap",(document.getElementById("builderSectionGap")?.value||32)+"px");d.documentElement.style.setProperty("--orbit-poster-height",(document.getElementById("builderPosterHeight")?.value||240)+"px");d.documentElement.style.setProperty("--orbit-shadow","0 14px "+(document.getElementById("builderShadow")?.value||18)+"px rgba(0,0,0,.45)")}};pairs.forEach(([a])=>document.getElementById(a)?.addEventListener("input",preview));const themes={builderThemeNight:["#090b12","#111522","#181d2b","#7c5cff","#f4f6ff"],builderThemeNeon:["#05050a","#0b0b14","#151525","#00e5ff","#fff"],builderThemeCinema:["#100b08","#17120f","#241a14","#d7a45a","#fff7eb"],builderThemeClean:["#f4f5f7","#fff","#e9ebef","#5b5bd6","#17181c"]};Object.entries(themes).forEach(([id,v])=>document.getElementById(id)?.addEventListener("click",()=>{["builderBg","builderHeader","builderCard","builderAccent","builderText"].forEach((x,i)=>{const e=document.getElementById(x);if(e)e.value=v[i]});["builderBg","builderHeader","builderCard","builderAccent","builderText"].forEach(x=>document.getElementById(x)?.dispatchEvent(new Event("input",{bubbles:true})));preview()}));preview()}
bindCreativeControls();`;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
