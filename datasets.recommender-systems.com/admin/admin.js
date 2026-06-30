"use strict";

const state = {
  csrfToken: "",
  summary: null,
  logs: [],
  page: 1,
  pageSize: 25,
  totalPages: 1,
  totalLogs: 0,
  charts: {},
  detailModal: null,
};

const palette = ["#3568d4", "#2ca6a4", "#7656c9", "#e69b3a", "#d45b73", "#5c7c91", "#60a36f", "#a76a45"];

document.addEventListener("DOMContentLoaded", async () => {
  state.detailModal = new bootstrap.Modal(document.getElementById("log-detail-modal"));
  bindEvents();
  await refreshAll();
});

function bindEvents() {
  document.getElementById("refresh-button").addEventListener("click", refreshAll);
  document.getElementById("log-filters").addEventListener("submit", async (event) => {
    event.preventDefault();
    state.page = 1;
    await loadLogs();
  });
  document.getElementById("reset-filters").addEventListener("click", async () => {
    document.getElementById("log-filters").reset();
    state.page = 1;
    await loadLogs();
  });
  document.getElementById("page-size").addEventListener("change", async (event) => {
    state.pageSize = Number(event.target.value);
    state.page = 1;
    await loadLogs();
  });
  document.getElementById("previous-page").addEventListener("click", async () => {
    if (state.page > 1) {
      state.page--;
      await loadLogs();
    }
  });
  document.getElementById("next-page").addEventListener("click", async () => {
    if (state.page < state.totalPages) {
      state.page++;
      await loadLogs();
    }
  });
  document.getElementById("delete-all-button").addEventListener("click", deleteAllLogs);
  document.getElementById("logs-body").addEventListener("click", async (event) => {
    const detailsButton = event.target.closest("[data-details-id]");
    const deleteButton = event.target.closest("[data-delete-id]");
    if (detailsButton) showLogDetails(Number(detailsButton.dataset.detailsId));
    if (deleteButton) await deleteLog(Number(deleteButton.dataset.deleteId));
  });
}

