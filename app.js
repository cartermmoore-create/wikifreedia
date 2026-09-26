const STORAGE="wikifreedia.data.v1";
const SETTINGS="wikifreedia.settings.v1";

const seed=[
{title:"Wikifreedia",summary:"Wikifreedia is a fictional, local-first encyclopedia platform for creating, editing, and organizing articles.",content:`Wikifreedia is a fictional collaborative encyclopedia platform designed for creating, editing, and organizing articles about any subject.

== About ==
Wikifreedia lets people write articles by hand or use an AI-assisted drafting tool.

== Features ==
* Create articles
* Edit articles
* Search articles
* Save drafts
* Add images
* Use AI-assisted drafting

== Markup ==
Use == Heading == for sections, * item for lists, and [[Article Name]] for internal links.`,categories:["Wikifreedia","Software"],images:[],infoboxImage:"",infoboxCaption:"",history:[]}
];

let db=loadDB(),prefs=loadPrefs(),activeTab="read",draftImages=[];

function loadDB(){
  try{
    const d=JSON.parse(localStorage.getItem(STORAGE)||"null");
    if(d&&Array.isArray(d.articles)){
      d.articles.forEach(a=>{
        a.images=Array.isArray(a.images)?a.images:[];
        a.history=Array.isArray(a.history)?a.history:[];
        a.infoboxImage=a.infoboxImage||"";
        a.infoboxCaption=a.infoboxCaption||"";
      });
      d.drafts=Array.isArray(d.drafts)?d.drafts:[];
      return d;
    }
  }catch(e){}
  const d={articles:seed.map(a=>({...a})),drafts:[]};
  localStorage.setItem(STORAGE,JSON.stringify(d));
  return d;
}

function saveDB(){
  try{
    localStorage.setItem(STORAGE,JSON.stringify(db));
    return true;
  }catch(e){
    const el=document.getElementById("editorStatus")||document.getElementById("imageStatus");
    if(el)el.textContent="Could not save. Browser storage may be full; try smaller images.";
    return false;
  }
}

function loadPrefs(){
  try{
    return Object.assign(
      {endpoint:"/api/generate",model:"",fallback:true},
      JSON.parse(localStorage.getItem(SETTINGS)||"{}")
    );
  }catch(e){
    return {endpoint:"/api/generate",model:"",fallback:true};
  }
}

function savePrefs(){
  localStorage.setItem(SETTINGS,JSON.stringify(prefs));
}

