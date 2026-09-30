let items = [], active = "all";
const labels = {
  all: "All",
  "team-type": "Team Types",
  interaction: "Interaction Modes",
  "cognitive-load": "Cognitive Load",
  architecture: "Architecture",
  evolution: "Evolution",
  scenario: "Scenarios"
};

const $ = (s) => document.querySelector(s);

async function init() {
  const r = await fetch("data/catalog.json");
  const d = await r.json();
  items = [...d.concepts, ...d.scenarios];
  drawFilters();
  render();
}

function drawFilters() {
  const cats = ["all", ...new Set(items.map((x) => x.category))];
  $("#filters").innerHTML = cats.map((c) =>
    `<button class="filter ${c === active ? "active" : ""}" data-cat="${c}">${labels[c] || c}</button>`
  ).join("");

  document.querySelectorAll("[data-cat]").forEach((b) => {
    b.onclick = () => {
      active = b.dataset.cat;
      drawFilters();
      render();
    };
  });
}

function render() {
  const q = $("#search").value.toLowerCase().trim();
  const list = items.filter((x) =>
    (active === "all" || x.category === active) &&
    JSON.stringify(x).toLowerCase().includes(q)
  );

  $("#count").textContent = `${list.length} fiches`;
  $("#cards").innerHTML = list.map(card).join("");

  document.querySelectorAll(".card").forEach((c) => {
    c.onclick = () => open(c.dataset.id);
    c.querySelector("[data-open]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      open(c.dataset.id);
    });
    c.querySelector("[data-copy]")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await copyMarkdown(c.dataset.id, e.currentTarget);
    });
  });
}

function card(x) {
  return `<article class="card" data-id="${x.id}">
    <div class="card-diagram">${diagram(x)}</div>
    <div class="card-body">
      <span class="badge">${labels[x.category] || x.category}</span>
      <h2>${x.name}</h2>
      <p class="summary">${x.summary}</p>
      <div class="box">
        <b>Problème</b><span>${x.problem}</span>
      </div>
      <div class="box solution">
        <b>Solution</b><span>${x.solution}</span>
      </div>
      <div class="tags">${(x.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="card-footer">
        <button type="button" class="card-action" data-copy>▧ Copier MD</button>
        <button type="button" class="card-action" data-open>Voir la fiche ↗</button>
      </div>
    </div>
  </article>`;
}

function svg(body, extra = "") {
  const sid = safeId(extra);
  return `<svg viewBox="0 0 360 145" role="img" aria-label="Schéma ${extra}">
    <defs>
      <marker id="arr-${sid}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M0,0 L7,3.5 L0,7 Z" class="arrow"/>
      </marker>
      <pattern id="hatch-${sid}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" class="hatch-line"/>
      </pattern>
      <pattern id="dots-${sid}" width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="3.5" cy="3.5" r="1.7" class="dot"/>
      </pattern>
    </defs>
    ${body.replaceAll('url(#arr)', `url(#arr-${sid})`)}
  </svg>`;
}

function safeId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function teamNode(x, y, w, h, title, subtitle = "", type = "stream") {
  const cx = x + w / 2;
  const cy = y + h / 2;
  let shape = "";
  if (type === "enabling") {
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="tt-team enabling"/>`;
  } else if (type === "complicated") {
    const c = Math.min(13, Math.max(8, Math.min(w, h) * 0.16));
    shape = `<polygon points="${x+c},${y} ${x+w-c},${y} ${x+w},${y+c} ${x+w},${y+h-c} ${x+w-c},${y+h} ${x+c},${y+h} ${x},${y+h-c} ${x},${y+c}" class="tt-team complicated"/>`;
  } else if (type === "platform") {
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="tt-team platform"/>`;
  } else {
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="tt-team stream"/>`;
  }
  return `${shape}
    <text x="${cx}" y="${cy - (subtitle ? 5 : 1)}" text-anchor="middle" class="tt-title">${title}</text>
    ${subtitle ? `<text x="${cx}" y="${cy + 12}" text-anchor="middle" class="tt-subtitle">${subtitle}</text>` : ""}`;
}

