<script>
(async()=>{
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  try{
    const cr=await fetch("/api/public/content",{cache:"no-store"});
    if(!cr.ok) throw new Error("Catalog request failed: "+cr.status);
    const cd=await cr.json(),items=cd.content||[];
    let settings={};
    try{const sr=await fetch("/api/site-settings",{cache:"no-store"});if(sr.ok){const sd=await sr.json();settings=sd.settings||{}}}catch(e){console.warn("Site settings unavailable",e)}
    const st=document.createElement("style");
    st.textContent=".movie-card{overflow:visible!important;position:relative}.movie-card:hover{z-index:20}.watch-button{display:block;position:relative;transition:transform .2s ease,box-shadow .2s ease,background .2s ease,color .2s ease}.movie-card:hover .watch-button{transform:scale(1.10);box-shadow:0 12px 30px rgba(0,0,0,.55)}.watch-button:hover,.watch-button:focus-visible{transform:scale(1.16)!important;box-shadow:0 16px 38px rgba(255,255,255,.28);background:#fff!important;color:#000!important;border-color:#fff!important;outline:none;z-index:10}button:hover,.button:hover,.btn:hover{background:#fff!important;color:#000!important;border-color:#fff!important}.poster img{display:block;width:100%;height:100%;object-fit:cover}.orbit-promo{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 0 12px}.orbit-promo>a{min-width:min(78vw,620px);scroll-snap-align:start}.orbit-promo .promo-card{height:220px;border-radius:10px;background:center/cover no-repeat;position:relative;overflow:hidden;border:1px solid #292929}.orbit-promo .promo-card:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.9),rgba(0,0,0,.25))}.orbit-promo .promo-copy{position:absolute;z-index:1;left:22px;bottom:20px}.orbit-promo h3{margin:0 0 6px;font-size:25px}.orbit-promo p{margin:0;color:#ccc}";
    document.head.appendChild(st);
    const card=i=>{
      const meta=[i.year,i.rating,i.runtime_minutes?i.runtime_minutes+" min":""].filter(Boolean).join(" · ");
      const url="/watch.html?slug="+encodeURIComponent(i.slug),poster=i.poster_url;
      return '<article class="movie-card"><div class="poster">'+(poster?'<img src="'+esc(poster)+'" alt="'+esc(i.title)+'" loading="lazy" onerror="this.onerror=null;this.remove();this.parentElement.textContent=\'POSTER\'">':"POSTER")+'</div><div class="movie-info"><div class="movie-title">'+esc(i.title)+'</div><div class="movie-meta">'+esc(meta||"ORBIT")+'</div><a href="'+url+'" class="watch-button">'+esc(settings.watch_button_text||"Watch")+'</a></div></article>';
    };
    const movies=items.filter(i=>i.type==="movie"),shows=items.filter(i=>i.type==="show"),byId=new Map(items.map(i=>[i.id,i]));
    const pick=(key,fallback)=>{const ids=Array.isArray(settings[key])?settings[key]:[];const chosen=ids.map(id=>byId.get(id)).filter(Boolean);return chosen.length?chosen:fallback};
    const featured=pick("featured_ids",movies.filter(i=>i.featured)),watchNow=pick("watch_now_ids",movies.slice(0,5)),recent=pick("recent_ids",movies.slice(0,5)),promo=pick("promo_ids",featured.length?featured:movies.slice(0,6));
    document.querySelectorAll(".logo").forEach(el=>el.textContent=settings.logo_text||"ORBIT X");
    document.documentElement.style.setProperty("--orbit-accent",settings.accent||"#ffffff");
    document.documentElement.style.setProperty("--orbit-hover",settings.button_hover||"#ffffff");
    if(location.pathname.endsWith("movies.html")){const g=document.getElementById("movieGrid")||document.querySelector(".movie-grid");if(g)g.innerHTML=movies.map(card).join("")||"<p>No movies published yet.</p>";const n=document.getElementById("movieCount");if(n)n.textContent=movies.length}
    if(location.pathname.endsWith("tv.html")){const g=document.querySelector(".movie-grid")||document.querySelector(".show-grid")||document.querySelector(".empty");if(g){g.className="movie-grid";g.innerHTML=shows.map(card).join("")||"<p>No TV shows published yet.</p>"}}
    if(location.pathname.endsWith("/")||location.pathname.endsWith("index.html")){
      const grids=document.querySelectorAll(".movie-grid");
      if(grids[0])grids[0].innerHTML=featured.slice(0,5).map(card).join("")||"<p>No featured movies yet.</p>";
      if(grids[1])grids[1].innerHTML=watchNow.slice(0,5).map(card).join("")||"<p>No movies published yet.</p>";
      const tvGrid=document.querySelector("#tv .movie-grid");if(tvGrid)tvGrid.innerHTML=shows.slice(0,5).map(card).join("")||"<p>No TV shows published yet.</p>";
      if(grids[2])grids[2].innerHTML=recent.slice(0,5).map(card).join("")||"<p>No recently added movies yet.</p>";
      const hero=document.querySelector(".hero"),heroItem=promo[0];
      if(heroItem&&hero){const bg=heroItem.backdrop_url||heroItem.poster_url;if(bg)hero.style.backgroundImage='linear-gradient(90deg,#080808 15%,rgba(8,8,8,.92) 40%,rgba(8,8,8,.45) 75%,rgba(8,8,8,.15)),url("'+String(bg).replace(/"/g,"%22")+'")';const t=document.querySelector(".hero h1");if(t)t.textContent=heroItem.title}
      const ad=document.querySelector(".ad-space");if(ad){ad.textContent=settings.ad_enabled===false?"":(settings.ad_text||"ADVERTISEMENT");ad.style.display=settings.ad_enabled===false?"none":""}
      let promoEl=document.getElementById("orbitPromo");
      if(!promoEl){promoEl=document.createElement("section");promoEl.className="section";promoEl.id="orbitPromo";promoEl.innerHTML='<h2 class="section-title">Now Showing</h2><div class="orbit-promo"></div>';const ad=document.querySelector(".ad-space");(ad?.parentNode||document.body).insertBefore(promoEl,ad?.nextSibling||null)}
      const strip=promoEl.querySelector(".orbit-promo");
      if(strip)strip.innerHTML=promo.map(i=>{const bg=i.backdrop_url||i.poster_url||"";return '<a href="/watch.html?slug='+encodeURIComponent(i.slug)+'"><div class="promo-card" style="background-image:url(\''+esc(bg)+'\')"><div class="promo-copy"><h3>'+esc(i.title)+'</h3><p>'+esc([i.year,i.rating].filter(Boolean).join(" · "))+'</p></div></div></a>'}).join("");
    }
    const blocked=(Array.isArray(settings.blocked_search_terms)?settings.blocked_search_terms:[]).map(x=>String(x).toLowerCase()).filter(Boolean);
    document.querySelectorAll('input[placeholder*="Search" i],input[aria-label*="Search" i]').forEach(input=>{const check=()=>input.dataset.orbitBlocked=blocked.some(t=>input.value.trim().toLowerCase().includes(t))?"1":"";input.addEventListener("input",check);input.addEventListener("keydown",e=>{check();if(e.key==="Enter"&&input.dataset.orbitBlocked==="1"){e.preventDefault();alert("That search is not allowed.")}})});
  }catch(e){console.error("ORBIT catalog error",e)}
})();
</script>