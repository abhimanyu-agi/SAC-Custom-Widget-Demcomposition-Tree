# SAC Decomposition Tree

A custom widget for **SAP Analytics Cloud** that renders a left-to-right hierarchical
decomposition tree, the way Power BI does — labeled nodes, a horizontal value bar per node,
expand/collapse on click, and a Top-N + "Others" rollup so high-cardinality dimensions
don't melt your browser.

Built with **D3.js**, three small JavaScript files, and one JSON manifest. No build step.

---

## Features

- **SAC data binding** — drag dimensions + a measure into the auto-generated Builder panel.
  No code needed for designers.
- **Top-N + Others** per level — keeps the tree fast when a dimension has thousands of
  distinct values.
- **Default-collapse depth** — tree starts focused; users click to drill.
- **Smooth animations** — 250 ms enter/exit/update transitions on every interaction.
- **Selected-path highlight** — clicking a node lights up root → that node so users
  always know where they are.
- **Dimension chips bar** — toggle bound dimensions on/off at runtime without re-binding.
- **State preservation across filters** — when linked-analysis or input controls refilter
  the data, your expand/collapse state survives.
- **Configurable value formatting** — Raw / Auto (K, M, B) / Thousands / Millions / Billions.
- **Hover tooltip** — full value, % of total, parent, unit.
- **Empty state** — clear message when no data is bound (no misleading sample data).
- **Script API** — `setData`, `setBarColor`, `expandAll`, `collapseAll`, plus `onNodeClick`
  event.

---

## Quick start

### 1. Files in this folder

```
decomposition_tree.json        widget manifest (uploaded directly)
decomposition_tree.js          main Web Component
decomposition_tree_styling.js  Styling panel
icon.png                       16×16 PNG shown in the widget picker
```

### 2. Build the resource ZIP

```bash
zip widget.zip decomposition_tree.js decomposition_tree_styling.js icon.png
```

The ZIP must have **no parent folder** and **no `__MACOSX/`** entries (Mac's right-click
"Compress" creates these — use `zip` from the terminal instead).

### 3. Upload to SAC

1. Open SAC → **Stories** (or **Analytic Applications**) → **Custom Widgets** tab.
2. Click **+ Create**, browse to `decomposition_tree.json`, click **Create**.
3. When the **Select File** button appears, upload `widget.zip`.

That's it. The widget shows up under **Custom Widgets** and can be dropped on any story canvas.

### 4. Bind data

Drop the widget on a canvas. In the **Builder** tab on the right:

1. Set the model.
2. Drag one or more **dimensions** into the *Dimensions* feed (outer → inner).
3. Drag a **measure** into the *Measure* feed.

The tree populates with your data, sorted descending by measure at every level.

---

## Configuration (Styling tab)

| Setting | Default | What it does |
|---|---|---|
| **Bar color** | `#1f77b4` | Color of the value bar inside each node. |
| **Root label** | `Total` | Name shown on the synthetic root node when data is bound. |
| **Value scale** | `Raw` | `Raw` (1,234,567) · `Auto` (K/M/B) · `Thousands` · `Millions` · `Billions` |
| **Top N children per level** | `10` | Children beyond N at each level fold into one "Others (count)" node. `0` disables. |
| **Default expand depth** | `1` | Levels visible on first render. `0` = root only. |

Tooltip always shows the full raw value regardless of scale.

---

## Script API

```javascript
DecompositionTree_1.setData(jsonString)   // override binding with literal JSON
DecompositionTree_1.setBarColor("#d62728")
DecompositionTree_1.expandAll()
DecompositionTree_1.collapseAll()

// Read after onNodeClick fires:
var name = DecompositionTree_1.lastClickedNode;
```

`setData` accepts a hierarchical JSON string of shape:

```json
{
  "name": "Total",
  "value": 1000,
  "children": [
    { "name": "Region A", "value": 600, "children": [
      { "name": "City 1", "value": 400 },
      { "name": "City 2", "value": 200 }
    ]},
    { "name": "Region B", "value": 400 }
  ]
}
```

---

## Data binding shape (under the hood)

The widget defines one binding `treeData` with two feeds:

- `dimensions` — type `dimension`, multiple values allowed, ordered outer → inner.
- `measure` — type `mainStructureMember`, single value.

Result rows are folded into a hierarchy by grouping on each dimension in order, summing
the measure on intermediate nodes. Children are sorted descending by value at every level.

---

## Local development

The `url` fields in the JSON use `/`-prefixed paths so the same JSON works for ZIP upload
to SAC. To self-host instead:

1. Serve this directory over HTTPS, e.g. `npx http-server -S -C cert.pem -K key.pem -p 8443`.
2. Edit `decomposition_tree.json` and replace each `"url"` with the absolute URL,
   e.g. `https://localhost:8443/decomposition_tree.js`.
3. Upload only the JSON to SAC — no ZIP needed.

For changes to take effect, you may need to delete and recreate the widget in SAC,
since the resource ZIP is cached.

---

## Known limitations

- **Browsers**: Chrome and Edge ≥ 79 only (SAC custom widget restriction).
- **Data binding** in Analytics Designer works only in optimized view mode.
- **D3 from CDN** (`cdn.jsdelivr.net`) — if your tenant blocks this, inline D3 into
  `decomposition_tree.js` or self-host.
- **Story filters** don't apply to custom widgets at design time (SDK p. 8).
- **Universal account models** aren't supported with data binding.
- **High row count**: even with `topN`, rendering remains client-side. Use story
  filters or input controls to keep result-set size manageable.

---

## File reference

| File | Purpose |
|---|---|
| `decomposition_tree.json` | Widget manifest — properties, methods, events, data binding. |
| `decomposition_tree.js` | Main Web Component — D3 layout, transitions, click handling. |
| `decomposition_tree_styling.js` | Styling panel — color, scale, top-N, expand depth. |
| `icon.png` | 16×16 PNG used in the widget picker. |
| `widget.zip` | Build output — uploaded as the resource bundle. |
| `CustomWidgetDevGuide_en.pdf` | Reference: SAC Custom Widget Developer Guide. |

---

## Roadmap

- Linked analysis as the *source* — clicking a node filters other widgets.
- Drag-to-reorder dimensions in the chip bar.
- Search/jump within the tree.
- Multi-measure (primary + secondary bar).
- Color modes: by depth / by share-of-parent heatmap.
- Right-click context menu (drill-through, copy, filter).
- Export current view via `serializeCustomWidgetToImage`.
- Bookmark support.

---

## License & credits

- Visualization: [D3.js v7](https://d3js.org/), MIT licensed.
- SAC Custom Widget framework: SAP — see `CustomWidgetDevGuide_en.pdf`.
- This widget: yours to use and modify.