function teamFlow(x1, y1, x2, y2, dashed = false) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="wire ${dashed ? "dashed" : ""}" marker-end="url(#arr)"/>`;
}

function line(x1, y1, x2, y2, dashed = false) {
  return teamFlow(x1, y1, x2, y2, dashed);
}

function text(x, y, s, cls = "label") {
  return `<text x="${x}" y="${y}" text-anchor="middle" class="${cls}">${s}</text>`;
}

function interactionOverlap(x1, y, x2, mode, sid) {
  const cy = y + 30;
  const r = 38;
  const overlapX = (x1 + x2) / 2;
  const pattern = mode === "collaboration" ? `url(#hatch-${sid})` : `url(#dots-${sid})`;
  return `<circle cx="${x1}" cy="${cy}" r="${r}" class="interaction-a"/>
    <circle cx="${x2}" cy="${cy}" r="${r}" class="interaction-b"/>
    <ellipse cx="${overlapX}" cy="${cy}" rx="17" ry="38" class="interaction-overlap" fill="${pattern}"/>`;
}

// Shared visual vocabulary follows the Team Topologies book:
// yellow stream-aligned, purple enabling, orange complicated-subsystem,
// blue platform; interaction modes use the book's overlap/service notation.
function diagram(x) {
  const id = x.id;
  const sid = safeId(id);
  const flow = (a,b,c,d,dashed=false) => teamFlow(a,b,c,d,dashed);

  if (id === "stream-aligned-team") return svg(
    `${text(28,17,"Flux de valeur","caption")}${text(331,17,"Résultat","caption")}
     ${flow(45,67,96,67)}${teamNode(96,43,168,48,"Stream-aligned","team","stream")}${flow(264,67,315,67)}
     ${text(54,86,"besoin","label")}${text(306,86,"valeur livrée","label")}
     ${text(180,120,"responsabilité de bout en bout sur un flux","caption")}`, "Stream-aligned Team");

  if (id === "platform-team") return svg(
    `${teamNode(8,25,92,40,"Stream-aligned","A","stream")}${teamNode(8,82,92,40,"Stream-aligned","B","stream")}
     ${flow(100,45,132,61)}${flow(100,102,132,81)}
     ${teamNode(132,45,96,60,"Platform","team","platform")}
     ${flow(228,61,280,45)}${flow(228,89,280,102)}
     ${text(316,48,"self-service","label")}${text(316,63,"capacité","label")}
     ${text(180,18,"une capacité commune devient un produit interne","caption")}`, "Platform Team");

  if (id === "enabling-team") return svg(
    `${teamNode(8,49,116,42,"Stream-aligned","équipe cible","stream")}${flow(124,70,154,70,true)}
     ${teamNode(154,27,62,86,"Enabling","team","enabling")}${flow(216,70,248,70,true)}
     ${teamNode(248,49,104,42,"Stream-aligned","autonomie","stream")}
     ${text(139,48,"apprentissage","caption")}${text(139,91,"aide ciblée","caption")}
     ${text(180,122,"l’aide disparaît lorsque la capacité est acquise","caption")}`, "Enabling Team");

  if (id === "complicated-subsystem-team") return svg(
    `${teamNode(8,49,108,42,"Stream-aligned","équipe de flux","stream")}${flow(116,70,138,70)}
     ${teamNode(138,29,88,82,"Complicated","subsystem","complicated")}${flow(226,70,254,70)}
     ${text(304,58,"capacité","label")}${text(304,73,"spécialisée","label")}
     ${text(180,122,"expertise rare encapsulée derrière une frontière claire","caption")}`, "Complicated Subsystem Team");

  if (id === "collaboration") return svg(
    `${interactionOverlap(125,29,235,"collaboration",sid)}
     ${text(180,88,"Collaboration","mini-title")}
     ${text(180,110,"explorer · apprendre · construire ensemble","caption")}
     ${text(180,126,"forte intensité, généralement temporaire","caption")}`, "Collaboration");

  if (id === "x-as-a-service") return svg(
    `<circle cx="105" cy="60" r="38" class="interaction-a"/><circle cx="255" cy="60" r="38" class="interaction-b"/>
     <path d="M150 47 C158 47 158 47 158 60 C158 73 158 73 150 73" class="service-bracket"/>
     <path d="M210 47 C202 47 202 47 202 60 C202 73 202 73 210 73" class="service-bracket"/>
     ${text(180,94,"X-as-a-Service","mini-title")}${text(180,113,"fournisseur → interface → consommateur","caption")}${text(180,128,"peu de coordination directe","caption")}`, "X-as-a-Service");

  if (id === "facilitating") return svg(
    `${interactionOverlap(125,29,235,"facilitating",sid)}
     ${text(180,88,"Facilitating","mini-title")}
     ${text(180,110,"mentoring · coaching · pairing","caption")}
     ${text(180,126,"transfert de compétence vers l’équipe aidée","caption")}`, "Facilitating");

  if (id === "cognitive-load") return svg(
    `${teamNode(8,47,104,46,"Stream-aligned","responsabilité","stream")}
     ${flow(112,70,140,70)}
     ${conceptNode(140,23,76,30,"Platform","réduire")}${conceptNode(140,55,76,30,"Enabling","transférer")}${conceptNode(140,87,76,30,"Subsystem","encapsuler")}
     ${flow(216,38,255,38)}${flow(216,70,255,70)}${flow(216,102,255,102)}
     ${text(300,61,"charge","label")}${text(300,76,"cognitive","label")}
     ${text(180,122,"réduire ce que l’équipe doit comprendre et maintenir","caption")}`, "Cognitive Load");

  if (id === "team-api") return svg(
    `${teamNode(8,47,104,46,"Stream-aligned","équipe","stream")}${flow(112,70,132,70)}
     <rect x="132" y="20" width="220" height="100" rx="8" class="boundary"/>
     ${text(242,38,"Team API","mini-title")}
     ${apiPill(154,51,"Code / service")}${apiPill(224,51,"Docs")}${apiPill(278,51,"Onboarding")}
     ${apiPill(154,80,"Interactions")}${apiPill(224,80,"Standards")}${apiPill(278,80,"Support")}
     ${text(242,112,"tout ce qui rend l’équipe consommable","caption")}`, "Team API");

  if (id === "team-sized-architecture") return svg(
    `<rect x="86" y="22" width="188" height="88" rx="10" class="boundary"/>
     ${text(180,38,"Frontière technique","caption")}
     ${teamNode(108,53,144,42,"Stream-aligned","périmètre soutenable","stream")}
     ${text(180,124,"une équipe doit pouvoir comprendre et faire évoluer son périmètre","caption")}`, "Team-sized Architecture");

  if (id === "conways-law") return svg(
    `${text(73,17,"Communication","caption")}${teamNode(12,30,58,34,"A","équipe","stream")}${teamNode(82,30,58,34,"B","équipe","stream")}${teamNode(47,80,58,34,"C","équipe","stream")}
     ${flow(70,47,82,47)}${flow(111,64,83,80,true)}
     ${text(286,17,"Architecture","caption")}${moduleNode(206,29,"A")}${moduleNode(282,29,"B")}${moduleNode(244,79,"C")}
     ${flow(264,46,282,46)}${flow(320,64,278,79,true)}
     ${text(180,122,"les structures de communication influencent les frontières du système","caption")}`, "Conway’s Law");

  if (id === "topology-evolution") return svg(
    `${teamNode(8,48,82,42,"Stream-aligned","état 1","stream")}${flow(90,69,126,69)}
     ${interactionState(126,51,"Collaboration",sid)}${flow(202,69,236,69)}
     ${teamNode(236,48,82,42,"Stream-aligned","état 2","stream")}
     ${text(164,38,"signal de friction","caption")}${text(180,119,"les modes d’interaction et responsabilités évoluent avec le contexte","caption")}`, "Evolution des topologies");

  if (id === "architecture-starting-point") return svg(
    `${teamNode(8,48,96,44,"Stream-aligned","capacité + charge","stream")}${flow(104,70,132,70)}
     ${conceptNode(132,47,76,46,"Frontières","responsabilités")}${flow(208,70,236,70)}
     ${conceptNode(236,47,104,46,"Architecture","modules / services")}
     ${text(180,20,"partir des équipes","mini-title")}${text(180,122,"puis choisir une forme technique compatible avec leur capacité","caption")}`, "Partir des équipes");

  if (id === "scenario-modular-monolith") return svg(
    `${teamNode(8,49,88,42,"Stream-aligned","A + B","stream")}${flow(96,70,128,70)}
     ${conceptNode(128,43,96,54,"Modulithe","frontières logiques")}${flow(224,70,258,70)}
     ${conceptNode(258,49,94,42,"Services","si justifié")}
     ${text(180,19,"frontières logiques → frontières de déploiement","caption")}${text(180,122,"distribuer seulement lorsque les équipes et responsabilités le justifient","caption")}`, "Modulithe et évolution progressive");

  if (id === "scenario-platform") return svg(
    `${teamNode(8,24,86,38,"Stream-aligned","A","stream")}${teamNode(8,79,86,38,"Stream-aligned","B","stream")}
     ${flow(94,43,126,59)}${flow(94,98,126,80)}${teamNode(126,43,98,62,"Platform","team","platform")}
     ${flow(224,74,264,74)}${text(302,66,"self-service","label")}${text(302,81,"capacité","label")}
     ${text(180,18,"une capacité répétée devient un produit interne","caption")}`, "Introduire une Platform Team");

  if (id === "scenario-enabling") return svg(
    `${teamNode(8,49,92,42,"Stream-aligned","avant","stream")}${flow(100,70,142,70,true)}
     ${teamNode(142,31,62,78,"Enabling","team","enabling")}${flow(204,70,246,70,true)}
     ${teamNode(246,49,106,42,"Stream-aligned","après","stream")}
     ${text(121,45,"manque","caption")}${text(121,91,"compétence","caption")}${text(180,122,"la capacité est intégrée dans l’équipe de flux","caption")}`, "Combler un manque de compétence");

  return svg(`${teamNode(24,49,90,42,"Stream-aligned","contexte","stream")}${flow(114,70,154,70)}${conceptNode(154,47,72,46,"Décision","évolution")}${flow(226,70,266,70)}${conceptNode(266,49,70,42,"Cible","topologie")}`, "Concept");
}