async function refreshAll() {
  setLoading(true);
  clearError();
  try {
    await loadSummary();
    await loadLogs();
    document.getElementById("last-updated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  let data;
  try {
    data = await response.json();
  } catch (_error) {
    throw new Error(`The server returned an invalid response (${response.status}).`);
  }
  if (!response.ok || !data.isSuccess) {
    throw new Error(data.error || data.message || `Request failed (${response.status}).`);
  }
  return data.data ?? data;
}

async function loadSummary() {
  const data = await fetchJson("./api.php?action=summary");
  state.summary = data;
  state.csrfToken = data.csrfToken;
  renderDashboard(data);
  populateFilterOptions(data);
  document.getElementById("log-count-badge").textContent = formatNumber(data.kpis.totalUses);
}

function renderDashboard(data) {
  renderKpis(data.kpis);
  renderChart("activity", "activity-chart", "line", data.activity, {
    label: "Requests",
    borderColor: palette[0],
    backgroundColor: "rgba(53, 104, 212, 0.12)",
    fill: true,
    tension: 0.32,
  });
  renderChart("methods", "methods-chart", "doughnut", data.methods, doughnutOptions("Requests"));
  renderChart("metrics", "metrics-chart", "bar", data.metrics, barOptions("Requests", palette[2]));
  renderChart("hourly", "hourly-chart", "bar", data.hourly, barOptions("Requests", palette[1]));
  renderChart("weekdays", "weekday-chart", "bar", data.weekdays, barOptions("Requests", palette[3]));
  renderChart("results", "results-chart", "bar", data.resultDistribution, barOptions("Requests", palette[4]));
  renderChart("kValues", "k-values-chart", "bar", data.kValues, barOptions("Requests", palette[5]));

  renderRanking("top-seeds", data.topSeedDatasets);
  renderRanking("top-filtered", data.topFilteredDatasets);
  renderRanking("top-recommended", data.topRecommendedDatasets);
  renderRanking("filter-usage", data.filterUsage);
  renderRanking("feedback-types", data.feedbackTypes);
  renderResultSummary(data.kpis);
}

function renderKpis(kpis) {
  const change = kpis.sevenDayChangePercent;
  const changeText = change === null
    ? "No prior-week baseline"
    : `${change >= 0 ? "+" : ""}${formatNumber(change)}% vs previous 7 days`;
  const cards = [
    ["Total uses", kpis.totalUses, "All recorded requests", "fa-chart-simple", "#eaf0ff", "#3568d4"],
    ["Today", kpis.todayUses, "Requests since midnight", "fa-calendar-day", "#e5f7f3", "#208b79"],
    ["Last 7 days", kpis.last7Days, changeText, "fa-arrow-trend-up", "#f0ebff", "#7656c9"],
    ["Last 30 days", kpis.last30Days, "Recent request volume", "fa-calendar", "#fff3df", "#b97716"],
    ["Total results", kpis.totalResults, "Recommendations returned", "fa-layer-group", "#fdecef", "#c74761"],
    ["Average results", kpis.averageResults, `Median ${formatNumber(kpis.medianResults)}`, "fa-scale-balanced", "#eaf3f7", "#477387"],
    ["Average seeds", kpis.averageSeeds, "Seed datasets per request", "fa-seedling", "#edf7ed", "#4a8a56"],
    ["Average candidates", kpis.averageCandidates, `Avg. recommendations ${formatNumber(kpis.averageRecommendations)}`, "fa-filter", "#f8eee8", "#9a633f"],
  ];
  document.getElementById("kpi-grid").innerHTML = cards.map(([label, value, note, icon, tint, color]) => `
    <article class="kpi-card" style="--kpi-tint:${tint};--kpi-color:${color}">
      <div class="kpi-top"><span>${escapeHtml(label)}</span><span class="kpi-icon"><i class="fa-solid ${icon}"></i></span></div>
      <div class="kpi-value">${formatNumber(value)}</div>
      <div class="kpi-note">${escapeHtml(note)}</div>
    </article>`).join("");
}

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { padding: 10, displayColors: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#788397", maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: { beginAtZero: true, grid: { color: "#edf0f5" }, ticks: { precision: 0, color: "#788397" } },
    },
  };
}

function barOptions(label, color) {
  return {
    label,
    backgroundColor: color,
    borderRadius: 5,
    maxBarThickness: 36,
  };
}

function doughnutOptions(label) {
  return {
    label,
    backgroundColor: palette,
    borderColor: "#ffffff",
    borderWidth: 3,
    hoverOffset: 5,
  };
}

function renderChart(key, canvasId, type, items, datasetOptions) {
  if (state.charts[key]) state.charts[key].destroy();
  const labels = items.map((item) => item.label);
  const values = items.map((item) => item.count);
  const options = baseChartOptions();
  if (type === "doughnut") {
    delete options.scales;
    options.cutout = "67%";
    options.plugins.legend = { display: true, position: "bottom", labels: { boxWidth: 10, usePointStyle: true, padding: 14 } };
  }
  state.charts[key] = new Chart(document.getElementById(canvasId), {
    type,
    data: { labels, datasets: [{ data: values, ...datasetOptions }] },
    options,
  });
}

function renderRanking(elementId, items) {
  const element = document.getElementById(elementId);
  if (!items.length) {
    element.innerHTML = '<div class="empty-state">No data available yet.</div>';
    return;
  }
  element.innerHTML = items.map((item, index) => `
    <div class="ranking-row" title="${escapeHtml(item.label)}">
      <span class="ranking-label">${index + 1}. ${escapeHtml(humanize(item.label))}</span>
      <span class="ranking-value">${formatNumber(item.count)}</span>
    </div>`).join("");
}

