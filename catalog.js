(()=>{const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const searchInput=document.querySelector("#search,#searchBox");
if(searchInput&&!document.getElementById("orbitSearchToggle")){
 const wrap=searchInput.closest(".search-box,.search");
 if(wrap){
  wrap.classList.add("orbit-search");
  const btn=document.createElement("button");btn.id="orbitSearchToggle";btn.type="button";btn.className="orbit-search-button";btn.setAttribute("aria-label","Open search");btn.innerHTML="<span class=\"orbit-magnifier\"></span>";
  searchInput.classList.add("orbit-search-input");wrap.insertBefore(btn,searchInput);
  const panel=document.createElement("div");panel.id="orbitSearchPanel";panel.className="orbit-search-panel";panel.innerHTML='<div class="orbit-search-title">Search ORBIT X</div><div id="orbitSearchResults"></div><div class="orbit-collections"><button data-collection="movies">Movies</button><button data-collection="tv">TV Shows</button></div>';wrap.appendChild(panel);
  const filter=async()=>{const q=searchInput.value.trim();const results=document.getElementById("orbitSearchResults");document.querySelectorAll(".movie-card").forEach(card=>card.style.display=!q||card.textContent.toLowerCase().includes(q.toLowerCase())?"":"none");if(!results)return;if(!q){results.innerHTML="";return}results.innerHTML="<div class=\"orbit-search-empty\">Searching…</div>";try{const r=await fetch("/api/public/content?q="+encodeURIComponent(q),{cache:"no-store"}),d=r.ok?await r.json():{content:[]},items=(d.content||[]).slice(0,12);results.innerHTML=items.length?items.map(i=>"<a class=\"orbit-result\" href=\"/watch.html?slug="+encodeURIComponent(i.slug)+"\"><strong>"+esc(i.title)+"</strong><span>"+esc(i.type==="show"?"TV Show":"Movie")+(i.year?" · "+i.year:"")+"</span></a>").join(""):"<div class=\"orbit-search-empty\">No matches found.</div>"}catch(e){results.innerHTML="<div class=\"orbit-search-empty\">Search is unavailable.</div>"}};
  btn.onclick=()=>{wrap.classList.toggle("open");if(wrap.classList.contains("open"))searchInput.focus();else{searchInput.value="";filter();}};
  searchInput.addEventListener("input",()=>{clearTimeout(window.orbitSearchTimer);window.orbitSearchTimer=setTimeout(filter,180)});
  panel.querySelectorAll("[data-collection]").forEach(b=>b.onclick=()=>{const c=b.dataset.collection;wrap.classList.remove("open");if(c==="movies")location.href="/movies.html";else if(c==="tv")location.href="/tv.html";else{const target=c==="featured"?"movies":c==="recent"?"recently-added":c==="watch"?"watch-now":"movies";document.getElementById(target)?.scrollIntoView({behavior:"smooth"});}});
 }
}
const css=document.createElement("style");css.textContent=".orbit-search{position:relative;display:flex;align-items:center}.orbit-search-button{width:42px;height:42px;border:1px solid #333;background:#171717;color:#fff;border-radius:6px;cursor:pointer}.orbit-magnifier{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-radius:50%;position:relative}.orbit-magnifier:after{content:\"\";position:absolute;width:7px;height:2px;background:currentColor;right:-6px;bottom:-3px;transform:rotate(45deg)}.orbit-search-input{width:0!important;opacity:0;padding:10px 0!important;border:0!important;transition:.25s}.orbit-search.open .orbit-search-input{width:230px!important;opacity:1;padding:10px 14px!important;border:1px solid #333!important;margin-left:8px}.orbit-search-panel{display:none;position:absolute;right:0;top:52px;width:min(680px,90vw);background:#0d0d0d;border:1px solid #2b2b2b;border-radius:10px;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.65);z-index:500;max-height:70vh;overflow:auto}.orbit-result{display:flex;justify-content:space-between;gap:12px;padding:10px;border-radius:7px;color:#fff;text-decoration:none}.orbit-result:hover{background:#1b1b1b}.orbit-result span,.orbit-search-empty{color:#999;font-size:13px;padding:8px}.orbit-search.open .orbit-search-panel{display:block}.orbit-collections{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.orbit-collections button{height:70px;border:1px solid #333;background:#171717;color:#fff;border-radius:7px;cursor:pointer;font-weight:700}.orbit-collections button:hover{background:#fff;color:#000}@media(max-width:750px){.orbit-search.open .orbit-search-input{width:170px!important}.orbit-collections{grid-template-columns:repeat(2,1fr)}}";document.head.appendChild(css);
(async()=>{try{
 const [cr,sr]=await Promise.all([fetch("/api/public/content",{cache:"no-store"}),fetch("/api/site-settings",{cache:"no-store"})]);
 const cd=cr.ok?await cr.json():{content:[]},sd=sr.ok?await sr.json():{settings:{}},items=cd.content||[],settings=sd.settings||{};
 document.querySelectorAll(".logo").forEach(el=>{if(!el.querySelector("img"))el.innerHTML='<img class="orbit-wordmark" src="/orbitx-wordmark.svg?v=20261014-restored-logo2" alt="ORBIT X">' }); try{const me=await fetch("/api/auth/me",{cache:"no-store"});if(me.ok){const md=await me.json(),p=md.profiles?.[0],av=md.avatars?.find(x=>x.id===p?.avatar_id),nav=document.getElementById("navAvatar");if(nav&&av)nav.innerHTML=av.icon}}catch{}
 const card=i=>{const meta=[i.year,i.rating,i.runtime_minutes!=null&&String(i.runtime_minutes).trim()!==""&&Number.isFinite(Number(i.runtime_minutes))?Math.max(1,Number(i.runtime_minutes))+" min":"",...(String(i.genres||"").split("||").filter(Boolean).slice(0,2))].filter(Boolean).join(" · "),url="/watch.html?slug="+encodeURIComponent(i.slug),poster=i.poster_url;return '<article class="movie-card" data-genres="'+esc(String(i.genres||"").split("||").join("|"))+'"><div class="poster">'+(poster?'<img src="'+esc(poster)+'" alt="'+esc(i.title)+'" loading="lazy" onerror="this.remove()">':"POSTER")+'<a href="'+url+'" class="watch-button" aria-label="Watch '+esc(i.title)+'"><span>'+esc("Watch")+'</span></a></div><div class="movie-info"><div class="movie-title">'+esc(i.title)+'</div><div class="movie-meta">'+esc(meta||"ORBIT")+'</div></div></article>'};
 const allMovies=items.filter(i=>i.type==="movie"),shortFilms=allMovies.filter(i=>i.runtime_minutes!=null&&String(i.runtime_minutes).trim()!==""&&Number(i.runtime_minutes)>=0&&Number(i.runtime_minutes)<=15),movies=allMovies.filter(i=>!(i.runtime_minutes!=null&&String(i.runtime_minutes).trim()!==""&&Number(i.runtime_minutes)>=0&&Number(i.runtime_minutes)<=15)),shows=items.filter(i=>i.type==="show"),byId=new Map(items.map(i=>[i.id,i]));
 const readIds=key=>{let value=settings[key];if(typeof value==="string"){try{value=JSON.parse(value)}catch{value=[]}}return Array.isArray(value)?value:[]};
 const pick=(key,fallback,type="movie")=>{const chosen=readIds(key).map(x=>byId.get(x)||items.find(i=>i.title===x)).filter(i=>i&&i.type===type);return chosen.length?chosen:fallback};
 const chaplinPattern=/the vagabond|the floorwalker|the rink|burlesque on carmen|shanghaied|the cure|the count|tillie.s punctured romance|one a\.m\.|kid auto races at venice|making a living|mabel.s strange predicament|the good for nothing|a fair exchange/i;
 const isFeatureLength=i=>!(i.runtime_minutes!=null&&String(i.runtime_minutes).trim()!==""&&Number(i.runtime_minutes)>=0&&Number(i.runtime_minutes)<=15);
 const featuredCandidates=[...pick("featured_ids",movies.filter(i=>i.featured)),...movies.filter(i=>i.featured),...movies];
 const featured=[...new Map(featuredCandidates.filter(i=>i&&isFeatureLength(i)).map(i=>[i.id,i])).values()].slice(0,20),recentMovies=pick("recent_ids",allMovies.slice(0,5)).slice(0,30),recommendedMovies=pick("recommended_ids",allMovies.slice(0,6)),chaplin=pick("chaplin_ids",allMovies.filter(i=>chaplinPattern.test(i.title))),watchNow=pick("watch_now_ids",movies.slice(0,5)),promo=pick("promo_ids",featured.length?featured:movies.slice(0,6));
 const pickShows=(key,fallback)=>pick(key,fallback,"show");
 const featuredShowCandidates=[...pickShows("featured_show_ids",shows.filter(i=>i.featured)),...shows.filter(i=>i.featured),...shows];
 const featuredShows=[...new Map(featuredShowCandidates.filter(Boolean).map(i=>[i.id,i])).values()].slice(0,15),recommendedShows=pickShows("recommended_show_ids",shows.slice(0,5)),recentShows=pickShows("recent_show_ids",shows.slice(0,30)).slice(0,30);
  const recent=[...items].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i).sort((a,b)=>String(b.created_at||" ").localeCompare(String(a.created_at||" "))||String(a.title||" ").localeCompare(String(b.title||" "))).slice(0,30);
  const recommended=[...recommendedMovies,...recommendedShows].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i).slice(0,12);
 if(location.pathname.endsWith("movies.html")){const g=document.getElementById("movieGrid")||document.querySelector(".movie-grid");if(g)g.innerHTML=movies.map(card).join("")||"<p>No movies published yet.</p>";}
 if(location.pathname.endsWith("tv.html")){const g=document.querySelector(".movie-grid");if(g)g.innerHTML=shows.map(card).join("")||"<p>No TV shows published yet.</p>";}
 if(location.pathname.endsWith("shorts.html")){const g=document.getElementById("shortGrid")||document.querySelector(".movie-grid");if(g)g.innerHTML=shortFilms.map(card).join("")||"<p>No short films published yet.</p>";}
 if(location.pathname==="/"||location.pathname.endsWith("index.html")){
  const fill=(selector,list,empty)=>{const g=document.querySelector(selector);if(g)g.innerHTML=list.map(card).join("")||"<p>"+empty+"</p>"};
  fill("#movies .movie-grid",featured,"No featured movies yet.");
  fill("#recommended .movie-grid",recommended,"Recommendations coming soon.");
  fill("#charlie-chaplin .movie-grid",chaplin,"Charlie Chaplin films coming soon.");
  fill("#recently-added .movie-grid",recent,"No recently added titles yet.");
  fill("#tv .movie-grid",featuredShows,"Public-domain TV shows are being added.");
  fill("#short-films .movie-grid",shortFilms,"Short films are being added.");
  const carouselStyle=document.createElement("style");
  carouselStyle.textContent=`
    .movie-card .poster{position:relative;overflow:hidden}
    .movie-card .poster:after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(180deg,transparent,rgba(0,0,0,.72));opacity:.72;pointer-events:none;transition:opacity .2s}
    .movie-grid .watch-button{position:absolute;z-index:2;left:10px;right:10px;bottom:10px;min-height:40px;display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 12px;border:1px solid rgba(255,255,255,.75);border-radius:6px;background:#f5f5f5!important;color:#111!important;font-size:14px;font-weight:750;text-decoration:none;box-shadow:0 3px 12px rgba(0,0,0,.24);opacity:0;transform:translateY(5px);transition:opacity .18s,transform .18s,background .18s}
    .movie-grid .movie-card:hover .watch-button,.movie-grid .movie-card:focus-within .watch-button{opacity:1;transform:translateY(0)}
    .movie-grid .watch-button:hover,.movie-grid .watch-button:focus-visible{background:#B9A4FF!important;border-color:#B9A4FF!important;color:#08070C!important}
    .movie-grid .watch-play-icon{font-size:13px;line-height:1}
    .movie-card .movie-info{padding:12px 2px 5px;background:transparent}
    .movie-card{background:transparent!important;overflow:visible;border-radius:7px}
    .movie-card:hover{background:transparent!important}
    .movie-card .poster{border-radius:7px;overflow:hidden;background:#171717;box-shadow:0 3px 12px rgba(0,0,0,.25)}
    .movie-card .movie-title{font-size:15px;line-height:1.35;margin-bottom:5px}
    .movie-card .movie-meta{font-size:12px;color:#a0a0a0}
    @media(hover:none){.movie-grid .watch-button{opacity:1;transform:none;min-height:38px;left:8px;right:8px;bottom:8px;padding:8px 10px}}
    .orbit-carousel{position:relative;width:100%;min-width:0}
    .orbit-carousel .movie-grid{display:flex!important;flex-wrap:nowrap;gap:18px;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;scroll-snap-type:x mandatory;scrollbar-width:none;padding:3px 2px 12px;overscroll-behavior-x:contain}
    .orbit-carousel .movie-grid::-webkit-scrollbar{display:none}
    .orbit-carousel .movie-card{flex:0 0 calc((100% - 72px)/5);min-width:0;scroll-snap-align:start}
    .orbit-carousel .orbit-row-arrow{position:absolute;z-index:5;top:38%;transform:translateY(-50%);width:42px;height:64px;border:0;border-radius:7px;background:rgba(8,8,8,.88);color:#fff;font-size:32px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 14px rgba(0,0,0,.35);opacity:1;pointer-events:auto;transition:opacity .18s,background .18s}
    .orbit-carousel .orbit-row-arrow:hover{background:rgba(45,45,45,.98)}
    .orbit-carousel .orbit-row-arrow:focus-visible{opacity:1;pointer-events:auto;outline:2px solid #fff;outline-offset:2px}
    .orbit-carousel .orbit-row-arrow.left{left:4px}
    .orbit-carousel .orbit-row-arrow.right{right:4px}
    .orbit-carousel .orbit-row-arrow[hidden]{display:none!important}
    @media(max-width:1000px){.orbit-carousel .movie-card{flex-basis:calc((100% - 36px)/3)}}
    @media(max-width:600px){.orbit-carousel .movie-card{flex-basis:calc((100% - 18px)/2)}.orbit-carousel .orbit-row-arrow{width:34px;height:52px;font-size:27px}.orbit-carousel .orbit-row-arrow.left{left:2px}.orbit-carousel .orbit-row-arrow.right{right:2px}}
    @media(hover:none){.orbit-carousel .orbit-row-arrow{opacity:1;pointer-events:auto;background:rgba(8,8,8,.78)}}
  `;
  document.head.appendChild(carouselStyle);
  document.querySelectorAll(".section .movie-grid").forEach(grid=>{
    const section=grid.closest(".section");
    if(!section||section.classList.contains("originals")||grid.dataset.orbitCarousel==="ready")return;
    const count=grid.querySelectorAll(".movie-card").length;
    if(count<=2)return;
    grid.dataset.orbitCarousel="ready";
    const wrap=document.createElement("div");wrap.className="orbit-carousel";
    grid.parentNode.insertBefore(wrap,grid);wrap.appendChild(grid);
    const left=document.createElement("button");left.type="button";left.className="orbit-row-arrow left";left.innerHTML="&#8249;";left.setAttribute("aria-label","Scroll "+(section.querySelector(".section-title")?.textContent||"titles")+" left");
    const right=document.createElement("button");right.type="button";right.className="orbit-row-arrow right";right.innerHTML="&#8250;";right.setAttribute("aria-label","Scroll "+(section.querySelector(".section-title")?.textContent||"titles")+" right");
    wrap.append(left,right);
    const update=()=>{const max=grid.scrollWidth-grid.clientWidth;const showArrows=max>3;left.hidden=!showArrows;right.hidden=!showArrows;};
    left.addEventListener("click",()=>{const max=grid.scrollWidth-grid.clientWidth;if(grid.scrollLeft<=3)grid.scrollTo({left:max,behavior:"smooth"});else grid.scrollBy({left:-grid.clientWidth*.85,behavior:"smooth"});});
    right.addEventListener("click",()=>{const max=grid.scrollWidth-grid.clientWidth;if(grid.scrollLeft>=max-3)grid.scrollTo({left:0,behavior:"smooth"});else grid.scrollBy({left:grid.clientWidth*.85,behavior:"smooth"});});
    grid.addEventListener("scroll",update,{passive:true});
    if("ResizeObserver" in window)new ResizeObserver(update).observe(grid);else window.addEventListener("resize",update);
    update();
  });
  const heroStyle=document.createElement("style");heroStyle.textContent=".hero{position:relative;transition:background-image .65s ease}.hero-cta{margin-top:24px}.hero-cta .button{display:inline-flex;align-items:center;justify-content:center;min-width:120px;text-decoration:none}.hero-spotlight-meta{display:flex;align-items:center;gap:18px;margin-top:28px;color:#d6caff;font-size:12px;font-weight:700;letter-spacing:2px}.hero-spotlight-meta #heroSpotlightDots{display:flex;gap:8px}.hero-dot{width:7px;height:7px;border:0;border-radius:50%;background:#666;cursor:pointer;padding:0}.hero-dot.active{background:#B9A4FF;transform:scale(1.3)}.hero h1{font-size:clamp(38px,6vw,70px);letter-spacing:1px;max-width:750px}.hero p{max-width:610px} .hero:after{content:'WATCH';position:absolute;right:6%;bottom:38px;color:#eee;font-size:11px;letter-spacing:2px;opacity:.72}@media(max-width:750px){.hero{min-height:420px!important;padding:65px 25px!important}.hero-spotlight-meta{flex-wrap:wrap}}";document.head.appendChild(heroStyle);
  const hero=document.querySelector(".hero"),hi=promo[0];if(hero&&!hero.dataset.orbitSpotlightActive){const bg=settings.hero_backdrop||(hi&&(hi.backdrop_url||hi.poster_url));if(bg)hero.style.backgroundImage='linear-gradient(90deg,#080808 15%,rgba(8,8,8,.92) 40%,rgba(8,8,8,.45) 75%,rgba(8,8,8,.15)),url("'+String(bg).replace(/"/g,"%22")+'")';const h=hero.querySelector("h1");if(h)h.textContent=settings.hero_title||hi?.title||"ORBIT X";const p=hero.querySelector("p");if(p&&settings.hero_description)p.textContent=settings.hero_description}
  const ad=document.querySelector(".ad-space");if(ad){ad.textContent=settings.ad_enabled===false?"":(settings.ad_text||"ADVERTISEMENT");ad.style.display=settings.ad_enabled===false?"none":""}
  const featuredTitle=document.querySelector("#movies .section-title");if(featuredTitle&&settings.featured_title)featuredTitle.textContent=settings.featured_title;
  document.querySelectorAll("#recently-added .section-title").forEach(el=>{if(settings.recent_title)el.textContent=settings.recent_title});
 }
}catch(e){console.error("ORBIT catalog error",e)}
const normalizeWatchLabels=()=>{document.querySelectorAll(".watch-button").forEach(el=>{if(el.textContent.trim().toLowerCase()==="view title")el.textContent="Watch";});};
normalizeWatchLabels();
new MutationObserver(normalizeWatchLabels).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();})();
(async()=>{try{const r=await fetch("/api/site-settings",{cache:"no-store"});if(!r.ok)return;const s=(await r.json()).settings||{},root=document.documentElement;const style=document.createElement("style");style.textContent=":root{--orbit-bg:"+(s.background_color||"#080808")+";--orbit-header:"+(s.header_background||"#0b0b0b")+";--orbit-card:"+(s.card_background||"#151515")+";--orbit-accent:"+(s.accent||"#A78BFA")+";--orbit-text:"+(s.text_color||"#fff")+";--orbit-muted:"+(s.muted_color||"#a0a0a0")+";--orbit-button:"+(s.button_color||"#A78BFA")+";--orbit-button-hover:"+(s.button_hover||"#B9A4FF")+";--orbit-max-width:"+(s.max_width||1280)+"px;--orbit-logo-size:"+(s.logo_size||28)+"px}body{background:var(--orbit-bg)!important;color:var(--orbit-text)!important}header,nav,.topbar,.site-header{background-color:var(--orbit-header)!important}.movie-card .poster,.card{background:var(--orbit-card)}.movie-meta,.muted,footer{color:var(--orbit-muted)}a{color:var(--orbit-accent)}.watch-button,.btn,.button{background:var(--orbit-button);color:#080808}.watch-button:hover,.btn:hover,.button:hover{background:var(--orbit-button-hover)}";document.head.appendChild(style);if(s.logo_url&&!document.querySelector(".orbit-wordmark")){document.querySelectorAll(".logo").forEach(el=>{el.innerHTML="<img src=\""+String(s.logo_url).replace(/"/g,"%22")+" \" alt=\"ORBIT X\" style=\"height:"+Number(s.logo_size||28)+"px;width:auto;object-fit:contain\">".replace(" \" alt","\" alt")})}const maps=[["#watch-now .section-title",s.watch_now_title],["#watchNow .section-title",s.watch_now_title],["#featured .section-title",s.featured_title],["#recently-added .section-title",s.recent_title],["#recent .section-title",s.recent_title],["#tv-recently-added .section-title",s.recent_title]];maps.forEach(x=>{if(x[1])document.querySelectorAll(x[0]).forEach(el=>el.textContent=x[1])});}catch(e){console.error("ORBIT design settings error",e)}})();
// Keep the homepage spotlight and its Watch action in the deployed static asset bundle.