function conceptNode(x,y,w,h,title,sub) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" class="concept-node"/><text x="${x+w/2}" y="${y+h/2-3}" text-anchor="middle" class="mini-title">${title}</text><text x="${x+w/2}" y="${y+h/2+11}" text-anchor="middle" class="label">${sub}</text>`;
}
function apiPill(x,y,label) {
  return `<rect x="${x}" y="${y}" width="58" height="20" rx="5" class="api-pill"/><text x="${x+29}" y="${y+13}" text-anchor="middle" class="label">${label}</text>`;
}
function moduleNode(x,y,label) {
  return `<rect x="${x}" y="${y}" width="58" height="34" rx="5" class="module"/><text x="${x+29}" y="${y+21}" text-anchor="middle" class="label">${label}</text>`;
}
function interactionState(x,y,label,sid) {
  const fill = `url(#hatch-${sid})`;
  return `<rect x="${x}" y="${y}" width="76" height="36" rx="18" class="interaction-state" fill="${fill}"/><text x="${x+38}" y="${y+22}" text-anchor="middle" class="label">${label}</text>`;
}
function box(x, y, w, h, title, sub, kind = "team") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" class="node ${kind}"/>
    <text x="${x + w / 2}" y="${y + h / 2 - 5}" text-anchor="middle" class="mini-title">${title}</text>
    ${sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 11}" text-anchor="middle" class="label">${sub}</text>` : ""}`;
}
function relatedMarkup(x) {
  if (!x.related?.length) return "<p class=\"empty-related\">Aucun concept lié.</p>";
  return `<div class="related">${x.related.map((r) => {
    const y = items.find((i) => i.id === r);
    return y ? `<button type="button" class="related-link" data-related="${y.id}">${y.name}</button>` : "";
  }).join("")}</div>`;
}

