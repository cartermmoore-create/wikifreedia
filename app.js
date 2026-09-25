
const STORAGE = "wikifreedia.data.v1";
const SETTINGS = "wikifreedia.settings.v1";

const seed = [
  {
    title:"Wikifreedia",
    summary:"Wikifreedia is a fictional, local-first encyclopedia platform for creating, editing, and organizing articles.",
    content:`Wikifreedia is a fictional collaborative encyclopedia platform designed for creating, editing, and organizing articles about any subject.

== About ==
Wikifreedia lets people write articles by hand or use an AI-assisted drafting tool. The starter build stores articles in the browser so it can work without an account or database.

== Features ==
* Create articles from scratch
* Edit articles
* Search saved articles
* Save drafts
* Keep a simple revision history
* Use an AI assistant to generate a starting draft
* Organize articles with categories

== Markup ==
Use == Heading == for sections, * item for lists, and [[Article Name]] for internal article links.`,
    categories:["Wikifreedia","Software"], images:[], history:[]
  },
  {
    title:"Example article",
    summary:"A sample Wikifreedia entry showing the basic article structure.",
    content:`This is an example Wikifreedia article.

== Overview ==
Articles can describe people, places, fictional worlds, objects, games, historical subjects, ideas, and more.

== History ==
Use this section to explain the subject's development and notable events.

== See also ==
* [[Wikifreedia]]`,
    categories:["Examples"], images:[], history:[]
  }
];

let db = loadDb();
let prefs = loadPrefs();
let activeTitle = null;
let activeTab = "read";
let draftImagesToLoad = [];

