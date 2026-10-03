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


const AUTH_COOKIE = "orbit_session";
const SESSION_DAYS = 30;
const AVATARS = [
  {id:"orbit-cat",name:"Cosmo Cat",icon:"🐱"},{id:"orbit-fox",name:"Nova Fox",icon:"🦊"},
  {id:"orbit-monster",name:"Orbit Monster",icon:"👾"},{id:"orbit-robot",name:"Pixel Bot",icon:"🤖"},
  {id:"orbit-bunny",name:"Moon Bunny",icon:"🐰"},{id:"orbit-bear",name:"Comet Bear",icon:"🐻"},
  {id:"orbit-unicorn",name:"Star Unicorn",icon:"🦄"},{id:"orbit-alien",name:"Zippy Alien",icon:"👽"},
  {id:"orbit-dog",name:"Rocket Pup",icon:"🐶"},{id:"orbit-frog",name:"Cosmic Frog",icon:"🐸"},
  {id:"orbit-panda",name:"Galaxy Panda",icon:"🐼"},{id:"orbit-dragon",name:"Little Dragon",icon:"🐲"}
];
function b64u(bytes){let s="";const a=new Uint8Array(bytes);for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function fromB64u(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const b=atob(s),o=new Uint8Array(b.length);for(let i=0;i<b.length;i++)o[i]=b.charCodeAt(i);return o}
async function sha256Text(v){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(v))}
async function hashPassword(p){const salt=new Uint8Array(16);crypto.getRandomValues(salt);const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(p),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:120000,hash:"SHA-256"},k,256);return "pbkdf2$120000$"+b64u(salt)+"$"+b64u(bits)}
async function verifyPassword(p,stored){const x=String(stored||"").split("$");if(x.length!==4||x[0]!=="pbkdf2")return false;const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(p),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:fromB64u(x[2]),iterations:Number(x[1]),hash:"SHA-256"},k,256);const storedHash=fromB64u(x[3]);const actual=new Uint8Array(bits);if(storedHash.length!==actual.length)return false;let diff=0;for(let i=0;i<actual.length;i++)diff|=actual[i]^storedHash[i];return diff===0}
function passwordError(p){if(typeof p!=="string"||p.length<8)return"Password must be at least 8 characters.";if(!/[A-Z]/.test(p))return"Password needs at least one uppercase letter.";if(!/[a-z]/.test(p))return"Password needs at least one lowercase letter.";if(!/[0-9]/.test(p))return"Password needs at least one number.";if(!/[^A-Za-z0-9]/.test(p))return"Password needs at least one special character.";return null}
function cookieValue(req,name){const h=req.headers.get("Cookie")||"";const x=h.split(";").map(v=>v.trim()).find(v=>v.startsWith(name+"="));return x?decodeURIComponent(x.slice(name.length+1)):null}
async function sessionTokenHash(t){return b64u(await sha256Text(t))}
async function createSession(userId,env){const b=new Uint8Array(32);crypto.getRandomValues(b);const token=b64u(b),hash=await sessionTokenHash(token),expires=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)").bind(id("session"),userId,hash,expires).run();return{token,expires}}
async function currentUser(req,env){const token=cookieValue(req,AUTH_COOKIE);if(!token)return null;const row=await env.DB.prepare("SELECT u.id,u.email,u.created_at,u.email_verified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now') AND u.disabled=0").bind(await sessionTokenHash(token)).first();return row||null}
function sessionCookie(token,expires){return AUTH_COOKIE+"="+encodeURIComponent(token)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Expires="+new Date(expires).toUTCString()}
function clearSessionCookie(){return AUTH_COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"}
function authJson(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}})}
async function signup(req,env){const b=await req.json(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return authJson({error:"Please enter a valid email address."},400);const pe=passwordError(password);if(pe)return authJson({error:pe},400);if(await env.DB.prepare("SELECT id FROM users WHERE email=? COLLATE NOCASE").bind(email).first())return authJson({error:"An account with that email already exists."},409);const uid=id("user");await env.DB.prepare("INSERT INTO users (id,email,password_hash) VALUES (?,?,?)").bind(uid,email,await hashPassword(password)).run();await env.DB.prepare("INSERT INTO profiles (id,user_id,name,avatar_id) VALUES (?,?,?,?)").bind(id("profile"),uid,"My Profile","orbit-cat").run();await env.DB.prepare("INSERT INTO user_settings (user_id) VALUES (?)").bind(uid).run();const s=await createSession(uid,env);return authJson({ok:true,user:{id:uid,email},message:"Welcome to ORBIT X."},201,{"Set-Cookie":sessionCookie(s.token,s.expires)})}
async function login(req,env){const b=await req.json(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||""),u=await env.DB.prepare("SELECT id,email,password_hash FROM users WHERE email=? COLLATE NOCASE AND disabled=0").bind(email).first();if(!u||!(await verifyPassword(password,u.password_hash)))return authJson({error:"Email or password is incorrect."},401);const s=await createSession(u.id,env);return authJson({ok:true,user:{id:u.id,email:u.email}},200,{"Set-Cookie":sessionCookie(s.token,s.expires)})}
async function logout(req,env){const t=cookieValue(req,AUTH_COOKIE);if(t)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sessionTokenHash(t)).run();return authJson({ok:true},200,{"Set-Cookie":clearSessionCookie()})}
async function accountData(req,env){const u=await currentUser(req,env);if(!u)return authJson({authenticated:false,avatars:AVATARS});const profiles=(await env.DB.prepare("SELECT id,name,avatar_id FROM profiles WHERE user_id=? ORDER BY created_at ASC").bind(u.id).all()).results||[];const settings=await env.DB.prepare("SELECT language,sound_enabled,sound_volume,blind_mode FROM user_settings WHERE user_id=?").bind(u.id).first();return authJson({authenticated:true,user:u,profiles,settings,avatars:AVATARS})}
async function saveProfile(req,env){const u=await currentUser(req,env);if(!u)return authJson({error:"Please sign in."},401);const b=await req.json(),name=String(b.name||"").trim().slice(0,24),avatar=String(b.avatar_id||"orbit-cat");if(!name)return authJson({error:"Profile name is required."},400);if(!AVATARS.some(a=>a.id===avatar))return authJson({error:"Choose a valid avatar."},400);try{if(b.id)await env.DB.prepare("UPDATE profiles SET name=?,avatar_id=?,updated_at=datetime('now') WHERE id=? AND user_id=?").bind(name,avatar,b.id,u.id).run();else{const c=await env.DB.prepare("SELECT COUNT(*) AS n FROM profiles WHERE user_id=?").bind(u.id).first();if(Number(c.n)>=8)return authJson({error:"You can have up to 8 family profiles."},400);await env.DB.prepare("INSERT INTO profiles (id,user_id,name,avatar_id) VALUES (?,?,?,?)").bind(id("profile"),u.id,name,avatar).run()}}catch(e){return authJson({error:"That profile name is already in use."},409)}return accountData(req,env)}
async function deleteProfile(req,env){const u=await currentUser(req,env);if(!u)return authJson({error:"Please sign in."},401);const b=await req.json(),c=await env.DB.prepare("SELECT COUNT(*) AS n FROM profiles WHERE user_id=?").bind(u.id).first();if(Number(c.n)<=1)return authJson({error:"Keep at least one profile."},400);await env.DB.prepare("DELETE FROM profiles WHERE id=? AND user_id=?").bind(b.id,u.id).run();return accountData(req,env)}
async function saveSettings(req,env){const u=await currentUser(req,env);if(!u)return authJson({error:"Please sign in."},401);const b=await req.json(),language=["en","es","fr","de","pt"].includes(b.language)?b.language:"en",se=b.sound_enabled?1:0,sv=Math.max(0,Math.min(100,Number(b.sound_volume??55))),blind=b.blind_mode?1:0;await env.DB.prepare("INSERT INTO user_settings (user_id,language,sound_enabled,sound_volume,blind_mode) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET language=excluded.language,sound_enabled=excluded.sound_enabled,sound_volume=excluded.sound_volume,blind_mode=excluded.blind_mode").bind(u.id,language,se,sv,blind).run();return accountData(req,env)}