function tagsMarkup(x) {
  return `<div class="tags detail-tags">${(x.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>`;
}

function open(id) {
  const x = items.find((i) => i.id === id);
  if (!x) return;

  const html = `
    <div class="detail-diagram">${diagram(x)}</div>
    <div class="detail-heading">
      <span class="badge">${labels[x.category] || x.category}</span>
      <h1>${x.name}</h1>
      <p class="detail-summary">${x.summary}</p>
    </div>
    <div class="detail-boxes">
      <div class="box"><b>Problème</b><span>${x.problem}</span></div>
      <div class="box solution"><b>Solution</b><span>${x.solution}</span></div>
    </div>
    ${tagsMarkup(x)}
    <section class="detail-section">
      <h3>Concepts liés</h3>
      ${relatedMarkup(x)}
    </section>
    <section class="detail-section">
      <h3>Contenu détaillé</h3>
      <p>${x.details}</p>
      ${x.questions?.length ? `<h4>Questions à se poser</h4><ul>${x.questions.map((q) => `<li>${q}</li>`).join("")}</ul>` : ""}
    </section>
    <div class="detail-actions">
      <button type="button" class="primary-action" data-modal-copy>▧ Copier en Markdown</button>
    </div>`;

  $("#modal-content").innerHTML = html;
  $("#modal").classList.add("open");
  $("#modal").setAttribute("aria-hidden", "false");

  document.querySelectorAll("[data-related]").forEach((b) => {
    b.onclick = () => open(b.dataset.related);
  });
  $("[data-modal-copy]").onclick = (e) => copyMarkdown(x.id, e.currentTarget);
}