function loadDb(){
  try{
    const x = JSON.parse(localStorage.getItem(STORAGE)||"null");
    if(x && Array.isArray(x.articles)) return x;
  }catch(e){}
  const x = {articles:seed.map(a=>({...a,history:[]})),drafts:[]};
  localStorage.setItem(STORAGE,JSON.stringify(x));
  return x;
}
function saveDb(){localStorage.setItem(STORAGE,JSON.stringify(db))}
function loadPrefs(){
  try{
    return Object.assign({endpoint:"/api/generate",model:"",fallback:true},
      JSON.parse(localStorage.getItem(SETTINGS)||"{}"));
  }catch(e){return {endpoint:"/api/generate",model:"",fallback:true}}
}
function savePrefs(){localStorage.setItem(SETTINGS,JSON.stringify(prefs))}
function esc(x=""){return String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function articleByTitle(t){return db.articles.find(a=>a.title.toLowerCase()===t.toLowerCase())||null}
function internalLinks(s){
  return esc(s)
    .replace(/\[\[([^\]]+)\]\]/g,(_,x)=>`<a href="#/article/${encodeURIComponent(x)}">${esc(x)}</a>`)
    .replace(/'''([^']+)'''/g,"<strong>$1</strong>")
    .replace(/''([^']+)''/g,"<em>$1</em>");
}
function wikiHtml(src){
  const lines=String(src||"").split(/\r?\n/); let out="",p=[],list=false;
  const fp=()=>{if(p.length){out+=`<p>${internalLinks(p.join(" "))}</p>`;p=[]}};
  const close=()=>{if(list){out+="</ul>";list=false}};
  for(const raw of lines){
    const line=raw.trimEnd();
    if(/^===.+===\s*$/.test(line)){fp();close();out+=`<h3>${internalLinks(line.replace(/^===|===$/g,"").trim())}</h3>`}
    else if(/^==.+==\s*$/.test(line)){fp();close();out+=`<h2>${internalLinks(line.replace(/^==|==$/g,"").trim())}</h2>`}
    else if(/^\*\s+/.test(line)){fp();if(!list){out+="<ul>";list=true}out+=`<li>${internalLinks(line.replace(/^\*\s+/,""))}</li>`}
    else if(!line.trim()){fp();close()}
    else{close();p.push(line.trim())}
  }
  fp();close(); return out||`<p class="muted">This article has no content yet.</p>`;
}

function imageHtml(image){
  if(!image || !image.data) return "";
  const align = image.align === "left" ? "left" : image.align === "right" ? "right" : "center";
  const width = Math.max(120, Math.min(1000, Number(image.width) || 320));
  return `<figure class="article-image ${align}">
    <img src="${image.data}" alt="${esc(image.alt || image.caption || "")}" style="width:${width}px;max-width:100%">
    ${image.caption ? `<figcaption>${esc(image.caption)}</figcaption>` : ""}
  </figure>`;
}
function mediaMarkup(a){
  return (a.images||[]).map(imageHtml).join("");
}

function randomArticle(){if(db.articles.length){const a=db.articles[Math.floor(Math.random()*db.articles.length)];location.hash="#/article/"+encodeURIComponent(a.title)}}
function status(id,msg){const e=document.getElementById(id);if(e)e.textContent=msg}

function render(){
  const raw=(location.hash||"#/").replace(/^#\/?/,"");
  const bits=raw.split("/");
  const route=bits[0]||"";
  if(route==="article" && bits[1]){
    activeTitle=decodeURIComponent(bits.slice(1).join("/")); renderArticle(activeTitle); return;
  }
  if(route==="create"){renderEditor();return}
  if(route==="drafts"){renderDrafts();return}
  if(route==="recent"){renderRecent();return}
  if(route==="categories"){renderCategories();return}
  if(route==="help"){renderHelp();return}
  if(route==="random"){randomArticle();return}
  renderHome();
}

function renderHome(){
  const newest=db.articles.slice().sort((a,b)=>a.title.localeCompare(b.title)).slice(0,8);
  document.getElementById("view").innerHTML=`
    <section class="hero">
      <h1>Welcome to Wikifreedia</h1>
      <p>A Wikipedia-inspired encyclopedia where you control what gets written. Create an article yourself or use the AI writer to get a first draft.</p>
      <div class="actions"><a class="primary" href="#/create">Create an article</a><button class="secondary" id="randomBtn">Random article</button></div>
    </section>
    <div class="kpis">
      <div class="kpi"><strong>${db.articles.length}</strong> saved articles</div>
      <div class="kpi"><strong>${db.drafts.length}</strong> drafts</div>
      <div class="kpi"><strong>AI + human</strong> authoring</div>
    </div>
    <div class="grid">
      <div>
        <div class="box">
          <h2>Featured article</h2>
          <p><strong>Wikifreedia</strong> is the included starter article. Edit it, replace it, or use it as a template.</p>
          <a href="#/article/Wikifreedia">Read the Wikifreedia article →</a>
        </div>
        <div class="box">
          <h2>Articles</h2>
          <div class="article-list">
            ${newest.map(a=>`<div class="article-item"><h3><a href="#/article/${encodeURIComponent(a.title)}">${esc(a.title)}</a></h3><p>${esc(a.summary||"No summary yet.")}</p></div>`).join("")}
          </div>
        </div>
      </div>
      <aside>
        <div class="reference">
          <h3>Quick markup</h3>
          <p><span class="code">== Heading ==</span></p>
          <p><span class="code">* List item</span></p>
          <p><span class="code">[[Article Name]]</span></p>
        </div>
      </aside>
    </div>`;
  document.getElementById("randomBtn").onclick=randomArticle;
}

function renderArticle(title){
  const view=document.getElementById("view"), a=articleByTitle(title);
  if(!a){
    view.innerHTML=`<section class="article-head"><h1 class="title">Article not found</h1><p class="subtitle">"${esc(title)}" does not exist yet.</p></section>
      <div class="notice">You can create this article now.</div><button class="primary" id="makeBtn">Create article</button>`;
    document.getElementById("makeBtn").onclick=()=>renderEditor(title);
    return;
  }
  view.innerHTML=`<section class="article-head">
    <h1 class="title">${esc(a.title)}</h1><p class="subtitle">From Wikifreedia, the free encyclopedia</p>
    <div class="tabs">
      <button data-tab="read" class="${activeTab==="read"?"active":""}">Read</button>
      <button data-tab="edit" class="${activeTab==="edit"?"active":""}">Edit</button>
      <button data-tab="history" class="${activeTab==="history"?"active":""}">View history</button>
    </div></section>
    ${activeTab==="edit"?inlineEditor(a):activeTab==="history"?history(a):readArticle(a)}`;
  view.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;renderArticle(a.title)});
  if(activeTab==="edit")bindInline(a);
}

function readArticle(a){
  const cats=a.categories?.length?a.categories:["Uncategorized"];
  return `<div class="grid"><article class="body"><p class="lead">${esc(a.summary||"")}</p>${wikiHtml(a.content)}${mediaMarkup(a)}
    <h2>Categories</h2><p>${cats.map(x=>`<span class="badge">${esc(x)}</span>`).join("")}</p>
  </article><aside>
    <div class="infobox"><h3>${esc(a.title)}</h3>
      <div class="infobox-row"><strong>Type</strong><span>Wikifreedia article</span></div>
      <div class="infobox-row"><strong>Revisions</strong><span>${(a.history||[]).length}</span></div>
      <div class="infobox-row"><strong>Categories</strong><span>${cats.map(esc).join(", ")}</span></div>
    </div>
    <div class="reference"><h3>Article tools</h3><p><a href="#/article/${encodeURIComponent(a.title)}">Permalink</a></p></div>
  </aside></div>`;
}
function inlineEditor(a){
  return `<div class="box" style="margin-top:18px"><div class="field"><label>Article body</label><textarea id="inlineBody">${esc(a.content)}</textarea></div>
    <div class="actions"><button class="primary" id="saveInline">Save changes</button><button class="secondary" id="cancelInline">Cancel</button></div><div class="status" id="inlineStatus"></div></div>`;
}
function bindInline(a){
  document.getElementById("saveInline").onclick=()=>{
    a.history=a.history||[];a.history.push({at:new Date().toISOString(),content:a.content});
    a.content=document.getElementById("inlineBody").value;saveDb();activeTab="read";renderArticle(a.title);
  };
  document.getElementById("cancelInline").onclick=()=>{activeTab="read";renderArticle(a.title)};
}
function history(a){
  const h=a.history||[];
  return `<div class="box" style="margin-top:18px"><h2>Revision history</h2>
  ${h.length?h.slice().reverse().map((x,i)=>`<div class="history-item"><strong>Revision ${h.length-i}</strong><br><span class="muted">${new Date(x.at).toLocaleString()}</span></div>`).join(""):`<p class="muted">No saved revisions yet.</p>`}</div>`;
}

function renderEditor(prefill=""){
  document.getElementById("view").innerHTML=`<section class="article-head"><h1 class="title">Create an article</h1>
    <p class="subtitle">Write it yourself or ask the AI assistant for a starting draft.</p></section>
    <div class="editor-grid">
      <div class="box">
        <div class="field"><label>Title</label><input id="editTitle" value="${esc(prefill)}" placeholder="Article title"></div>
        <div class="field"><label>Summary</label><input id="editSummary" placeholder="One or two sentences describing the topic"></div>
        <div class="field"><label>Categories</label><input id="editCategories" placeholder="Games, People, History"></div>
        <div class="field"><label>Article body</label><textarea id="editBody" placeholder="== Overview ==&#10;Write your article here.&#10;&#10;== History ==&#10;More information."></textarea></div>

        <div class="media-box">
          <h3>Article images</h3>
          <p class="muted">Upload images directly in your browser. They are saved with this article on this device.</p>
          <input id="imageUpload" type="file" accept="image/*" multiple>
          <div class="image-settings">
            <input id="imageCaption" placeholder="Caption for the new image">
            <input id="imageAlt" placeholder="Alt text">
            <select id="imageAlign">
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
            <input id="imageWidth" type="number" min="120" max="1000" value="320" placeholder="Width">
          </div>
          <div id="imagePreviewList" class="image-preview-list"></div>
          <div class="status" id="imageStatus"></div>
        </div>

        <div class="actions"><button class="primary" id="publish">Publish article</button><button class="secondary" id="draft">Save draft</button></div>
        <div class="status" id="editorStatus"></div>
      </div>
      <aside class="ai">
        <h3>AI article writer</h3>
        <p class="muted">Describe the article you want. The AI server can generate a draft, and you can edit it before publishing.</p>
        <div class="field"><label>Topic / instructions</label><textarea id="aiPrompt" style="min-height:155px;font-family:inherit" placeholder="Example: Write a neutral encyclopedia article about a fictional city called New Hollow, including its history, geography, culture and notable landmarks."></textarea></div>
        <div class="field"><label>Style</label><select id="aiStyle"><option>Neutral encyclopedia</option><option>Concise encyclopedia</option><option>Detailed reference</option><option>Fictional lore archive</option></select></div>
        <div class="actions"><button class="primary" id="generate">Generate draft</button></div>
        <div class="status" id="aiStatus"></div>
        <p class="muted" style="font-size:12px">AI output is a draft. Review it before publishing.</p>
      </aside>
    </div>`;
  bindEditor();
}
function localDraft(prompt){
  const title=prompt.length>70?prompt.slice(0,70).replace(/[.,!?:;]+$/,""):prompt;
  return {title,summary:`An encyclopedia-style draft about ${title}.`,body:`== Overview ==
${title} is the subject of this draft article.

== Background ==
The requested subject is described as follows:

${prompt}

== Characteristics ==
* Present known facts separately from interpretation.
* Add names, dates, locations and sources when they are available.
* Mark fictional or speculative details clearly.

== History ==
Expand this section with notable events and development.

== See also ==
* [[Wikifreedia]]`};
}

async function readImageFile(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
function renderImagePreview(images){
  const box = document.getElementById("imagePreviewList");
  if(!box) return;
  box.innerHTML = (images||[]).map((im,i)=>`
    <div class="image-preview-item">
      <img src="${im.data}" alt="">
      <div>
        <strong>${esc(im.caption || "Untitled image")}</strong>
        <div class="muted">${im.align || "center"} · ${Number(im.width)||320}px</div>
      </div>
      <button class="danger" data-remove-image="${i}">Remove</button>
    </div>
  `).join("");
  box.querySelectorAll("[data-remove-image]").forEach(btn=>{
    btn.onclick=()=>{ images.splice(Number(btn.dataset.removeImage),1); renderImagePreview(images); };
  });
}

function bindEditor(){
  const title=document.getElementById("editTitle"),sum=document.getElementById("editSummary"),cats=document.getElementById("editCategories"),body=document.getElementById("editBody");
  const images=[...draftImagesToLoad];
  draftImagesToLoad = [];
  const imageUpload=document.getElementById("imageUpload");
  renderImagePreview(images);
  if(imageUpload){
    imageUpload.onchange=async()=>{
      try{
        const files=[...imageUpload.files];
        const caption=document.getElementById("imageCaption").value.trim();
        const alt=document.getElementById("imageAlt").value.trim();
        const align=document.getElementById("imageAlign").value;
        const width=Number(document.getElementById("imageWidth").value)||320;
        for(const file of files){
          if(file.size>2*1024*1024) throw new Error(`${file.name} is larger than 2 MB`);
          const data=await readImageFile(file);
          images.push({data,caption:caption||file.name.replace(/\.[^.]+$/,""),alt:alt||file.name,align,width});
        }
        renderImagePreview(images);
        renderImagePreview(images); status("imageStatus",`${files.length} image${files.length===1?"":"s"} added.`);
        imageUpload.value="";
      }catch(e){status("imageStatus",e.message)}
    };
  }
  document.getElementById("publish").onclick=()=>{
    const t=title.value.trim();if(!t){status("editorStatus","Enter a title.");return}
    let a=articleByTitle(t), fresh=!a;
    if(!a)a={title:t,history:[]};
    a.summary=sum.value.trim();a.categories=cats.value.split(",").map(x=>x.trim()).filter(Boolean);a.content=body.value;
    a.images=images.slice();
    a.history=a.history||[];a.history.push({at:new Date().toISOString(),content:a.content});
    if(fresh)db.articles.push(a);saveDb();activeTab="read";location.hash="#/article/"+encodeURIComponent(t);
  };
  document.getElementById("draft").onclick=()=>{
    const d={id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),title:title.value.trim()||"Untitled draft",summary:sum.value.trim(),categories:cats.value.split(",").map(x=>x.trim()).filter(Boolean),content:body.value,images:images.slice(),updatedAt:new Date().toISOString()};
    db.drafts=db.drafts.filter(x=>x.title.toLowerCase()!==d.title.toLowerCase());db.drafts.unshift(d);saveDb();status("editorStatus","Draft saved.");
  };
  document.getElementById("generate").onclick=async()=>{
    const prompt=document.getElementById("aiPrompt").value.trim(),style=document.getElementById("aiStyle").value;
    if(!prompt){status("aiStatus","Describe the article you want.");return}
    status("aiStatus","Generating…");
    try{
      const r=await fetch(prefs.endpoint||"/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,style,model:prefs.model||undefined})});
      if(!r.ok)throw new Error(String(r.status));
      const data=await r.json();if(!data.text)throw new Error("empty response");
      body.value=data.text;status("aiStatus","Draft generated. Edit it before publishing.");
    }catch(e){
      if(prefs.fallback){
        const d=localDraft(prompt);body.value=d.body;if(!title.value)title.value=d.title;if(!sum.value)sum.value=d.summary;
        status("aiStatus","AI server unavailable; a local demo draft was inserted.");
      }else status("aiStatus","AI generation failed. Check Settings and the server.");
    }
  };
}

function renderDrafts(){
  document.getElementById("view").innerHTML=`<section class="article-head"><h1 class="title">My drafts</h1><p class="subtitle">Saved locally in this browser.</p></section>
  <div class="article-list" style="margin-top:18px">${db.drafts.length?db.drafts.map(d=>`<div class="article-item"><h3>${esc(d.title)}</h3><p>${esc(d.summary||"No summary.")}</p><div class="actions"><button class="secondary" data-open="${esc(d.id)}">Open</button><button class="danger" data-del="${esc(d.id)}">Delete</button></div></div>`).join(""):`<div class="empty">No drafts yet.</div>`}</div>`;
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openDraft(b.dataset.open));
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{db.drafts=db.drafts.filter(d=>d.id!==b.dataset.del);saveDb();renderDrafts()});
}
function openDraft(id){
  const d=db.drafts.find(x=>x.id===id);if(!d)return;
  renderEditor(d.title);
  draftImagesToLoad = d.images || [];
  setTimeout(()=>{document.getElementById("editSummary").value=d.summary||"";document.getElementById("editCategories").value=(d.categories||[]).join(", ");document.getElementById("editBody").value=d.content||""; if(d.images){ const p=document.getElementById("imagePreviewList"); p.innerHTML=d.images.map((im,i)=>`<div class="image-preview-item"><img src="${im.data}" alt=""><div><strong>${esc(im.caption||"Untitled image")}</strong><div class="muted">${im.align||"center"} · ${Number(im.width)||320}px</div></div></div>`).join(""); }},0);
}
function renderRecent(){
  const changes=[];db.articles.forEach(a=>(a.history||[]).forEach(h=>changes.push({title:a.title,...h})));changes.sort((a,b)=>b.at.localeCompare(a.at));
  document.getElementById("view").innerHTML=`<section class="article-head"><h1 class="title">Recent changes</h1><p class="subtitle">Edits saved in this browser.</p></section>
  <div class="box" style="margin-top:18px">${changes.length?changes.slice(0,60).map(c=>`<div class="history-item"><a href="#/article/${encodeURIComponent(c.title)}">${esc(c.title)}</a><span class="muted"> — ${new Date(c.at).toLocaleString()}</span></div>`).join(""):`<p class="muted">No edits yet.</p>`}</div>`;
}
function renderCategories(){
  const count={};db.articles.forEach(a=>(a.categories?.length?a.categories:["Uncategorized"]).forEach(c=>count[c]=(count[c]||0)+1));
  document.getElementById("view").innerHTML=`<section class="article-head"><h1 class="title">Categories</h1><p class="subtitle">Browse categories used by your articles.</p></section>
  <div class="box" style="margin-top:18px">${Object.entries(count).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`<div class="history-item"><span class="badge">${esc(k)}</span> ${v} article${v===1?"":"s"}</div>`).join("")}</div>`;
}
function renderHelp(){
  document.getElementById("view").innerHTML=`<section class="article-head"><h1 class="title">Help</h1><p class="subtitle">A quick guide to Wikifreedia.</p></section>
  <div class="box" style="margin-top:18px"><h2>Creating an article</h2><p>Use <a href="#/create">Create an article</a>, enter a title, then write or generate a draft.</p>
  <h2>Wiki-style markup</h2><p><span class="code">== Heading ==</span> creates a section.</p><p><span class="code">* item</span> creates a list.</p><p><span class="code">[[Article Name]]</span> links to another article.</p>
  <h2>Storage</h2><p>This starter version stores articles in browser local storage. A larger Wikifreedia could use accounts, a database, uploads, moderation and full revision diffs.</p></div>`;
}
function search(q){
  const x=q.toLowerCase(),m=db.articles.filter(a=>a.title.toLowerCase().includes(x)||(a.summary||"").toLowerCase().includes(x)||(a.content||"").toLowerCase().includes(x)||(a.categories||[]).some(c=>c.toLowerCase().includes(x)));
  document.getElementById("view").innerHTML=`<section class="article-head"><h1 class="title">Search results</h1><p class="subtitle">${m.length} result${m.length===1?"":"s"} for “${esc(q)}”</p></section>
  <div class="article-list" style="margin-top:18px">${m.map(a=>`<div class="article-item"><h3><a href="#/article/${encodeURIComponent(a.title)}">${esc(a.title)}</a></h3><p>${esc(a.summary||"No summary.")}</p></div>`).join("")||`<div class="empty">No matches. <a href="#/create">Create an article</a>.</div>`}</div>`;
}

function settingsModal(){
  const modal=document.getElementById("modal");
  document.getElementById("modalContent").className="modal-content";
  document.getElementById("modalContent").innerHTML=`<div class="field"><label>AI endpoint</label><input id="prefEndpoint" value="${esc(prefs.endpoint||"/api/generate")}"></div>
  <div class="field"><label>AI model (optional)</label><input id="prefModel" value="${esc(prefs.model||"")}"></div>
  <div class="field"><label><input type="checkbox" id="prefFallback" ${prefs.fallback?"checked":""}> Use local demo fallback when AI is unavailable</label></div>
  <div class="notice">Keep API keys on the server, never inside browser JavaScript.</div>
  <div class="actions"><button class="primary" id="savePrefs">Save settings</button><button class="danger" id="resetDb">Reset demo data</button></div>`;
  modal.classList.remove("hidden");
  document.getElementById("savePrefs").onclick=()=>{prefs.endpoint=document.getElementById("prefEndpoint").value.trim()||"/api/generate";prefs.model=document.getElementById("prefModel").value.trim();prefs.fallback=document.getElementById("prefFallback").checked;savePrefs();modal.classList.add("hidden")};
  document.getElementById("resetDb").onclick=()=>{if(confirm("Reset all Wikifreedia data in this browser?")){db={articles:seed.map(a=>({...a,history:[]})),drafts:[]};saveDb();modal.classList.add("hidden");render()}};
}

document.getElementById("searchForm").onsubmit=e=>{e.preventDefault();const q=document.getElementById("searchInput").value.trim();if(q)search(q)};
document.getElementById("settingsSide").onclick=settingsModal;
document.getElementById("settingsTop").onclick=settingsModal;
document.getElementById("closeModal").onclick=()=>document.getElementById("modal").classList.add("hidden");
document.getElementById("modal").onclick=e=>{if(e.target.id==="modal")e.currentTarget.classList.add("hidden")};
document.getElementById("mobileMenu").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("desktopMenu").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("mobileSearch").onclick=()=>document.getElementById("searchInput").focus();
window.addEventListener("hashchange",()=>{activeTab="read";document.getElementById("sidebar").classList.remove("open");render()});
render();
