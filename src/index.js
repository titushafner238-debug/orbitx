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


function awsEncode(value) { return encodeURIComponent(value).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase()); }
function hex(buffer) { return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function hmac(key, data) { return crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", key, {name:"HMAC", hash:"SHA-256"}, false, ["sign"]), new TextEncoder().encode(data)); }
async function signingKey(secret, date, region, service) { const a=await hmac(new TextEncoder().encode("AWS4"+secret),date); const b=await hmac(a,region); const c=await hmac(b,service); return hmac(c,"aws4_request"); }
function b2Config(env) { if(!env.B2_KEY_ID||!env.B2_APP_KEY||!env.B2_BUCKET_NAME||!env.B2_ENDPOINT) throw new Error("Backblaze B2 storage is not configured."); const endpoint=env.B2_ENDPOINT.replace(/\/$/,""); return {endpoint,host:new URL(endpoint).host,bucket:env.B2_BUCKET_NAME,keyId:env.B2_KEY_ID,secret:env.B2_APP_KEY,region:(new URL(endpoint).hostname.match(/^s3\.([^.]+)\.backblazeb2\.com$/)?.[1]||"us-east-005")}; }
async function b2SignedPut(request,env,key) { const c=b2Config(env), now=new Date(), amz=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z"), date=amz.slice(0,8), hash="UNSIGNED-PAYLOAD", ct=request.headers.get("content-type")||"application/octet-stream", uri="/"+awsEncode(c.bucket)+"/"+key.split("/").map(awsEncode).join("/"), ch="content-type:"+ct.trim()+"\nhost:"+c.host+"\nx-amz-content-sha256:"+hash+"\n", sh="content-type;host;x-amz-content-sha256", cr=["PUT",uri,"",ch,sh,hash].join("\n"), scope=date+"/"+c.region+"/s3/aws4_request", sts="AWS4-HMAC-SHA256\n"+amz+"\n"+scope+"\n"+hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(cr))), sig=hex(await signingKey(c.secret,date,c.region,"s3").then(k=>hmac(k,sts))), auth="AWS4-HMAC-SHA256 Credential="+c.keyId+"/"+scope+", SignedHeaders="+sh+", Signature="+sig; const r=await fetch(c.endpoint+uri,{method:"PUT",headers:{"content-type":ct,"x-amz-content-sha256":hash,"authorization":auth,"x-amz-date":amz},body:request.body}); if(!r.ok) throw new Error("Backblaze upload failed: "+r.status+" "+await r.text()); }
async function b2SignedGet(env,key) { const c=b2Config(env),now=new Date(),amz=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z"),date=amz.slice(0,8),scope=date+"/"+c.region+"/s3/aws4_request",uri="/"+awsEncode(c.bucket)+"/"+key.split("/").map(awsEncode).join("/"),p={"X-Amz-Algorithm":"AWS4-HMAC-SHA256","X-Amz-Credential":c.keyId+"/"+scope,"X-Amz-Date":amz,"X-Amz-Expires":"3600","X-Amz-SignedHeaders":"host"},cq=Object.keys(p).sort().map(k=>awsEncode(k)+"="+awsEncode(p[k])).join("&"),cr=["GET",uri,cq,"host:"+c.host+"\n","host","UNSIGNED-PAYLOAD"].join("\n"),sts="AWS4-HMAC-SHA256\n"+amz+"\n"+scope+"\n"+hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(cr))),sig=hex(await signingKey(c.secret,date,c.region,"s3").then(k=>hmac(k,sts))); return c.endpoint+uri+"?"+cq+"&X-Amz-Signature="+sig; }
async function b2SignedPutUrl(env,key) { const c=b2Config(env),now=new Date(),amz=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z"),date=amz.slice(0,8),scope=date+"/"+c.region+"/s3/aws4_request",uri="/"+awsEncode(c.bucket)+"/"+key.split("/").map(awsEncode).join("/"),p={"X-Amz-Algorithm":"AWS4-HMAC-SHA256","X-Amz-Credential":c.keyId+"/"+scope,"X-Amz-Date":amz,"X-Amz-Expires":"3600","X-Amz-SignedHeaders":"host"},cq=Object.keys(p).sort().map(k=>awsEncode(k)+"="+awsEncode(p[k])).join("&"),cr=["PUT",uri,cq,"host:"+c.host+"\n","host","UNSIGNED-PAYLOAD"].join("\n"),sts="AWS4-HMAC-SHA256\n"+amz+"\n"+scope+"\n"+hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(cr))),sig=hex(await signingKey(c.secret,date,c.region,"s3").then(k=>hmac(k,sts))); return c.endpoint+uri+"?"+cq+"&X-Amz-Signature="+sig; }
async function b2PutCors(env) { const c=b2Config(env),now=new Date(),amz=now.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z"),date=amz.slice(0,8),scope=date+"/"+c.region+"/s3/aws4_request",uri="/"+awsEncode(c.bucket)+"/",xml="<CORSConfiguration><CORSRule><ID>orbitx-admin</ID><AllowedOrigin>https://orbitx.titushafner238.workers.dev</AllowedOrigin><AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedMethod>PUT</AllowedMethod><AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader><MaxAgeSeconds>3600</MaxAgeSeconds></CORSRule></CORSConfiguration>",payload=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(xml))),ch="content-type:application/xml\nhost:"+c.host+"\nx-amz-content-sha256:"+payload+"\n",sh="content-type;host;x-amz-content-sha256",cr=["PUT",uri,"cors=",ch,sh,payload].join("\n"),sts="AWS4-HMAC-SHA256\n"+amz+"\n"+scope+"\n"+hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(cr))),sig=hex(await signingKey(c.secret,date,c.region,"s3").then(k=>hmac(k,sts))),auth="AWS4-HMAC-SHA256 Credential="+c.keyId+"/"+scope+", SignedHeaders="+sh+", Signature="+sig,res=await fetch(c.endpoint+uri+"?cors=",{method:"PUT",headers:{"content-type":"application/xml","x-amz-content-sha256":payload,"x-amz-date":amz,"authorization":auth},body:xml}); if(!res.ok) throw new Error("Backblaze CORS setup failed: "+res.status+" "+await res.text()); }


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
           status, release_at, created_at, updated_at,
           COALESCE((SELECT group_concat(g.name, '||') FROM content_genres cg JOIN genres g ON g.id = cg.genre_id WHERE cg.content_id = content.id), '') AS genres
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

async function upload(request, env) { const u=new URL(request.url); const folder=(u.searchParams.get("folder")||"uploads").replace(/[^a-z0-9_-]/gi,""); const filename=(u.searchParams.get("filename")||"file").replace(/[^a-z0-9._-]/gi,"_"); const key=folder+"/"+crypto.randomUUID()+"-"+filename; await b2SignedPut(request,env,key); return json({ok:true,key,url:"/media/"+encodeURIComponent(key)}); }
async function uploadUrl(request, env) { await b2PutCors(env); const body=await request.json(); const folder=String(body.folder||"uploads").replace(/[^a-z0-9_-]/gi,""); const filename=String(body.filename||"file").replace(/[^a-z0-9._-]/gi,"_"); const key=folder+"/"+crypto.randomUUID()+"-"+filename; return json({ok:true,key,url:"/media/"+encodeURIComponent(key),upload_url:await b2SignedPutUrl(env,key)}); }

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

        if (url.pathname === "/api/upload" && request.method === "POST") return upload(request, env);
        if (url.pathname === "/api/upload-url" && request.method === "POST") return uploadUrl(request, env);
        
        return json({ error: "API route not found." }, 404);
      } catch (error) {
        console.error(error);
        return json({ error: error.message || "Server error." }, 500);
      }
    }

    if (url.pathname.startsWith("/media/") && request.method === "GET") return Response.redirect(await b2SignedGet(env, decodeURIComponent(url.pathname.slice(7))), 302);
    if (url.pathname === "/admin.js" && request.method === "GET") return new Response(ADMIN_JS,{headers:{"content-type":"text/javascript; charset=utf-8","cache-control":"no-store"}});
    if (url.pathname === "/catalog.js" && request.method === "GET") return new Response(CATALOG_JS,{headers:{"content-type":"text/javascript; charset=utf-8","cache-control":"no-store"}});

    if (url.pathname === "/schema.sql" || url.pathname.startsWith("/src/")) {
      return new Response("Not found", { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};

const ADMIN_JS="const $ = id => document.getElementById(id);\nlet currentType = \"movie\";\nlet contentItems = [];\nlet seasons = [];\nlet currentSeasonId = null;\n\nasync function api(url, options = {}) {\n  const res = await fetch(url, {\n    headers: { \"Content-Type\": \"application/json\", ...(options.headers || {}) },\n    ...options\n  });\n  const data = await res.json().catch(() => ({}));\n  if (!res.ok) throw new Error(data.error || \"Request failed\");\n  return data;\n}\n\nfunction esc(s) {\n  return String(s ?? \"\").replace(/[&<>\"']/g, c => ({\n    \"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#039;\"\n  }[c]));\n}\n\nasync function loadGenres(selected = []) {\n  const data = await api(\"/api/genres\");\n  $(\"genres\").innerHTML = data.genres.map(g =>\n    `<label class=\"chip\"><input type=\"checkbox\" value=\"${esc(g.name)}\" ${selected.includes(g.name) ? \"checked\" : \"\"}> ${esc(g.name)}</label>`\n  ).join(\"\") || '<span class=\"muted\">Add your first genre below.</span>';\n}\n\nasync function loadList() {\n  const type = $(\"filterType\").value;\n  const q = $(\"search\").value.trim();\n  const params = new URLSearchParams();\n  if (type) params.set(\"type\", type);\n  if (q) params.set(\"q\", q);\n  const data = await api(\"/api/content?\" + params);\n  contentItems = data.content;\n  $(\"contentList\").innerHTML = contentItems.map(item =>\n    `<div class=\"item\" data-id=\"${item.id}\">\n      <span class=\"status\">${esc(item.status)}</span>\n      <strong>${esc(item.title)}</strong>\n      <small>${item.type === \"show\" ? \"TV Show\" : \"Movie\"} · ${esc(item.year || \"\")} ${item.rating ? \"· \" + esc(item.rating) : \"\"}</small>\n    </div>`\n  ).join(\"\") || '<p class=\"muted\">No content yet.</p>';\n  document.querySelectorAll(\".item\").forEach(el => {\n    el.onclick = () => editContent(el.dataset.id);\n  });\n}\n\nasync function editContent(id) {\n  const item = contentItems.find(x => x.id === id);\n  if (!item) return;\n  currentType = item.type;\n  $(\"formTitle\").textContent = item.type === \"show\" ? \"Edit TV Show\" : \"Edit Movie\";\n  $(\"contentId\").value = item.id;\n  $(\"title\").value = item.title || \"\";\n  $(\"year\").value = item.year || \"\";\n  $(\"description\").value = item.description || \"\";\n  $(\"runtime\").value = item.runtime_minutes || \"\";\n  $(\"rating\").value = item.rating || \"\";\n  $(\"status\").value = item.status || \"draft\";\n  $(\"releaseAt\").value = item.release_at ? item.release_at.slice(0,16) : \"\";\n  $(\"posterUrl\").value = item.poster_url || \"\";\n  $(\"backdropUrl\").value = item.backdrop_url || \"\";\n  $(\"trailerUrl\").value = item.trailer_url || \"\";\n  $(\"videoUrl\").value = item.video_url || \"\";\n  $(\"featured\").checked = !!item.featured;\n  $(\"posterPreview\").innerHTML = item.poster_url ? `<img src=\"${esc(item.poster_url)}\">` : \"Poster preview\";\n  $(\"backdropPreview\").innerHTML = item.backdrop_url ? `<img src=\"${esc(item.backdrop_url)}\">` : \"Netflix-style backdrop preview\";\n  $(\"showTools\").style.display = item.type === \"show\" ? \"block\" : \"none\";\n  const genreData = await api(\"/api/genres\");\n  const selected = String(item.genres || \"\").split(\"||\").filter(Boolean);\n  const all = await api(\"/api/content?type=\" + item.type);\n  const full = all.content.find(x => x.id === id);\n  // Genres are loaded separately below.\n  await loadGenres(selected);\n  if (item.type === \"show\") loadSeasons(item.id);\n}\n\nfunction resetForm(type = \"movie\") {\n  currentType = type;\n  $(\"contentForm\").reset();\n  $(\"contentId\").value = \"\";\n  $(\"formTitle\").textContent = type === \"show\" ? \"Add TV Show\" : \"Add Movie\";\n  $(\"showTools\").style.display = type === \"show\" ? \"block\" : \"none\";\n  $(\"posterPreview\").textContent = \"Poster preview\";\n  $(\"backdropPreview\").textContent = \"Netflix-style backdrop preview\";\n  $(\"status\").value = \"draft\";\n  $(\"releaseAt\").value = \"\";\n  loadGenres();\n}\n\nasync function save(statusOverride) {\n  const genres = [...document.querySelectorAll(\"#genres input:checked\")].map(x => x.value);\n  const body = {\n    id: $(\"contentId\").value || undefined,\n    type: currentType,\n    title: $(\"title\").value.trim(),\n    year: $(\"year\").value || null,\n    description: $(\"description\").value,\n    runtime_minutes: $(\"runtime\").value || null,\n    rating: $(\"rating\").value,\n    status: statusOverride || $(\"status\").value,\n    release_at: $(\"releaseAt\").value ? new Date($(\"releaseAt\").value).toISOString() : null,\n    poster_url: $(\"posterUrl\").value.trim(),\n    backdrop_url: $(\"backdropUrl\").value.trim(),\n    trailer_url: $(\"trailerUrl\").value.trim(),\n    video_url: $(\"videoUrl\").value.trim(),\n    genres,\n    featured: $(\"featured\").checked\n  };\n  if (!body.title) return alert(\"Please enter a title.\");\n  const data = await api(\"/api/content\", {method:\"POST\", body:JSON.stringify(body)});\n  $(\"contentId\").value = data.id;\n  alert(statusOverride === \"published\" ? \"Published.\" : \"Saved.\");\n  await loadList();\n  if (currentType === \"show\") await loadSeasons(data.id);\n}\n\nasync function uploadFile(file,folder,targetInput,preview){if(!file)return;const meta=await api(\"/api/upload-url\",{method:\"POST\",body:JSON.stringify({folder,filename:file.name})});const res=await fetch(meta.upload_url,{method:\"PUT\",headers:{\"Content-Type\":file.type||\"application/octet-stream\"},body:file});if(!res.ok)return alert(\"Upload failed: \"+res.status);targetInput.value=meta.url||\"\";if(preview&&file.type.startsWith(\"image/\"))preview.innerHTML='<img src=\"'+esc(meta.url)+'\">';alert(\"Uploaded and attached.\");}\nfunction addUploadInputs(){if(!$(\"videoFile\")){const i=document.createElement(\"input\");i.type=\"file\";i.id=\"videoFile\";i.accept=\"video/*\";i.style.marginTop=\"8px\";$(\"videoUrl\").parentNode.insertBefore(i,$(\"videoUrl\"));i.onchange=e=>uploadFile(e.target.files[0],\"videos\",$(\"videoUrl\"),null);}if(!$(\"episodeVideoFile\")){const i=document.createElement(\"input\");i.type=\"file\";i.id=\"episodeVideoFile\";i.accept=\"video/*\";i.style.marginTop=\"8px\";$(\"episodeVideo\").parentNode.insertBefore(i,$(\"episodeVideo\"));i.onchange=e=>uploadFile(e.target.files[0],\"episodes\",$(\"episodeVideo\"),null);}}\nresetForm(\"movie\");\naddUploadInputs();\n$(\"newShow\").onclick = () => resetForm(\"show\");\n$(\"refresh\").onclick = loadList;\n$(\"filterType\").onchange = loadList;\n$(\"search\").oninput = () => { clearTimeout(window.searchTimer); window.searchTimer = setTimeout(loadList, 250); };\n$(\"contentForm\").onsubmit = e => { e.preventDefault(); save(); };\n$(\"saveDraft\").onclick = () => save(\"draft\");\n$(\"delete\").onclick = async () => {\n  if (!$(\"contentId\").value) return;\n  if (!confirm(\"Delete this item?\")) return;\n  await api(\"/api/content/delete\", {method:\"POST\",body:JSON.stringify({id:$(\"contentId\").value})});\n  resetForm(currentType); await loadList();\n};\n$(\"addGenre\").onclick = async () => {\n  const name = $(\"newGenre\").value.trim();\n  if (!name) return;\n  // Genres are created automatically when a content item is saved.\n  const chip = document.createElement(\"label\");\n  chip.className = \"chip\";\n  chip.innerHTML = `<input type=\"checkbox\" checked value=\"${esc(name)}\"> ${esc(name)}`;\n  $(\"genres\").appendChild(chip);\n  $(\"newGenre\").value = \"\";\n};\n$(\"posterFile\").onchange = e => uploadFile(e.target.files[0], \"posters\", $(\"posterUrl\"), $(\"posterPreview\"));\n$(\"backdropFile\").onchange = e => uploadFile(e.target.files[0], \"backdrops\", $(\"backdropUrl\"), $(\"backdropPreview\"));\n\nasync function loadSeasons(showId) {\n  const data = await api(\"/api/seasons?show_id=\" + encodeURIComponent(showId));\n  seasons = data.seasons;\n  $(\"seasonList\").innerHTML = seasons.map(s =>\n    `<div class=\"item\" data-season=\"${s.id}\"><strong>Season ${s.season_number}</strong><small>${esc(s.title || \"\")}</small></div>`\n  ).join(\"\") || '<p class=\"muted\">No seasons yet.</p>';\n  document.querySelectorAll(\"[data-season]\").forEach(el => el.onclick = () => loadEpisodes(el.dataset.season));\n}\n$(\"saveSeason\").onclick = async () => {\n  if (!$(\"contentId\").value) return alert(\"Save the TV show first.\");\n  await api(\"/api/seasons\", {method:\"POST\",body:JSON.stringify({\n    show_id:$(\"contentId\").value,\n    season_number:$(\"seasonNumber\").value,\n    title:$(\"seasonTitle\").value,\n    description:$(\"seasonDescription\").value\n  })});\n  await loadSeasons($(\"contentId\").value);\n};\nasync function loadEpisodes(seasonId) {\n  currentSeasonId = seasonId;\n  $(\"episodeEditor\").style.display = \"block\";\n  const data = await api(\"/api/episodes?season_id=\" + encodeURIComponent(seasonId));\n  $(\"episodeList\").innerHTML = data.episodes.map(e =>\n    `<div class=\"item\"><strong>E${e.episode_number}: ${esc(e.title)}</strong><small>${esc(e.status)}</small></div>`\n  ).join(\"\") || '<p class=\"muted\">No episodes yet.</p>';\n}\n$(\"saveEpisode\").onclick = async () => {\n  if (!currentSeasonId) return alert(\"Choose a season first.\");\n  await api(\"/api/episodes\", {method:\"POST\",body:JSON.stringify({\n    season_id:currentSeasonId,\n    episode_number:$(\"episodeNumber\").value,\n    title:$(\"episodeTitle\").value,\n    description:$(\"episodeDescription\").value,\n    video_url:$(\"episodeVideo\").value,\n    status:\"draft\"\n  })});\n  await loadEpisodes(currentSeasonId);\n};\n\nresetForm(\"movie\");\nloadList().catch(err => {\n  $(\"notice\").textContent = \"Admin API is being connected. \" + err.message;\n});\n";
const CATALOG_JS="const esc=s=>String(s??\"\").replace(/[&<>\"']/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#039;\"}[c]));(async()=>{try{const r=await fetch(\"/api/public/content\");const d=await r.json();const items=d.content||[];const card=i=>{const m=[i.year,i.rating,i.runtime_minutes?i.runtime_minutes+\" min\":\"\"].filter(Boolean).join(\" · \");return '<article class=\"movie-card\"><div class=\"poster\">'+(i.poster_url?'<img src=\"'+esc(i.poster_url)+'\" alt=\"'+esc(i.title)+'\" style=\"width:100%;height:100%;object-fit:cover\">':'POSTER')+'</div><div class=\"movie-info\"><div class=\"movie-title\">'+esc(i.title)+'</div><div class=\"movie-meta\">'+esc(m||\"ORBIT\")+'</div>'+(i.description?'<div class=\"movie-description\">'+esc(i.description)+'</div>':'')+'<a href=\"/watch.html?slug='+encodeURIComponent(i.slug)+'\" class=\"watch-button\">Watch</a></div></article>'};const movies=items.filter(i=>i.type===\"movie\"),shows=items.filter(i=>i.type===\"show\");if(location.pathname.endsWith(\"movies.html\")){const g=document.getElementById(\"movieGrid\");if(g)g.innerHTML=movies.map(card).join(\"\")||\"<p>No movies published yet.</p>\";const n=document.getElementById(\"movieCount\");if(n)n.textContent=movies.length}if(location.pathname.endsWith(\"tv.html\")){const g=document.querySelector(\".movie-grid\")||document.querySelector(\".empty\");if(g){g.className=\"movie-grid\";g.innerHTML=shows.map(card).join(\"\")||\"<p>No TV shows published yet.</p>\"}}if(location.pathname.endsWith(\"/\")||location.pathname.endsWith(\"index.html\")){const grids=document.querySelectorAll(\".movie-grid\"),featured=movies.filter(i=>i.featured);if(grids[0])grids[0].innerHTML=(featured.length?featured:movies).slice(0,5).map(card).join(\"\")||\"<p>No movies published yet.</p>\";if(grids[1])grids[1].innerHTML=movies.slice(0,5).map(card).join(\"\")||\"<p>No movies published yet.</p>\";const tg=document.querySelector(\"#tv .movie-grid\");if(tg)tg.innerHTML=shows.slice(0,5).map(card).join(\"\")||\"<p>No TV shows published yet.</p>\";const h=featured[0];if(h){const hero=document.querySelector(\".hero\");if(hero&&h.backdrop_url)hero.style.backgroundImage='linear-gradient(90deg,#080808 15%,rgba(8,8,8,.92) 40%,rgba(8,8,8,.45) 75%,rgba(8,8,8,.15)),url(\"'+h.backdrop_url+'\")';const t=document.querySelector(\".hero h1\"),p=document.querySelector(\".hero p\");if(t)t.textContent=h.title;if(p)p.textContent=h.description||\"\"}}}catch(e){console.error(e)}})();";
