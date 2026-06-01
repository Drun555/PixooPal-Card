class PixooPalCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.entryId = config.entry_id || "";
    this.refreshInterval = Number(config.refresh_interval || 15);
    this.buttonState = {};
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
  }

  set hass(hass) {
    const nextStateSignature = this.stateSignature(hass);
    const stateChanged =
      this._stateSignature !== undefined && this._stateSignature !== nextStateSignature;

    this._hass = hass;
    this._stateSignature = nextStateSignature;

    if (this.config && !this.clockfaces && !this.loading) {
      this.load();
    } else if (this.config && stateChanged) {
      this.scheduleLoad(250);
    }
  }

  getCardSize() {
    return 4;
  }

  get basePath() {
    return `/api/pixoopal/${this.entryId}`;
  }

  async load() {
    if (!this._hass) {
      return;
    }

    window.clearTimeout(this.loadTimer);
    this.loading = true;
    this.error = "";
    try {
      await this.resolveEntryId();
      const response = await this._hass.fetchWithAuth(`${this.basePath}/api/v1/clockfaces`);
      if (!response.ok) {
        throw new Error(`PixooPal returned HTTP ${response.status}`);
      }
      this.clockfaces = await response.json();
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Unable to load PixooPal";
    }
    this.loading = false;
    this.render();
  }

  scheduleLoad(delay) {
    if (this.loading) {
      return;
    }

    window.clearTimeout(this.loadTimer);
    this.loadTimer = window.setTimeout(() => this.load(), delay);
  }

  connectedCallback() {
    this.startPolling();
  }

  disconnectedCallback() {
    window.clearTimeout(this.loadTimer);
    window.clearInterval(this.pollTimer);
  }

  startPolling() {
    window.clearInterval(this.pollTimer);
    if (this.refreshInterval <= 0) {
      return;
    }

    this.pollTimer = window.setInterval(() => this.scheduleLoad(0), this.refreshInterval * 1000);
  }

  stateSignature(hass) {
    const states = Object.values(hass?.states || {})
      .filter((state) => state.entity_id.startsWith("select.") && state.attributes?.device_class !== "diagnostic")
      .map((state) => `${state.entity_id}:${state.state}`)
      .join("|");

    return states;
  }

  async resolveEntryId() {
    if (this.entryId) {
      return;
    }

    const response = await this._hass.fetchWithAuth("/api/pixoopal/entries");
    if (!response.ok) {
      throw new Error(`PixooPal entries returned HTTP ${response.status}`);
    }

    const body = await response.json();
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (entries.length === 1) {
      this.entryId = entries[0].entry_id;
      return;
    }

    if (entries.length === 0) {
      throw new Error("No PixooPal integration entry found.");
    }

    throw new Error("Multiple PixooPal entries found. Set entry_id in the card config.");
  }

  activeClockface() {
    return this.clockfaces?.active || this.clockfaces?.clockface || null;
  }

  inputRows() {
    const rows = this.activeClockface()?.inputs || [];
    return rows
      .map((row) => (Array.isArray(row) ? row : [row]))
      .map((row) => row.filter((input) => input.isSetting !== true))
      .filter((row) => row.length > 0);
  }

  valueFor(input) {
    return this.activeClockface()?.data?.[input.id] || "";
  }

  async submitInput(input, value) {
    this.buttonState[input.id] = "busy";
    this.render();

    try {
      let response;
      if (value instanceof File) {
        const form = new FormData();
        form.set("inputId", input.id);
        form.set("value", value);
        response = await this._hass.fetchWithAuth(`${this.basePath}/api/v1/clockfaces/input`, {
          method: "POST",
          body: form,
        });
      } else {
        response = await this._hass.fetchWithAuth(`${this.basePath}/api/v1/clockfaces/input`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ inputId: input.id, value: String(value ?? "") }),
        });
      }

      if (!response.ok) {
        throw new Error(`PixooPal returned HTTP ${response.status}`);
      }

      this.buttonState[input.id] = "sent";
      this.clockfaces = await response.json();
      window.setTimeout(() => {
        if (this.buttonState[input.id] === "sent") {
          delete this.buttonState[input.id];
          this.render();
        }
      }, 900);
    } catch (err) {
      this.buttonState[input.id] = "error";
      this.error = err instanceof Error ? err.message : "Unable to submit PixooPal input";
    }
    this.render();
  }

  renderInput(input) {
    const state = this.buttonState[input.id];
    const disabled = state === "busy";
    const value = this.valueFor(input);

    if (input.type === "button") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `submit ${state === "error" ? "error" : ""}`;
      button.textContent = state === "error" ? "Error" : input.friendlyName;
      button.disabled = disabled;
      button.addEventListener("click", () => this.submitInput(input, value));
      return button;
    }

    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = input.friendlyName;
    label.append(span);

    if (input.type === "select") {
      const select = document.createElement("select");
      select.disabled = disabled;
      for (const option of input.options || []) {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        item.selected = option.value === value;
        select.append(item);
      }
      select.addEventListener("change", () => this.submitInput(input, select.value));
      label.append(select);
      return label;
    }

    const field = document.createElement("input");
    field.disabled = disabled;
    field.type =
      input.type === "colorpicker" ? "color" : input.type === "input-num" ? "number" : input.type === "input-file" ? "file" : "text";

    if (input.type === "input-file") {
      const wrapper = document.createElement("div");
      const trigger = document.createElement("span");
      const filename = document.createElement("span");

      wrapper.className = "file-picker";
      trigger.className = "file-trigger";
      filename.className = "file-name";
      trigger.textContent = "Choose file";
      filename.textContent = "No file selected";

      if (input.accept) {
        field.accept = input.accept;
      }
      field.addEventListener("change", () => {
        const file = field.files?.[0];
        if (file) {
          filename.textContent = file.name;
          this.submitInput(input, file);
        }
      });
      wrapper.append(field, trigger, filename);
      label.append(wrapper);
      return label;
    } else {
      field.value = value;
      if (input.min !== undefined) field.min = input.min;
      if (input.max !== undefined) field.max = input.max;
      if (input.step !== undefined) field.step = input.step;
      field.addEventListener("change", () => this.submitInput(input, field.value));
    }

    label.append(field);
    return label;
  }

  render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { padding: 0 16px 16px; }
        .rows { display: grid; gap: 12px; }
        .row { display: grid; gap: 10px; align-items: end; }
        label { display: grid; gap: 6px; min-width: 0; color: var(--secondary-text-color); font-size: .86rem; font-weight: 600; }
        input, select, button.submit { width: 100%; min-height: 40px; box-sizing: border-box; border-radius: 6px; font: inherit; }
        input, select { border: 1px solid var(--divider-color); padding: 0 10px; color: var(--primary-text-color); background: var(--card-background-color); }
        input[type="color"] { padding: 3px; }
        .file-picker { position: relative; display: grid; grid-template-columns: max-content minmax(0, 1fr); align-items: center; gap: 10px; min-height: 40px; box-sizing: border-box; border: 1px solid var(--divider-color); border-radius: 6px; padding: 4px; background: var(--card-background-color); overflow: hidden; }
        .file-picker input[type="file"] { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .file-trigger { display: inline-grid; min-height: 32px; align-items: center; border-radius: 5px; padding: 0 12px; color: var(--text-primary-color); background: var(--primary-color); font-weight: 600; pointer-events: none; }
        .file-name { min-width: 0; overflow: hidden; color: var(--primary-text-color); text-overflow: ellipsis; white-space: nowrap; pointer-events: none; }
        .submit { border: 0; padding: 0 12px; color: var(--text-primary-color); background: var(--primary-color); cursor: pointer; font-weight: 600; }
        .submit.error { background: var(--error-color); }
        .error-text { color: var(--error-color); margin-top: 12px; }
        .empty { color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <div class="rows"></div>
        ${this.error ? `<div class="error-text">${this.escape(this.error)}</div>` : ""}
      </ha-card>
    `;

    const container = this.shadowRoot.querySelector(".rows");
    const rows = this.inputRows();

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = this.error ? "" : "No visible inputs for the active clockface.";
      container.append(empty);
      return;
    }

    for (const row of rows) {
      const item = document.createElement("div");
      item.className = "row";
      item.style.gridTemplateColumns = `repeat(${row.length}, minmax(0, 1fr))`;
      for (const input of row) {
        item.append(this.renderInput(input));
      }
      container.append(item);
    }
  }

  escape(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }
}

customElements.define("pixoopal-card", PixooPalCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "pixoopal-card",
  name: "PixooPal Card",
  description: "Render PixooPal clockface inputs.",
});
