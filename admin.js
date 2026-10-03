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
  const selected = [];
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
    const params = new URLSearchParams({folder, filename:file.name});
    const res = await fetch("/api/upload?" + params.toString(), {
      method:"POST",
      headers:{"Content-Type":file.type || "application/octet-stream"},
      body:file
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ("Upload failed: " + res.status));
    targetInput.value = data.url || "";
    if (preview && file.type.startsWith("image/")) {
      preview.innerHTML = '<img src="' + esc(data.url) + '" alt="">';
    }
    $("notice").textContent = "Uploaded " + file.name + ". Click Save to attach it to this title.";
  } catch (err) {
    alert("Upload failed: " + err.message);
  }
}
async function importVideoUrl(inputId, targetId, statusId, folder) {
  const source = $(inputId).value.trim();
  if (!source) return alert("Paste a video link first.");
  $(statusId).textContent = "Downloading video and storing it. This can take a while for a large file...";
  $(inputId).disabled = true;
  try {
    const data = await api("/api/import-url", {method:"POST", body:JSON.stringify({url:source, folder})});
    $(targetId).value = data.url || "";
    $(statusId).textContent = "Video imported and attached.";
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
$("videoFile").onchange = e => uploadFile(e.target.files[0], "videos", $("videoUrl"), null);
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
loadList().catch(err => {
  $("notice").textContent = "Admin API is being connected. " + err.message;
});