function renderResultSummary(kpis) {
  const values = [
    ["Minimum results", kpis.minimumResults],
    ["Maximum results", kpis.maximumResults],
    ["Median results", kpis.medianResults],
    ["Average recommendations", kpis.averageRecommendations],
    ["First recorded use", formatDate(kpis.firstUse)],
    ["Most recent use", formatDate(kpis.lastUse)],
  ];
  document.getElementById("result-summary").innerHTML = values
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(typeof value === "number" ? formatNumber(value) : value))}</dd>`)
    .join("");
}

function populateFilterOptions(data) {
  populateSelect("method-filter", "All methods", data.methods);
  populateSelect("metric-filter", "All metrics", data.metrics);
}

function populateSelect(id, defaultLabel, items) {
  const select = document.getElementById(id);
  const current = select.value;
  select.innerHTML = `<option value="">${defaultLabel}</option>` + items
    .filter((item) => item.label !== "Not specified")
    .map((item) => `<option value="${escapeHtml(item.label)}">${escapeHtml(item.label)} (${formatNumber(item.count)})</option>`)
    .join("");
  select.value = current;
}

function currentLogParams() {
  const [sort, direction] = document.getElementById("sort-filter").value.split(":");
  const params = new URLSearchParams({
    action: "logs",
    page: String(state.page),
    pageSize: String(state.pageSize),
    sort,
    direction,
  });
  const mappings = [
    ["search-filter", "search"], ["from-filter", "from"], ["to-filter", "to"],
    ["method-filter", "method"], ["metric-filter", "metric"],
  ];
  mappings.forEach(([id, key]) => {
    const value = document.getElementById(id).value.trim();
    if (value) params.set(key, value);
  });
  return params;
}

async function loadLogs() {
  const data = await fetchJson(`./api.php?${currentLogParams().toString()}`);
  state.logs = data.logs;
  state.page = data.page;
  state.totalPages = data.totalPages;
  state.totalLogs = data.total;
  state.csrfToken = data.csrfToken;
  renderLogs();
  renderPagination();
}

function renderLogs() {
  const body = document.getElementById("logs-body");
  if (!state.logs.length) {
    body.innerHTML = '<tr><td colspan="7"><div class="empty-state">No usage logs match these filters.</div></td></tr>';
    return;
  }
  body.innerHTML = state.logs.map((log) => {
    const seeds = datasetNames(log.seedDatasets);
    const recommendations = datasetNames(log.recommendedDatasets);
    const config = [
      log.selectionMethod ? `Method: ${log.selectionMethod}` : null,
      log.selectionMetric ? `Metric: ${log.selectionMetric}` : null,
      log.selectionKValue !== null ? `K: ${log.selectionKValue}` : null,
    ].filter(Boolean);
    return `<tr>
      <td class="text-nowrap">${escapeHtml(formatDate(log.createdDate))}<br><small class="text-secondary">#${log.id}</small></td>
      <td><div class="config-stack">${config.length ? config.map((value) => `<span class="config-chip">${escapeHtml(value)}</span>`).join("") : "—"}</div></td>
      <td><span class="dataset-preview" title="${escapeHtml(seeds)}">${escapeHtml(seeds)}</span></td>
      <td>${formatNumber(log.datasetFilter.length)}</td>
      <td><strong>${formatNumber(log.resultCount)}</strong></td>
      <td><span class="dataset-preview" title="${escapeHtml(recommendations)}">${escapeHtml(recommendations)}</span></td>
      <td class="text-nowrap text-end">
        <button class="btn btn-sm btn-outline-primary" type="button" data-details-id="${log.id}" title="View details"><i class="fa-solid fa-eye"></i></button>
        <button class="btn btn-sm btn-outline-danger" type="button" data-delete-id="${log.id}" title="Delete log"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join("");
}