function markdownFor(x) {
  const related = (x.related || []).map((id) => items.find((y) => y.id === id)?.name).filter(Boolean);
  return `# ${x.name}\n\n${x.summary}\n\n## Problème\n${x.problem}\n\n## Solution\n${x.solution}\n\n## Tags\n${(x.tags || []).join(" ")}\n\n## Concepts liés\n${related.length ? related.map((r) => `- ${r}`).join("\n") : "- Aucun"}\n\n## Contenu détaillé\n${x.details}${x.questions?.length ? `\n\n### Questions à se poser\n${x.questions.map((q) => `- ${q}`).join("\n")}` : ""}\n`;
}

async function copyMarkdown(id, button) {
  const x = items.find((i) => i.id === id);
  if (!x) return;
  try {
    await navigator.clipboard.writeText(markdownFor(x));
    const old = button.textContent;
    button.textContent = "✓ Markdown copié";
    setTimeout(() => { button.textContent = old; }, 1400);
  } catch {
    const area = document.createElement("textarea");
    area.value = markdownFor(x);
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    const old = button.textContent;
    button.textContent = "✓ Markdown copié";
    setTimeout(() => { button.textContent = old; }, 1400);
  }
}

$("#search").addEventListener("input", render);
$("#close").onclick = () => closeModal();
$(".backdrop").onclick = () => closeModal();
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function closeModal() {
  $("#modal").classList.remove("open");
  $("#modal").setAttribute("aria-hidden", "true");
}

init();
