/* ORBIT X — discovery features. Personal lists and collections are saved on this browser. */
(()=> {
 const path=location.pathname;
 if(path==="/watch.html") return;
 const storage={
  list:"orbitx-my-list",
  progress:"orbitx-continue-watching",
  collections:"orbitx-custom-collections"
 };
 const read=(key,fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(key)||"null");return Array.isArray(v)?v:fallback}catch{return fallback}};
 const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
 const card=item=>'<a class="oxf-card" href="/watch.html?slug='+encodeURIComponent(item.slug||"")+'">'+(item.poster_url?'<img src="'+esc(item.poster_url)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">':'<span class="oxf-art">ORBIT X</span>')+'<span class="oxf-card-copy"><strong>'+esc(item.title||"Untitled")+'</strong><small>'+esc(item.type==="show"?"TV Series":"Movie")+(item.year?" · "+esc(item.year):"")+'</small></span></a>';
 const css=`
 #orbit-feature-hub{max-width:1500px;margin:0 auto;padding:25px clamp(16px,4vw,55px) 50px;color:#F8F6FC}
 #orbit-feature-hub *{box-sizing:border-box}
 .oxf-section{margin:0 0 30px;padding:22px;border:1px solid #342A43;border-radius:14px;background:linear-gradient(140deg,#171020,#0D0A12)}
 .oxf-heading{font-size:24px;margin:0 0 7px;font-weight:800}
 .oxf-sub{color:#B9B2C6;font-size:13px;line-height:1.6;margin:0 0 17px}
 .oxf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:13px}
 .oxf-card{display:block;min-width:0;border:1px solid #342A43;border-radius:8px;overflow:hidden;background:#14111B;color:#F8F6FC;text-decoration:none;transition:transform .16s,border-color .16s}
 .oxf-card:hover,.oxf-card:focus-visible{transform:translateY(-3px);border-color:#A78BFA;outline:2px solid transparent}
 .oxf-card img,.oxf-art{display:flex;width:100%;aspect-ratio:2/3;object-fit:cover;align-items:center;justify-content:center;background:linear-gradient(135deg,#49345F,#100D15);color:#B9A4FF;font-weight:900;letter-spacing:.1em}
 .oxf-card-copy{display:block;padding:10px}
 .oxf-card-copy strong{display:block;font-size:13px;line-height:1.4}
 .oxf-card-copy small{display:block;color:#B9B2C6;font-size:11px;margin-top:5px}
 .oxf-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:end}
 .oxf-field{display:grid;gap:6px;flex:1;min-width:155px}
 .oxf-field label{font-size:12px;color:#B9B2C6}
 .oxf-field input,.oxf-field select{width:100%;background:#0D0A12;color:#F8F6FC;border:1px solid #514162;border-radius:7px;padding:11px;font:inherit}
 .oxf-btn{border:1px solid #A78BFA;border-radius:7px;background:#A78BFA;color:#08070C;padding:11px 15px;font-weight:800;cursor:pointer}
 .oxf-btn:hover,.oxf-btn:focus-visible{background:#B9A4FF;border-color:#B9A4FF}
 .oxf-btn.secondary{background:#20172B;color:#F8F6FC;border-color:#514162}
 .oxf-btn.secondary:hover{border-color:#A78BFA;color:#B9A4FF}
 .oxf-collection-picker{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:7px;margin:14px 0}
 .oxf-pick{display:flex;align-items:center;gap:9px;padding:9px;border:1px solid #342A43;border-radius:7px;background:#100D15;color:#EDE7F7;font-size:13px}
 .oxf-pick input{accent-color:#A78BFA}
 .oxf-collection-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 0;border-top:1px solid #342A43}
 .oxf-collection-row strong{display:block}.oxf-collection-row small{color:#B9B2C6}
 .oxf-note{color:#B9A4FF;font-size:12px;min-height:18px;margin-top:10px}
 .oxf-live{display:grid;grid-template-columns:1fr auto;align-items:center;gap:16px}
 .oxf-live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#A78BFA;margin-right:7px}
 @media(max-width:600px){.oxf-section{padding:15px}.oxf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.oxf-live{grid-template-columns:1fr}}
 `;
 const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
 const hub=document.createElement("div");hub.id="orbit-feature-hub";
 hub.innerHTML=`
 <section class="oxf-section" id="oxf-pick">
  <h2 class="oxf-heading">Pick My Orbit</h2><p class="oxf-sub">Choose a mood and runtime. We'll find matches from the ORBIT X catalog.</p>
  <div class="oxf-controls">
   <div class="oxf-field"><label for="oxf-mood">What's your mood?</label><select id="oxf-mood"><option value="any">Surprise me</option><option value="funny">Something funny</option><option value="mystery">A mystery</option><option value="adventure">Adventure</option><option value="family">Family-friendly</option><option value="scifi">Sci-fi or fantasy</option><option value="drama">Drama</option></select></div>
   <div class="oxf-field"><label for="oxf-runtime">How much time?</label><select id="oxf-runtime"><option value="any">Any runtime</option><option value="60">Under 60 minutes</option><option value="90">Under 90 minutes</option><option value="120">Under 2 hours</option></select></div>
   <button type="button" class="oxf-btn" id="oxf-pick-button">Find my picks</button>
  </div><div id="oxf-picks" class="oxf-grid" style="margin-top:16px"></div><div class="oxf-note" id="oxf-pick-note" aria-live="polite"></div>
 </section>
 <section class="oxf-section" id="oxf-collections">
  <h2 class="oxf-heading">Orbit Collections</h2><p class="oxf-sub">Make a themed watchlist and share a link with friends. Collections are saved on this browser for now.</p>
  <div class="oxf-controls"><div class="oxf-field"><label for="oxf-collection-name">Collection name</label><input id="oxf-collection-name" maxlength="60" placeholder="e.g. Saturday Night Classics"></div><button type="button" class="oxf-btn" id="oxf-save-collection">Save collection</button></div>
  <div id="oxf-title-picker" class="oxf-collection-picker"></div><div id="oxf-collection-note" class="oxf-note" aria-live="polite"></div><div id="oxf-saved-collections"></div><div id="oxf-shared-collection" hidden></div>
 </section>
 <section class="oxf-section" id="oxf-continue"><h2 class="oxf-heading">Continue Watching</h2><p class="oxf-sub">Pick up where you left off on this device.</p><div id="oxf-progress-grid" class="oxf-grid"></div><p class="oxf-sub" id="oxf-progress-empty">Your recently played titles will appear here.</p></section>
 <section class="oxf-section" id="oxf-list"><h2 class="oxf-heading">My List</h2><p class="oxf-sub">Save movies and shows to watch later.</p><div id="oxf-list-grid" class="oxf-grid"></div><p class="oxf-sub" id="oxf-list-empty">Your saved titles will appear here.</p></section>
 <section class="oxf-section" id="oxf-now"><div class="oxf-live"><div><h2 class="oxf-heading"><span class="oxf-live-dot"></span>Orbit Now</h2><p class="oxf-sub">What's on now, what's starting soon, and where to jump in.</p><div id="oxf-live-content" class="oxf-sub">Live channel listings aren't connected yet. Once ORBIT X has live channels, this area will become the live-TV guide.</div></div><a class="oxf-btn secondary" href="/tv.html">Explore TV</a></div></section>
 `;
 const footer=document.querySelector("footer");
 if(footer)footer.parentNode.insertBefore(hub,footer);else document.body.appendChild(hub);
 let items=[];
 function renderGrid(target,list,emptyId,emptyText){const grid=document.getElementById(target),empty=document.getElementById(emptyId);grid.innerHTML=list.map(card).join("");if(empty){empty.hidden=list.length>0;empty.textContent=emptyText}}
 function renderCollections(){const box=document.getElementById("oxf-saved-collections"),saved=read(storage.collections);box.innerHTML=saved.map((c,i)=>'<div class="oxf-collection-row"><div><strong>'+esc(c.name)+'</strong><small>'+c.slugs.length+' title(s)</small></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button type="button" class="oxf-btn secondary" data-view="'+i+'">View</button><button type="button" class="oxf-btn secondary" data-share="'+i+'">Share</button><button type="button" class="oxf-btn secondary" data-delete="'+i+'">Delete</button></div></div>').join("")||'<p class="oxf-sub">Create your first collection above.</p>';
  box.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{const c=saved[Number(b.dataset.view)];const found=c.slugs.map(s=>items.find(i=>i.slug===s)).filter(Boolean);const out=document.getElementById("oxf-shared-collection");out.hidden=false;out.innerHTML='<h3 class="oxf-heading">'+esc(c.name)+'</h3><div class="oxf-grid">'+found.map(card).join("")+'</div>';out.scrollIntoView({behavior:"smooth",block:"start"})});
  box.querySelectorAll("[data-share]").forEach(b=>b.onclick=async()=>{const c=saved[Number(b.dataset.share)];const url=location.origin+"/search.html?orbitCollection="+encodeURIComponent(JSON.stringify({name:c.name,slugs:c.slugs}));try{await navigator.clipboard.writeText(url);document.getElementById("oxf-collection-note").textContent="Share link copied. Anyone with the link can open this collection."; }catch{window.prompt("Copy this collection link:",url)}});
  box.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{saved.splice(Number(b.dataset.delete),1);write(storage.collections,saved);renderCollections()});
 }
 function renderPicker(){const picker=document.getElementById("oxf-title-picker");const selected=new URLSearchParams(location.search).get("orbitCollection");picker.innerHTML=items.slice(0,60).map((i,n)=>'<label class="oxf-pick"><input type="checkbox" value="'+esc(i.slug)+'" '+(n<5?"":"")+'><span>'+esc(i.title)+'</span></label>').join("")||'<p class="oxf-sub">No catalog titles are available yet.</p>';
  if(selected){try{const c=JSON.parse(selected);const found=(c.slugs||[]).map(s=>items.find(i=>i.slug===s)).filter(Boolean);const out=document.getElementById("oxf-shared-collection");out.hidden=false;out.innerHTML='<h3 class="oxf-heading">'+esc(c.name||"Shared Orbit Collection")+'</h3><div class="oxf-grid">'+found.map(card).join("")+'</div>';document.getElementById("oxf-collection-note").textContent="You're viewing a shared collection."; }catch{}}
 }
 function pickTitles(){const mood=document.getElementById("oxf-mood").value,limit=document.getElementById("oxf-runtime").value;const patterns={funny:/comedy|funny|stooges|chaplin|comedy/i,mystery:/mystery|detective|crime|sherlock|suspense/i,adventure:/adventure|action|western|tarzan|journey/i,family:/family|kids|children|animation|cartoon|g-rated|tv-g/i,scifi:/sci-fi|science fiction|fantasy|space|monster/i,drama:/drama|romance|war|history/i};let found=items.filter(i=>{const text=[i.title,i.description,i.genres,i.rating].join(" ").toLowerCase();const genreOk=mood==="any"||patterns[mood]?.test(text);const durationOk=limit==="any"||!i.runtime_minutes||Number(i.runtime_minutes)<=Number(limit);return genreOk&&durationOk});if(!found.length&&mood!=="any")found=items.filter(i=>limit==="any"||!i.runtime_minutes||Number(i.runtime_minutes)<=Number(limit));found=found.sort(()=>Math.random()-.5).slice(0,6);renderGrid("oxf-picks",found,null,"");document.getElementById("oxf-pick-note").textContent=found.length?"Here are some options from the current catalog.":"No matches found yet — try a different mood or runtime."; }
 document.getElementById("oxf-pick-button").addEventListener("click",pickTitles);
 document.getElementById("oxf-save-collection").addEventListener("click",()=>{const name=document.getElementById("oxf-collection-name").value.trim();const slugs=[...document.querySelectorAll("#oxf-title-picker input:checked")].map(x=>x.value).slice(0,20);if(!name){document.getElementById("oxf-collection-note").textContent="Give your collection a name first.";return}if(!slugs.length){document.getElementById("oxf-collection-note").textContent="Choose at least one title.";return}const saved=read(storage.collections);saved.unshift({name,slugs,created_at:Date.now()});write(storage.collections,saved.slice(0,30));document.getElementById("oxf-collection-name").value="";document.querySelectorAll("#oxf-title-picker input").forEach(x=>x.checked=false);document.getElementById("oxf-collection-note").textContent="Collection saved on this browser.";renderCollections()});
 async function init(){try{const r=await fetch("/api/public/content",{cache:"no-store"});if(r.ok){const d=await r.json();items=d.content||[]}}catch{}renderPicker();renderCollections();renderGrid("oxf-progress-grid",read(storage.progress).map(p=>({...p,slug:p.series_slug||p.slug})).filter(p=>items.some(i=>i.slug===p.slug)), "oxf-progress-empty","Your recently played titles will appear here.");renderGrid("oxf-list-grid",read(storage.list).map(p=>items.find(i=>i.slug===p.slug)||p),"oxf-list-empty","Your saved titles will appear here.");
 const live=items.filter(i=>i.type==="channel"||i.type==="live");if(live.length){document.getElementById("oxf-live-content").innerHTML=live.slice(0,6).map(card).join("")}
 const q=new URLSearchParams(location.search).get("orbitCollection");if(q){document.getElementById("oxf-collections").scrollIntoView({behavior:"smooth",block:"start"})}
 }
 init();
})();