function renderPagination() {
  const start = state.totalLogs ? (state.page - 1) * state.pageSize + 1 : 0;
  const end = Math.min(state.page * state.pageSize, state.totalLogs);
  document.getElementById("logs-result-label").textContent = `${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(state.totalLogs)} entries`;
  document.getElementById("page-label").textContent = `Page ${formatNumber(state.page)} of ${formatNumber(state.totalPages)}`;
  document.getElementById("previous-page").disabled = state.page <= 1;
  document.getElementById("next-page").disabled = state.page >= state.totalPages;
  document.getElementById("delete-all-button").disabled = state.totalLogs === 0;
}

function showLogDetails(id) {
  const log = state.logs.find((item) => item.id === id);
  if (!log) return;
  document.getElementById("log-detail-title").textContent = `Log #${log.id} · ${formatDate(log.createdDate)}`;
  document.getElementById("log-detail-body").innerHTML = `
    <div class="detail-grid">
      <section class="detail-section"><h3>Configuration</h3><dl class="summary-list p-0"><dt>Method</dt><dd>${escapeHtml(log.selectionMethod || "—")}</dd><dt>Metric</dt><dd>${escapeHtml(log.selectionMetric || "—")}</dd><dt>K value</dt><dd>${escapeHtml(log.selectionKValue === null ? "—" : String(log.selectionKValue))}</dd><dt>Result count</dt><dd>${formatNumber(log.resultCount)}</dd></dl></section>
      <section class="detail-section"><h3>Dataset counts</h3><dl class="summary-list p-0"><dt>Seeds</dt><dd>${formatNumber(log.seedDatasets.length)}</dd><dt>Candidates</dt><dd>${formatNumber(log.datasetFilter.length)}</dd><dt>Recommendations</dt><dd>${formatNumber(log.recommendedDatasets.length)}</dd></dl></section>
      <section class="detail-section"><h3>Seed datasets</h3><p>${escapeHtml(datasetNames(log.seedDatasets))}</p></section>
      <section class="detail-section"><h3>Recommended datasets</h3><p>${escapeHtml(datasetNames(log.recommendedDatasets))}</p></section>
      <section class="detail-section detail-section-wide"><h3>Filters</h3><pre>${escapeHtml(JSON.stringify(log.filters, null, 2))}</pre></section>
      <section class="detail-section detail-section-wide"><h3>Candidate dataset IDs</h3><pre>${escapeHtml(JSON.stringify(log.datasetFilter, null, 2))}</pre></section>
    </div>`;
  state.detailModal.show();
}

async function deleteLog(id) {
  if (!window.confirm(`Delete usage log #${id}? This cannot be undone.`)) return;
  await performDelete({ id });
}

async function deleteAllLogs() {
  if (!window.confirm("Delete ALL usage logs? This permanently removes the complete analytics history.")) return;
  const confirmation = window.prompt('Type "DELETE" to confirm:');
  if (confirmation !== "DELETE") return;
  await performDelete({ deleteAll: true });
}

async function performDelete(body) {
  setLoading(true);
  clearError();
  try {
    await fetchJson("./api.php?action=delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": state.csrfToken },
      body: JSON.stringify(body),
    });
    await refreshAll();
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function datasetNames(ids) {
  if (!ids || !ids.length) return "—";
  const names = state.summary?.datasetNames || {};
  return ids.map((id) => names[String(id)] || `Dataset #${id}`).join(", ");
}

function formatDate(value) {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number) : "0";
}

function humanize(value) {
  return String(value)
    .replace(/^Metadata:\s*/, "Metadata: ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setLoading(show) {
  document.getElementById("loading-state").classList.toggle("d-none", !show);
  document.getElementById("refresh-button").disabled = show;
}

function showError(message) {
  const alert = document.getElementById("global-alert");
  alert.textContent = message;
  alert.classList.remove("d-none");
}

function clearError() {
  document.getElementById("global-alert").classList.add("d-none");
}
