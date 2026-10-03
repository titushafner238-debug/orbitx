const $ = id => document.getElementById(id);
let currentType = "movie";
let contentItems = [];
let seasons = [];
let currentSeasonId = null;

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
    `<label class="chip"><input type="checkbox" value="${esc(g.name)}" ${selected.includes(g.name) ? "checked" : ""}> ${esc(g.name)}</label>`
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
    `<div class="item" data-id="${item.id}">
      <span class="status">${esc(item.status)}</span>
      <strong>${esc(item.title)}</strong>
      <small>${item.type === "show" ? "TV Show" : "Movie"} · ${esc(item.year || "")} ${item.rating ? "· " + esc(item.rating) : ""}</small>
    </div>`
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
  $("featured").checked = !!item.featured;
  $("posterPreview").innerHTML = item.poster_url ? `<img src="${esc(item.poster_url)}">` : "Poster preview";
  $("backdropPreview").innerHTML = item.backdrop_url ? `<img src="${esc(item.backdrop_url)}">` : "Netflix-style backdrop preview";
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

$("newMovie").onclick = () => resetForm("movie");
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
  chip.innerHTML = `<input type="checkbox" checked value="${esc(name)}"> ${esc(name)}`;
  $("genres").appendChild(chip);
  $("newGenre").value = "";
};
$("posterFile").onchange = e => uploadFile(e.target.files[0], "posters", $("posterUrl"), $("posterPreview"));
$("videoFile").onchange = async e => { const f=e.target.files[0]; if(!f)return; if(f.size>90*1024*1024){alert("That video is over 90 MB. Use the video link importer for now.");e.target.value="";return;} await uploadFile(f,"videos",$("videoUrl"),null); };
$("importVideo").onclick = () => importVideoUrl("videoImportUrl", "videoUrl", "videoImportStatus", "videos");
$("importEpisodeVideo").onclick = () => importVideoUrl("episodeImportUrl", "episodeVideo", "episodeImportStatus", "episodes");
$("backdropFile").onchange = e => uploadFile(e.target.files[0], "backdrops", $("backdropUrl"), $("backdropPreview"));

