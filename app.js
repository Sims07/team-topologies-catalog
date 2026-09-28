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
  return `<svg viewBox="0 0 360 130" role="img" aria-label="Schéma ${extra}">
    <defs>
      <marker id="arr-${safeId(extra)}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M0,0 L7,3.5 L0,7 Z" class="arrow"/>
      </marker>
    </defs>
    ${body.replaceAll('url(#arr)', `url(#arr-${safeId(extra)})`)}
  </svg>`;
}

function safeId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function box(x, y, w, h, title, sub, kind = "team") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" class="node ${kind}"/>
    <text x="${x + w / 2}" y="${y + h / 2 - 5}" text-anchor="middle" class="mini-title">${title}</text>
    ${sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 11}" text-anchor="middle" class="label">${sub}</text>` : ""}`;
}

function line(x1, y1, x2, y2, dashed = false) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="wire ${dashed ? "dashed" : ""}" marker-end="url(#arr)"/>`;
}

function text(x, y, s, cls = "label") {
  return `<text x="${x}" y="${y}" text-anchor="middle" class="${cls}">${s}</text>`;
}

// Shared visual vocabulary: teams, system boundaries, value flow and interaction modes.
function diagram(x) {
  const id = x.id;
  if (id === "stream-aligned-team") return svg(`${text(35,18,"Flux de valeur","caption")}${box(8,45,70,48,"Utilisateur","besoin","accent")}${line(78,69,120,69)}${box(120,35,120,68,"Stream-aligned","Team","primary")}${line(240,69,282,69)}${box(282,45,70,48,"Résultat","livré","accent")}${text(180,120,"responsabilité de bout en bout","caption")}`, "Stream-aligned Team");
  if (id === "platform-team") return svg(`${box(8,44,88,48,"Stream-aligned","Team","primary")}${line(96,68,136,68)}${box(136,32,88,72,"Platform","self-service","accent")}${line(224,68,264,68)}${box(264,44,88,48,"Capacité","technique")}${text(180,19,"consommée comme un produit interne","caption")}${text(180,120,"réduit la complexité pour les équipes clientes","caption")}`, "Platform Team");
  if (id === "enabling-team") return svg(`${box(8,45,100,48,"Enabling","Team","accent")}${line(108,68,190,68,true)}${box(190,45,100,48,"Stream-aligned","Team","primary")}${text(149,49,"facilite","caption")}${text(149,93,"compétence → autonomie","caption")}${text(180,120,"interaction ciblée, puis retrait progressif","caption")}`, "Enabling Team");
  if (id === "complicated-subsystem-team") return svg(`${box(8,45,100,48,"Stream-aligned","Team","primary")}${line(108,68,154,68)}${box(154,31,104,74,"Complicated","Subsystem","accent")}${line(258,68,310,68)}${box(310,45,42,48,"API","système")}${text(206,18,"expertise spécialisée encapsulée","caption")}`, "Complicated Subsystem Team");
  if (id === "collaboration") return svg(`${box(18,45,105,48,"Team A","découverte","primary")}${line(123,68,236,68)}${line(236,76,123,76,true)}${box(236,45,105,48,"Team B","découverte","primary")}${text(180,23,"Collaboration","mini-title")}${text(180,119,"travail étroit pendant une période définie","caption")}`, "Collaboration");
  if (id === "x-as-a-service") return svg(`${box(8,45,96,48,"Team cliente","consomme","primary")}${line(104,69,150,69)}${box(150,35,70,68,"Service","interface","accent")}${line(220,69,266,69)}${box(266,45,86,48,"Team","fournit","primary")}${text(180,18,"X-as-a-Service","mini-title")}${text(180,119,"ownership clair · documentation · faible coordination directe","caption")}`, "X-as-a-Service");
  if (id === "facilitating") return svg(`${box(18,45,105,48,"Enabling","facilite","accent")}${line(123,69,237,69,true)}${box(237,45,105,48,"Team","apprend","primary")}${text(180,48,"Facilitating","mini-title")}${text(180,94,"transfert de compétence","caption")}${text(180,119,"l’équipe aidée conserve la responsabilité","caption")}`, "Facilitating");
  if (id === "cognitive-load") return svg(`${box(10,34,105,64,"Team","capacité cognitive","primary")}${text(62,49,"Charge intrinsèque")}${text(62,64,"Charge extrinsèque")}${text(62,79,"Connaissance domaine")}${line(115,66,154,66)}${box(154,22,76,28,"Platform","réduit","accent")}${box(154,54,76,28,"Enabling","apprend","accent")}${box(154,86,76,28,"Subsystem","encapsule","accent")}${line(230,36,278,36)}${line(230,68,278,68)}${line(230,100,278,100)}${box(278,45,74,48,"Flow","soutenable")}${text(180,17,"réduire, redistribuer ou encapsuler la charge","caption")}`, "Cognitive Load");
  if (id === "team-api") return svg(`${box(12,40,86,50,"Team","capabilities","primary")}${line(98,65,134,65)}<rect x="134" y="20" width="218" height="90" rx="8" class="boundary"/>${text(243,38,"Team API","mini-title")}${text(174,60,"Code","label")}${text(218,60,"Docs","label")}${text(260,60,"Onboarding","label")}${text(315,60,"Interactions","label")}${text(243,90,"tout ce qui permet à une autre équipe de consommer la capacité","caption")}`, "Team API");
  if (id === "team-sized-architecture") return svg(`<rect x="92" y="20" width="176" height="88" rx="10" class="boundary"/>${text(180,36,"Frontière du système","caption")}${box(116,50,128,42,"Une équipe","responsabilité","primary")}${text(180,122,"frontière compatible avec la capacité de l’équipe","caption")}`, "Team-sized Architecture");
  if (id === "conways-law") return svg(`${text(86,18,"Organisation","caption")}${box(18,30,62,34,"A","équipe","primary")}${box(92,30,62,34,"B","équipe","primary")}${box(55,79,62,34,"C","équipe","primary")}${line(80,47,92,47)}${line(122,64,86,79,true)}${text(274,18,"Système","caption")}${box(212,30,62,34,"A","module")}${box(286,30,62,34,"B","module")}${box(249,79,62,34,"C","module")}${line(274,47,286,47)}${line(316,64,280,79,true)}${text(180,123,"les structures de communication influencent les structures du système","caption")}`, "Conway’s Law");
  if (id === "topology-evolution") return svg(`${box(8,45,92,48,"État actuel","topologie","primary")}${line(100,69,139,69)}${box(139,37,82,64,"Signal","friction","accent")}${line(221,69,260,69)}${box(260,45,92,48,"État suivant","topologie","primary")}${text(180,18,"évolution continue","mini-title")}${text(180,119,"responsabilités, équipes ou interactions peuvent changer","caption")}`, "Evolution des topologies");
  if (id === "architecture-starting-point") return svg(`${box(8,42,90,52,"Équipes","capacité + charge","primary")}${line(98,68,136,68)}${box(136,34,88,68,"Frontières","responsabilités","accent")}${line(224,68,262,68)}${box(262,42,90,52,"Architecture","module / service")}${text(180,18,"raisonner des équipes vers le système","caption")}${text(180,119,"plutôt que choisir d’abord une technologie","caption")}`, "Partir des équipes");
  if (id === "scenario-modular-monolith") return svg(`${box(8,45,88,48,"Équipes","peu nombreuses","primary")}${line(96,69,132,69)}${box(132,34,96,70,"Modulithe","frontières logiques","accent")}${line(228,69,264,69)}${box(264,45,88,48,"Services","si justifié")}${text(180,18,"distribution progressive","caption")}${text(180,119,"les frontières logiques précèdent les frontières de déploiement","caption")}`, "Modulithe et évolution progressive");
  if (id === "scenario-platform") return svg(`${box(8,42,76,52,"Équipe A","flux","primary")}${box(8,94,76,28,"Équipe B","flux","primary")}${line(84,68,128,68)}${line(84,108,128,80)}${box(128,34,96,70,"Platform","produit interne","accent")}${line(224,68,272,68)}${box(272,45,80,48,"Self-service","capacité")}${text(180,18,"une capacité commune devient un produit interne","caption")}`, "Introduire une Platform Team");
  if (id === "scenario-enabling") return svg(`${box(8,45,94,48,"Team","responsable","primary")}${line(102,69,150,69,true)}${box(150,36,72,66,"Enabling","accompagne","accent")}${line(222,69,270,69,true)}${box(270,45,82,48,"Team","autonome","primary")}${text(180,18,"compétence manquante → compétence intégrée","caption")}${text(180,119,"l’aide diminue lorsque l’autonomie augmente","caption")}`, "Combler un manque de compétence");
  return svg(`${box(24,43,90,48,"Contexte","situation","primary")}${line(114,67,154,67)}${box(154,35,72,64,"Décision","évolution","accent")}${line(226,67,266,67)}${box(266,43,70,48,"Cible","topologie")}`, "Concept");
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