function esc(v=""){
  return String(v).replace(/[&<>"']/g,c=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));
}

function validURL(v=""){
  v=String(v).trim();
  return /^https?:\/\/|^data:image\//i.test(v)?v:"";
}

function getArticle(t){
  return db.articles.find(
    a=>a.title.toLowerCase()===t.toLowerCase()
  )||null;
}

function setStatus(id,t){
  const e=document.getElementById(id);
  if(e)e.textContent=t;
}

function wikiInline(s){
  return esc(s)
    .replace(
      /\[\[([^\]]+)\]\]/g,
      (_,x)=>`<a href="#/article/${encodeURIComponent(x)}">${esc(x)}</a>`
    )
    .replace(
      /'''([^']+)'''/g,
      "<strong>$1</strong>"
    )
    .replace(
      /''([^']+)''/g,
      "<em>$1</em>"
    );
}

function wikiHTML(src){
  const lines=String(src||"").split(/\r?\n/);
  const out=[];
  let paragraph=[];
  let list=false;

  const flush=()=>{
    if(paragraph.length){
      out.push(
        `<p>${wikiInline(paragraph.join(" "))}</p>`
      );
      paragraph=[];
    }
  };

  const close=()=>{
    if(list){
      out.push("</ul>");
      list=false;
    }
  };

  for(const raw of lines){
    const line=raw.trimEnd();

    if(/^===.+===\s*$/.test(line)){
      flush();
      close();
      out.push(
        `<h3>${wikiInline(
          line.replace(/^===|===$/g,"").trim()
        )}</h3>`
      );
    }

    else if(/^==.+==\s*$/.test(line)){
      flush();
      close();
      out.push(
        `<h2>${wikiInline(
          line.replace(/^==|==$/g,"").trim()
        )}</h2>`
      );
    }

    else if(/^\*\s+/.test(line)){
      flush();

      if(!list){
        out.push("<ul>");
        list=true;
      }

      out.push(
        `<li>${wikiInline(
          line.replace(/^\*\s+/,"")
        )}</li>`
      );
    }

    else if(!line.trim()){
      flush();
      close();
    }

    else{
      close();
      paragraph.push(line.trim());
    }
  }

  flush();
  close();

  return out.join("") ||
    `<p class="muted">This article has no content yet.</p>`;
}

function articleImageHTML(im){
  const src=validURL(im?.data||im?.url);

  if(!src)return "";

  const align=
    im.align==="left"||im.align==="right"
      ? im.align
      : "center";

  const width=Math.max(
    120,
    Math.min(
      1000,
      Number(im.width)||320
    )
  );

  return `
    <figure class="article-image ${align}">

      <img
        src="${src}"
        alt="${esc(im.alt||im.caption||"")}"
        style="width:${width}px;max-width:100%"
        loading="lazy"
      >

      ${
        im.caption
          ? `<figcaption>${esc(im.caption)}</figcaption>`
          : ""
      }

    </figure>
  `;
}

function mediaHTML(a){
  return (a.images||[])
    .map(articleImageHTML)
    .join("");
}

function infoboxImageHTML(a){
  const src=validURL(a.infoboxImage);

  if(!src)return "";

  return `
    <div class="infobox-image">

      <img
        src="${src}"
        alt="${esc(a.infoboxCaption||a.title)}"
        loading="lazy"
      >

      ${
        a.infoboxCaption
          ? `<div class="infobox-caption">${esc(a.infoboxCaption)}</div>`
          : ""
      }

    </div>
  `;
}

function logo(){
  const svg=`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 240 240"
  >

    <circle
      cx="120"
      cy="120"
      r="96"
      fill="#f7f7f7"
      stroke="#a2a9b1"
      stroke-width="4"
    />

    <g
      fill="none"
      stroke="#b4b7ba"
      stroke-width="5"
    >
      <path d="M35 100h52l18-28 30 28 34-18 40 24"/>
      <path d="M34 148l36-21 31 25 30-40 39 24 34-12 28 30"/>
      <path d="M78 26l8 41 42 26 6 45-42 31-51-27"/>
    </g>

    <text
      x="120"
      y="135"
      text-anchor="middle"
      font-family="Georgia,serif"
      font-size="80"
      font-weight="700"
    >
      W
    </text>

  </svg>`;

  return "data:image/svg+xml;charset=UTF-8,"+
    encodeURIComponent(svg);
}

function render(){

  const bits=
    (location.hash||"#/")
      .replace(/^#\/?/,"")
      .split("/");

  if(
    bits[0]==="article" &&
    bits[1]
  ){
    activeTab="read";
    renderArticle(
      decodeURIComponent(
        bits.slice(1).join("/")
      )
    );
    return;
  }

  if(bits[0]==="create"){
    renderEditor();
    return;
  }

  if(bits[0]==="drafts"){
    renderDrafts();
    return;
  }

  if(bits[0]==="recent"){
    renderRecent();
    return;
  }

  if(bits[0]==="categories"){
    renderCategories();
    return;
  }

  if(bits[0]==="help"){
    renderHelp();
    return;
  }

  if(bits[0]==="random"){
    randomArticle();
    return;
  }

  renderHome();
}

function renderHome(){

  const l=logo();

  const projects=[
    ["W","Wikifreedia","The free encyclopedia"],
    ["C","Commons","Free media & images"],
    ["V","WikiVoyage","Free travel guide"],
    ["D","Wiktionary","Free dictionary"],
    ["B","Wikibooks","Free textbooks"],
    ["N","Wikinews","Free news source"],
    ["Q","Wikidata","Free knowledge base"],
    ["S","Wikisource","Free source materials"]
  ];

  document.getElementById("view").innerHTML=`

    <section class="front-page">

      <div class="front-header">

        <img
          class="front-logo"
          src="${l}"
          alt="Wikifreedia"
        >

        <h1>
          Wikifreedia
        </h1>

        <div class="front-tagline">
          The Free Encyclopedia
        </div>

      </div>


      <div class="language-portal">

        <div class="language-column">

          <div class="language-item">
            <a href="#/create">
              English
            </a>

            <span>
              ${db.articles.length} articles
            </span>
          </div>

          <div class="language-item">
            <a href="#/create">
              Español
            </a>

            <span>
              español
            </span>
          </div>

          <div class="language-item">
            <a href="#/create">
              日本語
            </a>

            <span>
              日本語
            </span>
          </div>

          <div class="language-item">
            <a href="#/create">
              Deutsch
            </a>

            <span>
              Deutsch
            </span>
          </div>

        </div>


        <div class="language-center">

          <img
            src="${l}"
            alt="Wikifreedia"
          >

        </div>


        <div class="language-column">

          <div class="language-item">
            <a href="#/create">
              Français
            </a>

            <span>
              français
            </span>
          </div>

          <div class="language-item">
            <a href="#/create">
              Português
            </a>

            <span>
              português
            </span>
          </div>

          <div class="language-item">
            <a href="#/create">
              Русский
            </a>

            <span>
              русский
            </span>
          </div>

          <div class="language-item">
            <a href="#/create">
              中文
            </a>

            <span>
              中文
            </span>
          </div>

        </div>

      </div>


      <form
        class="front-search"
        id="frontSearch"
      >

        <input
          id="frontSearchInput"
          type="search"
          placeholder="Search Wikifreedia"
        >

        <button type="submit">
          Search
        </button>

      </form>


      <div class="language-selector">

        <select>

          <option>EN</option>
          <option>ES</option>
          <option>FR</option>
          <option>DE</option>
          <option>PT</option>
          <option>ZH</option>

        </select>

      </div>


      <div class="front-projects">

        <div class="front-project-grid">

          ${
            projects
              .map(
                p=>`
                  <a
                    class="front-project"
                    href="#/"
                  >

                    <img
                      src="${l}"
                      alt=""
                    >

                    <span>

                      <strong>
                        ${p[1]}
                      </strong>

                      ${p[2]}

                    </span>

                  </a>
                `
              )
              .join("")
          }

        </div>

      </div>

    </section>
  `;

  document.getElementById(
    "frontSearch"
  ).onsubmit=e=>{

    e.preventDefault();

    const q=
      document
        .getElementById(
          "frontSearchInput"
        )
        .value
        .trim();

    if(q){
      search(q);
    }
  };
}

function renderArticle(title){

  const a=getArticle(title);

  const view=
    document.getElementById(
      "view"
    );

  if(!a){

    view.innerHTML=`

      <section class="article-head">

        <h1 class="title">
          Article not found
        </h1>

        <p class="subtitle">
          "${esc(title)}" does not exist yet.
        </p>

      </section>


      <div class="notice">
        You can create it now.
      </div>


      <button
        class="primary"
        id="makeArticle"
      >
        Create article
      </button>

    `;

    document.getElementById(
      "makeArticle"
    ).onclick=()=>
      renderEditor(title);

    return;
  }


  view.innerHTML=`

    <section class="article-head">

      <h1 class="title">
        ${esc(a.title)}
      </h1>

      <p class="subtitle">
        From Wikifreedia, the free encyclopedia
      </p>

      <div class="tabs">

        <button
          data-tab="read"
          class="${activeTab==="read"?"active":""}"
        >
          Read
        </button>

        <button
          data-tab="edit"
          class="${activeTab==="edit"?"active":""}"
        >
          Edit
        </button>

        <button
          data-tab="history"
          class="${activeTab==="history"?"active":""}"
        >
          View history
        </button>

      </div>

    </section>


    ${
      activeTab==="read"
        ? readArticle(a)
        : activeTab==="edit"
          ? editArticle(a)
          : historyArticle(a)
    }

  `;


  view
    .querySelectorAll(
      "[data-tab]"
    )
    .forEach(
      b=>{
        b.onclick=()=>{
          activeTab=
            b.dataset.tab;

          renderArticle(
            a.title
          );
        };
      }
    );


  if(
    activeTab==="edit"
  ){
    bindInline(a);
  }
}

function readArticle(a){

  const cats=
    a.categories?.length
      ? a.categories
      : ["Uncategorized"];


  return `

    <div class="grid">

      <article class="body">

        <p class="lead">
          ${esc(a.summary||"")}
        </p>

        ${wikiHTML(a.content)}

        ${mediaHTML(a)}

        <h2>
          Categories
        </h2>

        <p>

          ${
            cats
              .map(
                c=>
                  `<span class="badge">
                    ${esc(c)}
                  </span>`
              )
              .join("")
          }

        </p>

      </article>


      <aside>

        <div class="infobox">

          <h3>
            ${esc(a.title)}
          </h3>

          ${infoboxImageHTML(a)}

          <div class="infobox-row">

            <strong>
              Type
            </strong>

            <span>
              Wikifreedia article
            </span>

          </div>


          <div class="infobox-row">

            <strong>
              Revisions
            </strong>

            <span>
              ${(a.history||[]).length}
            </span>

          </div>


          <div class="infobox-row">

            <strong>
              Categories
            </strong>

            <span>
              ${cats.map(esc).join(", ")}
            </span>

          </div>

        </div>

      </aside>

    </div>
  `;
}

function editArticle(a){

  return `

    <div
      class="box"
      style="margin-top:18px"
    >

      <div class="field">

        <label>
          Article body
        </label>

        <textarea id="inlineBody">${esc(a.content)}</textarea>

      </div>


      <div class="media-box">

        <h3>
          Infobox image
        </h3>

        <p class="muted">
          Paste a public image URL so other visitors can see it.
        </p>

        <div class="shared-image-field">

          <label>
            Image URL
          </label>

          <input
            id="inlineInfoURL"
            value="${esc(a.infoboxImage||"")}"
            placeholder="https://example.com/image.jpg"
          >

        </div>


        <div class="shared-image-field">

          <label>
            Caption
          </label>

          <input
            id="inlineInfoCaption"
            value="${esc(a.infoboxCaption||"")}"
            placeholder="Image caption"
          >

        </div>

      </div>


      <div class="media-box">

        <h3>
          Article images
        </h3>

        <p class="muted">
          Public URLs work for everyone.
          Local uploads stay in this browser.
        </p>


        <div class="shared-image-field">

          <label>
            Shared image URL
          </label>

          <input
            id="inlineSharedURL"
            placeholder="https://example.com/image.jpg"
          >

          <div class="actions">

            <button
              class="secondary"
              type="button"
              id="addInlineShared"
            >
              Add shared image
            </button>

          </div>

        </div>


        <input
          id="inlineUpload"
          type="file"
          accept="image/*"
          multiple
        >


        <div class="image-settings">

          <input
            id="inlineCaption"
            placeholder="Caption"
          >

          <input
            id="inlineAlt"
            placeholder="Alt text"
          >

          <select id="inlineAlign">

            <option value="center">
              Center
            </option>

            <option value="right">
              Right
            </option>

            <option value="left">
              Left
            </option>

          </select>

          <input
            id="inlineWidth"
            type="number"
            min="120"
            max="1000"
            value="320"
          >

        </div>


        <div
          id="inlinePreview"
          class="image-preview-list"
        ></div>


        <div
          id="inlineStatus"
          class="status"
        ></div>

      </div>


      <div class="actions">

        <button
          class="primary"
          id="saveInline"
        >
          Save changes
        </button>

        <button
          class="secondary"
          id="cancelInline"
        >
          Cancel
        </button>

      </div>

    </div>

  `;
}

function bindInline(a){

  const imgs=[
    ...(a.images||[])
  ];

  drawPreview(
    imgs,
    "inlinePreview",
    "inlineStatus"
  );


  document.getElementById(
    "addInlineShared"
  ).onclick=()=>{

    const u=
      validURL(
        document.getElementById(
          "inlineSharedURL"
        ).value
      );


    if(!u){

      setStatus(
        "inlineStatus",
        "Enter a valid image URL."
      );

      return;
    }


    imgs.push({

      url:u,

      caption:
        document
          .getElementById(
            "inlineCaption"
          )
          .value
          .trim() ||
        "Article image",

      alt:
        document
          .getElementById(
            "inlineAlt"
          )
          .value
          .trim() ||
        "Article image",

      align:
        document
          .getElementById(
            "inlineAlign"
          )
          .value,

      width:
        Number(
          document
            .getElementById(
              "inlineWidth"
            )
            .value
        ) || 320

    });


    drawPreview(
      imgs,
      "inlinePreview",
      "inlineStatus"
    );


    document.getElementById(
      "inlineSharedURL"
    ).value="";
  };


  document.getElementById(
    "inlineUpload"
  ).onchange=
    async()=>{

      try{

        for(
          const f of [
            ...document
              .getElementById(
                "inlineUpload"
              )
              .files
          ]
        ){

          if(
            f.size >
            2*1024*1024
          ){

            throw new Error(
              `${f.name} is larger than 2 MB`
            );
          }


          imgs.push({

            data:
              await readFile(f),

            caption:
              document
                .getElementById(
                  "inlineCaption"
                )
                .value
                .trim() ||
              f.name,

            alt:
              document
                .getElementById(
                  "inlineAlt"
                )
                .value
                .trim() ||
              f.name,

            align:
              document
                .getElementById(
                  "inlineAlign"
                )
                .value,

            width:
              Number(
                document
                  .getElementById(
                    "inlineWidth"
                  )
                  .value
              ) || 320

          });

        }


        drawPreview(
          imgs,
          "inlinePreview",
          "inlineStatus"
        );


        document.getElementById(
          "inlineUpload"
        ).value="";


      }catch(e){

        setStatus(
          "inlineStatus",
          e.message
        );
      }

    };


  document.getElementById(
    "saveInline"
  ).onclick=()=>{

    a.content=
      document.getElementById(
        "inlineBody"
      ).value;


    a.infoboxImage=
      validURL(
        document.getElementById(
          "inlineInfoURL"
        ).value
      );


    a.infoboxCaption=
      document.getElementById(
        "inlineInfoCaption"
      ).value
      .trim();


    a.images=
      imgs.slice();


    a.history=
      a.history || [];


    a.history.push({

      at:
        new Date().toISOString(),

      content:
        a.content

    });


    if(
      saveDB()
    ){

      activeTab="read";

      renderArticle(
        a.title
      );
    }

  };


  document.getElementById(
    "cancelInline"
  ).onclick=()=>{

    activeTab="read";

    renderArticle(
      a.title
    );

  };
}

function historyArticle(a){

  const h=
    a.history || [];


  return `

    <div
      class="box"
      style="margin-top:18px"
    >

      <h2>
        Revision history
      </h2>

      ${
        h.length

          ? h
              .slice()
              .reverse()
              .map(
                (x,i)=>`

                  <div
                    class="history-item"
                  >

                    <strong>
                      Revision ${h.length-i}
                    </strong>

                    <br>

                    <span class="muted">
                      ${new Date(
                        x.at
                      ).toLocaleString()}
                    </span>

                  </div>
                `
              )
              .join("")

          : `
            <p class="muted">
              No saved revisions yet.
            </p>
          `
      }

    </div>

  `;
}

function renderEditor(prefill=""){

  document.getElementById(
    "view"
  ).innerHTML=`

    <section
      class="article-head"
    >

      <h1 class="title">
        Create an article
      </h1>

      <p class="subtitle">
        Write it yourself or ask the
        AI assistant for a starting draft.
      </p>

    </section>


    <div class="editor-grid">

      <div class="box">


        <div class="field">

          <label>
            Title
          </label>

          <input
            id="editTitle"
            value="${esc(prefill)}"
            placeholder="Article title"
          >

        </div>


        <div class="field">

          <label>
            Summary
          </label>

          <input
            id="editSummary"
            placeholder="One or two sentences describing the topic"
          >

        </div>


        <div class="field">

          <label>
            Categories
          </label>

          <input
            id="editCategories"
            placeholder="Games, People, History"
          >

        </div>


        <div class="field">

          <label>
            Article body
          </label>

          <textarea
            id="editBody"
            placeholder="== Overview ==
Write your article here.

== History ==
More information."
          ></textarea>

        </div>


        <div class="media-box">

          <h3>
            Infobox image
          </h3>

          <p class="muted">
            Use a public image URL so other visitors can see it.
          </p>


          <div
            class="shared-image-field"
          >

            <label>
              Image URL
            </label>

            <input
              id="infoURL"
              placeholder="https://example.com/image.jpg"
            >

          </div>


          <div
            class="shared-image-field"
          >

            <label>
              Caption
            </label>

            <input
              id="infoCaption"
              placeholder="Image caption"
            >

          </div>

        </div>


        <div class="media-box">

          <h3>
            Article images
          </h3>

          <p class="muted">
            Use a shared URL for everyone,
            or upload a local image for this browser.
          </p>


          <div
            class="shared-image-field"
          >

            <label>
              Shared image URL
            </label>

            <input
              id="sharedURL"
              placeholder="https://example.com/image.jpg"
            >


            <div class="actions">

              <button
                class="secondary"
                type="button"
                id="addShared"
              >
                Add shared image
              </button>

            </div>

          </div>


          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            multiple
          >


          <div class="image-settings">

            <input
              id="imageCaption"
              placeholder="Caption"
            >

            <input
              id="imageAlt"
              placeholder="Alt text"
            >

            <select
              id="imageAlign"
            >

              <option value="center">
                Center
              </option>

              <option value="right">
                Right
              </option>

              <option value="left">
                Left
              </option>

            </select>


            <input
              id="imageWidth"
              type="number"
              min="120"
              max="1000"
              value="320"
            >

          </div>


          <div
            id="imagePreview"
            class="image-preview-list"
          ></div>


          <div
            id="imageStatus"
            class="status"
          ></div>

        </div>


        <div class="actions">

          <button
            class="primary"
            id="publish"
          >
            Publish article
          </button>

          <button
            class="secondary"
            id="draft"
          >
            Save draft
          </button>

        </div>


        <div
          id="editorStatus"
          class="status"
        ></div>

      </div>


      <aside class="ai">

        <h3>
          AI article writer
        </h3>

        <p class="muted">
          Describe what you want
          and generate a starting draft.
        </p>


        <div class="field">

          <label>
            Topic / instructions
          </label>

          <textarea
            id="aiPrompt"
            style="min-height:155px;font-family:inherit"
            placeholder="Write a neutral encyclopedia article about..."
          ></textarea>

        </div>


        <div class="field">

          <label>
            Style
          </label>

          <select id="aiStyle">

            <option>
              Neutral encyclopedia
            </option>

            <option>
              Concise encyclopedia
            </option>

            <option>
              Detailed reference
            </option>

            <option>
              Fictional lore archive
            </option>

          </select>

        </div>


        <div class="actions">

          <button
            class="primary"
            id="generate"
          >
            Generate draft
          </button>

        </div>


        <div
          id="aiStatus"
          class="status"
        ></div>

      </aside>

    </div>

  `;

  bindEditor();
}

function bindEditor(){

  const t=
    document.getElementById(
      "editTitle"
    );

  const s=
    document.getElementById(
      "editSummary"
    );

  const c=
    document.getElementById(
      "editCategories"
    );

  const b=
    document.getElementById(
      "editBody"
    );


  const imgs=[
    ...draftImages
  ];

  draftImages=[];


  drawPreview(
    imgs,
    "imagePreview",
    "imageStatus"
  );


  document.getElementById(
    "addShared"
  ).onclick=()=>{

    const u=
      validURL(
        document.getElementById(
          "sharedURL"
        ).value
      );


    if(!u){

      setStatus(
        "imageStatus",
        "Enter a valid image URL."
      );

      return;
    }


    imgs.push({

      url:u,

      caption:
        document
          .getElementById(
            "imageCaption"
          )
          .value
          .trim() ||
        "Article image",

      alt:
        document
          .getElementById(
            "imageAlt"
          )
          .value
          .trim() ||
        "Article image",

      align:
        document
          .getElementById(
            "imageAlign"
          )
          .value,

      width:
        Number(
          document
            .getElementById(
              "imageWidth"
            )
            .value
        ) || 320

    });


    drawPreview(
      imgs,
      "imagePreview",
      "imageStatus"
    );


    document.getElementById(
      "sharedURL"
    ).value="";

  };


  document.getElementById(
    "imageUpload"
  ).onchange=
    async()=>{

      try{

        for(
          const f of [
            ...document
              .getElementById(
                "imageUpload"
              )
              .files
          ]
        ){

          if(
            f.size >
            2*1024*1024
          ){

            throw new Error(
              `${f.name} is larger than 2 MB`
            );
          }


          imgs.push({

            data:
              await readFile(f),

            caption:
              document
                .getElementById(
                  "imageCaption"
                )
                .value
                .trim() ||
              f.name,

            alt:
              document
                .getElementById(
                  "imageAlt"
                )
                .value
                .trim() ||
              f.name,

            align:
              document
                .getElementById(
                  "imageAlign"
                )
                .value,

            width:
              Number(
                document
                  .getElementById(
                    "imageWidth"
                  )
                  .value
              ) || 320

          });

        }


        drawPreview(
          imgs,
          "imagePreview",
          "imageStatus"
        );


        document.getElementById(
          "imageUpload"
        ).value="";


      }catch(e){

        setStatus(
          "imageStatus",
          e.message
        );
      }

    };


  document.getElementById(
    "publish"
  ).onclick=()=>{

    const title=
      t.value.trim();


    if(!title){

      setStatus(
        "editorStatus",
        "Enter a title."
      );

      return;
    }


    let a=
      getArticle(title);


    if(!a){

      a={
        title,
        history:[],
        images:[]
      };

      db.articles.push(a);
    }


    a.summary=
      s.value.trim();


    a.categories=
      c.value
        .split(",")
        .map(x=>x.trim())
        .filter(Boolean);


    a.content=
      b.value;


    a.images=
      imgs.slice();


    a.infoboxImage=
      validURL(
        document
          .getElementById(
            "infoURL"
          )
          .value
      );


    a.infoboxCaption=
      document
        .getElementById(
          "infoCaption"
        )
        .value
        .trim();


    a.history=
      a.history || [];


    a.history.push({

      at:
        new Date().toISOString(),

      content:
        a.content

    });


    if(
      saveDB()
    ){

      activeTab=
        "read";

      location.hash=
        "#/article/" +
        encodeURIComponent(
          title
        );
    }

  };


  document.getElementById(
    "draft"
  ).onclick=()=>{

    const d={

      id:
        crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()),

      title:
        t.value.trim() ||
        "Untitled draft",

      summary:
        s.value.trim(),

      categories:
        c.value
          .split(",")
          .map(x=>x.trim())
          .filter(Boolean),

      content:
        b.value,

      images:
        imgs.slice(),

      infoboxImage:
        validURL(
          document
            .getElementById(
              "infoURL"
            )
            .value
        ),

      infoboxCaption:
        document
          .getElementById(
            "infoCaption"
          )
          .value
          .trim()

    };


    db.drafts=
      db.drafts.filter(
        x=>
          x.title.toLowerCase() !==
          d.title.toLowerCase()
      );


    db.drafts.unshift(
      d
    );


    if(
      saveDB()
    ){

      setStatus(
        "editorStatus",
        "Draft saved."
      );
    }

  };


  document.getElementById(
    "generate"
  ).onclick=
    async()=>{

      const prompt=
        document
          .getElementById(
            "aiPrompt"
          )
          .value
          .trim();


      const style=
        document
          .getElementById(
            "aiStyle"
          )
          .value;


      if(!prompt){

        setStatus(
          "aiStatus",
          "Describe the article you want."
        );

        return;
      }


      setStatus(
        "aiStatus",
        "Generating..."
      );


      try{

        const r=
          await fetch(
            prefs.endpoint ||
            "/api/generate",
            {
              method:"POST",

              headers:{
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  prompt,
                  style,
                  model:
                    prefs.model ||
                    undefined
                })
            }
          );


        if(!r.ok){

          throw new Error(
            String(r.status)
          );
        }


        const d=
          await r.json();


        if(!d.text){

          throw new Error(
            "No AI response."
          );
        }


        b.value=
          d.text;


        setStatus(
          "aiStatus",
          "Draft generated."
        );


      }catch(e){

        if(
          prefs.fallback
        ){

          b.value=
`== Overview ==
${prompt}

== History ==
Add the known history here.

== See also ==
* [[Wikifreedia]]`;

          if(!t.value){

            t.value=
              prompt.slice(
                0,
                70
              );
          }


          setStatus(
            "aiStatus",
            "AI server unavailable; local demo draft inserted."
          );

        }else{

          setStatus(
            "aiStatus",
            "AI generation failed. Check Settings."
          );
        }
      }
    };
}

function drawPreview(
  images,
  boxID,
  statusID
){

  const box=
    document.getElementById(
      boxID
    );


  if(!box){
    return;
  }


  box.innerHTML=
    (images||[])
      .map(
        (im,i)=>`

          <div
            class="image-preview-item"
          >

            <img
              src="${validURL(
                im.data ||
                im.url
              )}"
              alt=""
            >


            <div>

              <strong>
                ${esc(
                  im.caption ||
                  "Untitled image"
                )}
              </strong>

              <div class="muted">
                ${im.align||"center"}
                ·
                ${Number(im.width)||320}px
              </div>

            </div>


            <button
              class="danger"
              type="button"
              data-remove-preview="${i}"
            >
              Remove
            </button>

          </div>

        `
      )
      .join("");


  box
    .querySelectorAll(
      "[data-remove-preview]"
    )
    .forEach(
      b=>{

        b.onclick=()=>{

          images.splice(
            Number(
              b.dataset.removePreview
            ),
            1
          );


          drawPreview(
            images,
            boxID,
            statusID
          );

        };

      }
    );
}

function readFile(file){

  return new Promise(
    (resolve,reject)=>{

      const r=
        new FileReader();


      r.onload=
        ()=>resolve(
          String(
            r.result
          )
        );


      r.onerror=
        ()=>reject(
          new Error(
            "Could not read image."
          )
        );


      r.readAsDataURL(
        file
      );
    }
  );
}

function renderDrafts(){

  document.getElementById(
    "view"
  ).innerHTML=`

    <section class="article-head">

      <h1 class="title">
        My drafts
      </h1>

      <p class="subtitle">
        Saved locally in this browser.
      </p>

    </section>


    <div
      class="article-list"
      style="margin-top:18px"
    >

      ${
        db.drafts.length

          ? db.drafts
              .map(
                d=>`

                  <div
                    class="article-item"
                  >

                    <h3>
                      ${esc(d.title)}
                    </h3>


                    <p>
                      ${esc(
                        d.summary ||
                        "No summary."
                      )}
                    </p>


                    <div class="actions">

                      <button
                        class="secondary"
                        data-open="${esc(d.id)}"
                      >
                        Open
                      </button>


                      <button
                        class="danger"
                        data-delete="${esc(d.id)}"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                `
              )
              .join("")

          : `

              <div
                class="empty"
              >
                No drafts yet.
              </div>

            `
      }

    </div>

  `;


  document
    .querySelectorAll(
      "[data-open]"
    )
    .forEach(
      b=>{

        b.onclick=()=>{

          const d=
            db.drafts.find(
              x=>
                x.id===
                b.dataset.open
            );

          if(!d){
            return;
          }


          draftImages=
            d.images || [];


          renderEditor(
            d.title
          );


          setTimeout(
            ()=>{

              document
                .getElementById(
                  "editSummary"
                )
                .value=
                  d.summary ||
                  "";


              document
                .getElementById(
                  "editCategories"
                )
                .value=
                  (d.categories||[])
                    .join(", ");


              document
                .getElementById(
                  "editBody"
                )
                .value=
                  d.content ||
                  "";


              document
                .getElementById(
                  "infoURL"
                )
                .value=
                  d.infoboxImage ||
                  "";


              document
                .getElementById(
                  "infoCaption"
                )
                .value=
                  d.infoboxCaption ||
                  "";

            },
            0
          );

        };

      }
    );


  document
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach(
      b=>{

        b.onclick=()=>{

          db.drafts=
            db.drafts.filter(
              d=>
                d.id !==
                b.dataset.delete
            );


          saveDB();

          renderDrafts();

        };

      }
    );
}

function renderRecent(){

  const changes=[];


  db.articles.forEach(
    a=>
      (a.history||[])
        .forEach(
          h=>
            changes.push({
              title:a.title,
              ...h
            })
        )
  );


  changes.sort(
    (a,b)=>
      b.at.localeCompare(
        a.at
      )
  );


  document.getElementById(
    "view"
  ).innerHTML=`

    <section class="article-head">

      <h1 class="title">
        Recent changes
      </h1>

      <p class="subtitle">
        Edits saved in this browser.
      </p>

    </section>


    <div
      class="box"
      style="margin-top:18px"
    >

      ${
        changes.length

          ? changes
              .slice(0,60)
              .map(
                c=>`

                  <div
                    class="history-item"
                  >

                    <a
                      href="#/article/${encodeURIComponent(c.title)}"
                    >
                      ${esc(c.title)}
                    </a>

                    <span class="muted">
                      —
                      ${new Date(
                        c.at
                      ).toLocaleString()}
                    </span>

                  </div>

                `
              )
              .join("")

          : `
              <p class="muted">
                No edits yet.
              </p>
            `
      }

    </div>

  `;
}

function renderCategories(){

  const count={};


  db.articles.forEach(
    a=>
      (
        a.categories?.length
          ? a.categories
          : ["Uncategorized"]
      ).forEach(
        c=>
          count[c]=
            (count[c]||0)+1
      )
  );


  document.getElementById(
    "view"
  ).innerHTML=`

    <section class="article-head">

      <h1 class="title">
        Categories
      </h1>

      <p class="subtitle">
        Browse categories used by your articles.
      </p>

    </section>


    <div
      class="box"
      style="margin-top:18px"
    >

      ${
        Object
          .entries(count)
          .sort(
            (a,b)=>
              a[0].localeCompare(
                b[0]
              )
          )
          .map(
            ([k,v])=>`

              <div
                class="history-item"
              >

                <span class="badge">
                  ${esc(k)}
                </span>

                ${v}
                article${v===1?"":"s"}

              </div>

            `
          )
          .join("")
      }

    </div>

  `;
}

function renderHelp(){

  document.getElementById(
    "view"
  ).innerHTML=`

    <section class="article-head">

      <h1 class="title">
        Help
      </h1>

      <p class="subtitle">
        A quick guide to Wikifreedia.
      </p>

    </section>


    <div
      class="box"
      style="margin-top:18px"
    >

      <h2>
        Creating an article
      </h2>

      <p>
        Use
        <a href="#/create">
          Create an article
        </a>
        to make a new page.
      </p>


      <h2>
        Wiki-style markup
      </h2>

      <p>
        <span class="code">
          == Heading ==
        </span>
        creates a section.
      </p>


      <p>
        <span class="code">
          * item
        </span>
        creates a list.
      </p>


      <p>
        <span class="code">
          [[Article Name]]
        </span>
        links to another article.
      </p>


      <h2>
        Images
      </h2>

      <p>
        Use a public image URL when
        you want other visitors to see
        the image.
      </p>

    </div>

  `;
}

function search(q){

  const x=
    q.toLowerCase();


  const m=
    db.articles.filter(
      a=>
        a.title
          .toLowerCase()
          .includes(x) ||

        (a.summary||"")
          .toLowerCase()
          .includes(x) ||

        (a.content||"")
          .toLowerCase()
          .includes(x) ||

        (a.categories||[])
          .some(
            c=>
              c
                .toLowerCase()
                .includes(x)
          )
    );


  document.getElementById(
    "view"
  ).innerHTML=`

    <section class="article-head">

      <h1 class="title">
        Search results
      </h1>

      <p class="subtitle">
        ${m.length}
        result${m.length===1?"":"s"}
        for “${esc(q)}”
      </p>

    </section>


    <div
      class="article-list"
      style="margin-top:18px"
    >

      ${
        m.map(
          a=>`

            <div
              class="article-item"
            >

              <h3>

                <a
                  href="#/article/${encodeURIComponent(a.title)}"
                >
                  ${esc(a.title)}
                </a>

              </h3>


              <p>
                ${esc(
                  a.summary ||
                  "No summary."
                )}
              </p>

            </div>

          `
        ).join("")

        ||

        `

          <div
            class="empty"
          >

            No matches.

            <a href="#/create">
              Create an article
            </a>.

          </div>

        `
      }

    </div>

  `;
}

function randomArticle(){

  if(
    !db.articles.length
  ){
    return;
  }


  const a=
    db.articles[
      Math.floor(
        Math.random() *
        db.articles.length
      )
    ];


  location.hash=
    "#/article/" +
    encodeURIComponent(
      a.title
    );
}

function settingsModal(){

  const modal=
    document.getElementById(
      "modal"
    );


  document.getElementById(
    "modalContent"
  ).innerHTML=`

    <div class="field">

      <label>
        AI endpoint
      </label>

      <input
        id="prefEndpoint"
        value="${esc(
          prefs.endpoint ||
          "/api/generate"
        )}"
      >

    </div>


    <div class="field">

      <label>
        AI model
      </label>

      <input
        id="prefModel"
        value="${esc(
          prefs.model ||
          ""
        )}"
      >

    </div>


    <div class="field">

      <label>

        <input
          id="prefFallback"
          type="checkbox"
          ${prefs.fallback?"checked":""}
        >

        Use local demo fallback
        if AI is unavailable

      </label>

    </div>


    <div class="notice">

      Keep API keys on the server,
      never in browser JavaScript.

    </div>


    <div class="actions">

      <button
        class="primary"
        id="savePrefs"
      >
        Save settings
      </button>


      <button
        class="danger"
        id="resetDB"
      >
        Reset demo data
      </button>

    </div>

  `;


  modal.classList.remove(
    "hidden"
  );


  document.getElementById(
    "savePrefs"
  ).onclick=()=>{

    prefs.endpoint=
      document.getElementById(
        "prefEndpoint"
      ).value.trim() ||
      "/api/generate";


    prefs.model=
      document.getElementById(
        "prefModel"
      ).value.trim();


    prefs.fallback=
      document.getElementById(
        "prefFallback"
      ).checked;


    savePrefs();


    modal.classList.add(
      "hidden"
    );

  };


  document.getElementById(
    "resetDB"
  ).onclick=()=>{

    if(
      confirm(
        "Reset all Wikifreedia data in this browser?"
      )
    ){

      db={
        articles:
          seed.map(
            a=>({...a})
          ),
        drafts:[]
      };


      saveDB();


      modal.classList.add(
        "hidden"
      );


      render();

    }

  };
}


document.getElementById(
  "searchForm"
).onsubmit=e=>{

  e.preventDefault();

  const q=
    document
      .getElementById(
        "searchInput"
      )
      .value
      .trim();


  if(q){
    search(q);
  }

};


document.getElementById(
  "settingsSide"
).onclick=
  settingsModal;


document.getElementById(
  "settingsTop"
).onclick=
  settingsModal;


document.getElementById(
  "closeModal"
).onclick=()=>{

  document
    .getElementById(
      "modal"
    )
    .classList.add(
      "hidden"
    );

};


document.getElementById(
  "modal"
).onclick=e=>{

  if(
    e.target.id==="modal"
  ){

    e.currentTarget
      .classList.add(
        "hidden"
      );

  }

};


document.getElementById(
  "mobileMenu"
).onclick=()=>{

  document
    .getElementById(
      "sidebar"
    )
    .classList.toggle(
      "open"
    );

};


document.getElementById(
  "desktopMenu"
).onclick=()=>{

  document
    .getElementById(
      "sidebar"
    )
    .classList.toggle(
      "open"
    );

};


document.getElementById(
  "mobileSearch"
).onclick=()=>{

  document
    .getElementById(
      "searchInput"
    )
    .focus();

};


window.addEventListener(
  "hashchange",
  ()=>{

    activeTab=
      "read";


    document
      .getElementById(
        "sidebar"
      )
      .classList.remove(
        "open"
      );


    render();

  }
);


render();
