(function () {
  const D3_URL = "https://cdn.jsdelivr.net/npm/d3@7";
  let _d3Promise = null;
  function loadD3() {
    if (window.d3) return Promise.resolve(window.d3);
    if (_d3Promise) return _d3Promise;
    _d3Promise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = D3_URL;
      s.onload = () => resolve(window.d3);
      s.onerror = () => reject(new Error("Failed to load D3 from " + D3_URL));
      document.head.appendChild(s);
    });
    return _d3Promise;
  }

  const SAMPLE_DATA = {
    name: "Total",
    value: 1000,
    children: [
      { name: "North America", value: 450, children: [
        { name: "USA", value: 320, children: [
          { name: "California", value: 180 },
          { name: "Texas", value: 140 }
        ]},
        { name: "Canada", value: 130 }
      ]},
      { name: "Europe", value: 350, children: [
        { name: "Germany", value: 200 },
        { name: "France", value: 100 },
        { name: "UK", value: 50 }
      ]},
      { name: "Asia", value: 200 }
    ]
  };

  const NODE_W = 180;
  const NODE_H = 50;
  const ROW_GAP = 10;
  const COL_GAP = 56;
  const MARGIN = { top: 16, right: 16, bottom: 16, left: 16 };
  const ANIM_MS = 250;

  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host { display: block; width: 100%; height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #1d2733; }
      #root { display: flex; flex-direction: column; height: 100%; width: 100%; box-sizing: border-box; background: #fbfcfd; }
      #dim-bar { padding: 8px 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 32px; border-bottom: 1px solid #e5e9ee; box-sizing: border-box; flex-shrink: 0; background: #fff; }
      #dim-bar.hidden { display: none; }
      .dim-bar-label { font-size: 11px; color: #6b7785; font-weight: 500; letter-spacing: 0.02em; }
      .dim-chip { display: inline-flex; align-items: center; padding: 4px 10px; background: #eef4fb; color: #1f558d; border: 1px solid #cfdef0; border-radius: 14px; font-size: 11px; font-weight: 500; cursor: pointer; user-select: none; transition: background 0.15s, box-shadow 0.15s, transform 0.1s; }
      .dim-chip:hover { background: #dfeaf6; box-shadow: 0 1px 3px rgba(31,85,141,0.15); }
      .dim-chip:active { transform: translateY(1px); }
      .dim-chip.disabled { background: #f4f5f7; color: #a8b0bb; border-color: #e2e6ec; text-decoration: line-through; }
      .dim-chip .x { margin-left: 6px; font-weight: 600; opacity: 0.7; }
      #tree-area { flex: 1 1 auto; min-height: 0; overflow: auto; position: relative; scroll-behavior: smooth; padding: 8px 0; box-sizing: border-box; }
      #tree-area::-webkit-scrollbar { width: 10px; height: 10px; }
      #tree-area::-webkit-scrollbar-thumb { background: #d8dde5; border-radius: 5px; }
      #tree-area::-webkit-scrollbar-thumb:hover { background: #b8bfca; }
      svg { display: block; }
      .node-bg { fill: #ffffff; stroke: #d8dde5; stroke-width: 1; }
      .node-accent { fill: transparent; }
      .has-children .node-accent { fill: #4a90d9; }
      .node-group { cursor: pointer; }
      .node-group .node-bg { transition: stroke 0.12s; }
      .node-group:hover .node-bg { stroke: #4a90d9; filter: url(#node-shadow-hover); }
      .on-path .node-bg { stroke: #4a90d9; stroke-width: 1.5; }
      .on-path .node-accent { fill: #2c6cb0; }
      .node-label { font-size: 12px; font-weight: 600; fill: #1d2733; pointer-events: none; letter-spacing: 0.01em; }
      .node-value { font-size: 11px; fill: #6b7785; pointer-events: none; font-variant-numeric: tabular-nums; }
      .toggle-icon { pointer-events: none; }
      .toggle-icon path { fill: none; stroke: #8a96a3; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
      .has-children:hover .toggle-icon path { stroke: #4a90d9; }
      .on-path .toggle-icon path { stroke: #4a90d9; }
      .link { fill: none; stroke: #d2d8e0; stroke-width: 1; transition: stroke 0.12s, stroke-width 0.12s; }
      .link.on-path { stroke: #4a90d9; stroke-width: 1.6; }
      .empty-msg { padding: 20px; font-size: 13px; color: #888; }
      #empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; height: 100%; box-sizing: border-box; }
      #empty-state.hidden { display: none; }
      #empty-state .icon { width: 56px; height: 56px; color: #c8c8c8; margin-bottom: 14px; }
      #empty-state .title { margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #555; }
      #empty-state .msg { margin: 0; font-size: 12px; line-height: 1.5; color: #888; max-width: 320px; }
    </style>
    <div id="root">
      <div id="dim-bar" class="hidden"></div>
      <div id="tree-area">
        <div id="empty-state" class="hidden">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2.5" y="9" width="6" height="6" rx="1"/>
            <rect x="15.5" y="3" width="6" height="6" rx="1"/>
            <rect x="15.5" y="15" width="6" height="6" rx="1"/>
            <path d="M8.5 12 H12 V6 H15.5"/>
            <path d="M12 12 V18 H15.5"/>
          </svg>
          <p class="title"></p>
          <p class="msg"></p>
        </div>
      </div>
    </div>
  `;

  class DecompositionTree extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(template.content.cloneNode(true));
      this._props = {};
      this._scriptData = null;
      this._tree = null;
      this._treeBuiltFromBinding = false;
      this._sourceSig = null;
      this._root = null;
      this._collapsedNodes = new Set();
      this._userExpandedPaths = new Set();
      this._userCollapsedPaths = new Set();
      this._disabledDims = new Set();
      this._isFreshRebuild = false;
      this._hasRendered = false;
      this._svg = null;
      this._gLinks = null;
      this._gNodes = null;
      this._selectedPathSet = new Set();
    }

    onCustomWidgetBeforeUpdate(changed) {
      this._props = { ...this._props, ...changed };
    }

    onCustomWidgetAfterUpdate(changed) {
      console.log("[DecompositionTree] update keys:", Object.keys(changed));
      if ("data" in changed) this._parseScriptData(changed.data);
      this._maybeRebuildTree();
      this._render();
    }

    onCustomWidgetResize() {
      // Container CSS handles sizing; nothing to recompute.
    }

    setData(jsonString) {
      this.dispatchEvent(new CustomEvent("propertiesChanged", {
        detail: { properties: { data: jsonString } }
      }));
    }

    expandAll() {
      this._collapsedNodes.clear();
      this._userExpandedPaths.clear();
      this._userCollapsedPaths.clear();
      if (this._root) {
        this._root.each(n => {
          if (n.children && n.children.length > 0) this._userExpandedPaths.add(this._pathOf(n));
        });
      }
      this._render();
    }

    collapseAll() {
      this._collapsedNodes.clear();
      this._userExpandedPaths.clear();
      this._userCollapsedPaths.clear();
      if (this._root) {
        this._root.each(n => {
          if (n.depth > 0 && n.children && n.children.length > 0) {
            this._collapsedNodes.add(n);
            this._userCollapsedPaths.add(this._pathOf(n));
          }
        });
      }
      this._render();
    }

    _parseScriptData(jsonString) {
      if (!jsonString) { this._scriptData = null; return; }
      try { this._scriptData = JSON.parse(jsonString); }
      catch (e) {
        console.error("DecompositionTree: invalid JSON for setData", e);
        this._scriptData = null;
      }
    }

    _sourceSignature() {
      const topN = Number(this._props.topN);
      const topNSig = isNaN(topN) ? "" : String(topN);
      const disabledSig = Array.from(this._disabledDims).sort().join(",");
      const b = this.treeData;
      if (b && b.data && b.data.length > 0 && b.metadata && b.metadata.feeds) {
        const dimAliases = (b.metadata.feeds.dimensions && b.metadata.feeds.dimensions.values) || [];
        const measureAliases = (b.metadata.feeds.measure && b.metadata.feeds.measure.values) || [];
        const slice = b.data.length > 6 ? b.data.slice(0, 3).concat(b.data.slice(-3)) : b.data;
        return "B|" + topNSig + "|D" + disabledSig + "|" + b.data.length + "|"
          + dimAliases.join(",") + "|" + measureAliases.join(",") + "|" + JSON.stringify(slice);
      }
      if (this._scriptData) return "S|" + JSON.stringify(this._scriptData);
      return "X";
    }

    _maybeRebuildTree() {
      const sig = this._sourceSignature();
      if (sig === this._sourceSig) return;
      this._sourceSig = sig;
      const fromBinding = this._buildTreeFromBinding();
      if (fromBinding) {
        this._tree = fromBinding;
        this._treeBuiltFromBinding = true;
      } else if (this._scriptData) {
        const t = JSON.parse(JSON.stringify(this._scriptData));
        this._sortDesc(t);
        this._tree = t;
        this._treeBuiltFromBinding = false;
      } else {
        // No binding and no script data → empty state
        this._tree = null;
        this._treeBuiltFromBinding = false;
      }
      this._root = null;
      this._collapsedNodes = new Set();
      // _userExpandedPaths and _userCollapsedPaths are intentionally preserved
      this._isFreshRebuild = true;
    }

    _buildTreeFromBinding() {
      const b = this.treeData;
      if (!b || !b.data || !b.metadata || !b.metadata.feeds) return null;
      if (b.data.length === 0) return null;
      const dimsFeed = b.metadata.feeds.dimensions;
      const measureFeed = b.metadata.feeds.measure;
      if (!dimsFeed || !dimsFeed.values || !measureFeed || !measureFeed.values || measureFeed.values.length === 0) return null;

      const allAliases = dimsFeed.values;
      const dimAliases = allAliases.filter(a => !this._disabledDims.has(a));
      const measureKey = measureFeed.values[0];
      const rootLabel = this._props.rootLabel || "Total";

      if (dimAliases.length === 0) {
        let total = 0;
        let unit = null;
        for (const row of b.data) {
          const cell = row[measureKey];
          if (cell) {
            const v = Number(cell.raw) || 0;
            total += v;
            if (cell.unit && !unit) unit = cell.unit;
          }
        }
        return { name: rootLabel, value: total, unit: unit || undefined };
      }

      const root = { name: rootLabel, value: 0, children: [], _childMap: {} };
      let unit = null;

      for (const row of b.data) {
        const cell = row[measureKey];
        const v = cell ? Number(cell.raw) : 0;
        if (isNaN(v)) continue;
        if (cell && cell.unit && !unit) unit = cell.unit;
        let cursor = root;
        cursor.value += v;
        for (const dimKey of dimAliases) {
          const dCell = row[dimKey];
          const label = (dCell && dCell.label) ? dCell.label : "(empty)";
          let child = cursor._childMap[label];
          if (!child) {
            child = { name: label, value: 0, children: [], _childMap: {} };
            cursor._childMap[label] = child;
            cursor.children.push(child);
          }
          child.value += v;
          cursor = child;
        }
      }

      const topN = Number(this._props.topN);
      const useTopN = !isNaN(topN) && topN > 0;
      const finalize = (n) => {
        delete n._childMap;
        if (unit) n.unit = unit;
        if (!n.children || n.children.length === 0) { delete n.children; return; }
        n.children.sort((a, b) => b.value - a.value);
        if (useTopN && n.children.length > topN) {
          const top = n.children.slice(0, topN);
          const rest = n.children.slice(topN);
          top.forEach(finalize);
          const othersValue = rest.reduce((s, c) => s + (Number(c.value) || 0), 0);
          n.children = top.concat([{
            name: "Others (" + rest.length + ")",
            value: othersValue,
            unit: unit || undefined,
            _isOthers: true
          }]);
        } else {
          n.children.forEach(finalize);
        }
      };
      finalize(root);
      return root;
    }

    _sortDesc(node) {
      if (node.children && node.children.length) {
        node.children.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
        node.children.forEach(c => this._sortDesc(c));
      }
    }

    _pathOf(d3node) {
      const parts = [];
      let n = d3node;
      while (n) { parts.unshift(n.data.name); n = n.parent; }
      return parts.join(" › ");
    }

    _pathOfVisible(visNode) {
      const orig = visNode.data && visNode.data.__orig;
      return orig ? this._pathOf(orig) : (visNode.data ? visNode.data.name : "");
    }

    _applyDefaultCollapse() {
      if (!this._root) return;
      const raw = Number(this._props.defaultExpandDepth);
      const useDepth = !isNaN(raw) && raw >= 0;
      this._root.each(n => {
        if (!n.children || n.children.length === 0) return;
        const path = this._pathOf(n);
        if (this._userExpandedPaths.has(path)) {
          this._collapsedNodes.delete(n);
          return;
        }
        if (this._userCollapsedPaths.has(path)) {
          this._collapsedNodes.add(n);
          return;
        }
        if (useDepth && n.depth >= raw) this._collapsedNodes.add(n);
      });
    }

    _renderDimBar() {
      const bar = this._shadow.getElementById("dim-bar");
      bar.innerHTML = "";
      const b = this.treeData;
      if (!b || !b.metadata || !b.metadata.feeds) { bar.classList.add("hidden"); return; }
      const dimsFeed = b.metadata.feeds.dimensions;
      if (!dimsFeed || !dimsFeed.values || dimsFeed.values.length === 0) {
        bar.classList.add("hidden"); return;
      }
      bar.classList.remove("hidden");
      const dimMeta = b.metadata.dimensions || {};
      const label = document.createElement("span");
      label.className = "dim-bar-label";
      label.textContent = "Levels:";
      bar.appendChild(label);

      for (const alias of dimsFeed.values) {
        const friendly = (dimMeta[alias] && dimMeta[alias].description) || alias;
        const disabled = this._disabledDims.has(alias);
        const chip = document.createElement("span");
        chip.className = "dim-chip" + (disabled ? " disabled" : "");
        chip.textContent = friendly;
        if (!disabled) {
          const x = document.createElement("span");
          x.className = "x";
          x.textContent = "×";
          chip.appendChild(x);
        }
        chip.title = disabled ? "Click to add back to tree" : "Click to remove from tree";
        chip.addEventListener("click", () => {
          if (this._disabledDims.has(alias)) this._disabledDims.delete(alias);
          else this._disabledDims.add(alias);
          this._maybeRebuildTree();
          this._render();
        });
        bar.appendChild(chip);
      }
    }

    _ensureSvg(d3) {
      const treeArea = this._shadow.getElementById("tree-area");
      if (this._svg) return;
      this._svg = d3.select(treeArea).append("svg");
      // Defs: drop shadow used on hover
      const defs = this._svg.append("defs");
      const filt = defs.append("filter")
        .attr("id", "node-shadow-hover")
        .attr("x", "-10%").attr("y", "-10%")
        .attr("width", "120%").attr("height", "130%");
      filt.append("feDropShadow")
        .attr("dx", 0).attr("dy", 1).attr("stdDeviation", 1.5)
        .attr("flood-color", "#4a90d9").attr("flood-opacity", "0.18");
      this._gLinks = this._svg.append("g").attr("class", "links");
      this._gNodes = this._svg.append("g").attr("class", "nodes");
    }

    _showEmptyState() {
      // Remove SVG so empty state has the full tree-area to itself.
      if (this._svg) {
        this._svg.remove();
        this._svg = null;
        this._gLinks = null;
        this._gNodes = null;
        this._hasRendered = false;
      }
      const empty = this._shadow.getElementById("empty-state");
      const titleEl = empty.querySelector(".title");
      const msgEl = empty.querySelector(".msg");
      const b = this.treeData;
      const hasBinding = b && b.metadata && b.metadata.feeds &&
        ((b.metadata.feeds.dimensions && b.metadata.feeds.dimensions.values && b.metadata.feeds.dimensions.values.length > 0) ||
         (b.metadata.feeds.measure && b.metadata.feeds.measure.values && b.metadata.feeds.measure.values.length > 0));
      if (hasBinding && b && Array.isArray(b.data) && b.data.length === 0) {
        titleEl.textContent = "No rows returned";
        msgEl.textContent = "The data binding returned no rows. Check story filters and input controls.";
      } else {
        titleEl.textContent = "No data bound";
        msgEl.textContent = "Add a measure and one or more dimensions in the Builder panel to populate the decomposition tree.";
      }
      empty.classList.remove("hidden");
    }

    _hideEmptyState() {
      const empty = this._shadow.getElementById("empty-state");
      if (empty) empty.classList.add("hidden");
    }

    async _render() {
      const d3 = await loadD3();
      this._renderDimBar();

      if (this._sourceSig === null) this._maybeRebuildTree();

      if (!this._tree) {
        this._showEmptyState();
        return;
      }
      this._hideEmptyState();

      if (this._treeBuiltFromBinding && this._tree) {
        const desired = this._props.rootLabel || "Total";
        if (this._tree.name !== desired) this._tree.name = desired;
      }

      if (!this._root) this._root = d3.hierarchy(this._tree);

      if (this._isFreshRebuild) {
        this._applyDefaultCollapse();
        this._isFreshRebuild = false;
      }

      this._ensureSvg(d3);

      // Per-level max for bar scaling
      const maxByDepth = {};
      this._root.each(n => {
        const v = Number(n.data.value) || 0;
        if (maxByDepth[n.depth] == null || v > maxByDepth[n.depth]) maxByDepth[n.depth] = v;
      });

      const visible = this._buildVisible(this._root);
      const visRoot = d3.hierarchy(visible);

      const layout = d3.tree().nodeSize([NODE_H + ROW_GAP, NODE_W + COL_GAP]);
      layout(visRoot);

      let minX = Infinity, maxX = -Infinity, maxY = 0;
      visRoot.each(n => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y > maxY) maxY = n.y;
      });
      const contentW = maxY + NODE_W + MARGIN.left + MARGIN.right;
      const contentH = (maxX - minX) + NODE_H + MARGIN.top + MARGIN.bottom;

      // Natural pixel size — container scrolls if larger than viewport.
      this._svg.attr("width", contentW).attr("height", contentH);
      const groupTransform = `translate(${MARGIN.left},${MARGIN.top - minX})`;
      this._gLinks.attr("transform", groupTransform);
      this._gNodes.attr("transform", groupTransform);

      const dur = this._hasRendered ? ANIM_MS : 0;
      this._hasRendered = true;

      const barColor = this._props.barColor || "#1f77b4";
      const barWidth = (d) => {
        const max = maxByDepth[d.depth] || 0;
        const v = Number(d.data.value) || 0;
        return max > 0 ? (v / max) * (NODE_W - 16) : 0;
      };
      const linkPath = (d) => {
        const sx = d.source.y + NODE_W;
        const sy = d.source.x + NODE_H / 2;
        const tx = d.target.y;
        const ty = d.target.x + NODE_H / 2;
        const mx = (sx + tx) / 2;
        return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
      };

      // -------- LINKS --------
      const linkSel = this._gLinks.selectAll("path.link")
        .data(visRoot.links(), d =>
          this._pathOfVisible(d.source) + "→" + this._pathOfVisible(d.target));

      linkSel.exit()
        .transition().duration(dur).attr("opacity", 0).remove();

      const linkEnter = linkSel.enter()
        .append("path")
        .attr("class", "link")
        .attr("opacity", 0)
        .attr("d", d => linkPath(d));

      linkEnter.merge(linkSel)
        .transition().duration(dur)
        .attr("opacity", 1)
        .attr("d", d => linkPath(d));

      // -------- NODES --------
      const nodeSel = this._gNodes.selectAll("g.node-group")
        .data(visRoot.descendants(), d => this._pathOfVisible(d));

      nodeSel.exit()
        .transition().duration(dur).attr("opacity", 0).remove();

      const nodeEnter = nodeSel.enter()
        .append("g")
        .attr("opacity", 0)
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .on("click", (event, d) => this._onNodeClick(d));

      nodeEnter.append("title");
      nodeEnter.append("rect")
        .attr("class", "node-bg")
        .attr("width", NODE_W).attr("height", NODE_H).attr("rx", 8);
      // Left-edge accent for nodes that have children
      nodeEnter.append("rect")
        .attr("class", "node-accent")
        .attr("x", 0).attr("y", 6)
        .attr("width", 3).attr("height", NODE_H - 12)
        .attr("rx", 1.5);
      nodeEnter.append("rect")
        .attr("class", "bar-bg")
        .attr("x", 12).attr("y", NODE_H - 12)
        .attr("width", NODE_W - 24).attr("height", 6).attr("rx", 3)
        .attr("fill", "#eef0f3");
      nodeEnter.append("rect")
        .attr("class", "bar-fg")
        .attr("x", 12).attr("y", NODE_H - 12)
        .attr("height", 6).attr("rx", 3)
        .attr("width", 0);
      nodeEnter.append("text")
        .attr("class", "node-label").attr("x", 14).attr("y", 19);
      nodeEnter.append("text")
        .attr("class", "node-value").attr("x", 14).attr("y", 33);
      // Animated chevron icon
      const toggleG = nodeEnter.append("g")
        .attr("class", "toggle-icon")
        .attr("transform", `translate(${NODE_W - 16}, ${NODE_H / 2})`);
      toggleG.append("path").attr("d", "M-3,-4 L3,0 L-3,4");

      const allNodes = nodeEnter.merge(nodeSel);

      // Update class (has-children may toggle, on-path may toggle)
      const onPath = (d) => this._selectedPathSet && this._selectedPathSet.has(this._pathOfVisible(d));
      allNodes.attr("class", d =>
        "node-group"
        + (this._hasChildren(d) ? " has-children" : "")
        + (onPath(d) ? " on-path" : ""));
      allNodes.select("title").text(d => this._tooltipText(d));
      allNodes.select(".node-label").text(d => this._truncate(d.data.name, 24));
      allNodes.select(".node-value").text(d => this._formatValue(d.data.value, d.data.unit));

      // Chevron: rotate from 0° (collapsed) to 90° (expanded), hide on leaves
      allNodes.select(".toggle-icon")
        .transition().duration(dur)
        .attr("opacity", d => this._hasChildren(d) ? 1 : 0)
        .attr("transform", d => {
          const rot = (this._hasChildren(d) && !this._isCollapsed(d.data.__orig)) ? 90 : 0;
          return `translate(${NODE_W - 16}, ${NODE_H / 2}) rotate(${rot})`;
        });

      // Animate position + opacity
      allNodes.transition().duration(dur)
        .attr("opacity", 1)
        .attr("transform", d => `translate(${d.y},${d.x})`);

      // Animate bar fill
      allNodes.select(".bar-fg")
        .transition().duration(dur)
        .attr("width", d => barWidth(d))
        .attr("fill", barColor);

      // Apply on-path class to links too
      this._gLinks.selectAll("path.link")
        .classed("on-path", d => onPath(d.target));
    }

    _tooltipText(visNode) {
      const orig = visNode.data.__orig;
      const name = visNode.data.name || "";
      const value = visNode.data.value;
      const unit = visNode.data.unit;
      const total = this._root && this._root.data ? Number(this._root.data.value) || 0 : 0;
      const v = Number(value) || 0;
      const pct = total > 0 ? ((v / total) * 100).toFixed(1) + "%" : "";
      const formatted = this._formatValue(value, unit, true);
      const parent = orig && orig.parent ? orig.parent.data.name : null;
      const lines = [name];
      lines.push("Value: " + formatted + (unit ? " " + unit : ""));
      if (pct) lines.push("Share of total: " + pct);
      if (parent) lines.push("Parent: " + parent);
      return lines.join("\n");
    }

    _buildVisible(node) {
      const out = {
        name: node.data.name,
        value: node.data.value,
        unit: node.data.unit,
        __orig: node
      };
      if (!this._isCollapsed(node) && node.children && node.children.length > 0) {
        out.children = node.children.map(c => this._buildVisible(c));
      }
      return out;
    }

    _hasChildren(visNode) {
      const orig = visNode.data.__orig;
      return !!(orig && orig.children && orig.children.length > 0);
    }

    _isCollapsed(origNode) {
      return this._collapsedNodes.has(origNode);
    }

    _onNodeClick(visNode) {
      const orig = visNode.data.__orig;
      const name = visNode.data.name || "";
      let didToggle = false;
      if (orig && orig.children && orig.children.length > 0) {
        const path = this._pathOf(orig);
        if (this._collapsedNodes.has(orig)) {
          this._collapsedNodes.delete(orig);
          this._userExpandedPaths.add(path);
          this._userCollapsedPaths.delete(path);
        } else {
          this._collapsedNodes.add(orig);
          this._userCollapsedPaths.add(path);
          this._userExpandedPaths.delete(path);
        }
        didToggle = true;
      }
      // Track selected path for highlighting (root → clicked node)
      this._selectedPathSet = new Set();
      let cursor = orig;
      while (cursor) { this._selectedPathSet.add(this._pathOf(cursor)); cursor = cursor.parent; }
      const renderPromise = this._render();
      this.dispatchEvent(new CustomEvent("propertiesChanged", {
        detail: { properties: { lastClickedNode: name } }
      }));
      this.dispatchEvent(new Event("onNodeClick"));

      // After expanding, scroll the clicked node into view so newly revealed children are visible.
      if (didToggle) {
        Promise.resolve(renderPromise).then(() => this._scrollNodeIntoView(visNode));
      }
    }

    _scrollNodeIntoView(visNode) {
      try {
        const treeArea = this._shadow.getElementById("tree-area");
        const path = this._pathOfVisible(visNode);
        const groups = this._gNodes && this._gNodes.node && this._gNodes.node();
        if (!groups) return;
        // Find matching group by re-binding key — simplest: walk descendants.
        const all = groups.querySelectorAll("g");
        let target = null;
        for (const g of all) {
          const t = g.querySelector("title");
          if (t && t.textContent && t.textContent.split("\n")[0] === (visNode.data.name || "")) {
            target = g; break;
          }
        }
        if (!target || !target.getBBox) return;
        const bbox = target.getBoundingClientRect();
        const areaBox = treeArea.getBoundingClientRect();
        // Only scroll if the node sits outside the visible viewport
        if (bbox.right > areaBox.right || bbox.left < areaBox.left ||
            bbox.bottom > areaBox.bottom || bbox.top < areaBox.top) {
          target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
      } catch (e) { /* non-critical */ }
    }

    _formatValue(v, unit, full) {
      if (v == null || v === "" || isNaN(v)) return "";
      const n = Number(v);
      if (full) return n.toLocaleString();
      const mode = (this._props.scaleUnit || "raw").toLowerCase();
      switch (mode) {
        case "thousand": return (n / 1e3).toFixed(1) + "K";
        case "million": return (n / 1e6).toFixed(1) + "M";
        case "billion": return (n / 1e9).toFixed(1) + "B";
        case "auto":
          if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
          if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
          if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
          return n.toLocaleString();
        case "raw":
        default:
          return n.toLocaleString();
      }
    }

    _truncate(s, n) {
      s = String(s == null ? "" : s);
      return s.length > n ? s.slice(0, n - 1) + "…" : s;
    }
  }

  customElements.define("com-example-decomposition-tree", DecompositionTree);
})();
