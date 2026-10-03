<script>
(async()=>{
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  try{
    const r=await fetch("/api/public/content",{cache:"no-store"});
    if(!r.ok) throw new Error("Catalog request failed: "+r.status);
    const data=await r.json();
    const items=data.content||[];

    if(!document.getElementById("orbit-watch-hover")){
      const st=document.createElement("style");
      st.id="orbit-watch-hover";
      st.textContent=".movie-card{overflow:visible!important;position:relative}.movie-card:hover{z-index:5}.watch-button{display:block;transition:transform .2s ease,box-shadow .2s ease,background .2s ease;position:relative}.movie-card:hover .watch-button{transform:scale(1.10);box-shadow:0 10px 28px rgba(0,0,0,.55);background:#fff}.watch-button:hover,.watch-button:focus-visible{transform:scale(1.16);box-shadow:0 14px 34px rgba(255,255,255,.28);outline:none;z-index:10}";
      document.head.appendChild(st);
    }

    const card=i=>{
      const meta=[i.year,i.rating,i.runtime_minutes?i.runtime_minutes+" min":""].filter(Boolean).join(" · ");
      const url="/watch.html?slug="+encodeURIComponent(i.slug);
      return '<article class="movie-card"><div class="poster">'+
        (i.poster_url?'<img src="'+esc(i.poster_url)+'" alt="'+esc(i.title)+'" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.remove();this.parentElement.textContent=\'POSTER\'">':"POSTER")+
        '</div><div class="movie-info"><div class="movie-title">'+esc(i.title)+'</div><div class="movie-meta">'+esc(meta||"ORBIT")+'</div><a href="'+url+'" class="watch-button">Watch</a></div></article>';
    };

    const movies=items.filter(i=>i.type==="movie");
    const shows=items.filter(i=>i.type==="show");

    if(location.pathname.endsWith("movies.html")){
      const g=document.getElementById("movieGrid");
      if(g)g.innerHTML=movies.map(card).join("")||"<p>No movies published yet.</p>";
      const n=document.getElementById("movieCount");
      if(n)n.textContent=movies.length;
    }

    if(location.pathname.endsWith("tv.html")){
      const g=document.querySelector(".movie-grid")||document.querySelector(".empty");
      if(g){g.className="movie-grid";g.innerHTML=shows.map(card).join("")||"<p>No TV shows have been published yet.</p>";}
    }

    if(location.pathname.endsWith("/")||location.pathname.endsWith("index.html")){
      const grids=document.querySelectorAll(".movie-grid");
      const featured=movies.filter(i=>i.featured);
      if(grids[0])grids[0].innerHTML=(featured.length?featured:movies).slice(0,5).map(card).join("")||"<p>No movies published yet.</p>";
      if(grids[1])grids[1].innerHTML=movies.slice(0,5).map(card).join("")||"<p>No movies published yet.</p>";
      const tg=document.querySelector("#tv .movie-grid");
      if(tg)tg.innerHTML=shows.slice(0,5).map(card).join("")||"<p>No TV shows published yet.</p>";

      const h=featured[0]||movies[0];
      if(h){
        const hero=document.querySelector(".hero");
        if(hero && h.backdrop_url) hero.style.backgroundImage='linear-gradient(90deg,#080808 15%,rgba(8,8,8,.92) 40%,rgba(8,8,8,.45) 75%,rgba(8,8,8,.15)),url("'+String(h.backdrop_url).replace(/"/g,"%22")+'")';
        const t=document.querySelector(".hero h1");
        if(t)t.textContent=h.title;
      }
    }
  }catch(e){console.error("ORBIT catalog error",e);}
})();
</script>