const ACCOUNT_HTML="<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>ORBIT X — Account</title>\n<style>\n:root{color-scheme:dark;--bg:#07080b;--panel:#11141a;--panel2:#171b23;--line:#2a303b;--text:#f5f7fb;--muted:#9da6b5;--accent:#fff}\n*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#1c2330,#07080b 55%);color:var(--text);font-family:Inter,system-ui,-apple-system,sans-serif;min-height:100vh}\na{color:inherit}.wrap{max-width:1050px;margin:auto;padding:28px 20px 70px}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:35px}.logo{font-weight:950;letter-spacing:.18em;font-size:25px}.back{text-decoration:none;color:var(--muted)}\n.card{background:rgba(17,20,26,.9);border:1px solid var(--line);border-radius:18px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.auth{max-width:520px;margin:40px auto}.tabs{display:flex;gap:8px;margin-bottom:20px}.tabs button,.btn{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:10px;padding:11px 16px;font-weight:750;cursor:pointer}.tabs button.active,.btn.primary{background:#fff;color:#08090b;border-color:#fff}\nh1,h2,h3{margin-top:0}label{display:block;margin:14px 0 7px;font-size:13px;font-weight:750}input,select{width:100%;padding:12px;border-radius:10px;background:#0a0c10;border:1px solid var(--line);color:var(--text);font:inherit}input:focus,select:focus{outline:2px solid #555}\n.rules{display:grid;gap:5px;color:var(--muted);font-size:13px;margin:10px 0 18px}.rules span.ok{color:#d8fbd8}.msg{min-height:22px;color:#ffb9c0;font-size:13px}.hidden{display:none!important}\n.profile-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}.profile{border:1px solid var(--line);background:#0d1015;border-radius:15px;padding:18px;cursor:pointer}.profile:hover{border-color:#555}.avatar{font-size:48px;width:78px;height:78px;border-radius:22px;background:#191e27;display:grid;place-items:center;margin-bottom:12px}.profile small{color:var(--muted)}\n.avatar-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.avatar-choice{border:1px solid var(--line);background:#0b0e13;border-radius:12px;padding:10px;text-align:center;cursor:pointer;font-size:27px}.avatar-choice.selected{border-color:#fff;background:#202630}.avatar-choice span{display:block;font-size:10px;color:var(--muted);margin-top:4px}\n.settings{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:22px}.setting{border:1px solid var(--line);border-radius:14px;padding:18px;background:#0d1015}.range{display:flex;gap:12px;align-items:center}.range input{padding:0}.switch{display:flex;gap:10px;align-items:center}.switch input{width:auto}\n.account-menu{display:flex;align-items:center;gap:10px}.footer{margin-top:30px;color:var(--muted);font-size:12px;text-align:center}\n@media(max-width:650px){.settings{grid-template-columns:1fr}.avatar-grid{grid-template-columns:repeat(4,1fr)}}\n</style>\n</head>\n<body>\n<div class=\"wrap\">\n<div class=\"top\"><a class=\"logo\" href=\"/\">ORBIT X</a><div class=\"account-menu\"><a class=\"back\" href=\"/\">Home</a><button id=\"settingsJump\" class=\"btn\">⚙ Settings</button></div></div>\n<div id=\"authView\" class=\"card auth\">\n<h1 id=\"authTitle\">Welcome to ORBIT X</h1>\n<p style=\"color:var(--muted)\">Create one account, then make separate profiles for family members.</p>\n<div class=\"tabs\"><button id=\"loginTab\" class=\"active\">Sign In</button><button id=\"signupTab\">Create Account</button></div>\n<form id=\"authForm\">\n<label>Email</label><input id=\"email\" type=\"email\" autocomplete=\"email\" required>\n<label>Password</label><input id=\"password\" type=\"password\" autocomplete=\"current-password\" required>\n<div id=\"rules\" class=\"rules hidden\"><div id=\"r8\">○ At least 8 characters</div><div id=\"ru\">○ At least one uppercase letter</div><div id=\"rl\">○ At least one lowercase letter</div><div id=\"rn\">○ At least one number</div><div id=\"rs\">○ At least one special character</div></div>\n<button class=\"btn primary\" style=\"width:100%\" id=\"authSubmit\">Sign In</button>\n<div id=\"authMsg\" class=\"msg\"></div>\n</form>\n</div>\n<div id=\"accountView\" class=\"hidden\">\n<div class=\"card\">\n<div style=\"display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap\"><div><h1>Who's watching?</h1><p style=\"color:var(--muted)\">Choose a family profile or make a new one.</p></div><button id=\"logout\" class=\"btn\">Sign Out</button></div>\n<div id=\"profiles\" class=\"profile-grid\" style=\"margin-top:22px\"></div>\n</div>\n<div class=\"card\" style=\"margin-top:18px\">\n<h2>Family Profile</h2>\n<div class=\"two\" style=\"display:grid;grid-template-columns:1fr 1fr;gap:14px\"><div><label>Profile name</label><input id=\"profileName\" maxlength=\"24\" placeholder=\"e.g. Mom\"></div><div><label>Avatar</label><div id=\"avatarPreview\" class=\"avatar\">🐱</div></div></div>\n<label>Pick a little ORBIT friend</label><div id=\"avatarGrid\" class=\"avatar-grid\"></div>\n<div style=\"display:flex;gap:10px;margin-top:16px;flex-wrap:wrap\"><button id=\"saveProfile\" class=\"btn primary\">Save Profile</button><button id=\"newProfile\" class=\"btn\">New Profile</button><button id=\"deleteProfile\" class=\"btn\" style=\"display:none\">Delete Profile</button></div>\n<div id=\"profileMsg\" class=\"msg\"></div>\n</div>\n<div class=\"card\" style=\"margin-top:18px\">\n<h2>Settings</h2>\n<div class=\"settings\">\n<div class=\"setting\"><h3>Language</h3><p style=\"color:var(--muted)\">Choose the language for ORBIT X controls and accessibility.</p><select id=\"language\"><option value=\"en\">English</option><option value=\"es\">Español</option><option value=\"fr\">Français</option><option value=\"de\">Deutsch</option><option value=\"pt\">Português</option></select></div>\n<div class=\"setting\"><h3>Peaceful Sounds</h3><label class=\"switch\"><input id=\"soundEnabled\" type=\"checkbox\"> Sound effects on</label><div class=\"range\"><input id=\"soundVolume\" type=\"range\" min=\"0\" max=\"100\"><output id=\"volumeOut\"></output></div><small style=\"color:var(--muted)\">Soft chimes for clicks, scrolling, opening and closing.</small></div>\n<div class=\"setting\"><h3>Blind Mode</h3><label class=\"switch\"><input id=\"blindMode\" type=\"checkbox\"> Read focused content aloud</label><p style=\"color:var(--muted)\">Uses your device's built-in speech voice to read the page text when you focus or select controls.</p></div>\n</div>\n<button id=\"saveSettings\" class=\"btn primary\" style=\"margin-top:18px\">Save Settings</button><span id=\"settingsMsg\" style=\"margin-left:10px;color:#b8f5c0\"></span>\n</div>\n<div class=\"footer\">ORBIT X — Free Entertainment</div>\n</div>\n</div>\n<script src=\"/site.js\"></script>\n<script>\nconst $=id=>document.getElementById(id);let mode=\"login\",state=null,selectedAvatar=\"orbit-cat\",editingProfile=null;\nasync function api(url,opts={}){let r;try{r=await fetch(url,{credentials:\"include\",cache:\"no-store\",...opts,headers:{\"Content-Type\":\"application/json\",...(opts.headers||{})}})}catch(e){throw Error(\"Could not connect to ORBIT X. Please refresh and try again.\")}const text=await r.text();let d={};try{d=text?JSON.parse(text):{}}catch(e){}if(!r.ok)throw Error(d.error||(\"ORBIT X returned error \"+r.status+\".\"));return d}\nfunction showMsg(el,msg){$(el).textContent=msg}\nfunction rules(){const p=$(\"password\").value;const checks=[[\"r8\",p.length>=8],[\"ru\",/[A-Z]/.test(p)],[\"rl\",/[a-z]/.test(p)],[\"rn\",/[0-9]/.test(p)],[\"rs\",/[^A-Za-z0-9]/.test(p)]];checks.forEach(([id,ok])=>{$(id).textContent=(ok?\"✓ \":\"○ \")+$(id).textContent.slice(2);$(id).classList.toggle(\"ok\",ok)})}\nfunction setMode(m){mode=m;$(\"loginTab\").classList.toggle(\"active\",m===\"login\");$(\"signupTab\").classList.toggle(\"active\",m===\"signup\");$(\"authTitle\").textContent=m===\"login\"?\"Welcome back to ORBIT X\":\"Create your ORBIT X account\";$(\"authSubmit\").textContent=m===\"login\"?\"Sign In\":\"Create Account\";$(\"rules\").classList.toggle(\"hidden\",m!==\"signup\");$(\"password\").autocomplete=m===\"login\"?\"current-password\":\"new-password\";showMsg(\"authMsg\",\"\")}\n$(\"loginTab\").onclick=()=>setMode(\"login\");$(\"signupTab\").onclick=()=>setMode(\"signup\");$(\"password\").oninput=rules;\n$(\"authForm\").onsubmit=async e=>{e.preventDefault();showMsg(\"authMsg\",\"\");const btn=$(\"authSubmit\");btn.disabled=true;btn.textContent=mode===\"login\"?\"Signing In…\":\"Creating Account…\";try{const d=await api(mode===\"login\"?\"/api/auth/login\":\"/api/auth/signup\",{method:\"POST\",body:JSON.stringify({email:$(\"email\").value.trim(),password:$(\"password\").value})});if(!d.ok)throw Error(d.error||\"Account request failed.\");await showAccount();showMsg(\"authMsg\",mode===\"signup\"?\"Account created! You are now signed in.\":\"Signed in successfully.\");}catch(err){showMsg(\"authMsg\",err.message)}finally{btn.disabled=false;btn.textContent=mode===\"login\"?\"Sign In\":\"Create Account\"}};\nasync function showAccount(){state=await api(\"/api/auth/me\");if(!state.authenticated){$(\"authView\").classList.remove(\"hidden\");$(\"accountView\").classList.add(\"hidden\");return}$(\"authView\").classList.add(\"hidden\");$(\"accountView\").classList.remove(\"hidden\");render()}\nfunction render(){const d=state;$(\"profiles\").innerHTML=(d.profiles||[]).map(p=>{const a=(d.avatars||[]).find(x=>x.id===p.avatar_id)||d.avatars[0];return '<button class=\"profile\" data-id=\"'+p.id+'\"><div class=\"avatar\">'+a.icon+'</div><strong>'+escapeHtml(p.name)+'</strong><br><small>Family profile</small></button>'}).join(\"\");document.querySelectorAll(\".profile\").forEach(x=>x.onclick=()=>edit(x.dataset.id));renderAvatars();const s=d.settings||{};$(\"language\").value=s.language||\"en\";$(\"soundEnabled\").checked=!!s.sound_enabled;$(\"soundVolume\").value=s.sound_volume??55;$(\"volumeOut\").value=($(\"soundVolume\").value)+\"%\";$(\"blindMode\").checked=!!s.blind_mode}\nfunction escapeHtml(s){return String(s).replace(/[&<>\"]/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\"}[c]))}\nfunction renderAvatars(){$(\"avatarGrid\").innerHTML=(state.avatars||[]).map(a=>'<button type=\"button\" class=\"avatar-choice '+(selectedAvatar===a.id?\"selected\":\"\")+'\" data-avatar=\"'+a.id+'\">'+a.icon+'<span>'+escapeHtml(a.name)+'</span></button>').join(\"\");document.querySelectorAll(\"[data-avatar]\").forEach(b=>b.onclick=()=>{selectedAvatar=b.dataset.avatar;renderAvatars();const a=state.avatars.find(x=>x.id===selectedAvatar);$(\"avatarPreview\").textContent=a.icon})}\nfunction edit(id){const p=state.profiles.find(x=>x.id===id);if(!p)return;editingProfile=p.id;$(\"profileName\").value=p.name;selectedAvatar=p.avatar_id;$(\"deleteProfile\").style.display=\"inline-block\";const a=state.avatars.find(x=>x.id===selectedAvatar);$(\"avatarPreview\").textContent=a?.icon||\"🐱\";renderAvatars()}\n$(\"newProfile\").onclick=()=>{editingProfile=null;$(\"profileName\").value=\"\";selectedAvatar=\"orbit-cat\";$(\"deleteProfile\").style.display=\"none\";$(\"avatarPreview\").textContent=\"🐱\";renderAvatars()}\n$(\"saveProfile\").onclick=async()=>{try{state=await api(\"/api/profiles\",{method:\"POST\",body:JSON.stringify({id:editingProfile,name:$(\"profileName\").value,avatar_id:selectedAvatar})});showMsg(\"profileMsg\",\"Profile saved.\");render()}catch(e){showMsg(\"profileMsg\",e.message)}}\n$(\"deleteProfile\").onclick=async()=>{if(!editingProfile||!confirm(\"Delete this family profile?\"))return;try{state=await api(\"/api/profiles/delete\",{method:\"POST\",body:JSON.stringify({id:editingProfile})});editingProfile=null;$(\"profileName\").value=\"\";$(\"deleteProfile\").style.display=\"none\";render()}catch(e){showMsg(\"profileMsg\",e.message)}}\n$(\"soundVolume\").oninput=()=>{$(\"volumeOut\").value=$(\"soundVolume\").value+\"%\"};$(\"saveSettings\").onclick=async()=>{try{state=await api(\"/api/settings\",{method:\"POST\",body:JSON.stringify({language:$(\"language\").value,sound_enabled:$(\"soundEnabled\").checked,sound_volume:Number($(\"soundVolume\").value),blind_mode:$(\"blindMode\").checked})});showMsg(\"settingsMsg\",\"Saved.\");window.ORBITSound?.apply();window.ORBITBlind?.apply()}catch(e){showMsg(\"settingsMsg\",e.message)}};\n$(\"logout\").onclick=async()=>{await api(\"/api/auth/logout\",{method:\"POST\"});location.reload()};\n$(\"settingsJump\").onclick=()=>document.querySelector(\"#accountView .card:nth-of-type(3)\")?.scrollIntoView({behavior:\"smooth\"});
showAccount().catch(e=>showMsg("authMsg",e.message));\n</script>\n</body>\n</html>";
const SITE_JS="(()=>{let settings={sound_enabled:true,sound_volume:55,blind_mode:false},ctx=null,lastY=scrollY,lastScrollSound=0;\nfunction load(){try{const s=JSON.parse(localStorage.getItem(\"orbitx-settings\")||\"{}\");settings={...settings,...s}}catch{}}\nfunction tone(freq=440,dur=.08){if(!settings.sound_enabled||settings.sound_volume<=0)return;try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.type=\"sine\";o.frequency.value=freq;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(.018*(settings.sound_volume/55),ctx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur)}catch{}}\nfunction apply(){localStorage.setItem(\"orbitx-settings\",JSON.stringify(settings));document.documentElement.dataset.sound=settings.sound_enabled?\"on\":\"off\"}\nfunction speak(text){if(!settings.blind_mode||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text||\"\").replace(/\\s+/g,\" \").trim().slice(0,500));u.rate=.95;u.pitch=1;window.speechSynthesis.speak(u)}\nwindow.ORBITSound={apply:()=>{load();apply()},tone};window.ORBITBlind={apply:()=>{load()}};\nload();document.addEventListener(\"click\",e=>{if(e.target.closest(\"button,a,[role=button]\"))tone(520,.07)});window.addEventListener(\"scroll\",()=>{const now=Date.now();if(Math.abs(scrollY-lastY)>220&&now-lastScrollSound>900){tone(310,.05);lastScrollSound=now;lastY=scrollY}}, {passive:true});document.addEventListener(\"focusin\",e=>{if(settings.blind_mode){const el=e.target;const text=el.getAttribute(\"aria-label\")||el.innerText||el.value||el.placeholder||el.alt;speak(text)}});document.addEventListener(\"keydown\",e=>{if(settings.blind_mode&&e.key===\"Escape\")window.speechSynthesis?.cancel()});apply()})();";
const ABOUT_HTML="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>About — ORBIT X</title><style>body{margin:0;background:#080808;color:#fff;font-family:Arial,sans-serif}main{max-width:850px;margin:auto;padding:60px 24px;line-height:1.8}a{color:#fff}.logo{font-weight:900;letter-spacing:4px;font-size:28px}</style></head><body><main><a class=\"logo\" href=\"/\">ORBIT X</a><h1>About ORBIT X</h1><p>ORBIT X is a free entertainment project built to make movies, television, independent work, and public-domain entertainment easy to discover.</p><p>Our goal is a peaceful, family-friendly viewing experience with profiles, accessibility tools, and a simple catalog.</p><p><a href=\"/\">← Back to ORBIT X</a></p></main></body></html>";
const CONTACT_HTML="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Contact — ORBIT X</title><style>body{margin:0;background:#080808;color:#fff;font-family:Arial,sans-serif}main{max-width:850px;margin:auto;padding:60px 24px;line-height:1.8}a{color:#fff}.logo{font-weight:900;letter-spacing:4px;font-size:28px}</style></head><body><main><a class=\"logo\" href=\"/\">ORBIT X</a><h1>Contact</h1><p>For Phase 1, ORBIT X contact information is:</p><p><strong>Phone:</strong> 804-599-9292</p><p><strong>Email:</strong> Email contact is being set up. We will add the official ORBIT X email address here when it is ready.</p><p><a href=\"/\">← Back to ORBIT X</a></p></main></body></html>";
const COPYRIGHT_HTML="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Copyright — ORBIT X</title><style>body{margin:0;background:#080808;color:#fff;font-family:Arial,sans-serif}main{max-width:850px;margin:auto;padding:60px 24px;line-height:1.8}a{color:#fff}.logo{font-weight:900;letter-spacing:4px;font-size:28px}</style></head><body><main><a class=\"logo\" href=\"/\">ORBIT X</a><h1>Copyright</h1><p>ORBIT X respects copyright. Content added to the catalog should be content you have permission to host, content in the public domain, or content made available under a license that permits the intended use.</p><p>If you believe material hosted by ORBIT X infringes your rights, contact us with enough information to identify the work and the claimed rights. We will review notices and respond according to applicable law.</p><p><a href=\"/\">← Back to ORBIT X</a></p></main></body></html>";
const PRIVACY_HTML="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Privacy — ORBIT X</title><style>body{margin:0;background:#080808;color:#fff;font-family:Arial,sans-serif}main{max-width:850px;margin:auto;padding:60px 24px;line-height:1.8}a{color:#fff}.logo{font-weight:900;letter-spacing:4px;font-size:28px}</style></head><body><main><a class=\"logo\" href=\"/\">ORBIT X</a><h1>Privacy</h1><p>Phase 1 ORBIT X accounts store your email address, a securely derived password hash, family profile names and avatar choices, and your viewing preferences. Passwords are not stored as plain text.</p><p>Sessions use secure HTTP-only cookies. We do not sell account information. Email features will be added only when an email delivery system is configured.</p><p><strong>Note:</strong> This is an early project privacy page and should be reviewed for your final production launch.</p><p><a href=\"/\">← Back to ORBIT X</a></p></main></body></html>";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/movies.html" || url.pathname === "/tv.html") {
      const page = await env.ASSETS.fetch(request);
      if (page.ok) {
        let html = await page.text();
        html = html.replace(/<title>ORBIT - (Movies|TV Shows)<\/title>/g, "<title>ORBIT X — $1</title>")
          .replace(/<a href="index\.html" class="logo">\s*ORBIT\s*<\/a>/g, '<a href="/" class="logo" aria-label="ORBIT X home">ORBIT X</a>')
          .replace(/<a href="index\.html" class="logo">\s*ORBIT X\s*<\/a>/g, '<a href="/" class="logo" aria-label="ORBIT X home">ORBIT X</a>')
          .replace(/<p>\s*ORBIT — Free Entertainment\s*<\/p>/g, '<p>ORBIT X — Free Entertainment</p>');
        return new Response(html,{status:page.status,headers:page.headers});
      }
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return env.ASSETS.fetch(new Request(new URL("/admin.html", url), request));
    }
    if (url.pathname === "/account" || url.pathname === "/account/") {
      return new Response(ACCOUNT_HTML, {headers: {"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/auth/signup" && request.method === "POST") return signup(request, env);
        if (url.pathname === "/api/auth/login" && request.method === "POST") return login(request, env);
        if (url.pathname === "/api/auth/logout" && request.method === "POST") return logout(request, env);
        if (url.pathname === "/api/auth/me" && request.method === "GET") return accountData(request, env);
        if (url.pathname === "/api/profiles" && request.method === "POST") return saveProfile(request, env);
        if (url.pathname === "/api/profiles/delete" && request.method === "POST") return deleteProfile(request, env);
        if (url.pathname === "/api/settings" && request.method === "POST") return saveSettings(request, env);

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

    if (url.pathname === "/site.js") return new Response(SITE_JS,{headers:{"content-type":"text/javascript; charset=utf-8","cache-control":"no-store"}});
    if (url.pathname === "/about.html") return new Response(ABOUT_HTML,{headers:{"content-type":"text/html; charset=utf-8"}});
    if (url.pathname === "/contact.html") return new Response(CONTACT_HTML,{headers:{"content-type":"text/html; charset=utf-8"}});
    if (url.pathname === "/copyright.html") return new Response(COPYRIGHT_HTML,{headers:{"content-type":"text/html; charset=utf-8"}});
    if (url.pathname === "/privacy.html") return new Response(PRIVACY_HTML,{headers:{"content-type":"text/html; charset=utf-8"}});
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
