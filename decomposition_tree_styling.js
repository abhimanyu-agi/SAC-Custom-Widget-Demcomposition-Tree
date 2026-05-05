(function () {
  const template = document.createElement("template");
  template.innerHTML = `
    <style>
      :host { display: block; padding: 12px; font-family: Arial, sans-serif; font-size: 12px; color: #333; }
      fieldset { border: 1px solid #ccc; border-radius: 4px; padding: 10px; margin: 0 0 10px 0; }
      legend { padding: 0 6px; font-weight: bold; color: #444; }
      label { display: block; margin: 6px 0 2px; }
      input[type=color] { width: 60px; height: 26px; padding: 0; border: 1px solid #aaa; vertical-align: middle; }
      input[type=text], input[type=number], select { padding: 4px 6px; border: 1px solid #aaa; border-radius: 3px; vertical-align: middle; }
      .row { margin-bottom: 8px; }
      .hint { color: #888; font-size: 11px; margin-top: 4px; }
    </style>
    <form id="form">
      <fieldset>
        <legend>Appearance</legend>
        <div class="row">
          <label>Bar color</label>
          <input type="color" id="barColor" value="#1f77b4">
          <input type="text" id="barColorText" style="width: 100px; margin-left: 6px;" value="#1f77b4">
        </div>
        <div class="row">
          <label>Root label (used when data binding is active)</label>
          <input type="text" id="rootLabel" style="width: 200px;" value="Total">
        </div>
        <div class="row">
          <label>Value scale</label>
          <select id="scaleUnit" style="width: 220px;">
            <option value="raw">Raw (1,234,567)</option>
            <option value="auto">Auto (K / M / B)</option>
            <option value="thousand">Thousands (K)</option>
            <option value="million">Millions (M)</option>
            <option value="billion">Billions (B)</option>
          </select>
        </div>
      </fieldset>
      <fieldset>
        <legend>Performance</legend>
        <div class="row">
          <label>Top N children per level (0 = no limit)</label>
          <input type="number" id="topN" min="0" step="1" style="width: 80px;" value="10">
          <div class="hint">Remainder is summed into a single "Others (count)" node. Critical for high-cardinality dimensions.</div>
        </div>
        <div class="row">
          <label>Default expand depth on first render</label>
          <input type="number" id="defaultExpandDepth" min="0" step="1" style="width: 80px;" value="1">
          <div class="hint">1 = root + first level visible, deeper levels start collapsed. Users click to drill.</div>
        </div>
      </fieldset>
      <input type="submit" style="display: none;">
    </form>
  `;

  class DecompositionTreeStyling extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: "open" });
      this._shadow.appendChild(template.content.cloneNode(true));

      const form = this._shadow.getElementById("form");
      form.addEventListener("submit", e => { e.preventDefault(); this._submit(); });

      const picker = this._shadow.getElementById("barColor");
      const text = this._shadow.getElementById("barColorText");
      picker.addEventListener("change", () => { text.value = picker.value; this._submit(); });
      text.addEventListener("change", () => {
        if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
        this._submit();
      });

      this._shadow.getElementById("rootLabel").addEventListener("change", () => this._submit());
      this._shadow.getElementById("scaleUnit").addEventListener("change", () => this._submit());
      this._shadow.getElementById("topN").addEventListener("change", () => this._submit());
      this._shadow.getElementById("defaultExpandDepth").addEventListener("change", () => this._submit());
    }

    set barColor(v) {
      if (!v) return;
      const picker = this._shadow.getElementById("barColor");
      const text = this._shadow.getElementById("barColorText");
      text.value = v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) picker.value = v;
    }
    set rootLabel(v) { if (v != null) this._shadow.getElementById("rootLabel").value = v; }
    set scaleUnit(v) { if (v != null) this._shadow.getElementById("scaleUnit").value = v; }
    set topN(v) { if (v != null) this._shadow.getElementById("topN").value = v; }
    set defaultExpandDepth(v) { if (v != null) this._shadow.getElementById("defaultExpandDepth").value = v; }

    _submit() {
      const props = {
        barColor: this._shadow.getElementById("barColorText").value,
        rootLabel: this._shadow.getElementById("rootLabel").value,
        scaleUnit: this._shadow.getElementById("scaleUnit").value,
        topN: parseInt(this._shadow.getElementById("topN").value, 10) || 0,
        defaultExpandDepth: parseInt(this._shadow.getElementById("defaultExpandDepth").value, 10) || 0
      };
      console.log("[DecompositionTreeStyling] dispatch:", props);
      this.dispatchEvent(new CustomEvent("propertiesChanged", {
        detail: { properties: props }
      }));
    }
  }

  customElements.define("com-example-decomposition-tree-styling", DecompositionTreeStyling);
})();
