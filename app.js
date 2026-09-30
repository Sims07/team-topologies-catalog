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

  if (id === "stream-aligned-team") return svg(`${text(38,18,"Flux de valeur","caption")}${teamNode(96,42,168,46,"Stream-aligned","team","stream")}${teamFlow(78,65,112,65)}${teamFlow(248,65,282,65)}${text(42,86,"besoin","label")}${text(318,86,"valeur livrée","label")}${text(180,119,"responsabilité de bout en bout","caption")}`, "Stream-aligned Team");
  if (id === "enabling-team") return svg(`${teamNode(42,25,56,82,"Enabling","team","enabling")}${teamFlow(98,66,150,66,true)}${teamNode(140,47,160,46,"Stream-aligned","team","stream")}${text(124,49,"aide ciblée","caption")}${text(124,94,"puis retrait","caption")}${text(180,119,"transfert de compétence vers l’équipe de flux","caption")}`, "Enabling Team");
  if (id === "complicated-subsystem-team") return svg(`${teamNode(8,48,112,42,"Stream-aligned","team","stream")}${teamFlow(120,69,135,69)}${teamNode(135,30,92,78,"Complicated","subsystem","complicated")}${teamFlow(227,68,260,68)}${text(304,58,"capacité","label")}${text(304,73,"spécialisée","label")}${text(180,119,"expertise complexe encapsulée","caption")}`, "Complicated Subsystem Team");
  if (id === "platform-team") return svg(`${teamNode(8,50,112,42,"Stream-aligned","team","stream")}${teamFlow(120,71,130,71)}${teamNode(130,47,150,48,"Platform","team","platform")}${teamFlow(280,71,292,71)}${text(304,59,"self-service","label")}${text(304,74,"capacité","label")}${text(180,119,"réduit la complexité pour les équipes clientes","caption")}`, "Platform Team");
  if (id === "collaboration") return svg(`${interactionOverlap(125,34,235,"collaboration",sid)}${text(180,89,"Collaboration","mini-title")}${text(180,112,"travail étroit · exploration · durée limitée","caption")}`, "Collaboration");
  if (id === "x-as-a-service") return svg(`<circle cx="105" cy="58" r="38" class="interaction-a"/><circle cx="255" cy="58" r="38" class="interaction-b"/><path d="M150 45 C158 45 158 45 158 58 C158 71 158 71 150 71" class="service-bracket"/><path d="M210 45 C202 45 202 45 202 58 C202 71 202 71 210 71" class="service-bracket"/>${text(180,92,"X-as-a-Service","mini-title")}${text(180,114,"interface claire · faible coordination directe","caption")}`, "X-as-a-Service");
  if (id === "facilitating") return svg(`${interactionOverlap(125,34,235,"facilitating",sid)}${text(180,89,"Facilitating","mini-title")}${text(180,112,"apprentissage · transfert de compétence","caption")}`, "Facilitating");
  if (id === "cognitive-load") return svg(`${teamNode(8,38,92,54,"Stream-aligned","team","stream")}${teamFlow(100,65,132,65)}${teamNode(124,18,108,28,"Platform","réduit","platform")}${teamNode(132,50,72,30,"Enabling","apprend","enabling")}${teamNode(132,82,72,30,"Subsystem","encapsule","complicated")}${teamFlow(204,33,254,33)}${teamFlow(204,65,254,65)}${teamFlow(204,97,254,97)}${text(302,58,"charge","label")}${text(302,73,"cognitive","label")}${text(180,119,"réduire, redistribuer ou encapsuler la charge","caption")}`, "Cognitive Load");
  if (id === "team-api") return svg(`${teamNode(10,41,92,50,"Stream-aligned","team","stream")}${teamFlow(102,66,132,66)}<rect x="132" y="20" width="218" height="90" rx="8" class="boundary"/>${text(241,38,"Team API","mini-title")}${text(164,60,"Code","label")}${text(211,60,"Docs","label")}${text(260,60,"Onboarding","label")}${text(319,60,"Interactions","label")}${text(241,90,"tout ce qui permet à une autre équipe de consommer la capacité","caption")}`, "Team API");
  if (id === "team-sized-architecture") return svg(`<rect x="92" y="20" width="176" height="88" rx="10" class="boundary"/>${text(180,36,"Frontière du système","caption")}${teamNode(116,49,128,44,"Stream-aligned","responsabilité","stream")}${text(180,122,"frontière compatible avec la capacité de l’équipe","caption")}`, "Team-sized Architecture");
  if (id === "conways-law") return svg(`${text(82,18,"Organisation","caption")}${teamNode(18,28,62,34,"A","team","stream")}${teamNode(92,28,62,34,"B","team","stream")}${teamNode(55,78,62,34,"C","team","stream")}${teamFlow(80,45,92,45)}${teamFlow(122,62,86,78,true)}${text(276,18,"Système","caption")}<rect x="210" y="27" width="66" height="36" rx="5" class="module"/><rect x="286" y="27" width="66" height="36" rx="5" class="module"/><rect x="248" y="77" width="66" height="36" rx="5" class="module"/>${text(243,50,"A","label")}${text(319,50,"B","label")}${text(281,100,"C","label")}${teamFlow(276,45,286,45)}${teamFlow(319,63,282,77,true)}${text(180,123,"les structures de communication influencent les structures du système","caption")}`, "Conway’s Law");
  if (id === "topology-evolution") return svg(`${teamNode(8,43,92,50,"Stream-aligned","aujourd’hui","stream")}${teamFlow(100,68,139,68)}${text(180,55,"friction","mini-title")}${text(180,76,"signal","caption")}${teamFlow(221,68,260,68)}${teamNode(260,43,92,50,"Stream-aligned","évolution","stream")}${text(180,18,"évolution continue des topologies","caption")}${text(180,119,"responsabilités, équipes et interactions peuvent changer","caption")}`, "Evolution des topologies");
  if (id === "architecture-starting-point") return svg(`${teamNode(8,42,92,52,"Stream-aligned","capacité + charge","stream")}${teamFlow(100,68,136,68)}${box(136,34,88,68,"Frontières","responsabilités","accent")}${teamFlow(224,68,262,68)}${box(262,42,90,52,"Architecture","module / service")}${text(180,18,"raisonner des équipes vers le système","caption")}${text(180,119,"plutôt que choisir d’abord une technologie","caption")}`, "Partir des équipes");
  if (id === "scenario-modular-monolith") return svg(`${teamNode(8,45,88,48,"Stream-aligned","équipes","stream")}${teamFlow(96,69,132,69)}${box(132,34,96,70,"Modulithe","frontières logiques","accent")}${teamFlow(228,69,264,69)}${box(264,45,88,48,"Services","si justifié")}${text(180,18,"distribution progressive","caption")}${text(180,119,"les frontières logiques précèdent les frontières de déploiement","caption")}`, "Modulithe et évolution progressive");
  if (id === "scenario-platform") return svg(`${teamNode(8,28,76,42,"Stream-aligned","A","stream")}${teamNode(8,79,76,42,"Stream-aligned","B","stream")}${teamFlow(84,49,128,60)}${teamFlow(84,100,128,80)}${teamNode(128,34,96,70,"Platform","team","platform")}${teamFlow(224,69,272,69)}${text(312,62,"self-","label")}${text(312,76,"service","label")}${text(180,18,"une capacité commune devient un produit interne","caption")}`, "Introduire une Platform Team");
  if (id === "scenario-enabling") return svg(`${teamNode(8,45,94,48,"Stream-aligned","team","stream")}${teamFlow(102,69,150,69,true)}${teamNode(150,35,62,78,"Enabling","team","enabling")}${teamFlow(212,69,270,69,true)}${teamNode(270,45,82,48,"Stream-aligned","autonome","stream")}${text(180,18,"compétence manquante → compétence intégrée","caption")}${text(180,119,"l’aide diminue lorsque l’autonomie augmente","caption")}`, "Combler un manque de compétence");
  return svg(`${teamNode(24,43,90,48,"Stream-aligned","contexte","stream")}${teamFlow(114,67,154,67)}${box(154,35,72,64,"Décision","évolution","accent")}${teamFlow(226,67,266,67)}${box(266,43,70,48,"Cible","topologie")}`, "Concept");
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