async function loadSeasons(showId) {
  const data = await api("/api/seasons?show_id=" + encodeURIComponent(showId));
  seasons = data.seasons;
  $("seasonList").innerHTML = seasons.map(s =>
    `<div class="item" data-season="${s.id}"><strong>Season ${s.season_number}</strong><small>${esc(s.title || "")}</small></div>`
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
  $("episodeEditor").style.display = "block";
  const data = await api("/api/episodes?season_id=" + encodeURIComponent(seasonId));
  $("episodeList").innerHTML = data.episodes.map(e =>
    `<div class="item"><strong>E${e.episode_number}: ${esc(e.title)}</strong><small>${esc(e.status)}</small></div>`
  ).join("") || '<p class="muted">No episodes yet.</p>';
}
$("saveEpisode").onclick = async () => {
  if (!currentSeasonId) return alert("Choose a season first.");
  await api("/api/episodes", {method:"POST",body:JSON.stringify({
    season_id:currentSeasonId,
    episode_number:$("episodeNumber").value,
    title:$("episodeTitle").value,
    description:$("episodeDescription").value,
    video_url:$("episodeVideo").value,
    status:"draft"
  })});
  await loadEpisodes(currentSeasonId);
};

resetForm("movie");

async function loadSiteSettings(){const d=await api("/api/site-settings");const s=d.settings||{};$("siteLogo").value=s.logo_text||"ORBIT X";$("siteWatchText").value=s.watch_button_text||"Watch";$("siteAccent").value=s.accent||"#ffffff";$("siteHover").value=s.button_hover||"#ffffff";$("siteAdText").value=s.ad_text||"ADVERTISEMENT";$("siteAdEnabled").checked=s.ad_enabled!==false;$("blockedSearchTerms").value=(s.blocked_search_terms||[]).join(", ");$("featuredIds").value=(s.featured_ids||[]).join(", ");$("watchNowIds").value=(s.watch_now_ids||[]).join(", ");$("recentIds").value=(s.recent_ids||[]).join(", ");$("promoIds").value=(s.promo_ids||[]).join(", ")}
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
$("loadUsers").onclick=async()=>{const d=await api("/api/admin/users");$("usersPanel").innerHTML=d.users.map(u=>'<div class="item"><strong>'+esc(u.email)+'</strong><small>Created '+esc(u.created_at||"")+' · '+esc(u.profiles||0)+' profiles'+(u.is_admin?' · Admin':"")+(u.disabled?' · Disabled':"")+'</small></div>').join("")||'<p class="muted">No accounts yet.</p>'};
loadSiteSettings().catch(err => { $("notice").textContent = "Could not load site settings: " + err.message; });

async function loadBuilder(){try{const d=await api("/api/site-settings"),s=d.settings||{};const v={builderLogo:s.logo_text||"ORBIT X",builderAccent:s.accent||"#ffffff",builderHover:s.button_hover||"#ffffff",builderHeroTitle:s.hero_title||"ORBIT X",builderHeroDescription:s.hero_description||"Discover movies and television from classic favorites to independent creators.",builderHeroBackdrop:s.hero_backdrop||"",builderFeaturedTitle:s.featured_title||"Featured Movies",builderRecentTitle:s.recent_title||"Recently Added",builderTvTitle:s.tv_title||"TV Shows",builderAdText:s.ad_text||"ADVERTISEMENT"};Object.keys(v).forEach(k=>$(k).value=v[k]);$("builderAdEnabled").checked=s.ad_enabled!==false;refreshBuilder()}catch(e){console.error(e)}}
function builderPayload(){return{logo_text:$("builderLogo").value.trim(),accent:$("builderAccent").value,button_hover:$("builderHover").value,hero_title:$("builderHeroTitle").value.trim(),hero_description:$("builderHeroDescription").value.trim(),hero_backdrop:$("builderHeroBackdrop").value.trim(),featured_title:$("builderFeaturedTitle").value.trim(),recent_title:$("builderRecentTitle").value.trim(),tv_title:$("builderTvTitle").value.trim(),ad_text:$("builderAdText").value.trim(),ad_enabled:$("builderAdEnabled").checked}}
function refreshBuilder(){const s=builderPayload(),f=$("sitePreview"),bg=s.hero_backdrop?('url("'+s.hero_backdrop.replace(/"/g,"%22")+'") center/cover'):"linear-gradient(135deg,#222,#080808)";f.srcdoc='<!doctype html><html><head><style>body{margin:0;background:#080808;color:#fff;font-family:Arial}.bar{height:58px;background:#0b0b0b;border-bottom:1px solid #242424;display:flex;align-items:center;padding:0 24px;gap:25px}.logo{font-size:20px;font-weight:900;letter-spacing:3px}.nav{color:#aaa}.search{margin-left:auto;background:#171717;border:1px solid #333;padding:8px 12px;border-radius:6px;color:#777}.hero{min-height:330px;padding:45px;background:linear-gradient(90deg,#080808 15%,rgba(8,8,8,.8)),'+bg+'}.hero h1{font-size:48px;margin:0 0 12px}.hero p{max-width:600px;color:#bbb;line-height:1.6}.section{padding:28px 35px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.card{height:150px;background:linear-gradient(145deg,#292929,#101010);border-radius:7px;display:flex;align-items:end;padding:10px}.ad{margin:8px 35px;padding:24px;border:1px dashed #333;text-align:center;color:#666}</style></head><body><div class="bar"><div class="logo">'+esc(s.logo_text)+'</div><div class="nav">Home</div><div class="nav">Movies</div><div class="nav">TV</div><div class="search">Search</div></div><div class="hero"><h1>'+esc(s.hero_title)+'</h1><p>'+esc(s.hero_description)+'</p></div>'+(s.ad_enabled?'<div class="ad">'+esc(s.ad_text)+'</div>':"")+'<div class="section"><h2>'+esc(s.featured_title)+'</h2><div class="grid"><div class="card">Movie</div><div class="card">Movie</div><div class="card">Movie</div><div class="card">Movie</div><div class="card">Movie</div></div></div><div class="section"><h2>'+esc(s.recent_title)+'</h2><div class="grid"><div class="card">Movie</div><div class="card">Movie</div><div class="card">Movie</div><div class="card">Movie</div><div class="card">Movie</div></div></div><div class="section"><h2>'+esc(s.tv_title)+'</h2><div class="grid"><div class="card">TV</div><div class="card">TV</div><div class="card">TV</div><div class="card">TV</div><div class="card">TV</div></div></div></body></html>'}
["builderLogo","builderAccent","builderHover","builderHeroTitle","builderHeroDescription","builderHeroBackdrop","builderFeaturedTitle","builderRecentTitle","builderTvTitle","builderAdText","builderAdEnabled"].forEach(id=>$(id)?.addEventListener("input",refreshBuilder));$("builderRefresh").onclick=refreshBuilder;$("builderSave").onclick=async()=>{try{await api("/api/site-settings",{method:"POST",body:JSON.stringify(builderPayload())});$("notice").textContent="Website changes published.";await loadSiteSettings();alert("Website changes published.")}catch(e){alert("Could not publish website changes: "+e.message)}};loadBuilder();
loadList().catch(err => {
  $("notice").textContent = "Admin API is being connected. " + err.message;
});
