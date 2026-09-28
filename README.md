# Team Topologies — Architecture Catalog

Catalogue de référence pour les architectes SI et architectes solutions.

Le contenu reprend les concepts fondamentaux de Team Topologies et les complète avec des explications pratiques pour faciliter leur lecture dans un contexte d’architecture.

## Principes de conception

- Même philosophie d’interface que le EIP Architecture Catalog : barre sombre, filtres en pills, cartes en grille, problème / solution, tags et fiche détaillée.
- Le contenu est un référentiel, pas un outil de modélisation.
- `data/catalog.json` est la source de vérité.
- Aucun backend ni base de données.

## Lancement

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080/`.

## Contenu

- 4 Team Types
- 3 Interaction Modes
- Cognitive Load
- Team API
- Team-sized Architecture
- Conway’s Law
- Evolution des topologies
- Scénarios d’architecture
