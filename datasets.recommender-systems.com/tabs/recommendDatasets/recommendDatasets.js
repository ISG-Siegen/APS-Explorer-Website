import { ApiService } from "../../apiService.js";
import { copyToClipboard, getQueryString, versionNumber } from "../../main.js";
import { selectDatasetSet } from "./datasetSetSelection.js";

var datasets = [];

var selectedDatasets = [];
var requiredDatasetIds = [];
var recommendedDatasetIds = [];
var finalDatasetIds = [];

var datasetFilterCheckboxes = [];

var datasetFilterHeaderElement = null;
var datasetFilterArea = null;
var requiredFilterHeaderElement = null;
var requiredFilterArea = null;
var requiredChipsElement = null;
var requiredInputElement = null;
var requiredSuggestionsElement = null;

var selectAllDatasetArea = null;
var selectAllDatasetButton = null;
var selectAllDatasetButtonText = null;

var targetCountElement = null;
var feedbackTypeElement = null;

var generateButtonElement = null;
var openApsButtonElement = null;
var shareButtonElement = null;
var statusElement = null;
var loadingElement = null;
var resultsSummaryElement = null;
var resultsListElement = null;
var resultsHeadElement = null;
var resultsEmptyElement = null;
var resultsTableElement = null;
var resultColumnOptionsElement = null;
var resultSortStatusElement = null;
var exportButtonElement = null;
var apsPreviewCanvasElement = null;
var apsPreviewEmptyElement = null;
var apsPreviewMetaElement = null;
var apsPreviewNoteElement = null;
var apsZoomOutButtonElement = null;
var apsZoomInButtonElement = null;
var apsResetButtonElement = null;
var apsApplyRangeButtonElement = null;
var apsXMinInputElement = null;
var apsXMaxInputElement = null;
var apsYMinInputElement = null;
var apsYMaxInputElement = null;

var methodSelectElement = null;
var metricSelectElement = null;
var kValueSelectElement = null;

var interactionsBounds = {
  min: null,
  max: null,
};

var __allAlgorithms = null;
var __performanceResults = null;

var kValueKeyMap = { "1": "one", "3": "three", "5": "five", "10": "ten", "20": "twenty" };
var resultTablePreferenceKey = "finally.recommendation-table.v1";
var defaultResultColumnKeys = ["feedback", "interactions", "users", "items", "density", "ratio"];
var visibleResultColumnKeys = defaultResultColumnKeys.slice();
var resultOrderIds = [];
var resultSortKey = null;
var resultSortDirection = null;
var draggedResultId = null;
var lastRecommendationPoolIds = [];
var apsPreviewChart = null;
var apsPreviewRequestId = 0;
var apsPreviewPoints = [];
var apsPreviewDefaultBounds = null;
var apsPreviewIsFitted = true;
var apsPreviewResizeTimer = null;
var apsPreviewResizeHandler = null;

var activeFilters = {
  feedbackType: "all",
  minInteractions: null,
  maxInteractions: null,
  metadataRanges: {},
};

function formatNumber(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString();
}

function formatDensity(d) {
  if (d == null || !Number.isFinite(Number(d))) return "—";
  return (Number(d) * 100).toFixed(1) + "%";
}

function formatRatio(r) {
  if (r == null || !Number.isFinite(Number(r))) return "—";
  return Number(r).toFixed(1);
}

var resultColumnDefinitions = [
  { key: "name", label: "Dataset", fixed: true, value: function (dataset) { return dataset.name || ""; } },
  { key: "status", label: "Status", fixed: true, value: function (dataset) { return requiredDatasetIds.includes(dataset.id) ? "Required" : "Recommended"; } },
  { key: "feedback", label: "Feedback Type", value: function (dataset) { return dataset.feedbackType || "\u2014"; } },
  { key: "interactions", label: "Interactions", numeric: true, value: function (dataset) { return formatNumber(dataset.numberOfInteractions); }, raw: function (dataset) { return Number(dataset.numberOfInteractions); } },
  { key: "users", label: "Users", numeric: true, value: function (dataset) { return formatNumber(dataset.numberOfUsers); }, raw: function (dataset) { return Number(dataset.numberOfUsers); } },
  { key: "items", label: "Items", numeric: true, value: function (dataset) { return formatNumber(dataset.numberOfItems); }, raw: function (dataset) { return Number(dataset.numberOfItems); } },
  { key: "density", label: "Density", numeric: true, value: function (dataset) { return formatDensity(dataset.density); }, raw: function (dataset) { return Number(dataset.density); } },
  { key: "ratio", label: "User-Item Ratio", numeric: true, value: function (dataset) { return formatRatio(dataset.userItemRatio); }, raw: function (dataset) { return Number(dataset.userItemRatio); } },
  { key: "maxUser", label: "Max Ratings / User", numeric: true, value: function (dataset) { return formatNumber(dataset.highestNumberOfRatingBySingleUser); }, raw: function (dataset) { return Number(dataset.highestNumberOfRatingBySingleUser); } },
  { key: "minUser", label: "Min Ratings / User", numeric: true, value: function (dataset) { return formatNumber(dataset.lowestNumberOfRatingBySingleUser); }, raw: function (dataset) { return Number(dataset.lowestNumberOfRatingBySingleUser); } },
  { key: "maxItem", label: "Max Ratings / Item", numeric: true, value: function (dataset) { return formatNumber(dataset.highestNumberOfRatingOnSingleItem); }, raw: function (dataset) { return Number(dataset.highestNumberOfRatingOnSingleItem); } },
  { key: "minItem", label: "Min Ratings / Item", numeric: true, value: function (dataset) { return formatNumber(dataset.lowestNumberOfRatingOnSingleItem); }, raw: function (dataset) { return Number(dataset.lowestNumberOfRatingOnSingleItem); } },
  { key: "meanUser", label: "Mean Ratings / User", numeric: true, value: function (dataset) { return formatNumber(dataset.meanNumberOfRatingsByUser); }, raw: function (dataset) { return Number(dataset.meanNumberOfRatingsByUser); } },
  { key: "meanItem", label: "Mean Ratings / Item", numeric: true, value: function (dataset) { return formatNumber(dataset.meanNumberOfRatingsOnItem); }, raw: function (dataset) { return Number(dataset.meanNumberOfRatingsOnItem); } },
];

function getDatasetMetaParts(dataset) {
  var parts = [];
  if (dataset.feedbackType) {
    parts.push({ label: "Feedback", value: dataset.feedbackType });
  }
  if (dataset.numberOfInteractions != null) {
    parts.push({ label: "Interactions", value: formatNumber(dataset.numberOfInteractions) });
  }
  if (dataset.numberOfUsers != null) {
    parts.push({ label: "Users", value: formatNumber(dataset.numberOfUsers) });
  }
  if (dataset.numberOfItems != null) {
    parts.push({ label: "Items", value: formatNumber(dataset.numberOfItems) });
  }
  if (dataset.density != null) {
    parts.push({ label: "Density", value: formatDensity(dataset.density) });
  }
  if (dataset.userItemRatio != null) {
    parts.push({ label: "Ratio", value: formatRatio(dataset.userItemRatio) });
  }
  return parts;
}

function getFinalDatasets() {
  return finalDatasetIds
    .map(function (id) { return datasets.find(function (d) { return d.id === id; }); })
    .filter(function (d) { return !!d; });
}

function getSelectedOptionText(element, fallback) {
  if (!element || element.selectedIndex < 0) return fallback;
  return element.options[element.selectedIndex]?.text || fallback;
}

function getExportFilterDetails() {
  var details = [];
  var interactionIsDefault = interactionsBounds.min !== null && interactionsBounds.max !== null
    && activeFilters.minInteractions === interactionsBounds.min
    && activeFilters.maxInteractions === interactionsBounds.max;
  details.push({
    label: "Feedback Type",
    value: activeFilters.feedbackType === "all" ? "All" : activeFilters.feedbackType,
    active: activeFilters.feedbackType !== "all",
  });
  details.push({
    label: "Interactions",
    value: formatNumber(activeFilters.minInteractions) + " to " + formatNumber(activeFilters.maxInteractions),
    active: !interactionIsDefault,
  });

  var labels = {
    numberOfUsers: "Users",
    numberOfItems: "Items",
    userItemRatio: "User-Item Ratio",
    density: "Density",
    highestNumberOfRatingBySingleUser: "Max Ratings / User",
    lowestNumberOfRatingBySingleUser: "Min Ratings / User",
    highestNumberOfRatingOnSingleItem: "Max Ratings / Item",
    lowestNumberOfRatingOnSingleItem: "Min Ratings / Item",
    meanNumberOfRatingsByUser: "Mean Ratings / User",
    meanNumberOfRatingsOnItem: "Mean Ratings / Item",
  };

  metadataRangeFields.forEach(function (field) {
    var range = activeFilters.metadataRanges[field.key];
    var bounds = metadataRangeBounds[field.key];
    if (!range || !bounds) return;
    details.push({
      label: labels[field.key] || field.key,
      value: field.format(range.min) + " to " + field.format(range.max),
      active: !isDefaultMetadataRange(field.key, range),
    });
  });
  return details;
}

function buildExportReport() {
  readActiveFiltersFromUi();
  var rows = getConfiguredFinalDatasets();
  var columns = getVisibleResultColumns();
  var poolIds = lastRecommendationPoolIds.length > 0
    ? lastRecommendationPoolIds.slice()
    : getCandidatePool().map(function (dataset) { return dataset.id; });
  var poolDatasets = poolIds
    .map(function (id) { return datasets.find(function (dataset) { return dataset.id === id; }); })
    .filter(function (dataset) { return !!dataset; });
  var sortDescription = resultSortKey
    ? getResultColumn(resultSortKey).label + " (" + (resultSortDirection === "desc" ? "descending" : "ascending") + ")"
    : "Custom Order";
  var now = new Date();
  var apsPoints = [];
  if (apsPreviewChart) {
    apsPreviewChart.data.datasets.forEach(function (chartDataset) {
      chartDataset.data.forEach(function (point) {
        apsPoints.push({ id: point.id, name: point.name, status: point.status, x: point.x, y: point.y });
      });
    });
  }
  var apsImage = null;
  try {
    if (apsPreviewCanvasElement && apsPreviewCanvasElement.style.display !== "none") {
      apsImage = apsPreviewCanvasElement.toDataURL("image/png");
    }
  } catch (error) {
    apsImage = null;
  }

  return {
    title: "FINALLY: Dataset Recommendation",
    generatedAt: now.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    generatedIso: now.toISOString(),
    version: versionNumber,
    source: "https://finally.recommender-systems.com",
    rows: rows,
    columns: columns,
    poolDatasets: poolDatasets,
    poolIds: poolIds,
    apsPoints: apsPoints,
    apsImage: apsImage,
    filters: getExportFilterDetails(),
    settings: [
      { label: "Selection Method", value: getSelectedOptionText(methodSelectElement, getSelectedMethod()) },
      { label: "APS Metric", value: getSelectedOptionText(metricSelectElement, metricSelectElement?.value || "NDCG") },
      { label: "K-Value", value: "@" + (kValueSelectElement?.value || "10") },
      { label: "Target Dataset Count", value: String(getValidatedTargetCount()) },
      { label: "Selected Candidates", value: selectedDatasets.length + " of " + datasets.length },
      { label: "Evaluated Pool", value: poolIds.length + " datasets" },
      { label: "Result Order", value: sortDescription },
      { label: "Visible Parameters", value: columns.map(function (column) { return column.label; }).join(", ") },
    ],
    summary: {
      final: rows.length,
      required: requiredDatasetIds.length,
      recommended: recommendedDatasetIds.length,
      pool: poolIds.length,
    },
  };
}

function markdownCell(value) {
  return String(value ?? "\u2014").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderRecommendationImage() {
  var report = buildExportReport();
  if (report.rows.length === 0) return null;

  var columnWidths = report.columns.map(function (column) {
    if (column.key === "name") return 250;
    if (column.key === "status") return 125;
    return Math.max(125, Math.min(180, column.label.length * 7 + 34));
  });
  var tableWidth = 48 + columnWidths.reduce(function (sum, width) { return sum + width; }, 0);
  var logicalWidth = Math.max(1280, tableWidth + 80);
  var settingsText = report.settings.map(function (setting) { return setting.label + ": " + setting.value; }).join("  |  ");
  var filterText = report.filters.map(function (filter) { return filter.label + ": " + filter.value + (filter.active ? " (active)" : ""); }).join("  |  ");
  var settingsLines = Math.max(1, Math.ceil(settingsText.length / Math.max(80, logicalWidth / 8)));
  var filterLines = Math.max(1, Math.ceil(filterText.length / Math.max(80, logicalWidth / 8)));
  var chartHeight = report.apsImage ? 430 : 0;
  var tableHeight = 42 + report.rows.length * 40;
  var logicalHeight = 165 + settingsLines * 20 + 48 + filterLines * 20 + 64 + tableHeight + (chartHeight ? chartHeight + 70 : 0) + 70;
  var pixelRatio = 2;
  var canvas = document.createElement("canvas");
  canvas.width = logicalWidth * pixelRatio;
  canvas.height = logicalHeight * pixelRatio;
  canvas.style.width = logicalWidth + "px";
  canvas.style.height = logicalHeight + "px";
  var ctx = canvas.getContext("2d");
  ctx.scale(pixelRatio, pixelRatio);

  function drawFittedText(text, x, y, maxWidth) {
    var fitted = String(text ?? "\u2014");
    while (fitted.length > 1 && ctx.measureText(fitted).width > maxWidth) fitted = fitted.slice(0, -1);
    if (fitted !== String(text ?? "\u2014")) fitted = fitted.slice(0, -1) + "\u2026";
    ctx.fillText(fitted, x, y);
  }

  function drawWrappedText(text, x, y, maxWidth, lineHeight) {
    var words = String(text).split(/\s+/);
    var line = "";
    words.forEach(function (word) {
      var candidate = line ? line + " " + word : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) ctx.fillText(line, x, y);
    return y;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  ctx.fillStyle = "#17345f";
  ctx.fillRect(0, 0, logicalWidth, 126);
  ctx.fillStyle = "#8fb2ff";
  ctx.font = "800 14px Arial, sans-serif";
  ctx.fillText("FINALLY", 40, 34);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillText("Dataset Recommendation", 40, 70);
  ctx.fillStyle = "#dce7fb";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("Final: " + report.summary.final + "  |  Required: " + report.summary.required + "  |  Recommended: " + report.summary.recommended + "  |  Pool: " + report.summary.pool, 40, 99);
  ctx.textAlign = "right";
  ctx.fillText(report.generatedAt, logicalWidth - 40, 99);
  ctx.textAlign = "left";

  var y = 158;
  ctx.fillStyle = "#21304a";
  ctx.font = "700 17px Arial, sans-serif";
  ctx.fillText("Recommendation Configuration", 40, y);
  y += 27;
  ctx.fillStyle = "#5d6b81";
  ctx.font = "12px Arial, sans-serif";
  y = drawWrappedText(settingsText, 40, y, logicalWidth - 80, 20) + 31;

  ctx.fillStyle = "#21304a";
  ctx.font = "700 17px Arial, sans-serif";
  ctx.fillText("Dataset Filters", 40, y);
  y += 27;
  ctx.fillStyle = "#5d6b81";
  ctx.font = "12px Arial, sans-serif";
  y = drawWrappedText(filterText, 40, y, logicalWidth - 80, 20) + 35;

  ctx.fillStyle = "#21304a";
  ctx.font = "700 17px Arial, sans-serif";
  ctx.fillText("Configured Result Table", 40, y);
  y += 20;
  var tableX = 40;
  var rowY = y;
  ctx.fillStyle = "#edf2fb";
  ctx.fillRect(tableX, rowY, tableWidth, 42);
  ctx.fillStyle = "#58677d";
  ctx.font = "700 11px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("#", tableX + 15, rowY + 21);
  var cellX = tableX + 48;
  report.columns.forEach(function (column, index) {
    drawFittedText(column.label.toUpperCase(), cellX + 9, rowY + 21, columnWidths[index] - 18);
    cellX += columnWidths[index];
  });
  rowY += 42;

  report.rows.forEach(function (dataset, rowIndex) {
    ctx.fillStyle = rowIndex % 2 === 0 ? "#ffffff" : "#f8faff";
    ctx.fillRect(tableX, rowY, tableWidth, 40);
    ctx.fillStyle = requiredDatasetIds.includes(dataset.id) ? "#315fd1" : "#1f9d62";
    ctx.fillRect(tableX, rowY, 4, 40);
    ctx.fillStyle = "#657289";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(String(rowIndex + 1), tableX + 16, rowY + 20);
    cellX = tableX + 48;
    report.columns.forEach(function (column, index) {
      ctx.fillStyle = column.key === "name" ? "#21304a" : "#536178";
      ctx.font = column.key === "name" ? "700 12px Arial, sans-serif" : "12px Arial, sans-serif";
      drawFittedText(column.value(dataset), cellX + 9, rowY + 20, columnWidths[index] - 18);
      cellX += columnWidths[index];
    });
    rowY += 40;
  });
  y = rowY + 34;

  if (report.apsImage && apsPreviewCanvasElement) {
    ctx.fillStyle = "#21304a";
    ctx.font = "700 17px Arial, sans-serif";
    ctx.fillText("Algorithm Performance Space", 40, y);
    y += 18;
    var chartWidth = Math.min(900, logicalWidth - 80);
    var chartDrawHeight = 360;
    var chartX = (logicalWidth - chartWidth) / 2;
    ctx.drawImage(apsPreviewCanvasElement, chartX, y, chartWidth, chartDrawHeight);
    y += chartDrawHeight + 24;
    var legendItems = [["Pool", "#aeb9c9"], ["Recommended", "#1f9d62"], ["Required", "#315fd1"]];
    var legendX = logicalWidth / 2 - 145;
    ctx.font = "12px Arial, sans-serif";
    legendItems.forEach(function (item) {
      ctx.fillStyle = item[1];
      ctx.beginPath();
      ctx.arc(legendX, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5d6b81";
      ctx.fillText(item[0], legendX + 10, y);
      legendX += item[0] === "Recommended" ? 125 : 85;
    });
  }

  ctx.strokeStyle = "#dbe2ee";
  ctx.beginPath();
  ctx.moveTo(40, logicalHeight - 47);
  ctx.lineTo(logicalWidth - 40, logicalHeight - 47);
  ctx.stroke();
  ctx.fillStyle = "#758198";
  ctx.font = "11px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(report.source, 40, logicalHeight - 24);
  ctx.textAlign = "right";
  ctx.fillText("FINALLY v" + report.version + " \u00b7 " + report.generatedIso, logicalWidth - 40, logicalHeight - 24);
  return canvas;
}

function exportAsMarkdown() {
  var report = buildExportReport();
  if (report.rows.length === 0) return "No datasets to export.";
  var lines = ["# " + report.title, "", "Generated: " + report.generatedAt, "", "## Summary", ""];
  lines.push("- Final datasets: " + report.summary.final);
  lines.push("- Required datasets: " + report.summary.required);
  lines.push("- Recommended datasets: " + report.summary.recommended);
  lines.push("- Evaluated pool: " + report.summary.pool);
  lines.push("", "## Recommendation Configuration", "", "| Setting | Value |", "|---|---|");
  report.settings.forEach(function (setting) { lines.push("| " + markdownCell(setting.label) + " | " + markdownCell(setting.value) + " |"); });
  lines.push("", "## Dataset Filters", "", "| Filter | Range / Value | Active |", "|---|---|---|");
  report.filters.forEach(function (filter) { lines.push("| " + markdownCell(filter.label) + " | " + markdownCell(filter.value) + " | " + (filter.active ? "Yes" : "No") + " |"); });
  lines.push("", "## Final Dataset Selection", "");
  lines.push("| # | " + report.columns.map(function (column) { return markdownCell(column.label); }).join(" | ") + " |");
  lines.push("|---|" + report.columns.map(function () { return "---|"; }).join(""));
  report.rows.forEach(function (dataset, index) {
    lines.push("| " + (index + 1) + " | " + report.columns.map(function (column) { return markdownCell(column.value(dataset)); }).join(" | ") + " |");
  });
  lines.push("", "## APS Dataset Pool", "");
  if (report.apsPoints.length > 0) {
    lines.push("| Dataset | Status | APS Dimension 1 | APS Dimension 2 |", "|---|---|---:|---:|");
    report.apsPoints.forEach(function (point) { lines.push("| " + markdownCell(point.name) + " | " + point.status + " | " + point.x.toFixed(6) + " | " + point.y.toFixed(6) + " |"); });
  } else {
    lines.push("APS coordinates were not available when this report was generated.");
  }
  lines.push("", "_Generated by [FINALLY](" + report.source + "), version " + report.version + "._");
  return lines.join("\n");
}

function escapeReportHtml(value) {
  return String(value ?? "\u2014").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function exportAsHtml() {
  var report = buildExportReport();
  if (report.rows.length === 0) return "<!doctype html><html><body><p>No datasets to export.</p></body></html>";
  var settings = report.settings.map(function (setting) { return "<div><dt>" + escapeReportHtml(setting.label) + "</dt><dd>" + escapeReportHtml(setting.value) + "</dd></div>"; }).join("");
  var filters = report.filters.map(function (filter) { return "<tr><td>" + escapeReportHtml(filter.label) + "</td><td>" + escapeReportHtml(filter.value) + "</td><td>" + (filter.active ? "Active" : "Full range") + "</td></tr>"; }).join("");
  var headers = report.columns.map(function (column) { return "<th>" + escapeReportHtml(column.label) + "</th>"; }).join("");
  var rows = report.rows.map(function (dataset, index) { return "<tr><td>" + (index + 1) + "</td>" + report.columns.map(function (column) { return "<td>" + escapeReportHtml(column.value(dataset)) + "</td>"; }).join("") + "</tr>"; }).join("");
  var apsRows = report.apsPoints.map(function (point) { return "<tr><td>" + escapeReportHtml(point.name) + "</td><td>" + point.status + "</td><td>" + point.x.toFixed(6) + "</td><td>" + point.y.toFixed(6) + "</td></tr>"; }).join("");
  var chart = report.apsImage ? '<figure><img src="' + report.apsImage + '" alt="Algorithm Performance Space"><figcaption>Pool datasets are gray, recommended datasets green, and required datasets blue.</figcaption></figure>' : "";
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeReportHtml(report.title) + '</title><style>body{margin:0;background:#f4f7fb;color:#26344c;font:14px Arial,sans-serif}main{max-width:1200px;margin:auto;padding:32px}header{padding:28px;border-radius:16px;background:#17345f;color:#fff}header small{color:#9fbcf4;font-weight:800;letter-spacing:.12em}h1{margin:.35rem 0}section{margin-top:20px;padding:22px;border:1px solid #dbe3ef;border-radius:14px;background:#fff}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}dl div{padding:12px;border-radius:9px;background:#f5f8fc}dt{color:#68758a;font-size:11px;font-weight:700;text-transform:uppercase}dd{margin:5px 0 0;font-weight:700}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #e5eaf2;text-align:left;white-space:nowrap}th{background:#edf2fb;font-size:11px;text-transform:uppercase}.scroll{overflow:auto}figure{text-align:center}img{max-width:100%;height:auto}figcaption{color:#69768b;font-size:12px}footer{padding:24px;color:#69768b;text-align:center}</style></head><body><main><header><small>FINALLY</small><h1>Dataset Recommendation</h1><p>Final: ' + report.summary.final + ' &middot; Required: ' + report.summary.required + ' &middot; Recommended: ' + report.summary.recommended + ' &middot; Pool: ' + report.summary.pool + '</p><time>' + escapeReportHtml(report.generatedAt) + '</time></header><section><h2>Recommendation Configuration</h2><dl>' + settings + '</dl></section><section><h2>Dataset Filters</h2><div class="scroll"><table><thead><tr><th>Filter</th><th>Range / Value</th><th>State</th></tr></thead><tbody>' + filters + '</tbody></table></div></section><section><h2>Final Dataset Selection</h2><div class="scroll"><table><thead><tr><th>#</th>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table></div></section><section><h2>Algorithm Performance Space</h2>' + chart + '<div class="scroll"><table><thead><tr><th>Dataset</th><th>Status</th><th>APS Dimension 1</th><th>APS Dimension 2</th></tr></thead><tbody>' + apsRows + '</tbody></table></div></section><footer>Generated by FINALLY v' + escapeReportHtml(report.version) + ' &middot; <a href="' + report.source + '">' + report.source + '</a></footer></main></body></html>';
}

function escapeLatexReport(value) {
  var replacements = {
    "\\": "\\textbackslash{}",
    "&": "\\&",
    "%": "\\%",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}",
  };
  return String(value ?? "--").replace(/[\\&%$#_{}~^]/g, function (character) {
    return replacements[character];
  });
}

function exportAsLatex() {
  var report = buildExportReport();
  if (report.rows.length === 0) return "% No datasets to export.";
  var lines = ["\\documentclass{article}", "\\usepackage[margin=1.8cm]{geometry}", "\\usepackage{booktabs,longtable,array,hyperref}", "\\begin{document}", "\\title{FINALLY: Dataset Recommendation}", "\\author{FINALLY}", "\\date{" + escapeLatexReport(report.generatedAt) + "}", "\\maketitle", "\\section{Summary}"];
  lines.push("Final datasets: " + report.summary.final + ", required datasets: " + report.summary.required + ", recommended datasets: " + report.summary.recommended + ", evaluated pool: " + report.summary.pool + ".");
  lines.push("\\section{Recommendation Configuration}", "\\begin{description}");
  report.settings.forEach(function (setting) { lines.push("\\item[" + escapeLatexReport(setting.label) + "] " + escapeLatexReport(setting.value)); });
  lines.push("\\end{description}", "\\section{Dataset Filters}", "\\begin{longtable}{lll}", "\\toprule", "Filter & Range / Value & State \\\\", "\\midrule", "\\endhead");
  report.filters.forEach(function (filter) { lines.push(escapeLatexReport(filter.label) + " & " + escapeLatexReport(filter.value) + " & " + (filter.active ? "Active" : "Full range") + " \\\\"); });
  lines.push("\\bottomrule", "\\end{longtable}", "\\section{Final Dataset Selection}");
  var columnSpec = "r" + report.columns.map(function (column) { return column.numeric ? "r" : "l"; }).join("");
  lines.push("\\begin{longtable}{" + columnSpec + "}", "\\toprule", "\\# & " + report.columns.map(function (column) { return escapeLatexReport(column.label); }).join(" & ") + " \\\\", "\\midrule", "\\endhead");
  report.rows.forEach(function (dataset, index) { lines.push((index + 1) + " & " + report.columns.map(function (column) { return escapeLatexReport(column.value(dataset)); }).join(" & ") + " \\\\"); });
  lines.push("\\bottomrule", "\\end{longtable}", "\\section{Algorithm Performance Space}");
  if (report.apsPoints.length > 0) {
    lines.push("\\begin{longtable}{llrr}", "\\toprule", "Dataset & Status & APS Dimension 1 & APS Dimension 2 \\\\", "\\midrule", "\\endhead");
    report.apsPoints.forEach(function (point) { lines.push(escapeLatexReport(point.name) + " & " + point.status + " & " + point.x.toFixed(6) + " & " + point.y.toFixed(6) + " \\\\"); });
    lines.push("\\bottomrule", "\\end{longtable}");
  } else {
    lines.push("APS coordinates were not available when this report was generated.");
  }
  lines.push("\\vfill", "\\noindent Generated by FINALLY v" + escapeLatexReport(report.version) + ", \\url{" + report.source + "}.", "\\end{document}");
  return lines.join("\n");
}

function escapeBibValue(value) {
  return String(value ?? "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}

function exportAsBibtex() {
  var report = buildExportReport();
  if (report.rows.length === 0) return "% No datasets to export.";
  var lines = [];
  var reportNote = report.settings.map(function (setting) { return setting.label + ": " + setting.value; }).join("; ");
  lines.push("@misc{finally_recommendation_" + report.generatedIso.slice(0, 10).replace(/-/g, "") + ",");
  lines.push("  title        = {" + escapeBibValue(report.title) + "},");
  lines.push("  author       = {{FINALLY}},");
  lines.push("  year         = {" + report.generatedIso.slice(0, 4) + "},");
  lines.push("  howpublished = {\\url{" + report.source + "}},");
  lines.push("  note         = {" + escapeBibValue(reportNote) + "},");
  lines.push("  annote       = {Candidate pool: " + escapeBibValue(report.poolDatasets.map(function (dataset) { return dataset.name; }).join(", ")) + "}");
  lines.push("}", "");
  report.rows.forEach(function (dataset, index) {
    var key = (dataset.name || "dataset").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    var visibleDetails = report.columns.map(function (column) { return column.label + ": " + column.value(dataset); }).join("; ");
    lines.push("@misc{finally_" + key + "_" + (index + 1) + ",");
    lines.push("  title        = {" + escapeBibValue(dataset.name || "Untitled Dataset") + "},");
    lines.push("  author       = {{Dataset Provider}},");
    lines.push("  howpublished = {\\url{" + report.source + "}},");
    lines.push("  keywords     = {recommender systems, dataset, " + (requiredDatasetIds.includes(dataset.id) ? "required" : "recommended") + "},");
    lines.push("  note         = {" + escapeBibValue(visibleDetails) + "}");
    lines.push("}", "");
  });
  return lines.join("\n");
}

var metadataRangeFields = [
  { key: "numberOfUsers", sliderId: "slider-users", step: 1, format: formatNumber },
  { key: "numberOfItems", sliderId: "slider-items", step: 1, format: formatNumber },
  { key: "userItemRatio", sliderId: "slider-ratio", step: null, format: formatRatio },
  { key: "density", sliderId: "slider-density", step: null, format: formatDensity },
  { key: "highestNumberOfRatingBySingleUser", sliderId: "slider-max-user", step: 1, format: formatNumber },
  { key: "lowestNumberOfRatingBySingleUser", sliderId: "slider-min-user", step: 1, format: formatNumber },
  { key: "highestNumberOfRatingOnSingleItem", sliderId: "slider-max-item", step: 1, format: formatNumber },
  { key: "lowestNumberOfRatingOnSingleItem", sliderId: "slider-min-item", step: 1, format: formatNumber },
  { key: "meanNumberOfRatingsByUser", sliderId: "slider-mean-user", step: null, format: formatNumber },
  { key: "meanNumberOfRatingsOnItem", sliderId: "slider-mean-item", step: null, format: formatNumber },
];

var metadataRangeBounds = {};

export async function initialize(queryOptions) {
  var initialData = await Promise.all([ApiService.getDatasets(), ApiService.getAlgorithms()]);
  datasets = initialData[0] || [];
  __allAlgorithms = initialData[1] || [];
  if (__allAlgorithms.length > 0 && datasets.length > 0) {
    var allIds = datasets.map(function (dataset) { return dataset.id; });
    __performanceResults = await ApiService.getPerformanceResults(
      allIds,
      __allAlgorithms.map(function (algorithm) { return algorithm.id; }),
    );
  } else {
    __performanceResults = null;
  }

  mapElements();

  if (
    !datasetFilterHeaderElement ||
    !datasetFilterArea ||
    !requiredFilterHeaderElement ||
    !requiredFilterArea
  ) {
    console.error(
      "recommendDatasets initialization failed: required filter elements are missing.",
    );
    return;
  }

  createSelectAllButtons();

  initializeSettingsFromQuery(queryOptions);
  initializeCandidateDatasetFilter(queryOptions);
  initializeRequiredDatasetFilter(queryOptions);
  loadResultTablePreferences();
  initializeResultColumnControls();
  initializeEvents();

  applyDatasetFilter();
  renderResults();
}

function mapElements() {
  datasetFilterHeaderElement = document.getElementById(
    "dataset-comparison-header",
  );
  datasetFilterArea = document.getElementById("dataset-comparison-filter");
  requiredFilterHeaderElement = document.getElementById(
    "required-dataset-header",
  );
  requiredFilterArea = document.getElementById("required-dataset-filter");
  requiredChipsElement = document.getElementById("required-dataset-chips");
  requiredInputElement = document.getElementById("required-dataset-input");
  requiredSuggestionsElement = document.getElementById(
    "required-dataset-suggestions",
  );

  targetCountElement = document.getElementById("recommend-target-count");
  feedbackTypeElement = document.getElementById("recommend-feedback-type");
  generateButtonElement = document.getElementById("recommend-generate-btn");
  openApsButtonElement = document.getElementById("recommend-open-aps-btn");
  shareButtonElement = document.getElementById("recommend-share-btn");
  statusElement = document.getElementById("recommend-status");
  loadingElement = document.getElementById("recommend-loading");
  resultsSummaryElement = document.getElementById("recommend-results-summary");
  resultsListElement = document.getElementById("recommend-results-list");
  resultsHeadElement = document.getElementById("recommend-results-head");
  resultsEmptyElement = document.getElementById("recommend-results-empty");
  resultsTableElement = document.getElementById("recommend-results-table");
  resultColumnOptionsElement = document.getElementById("recommend-column-options");
  resultSortStatusElement = document.getElementById("recommend-sort-status");
  exportButtonElement = document.getElementById("recommend-export-btn");
  apsPreviewCanvasElement = document.getElementById("recommend-aps-chart");
  apsPreviewEmptyElement = document.getElementById("recommend-aps-empty");
  apsPreviewMetaElement = document.getElementById("recommend-aps-meta");
  apsPreviewNoteElement = document.getElementById("recommend-aps-note");
  apsZoomOutButtonElement = document.getElementById("recommend-aps-zoom-out");
  apsZoomInButtonElement = document.getElementById("recommend-aps-zoom-in");
  apsResetButtonElement = document.getElementById("recommend-aps-reset");
  apsApplyRangeButtonElement = document.getElementById("recommend-aps-apply-range");
  apsXMinInputElement = document.getElementById("recommend-aps-x-min");
  apsXMaxInputElement = document.getElementById("recommend-aps-x-max");
  apsYMinInputElement = document.getElementById("recommend-aps-y-min");
  apsYMaxInputElement = document.getElementById("recommend-aps-y-max");

  methodSelectElement = document.getElementById("recommend-method");
  metricSelectElement = document.getElementById("recommend-metric");
  kValueSelectElement = document.getElementById("recommend-kvalue");
}

function initializeSettingsFromQuery(queryOptions) {
  setInteractionBounds();
  setMetadataRangeBounds();

  if (feedbackTypeElement) {
    const feedbackTypeValues = datasets
      .map((d) => d.feedbackType)
      .filter((v) => !!v);
    const feedbackTypeLookup = new Map(
      feedbackTypeValues.map((value) => [value.toLowerCase(), value]),
    );
    const requiredTypes = ["explicit", "implicit"];

    let allOption = feedbackTypeElement.querySelector('option[value="all"]');
    if (!allOption) {
      allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "All";
    }
    allOption.selected = true;

    feedbackTypeElement.innerHTML = "";
    feedbackTypeElement.appendChild(allOption);

    const ensureOption = (baseType, optionValue, isDisabled) => {
      let option = feedbackTypeElement.querySelector(
        `option[data-base-type="${baseType}"]`,
      );

      if (!option) {
        option = document.createElement("option");
        option.dataset.baseType = baseType;
        feedbackTypeElement.appendChild(option);
      }

      option.value = optionValue;
      option.textContent =
        baseType.charAt(0).toUpperCase() + baseType.slice(1).toLowerCase();
      option.disabled = isDisabled;
    };

    requiredTypes.forEach((baseType) => {
      const normalized = baseType.toLowerCase();
      const datasetValue = feedbackTypeLookup.get(normalized);
      ensureOption(baseType, datasetValue || baseType, !datasetValue);
    });

    const addOption = (typeValue) => {
      const option = document.createElement("option");
      option.value = typeValue;
      option.textContent = typeValue;
      option.disabled = false;
      feedbackTypeElement.appendChild(option);
    };

    const seen = new Set(requiredTypes);
    feedbackTypeValues.forEach((typeValue) => {
      const normalized = typeValue.toLowerCase();
      if (seen.has(normalized)) {
        return;
      }
      seen.add(normalized);
      addOption(typeValue);
    });
  }

  const defaultTargetCount = Math.min(5, datasets.length);
  const queryTargetCount = Number(queryOptions?.targetCount);
  const targetCount =
    Number.isFinite(queryTargetCount) && queryTargetCount > 0
      ? queryTargetCount
      : defaultTargetCount;

  if (targetCountElement) {
    targetCountElement.value = targetCount;
  }

  if (queryOptions?.feedbackType && feedbackTypeElement) {
    const requestedFeedbackType = queryOptions?.feedbackType;
    if (
      requestedFeedbackType &&
      !feedbackTypeElement.querySelector(
        `option[value="${requestedFeedbackType}"][disabled]`,
      )
    ) {
      const normalized = requestedFeedbackType.toLowerCase();
      const mappedValue =
        feedbackTypeElement.querySelector(
          `option[data-base-type="${normalized}"]`,
        )?.value || requestedFeedbackType;
      feedbackTypeElement.value = mappedValue;
    }
  }
  if (queryOptions?.minInteractions || queryOptions?.maxInteractions) {
    var sliderEl = document.getElementById("slider-interactions");
    if (sliderEl && sliderEl.noUiSlider) {
      sliderEl.noUiSlider.set([
        queryOptions?.minInteractions
          ? Number(queryOptions.minInteractions)
          : interactionsBounds.min,
        queryOptions?.maxInteractions
          ? Number(queryOptions.maxInteractions)
          : interactionsBounds.max,
      ]);
    }
  }

  if (queryOptions?.method && methodSelectElement) {
    var requestedMethod = queryOptions.method === "non_diverse"
      ? "non_diverse_effcov"
      : queryOptions.method;
    if (methodSelectElement.querySelector('option[value="' + requestedMethod + '"]')) {
      methodSelectElement.value = requestedMethod;
    }
  }
  if (queryOptions?.metric && metricSelectElement) {
    if (metricSelectElement.querySelector('option[value="' + queryOptions.metric + '"]')) {
      metricSelectElement.value = queryOptions.metric;
    }
  }
  if (queryOptions?.kValue && kValueSelectElement) {
    if (kValueSelectElement.querySelector('option[value="' + queryOptions.kValue + '"]')) {
      kValueSelectElement.value = queryOptions.kValue;
    }
  }

  readActiveFiltersFromUi();
}

function setInteractionBounds() {
  var values = datasets
    .map(function (d) { return Number(d.numberOfInteractions); })
    .filter(function (v) { return Number.isFinite(v); });

  if (values.length === 0) {
    interactionsBounds = { min: null, max: null };
    return;
  }

  interactionsBounds = {
    min: Math.min.apply(null, values),
    max: Math.max.apply(null, values),
  };

  var sliderEl = document.getElementById("slider-interactions");
  if (!sliderEl) return;

  if (sliderEl.noUiSlider) {
    sliderEl.noUiSlider.destroy();
  }

  noUiSlider.create(sliderEl, {
    start: [interactionsBounds.min, interactionsBounds.max],
    connect: true,
    step: 1,
    range: {
      min: interactionsBounds.min,
      max: interactionsBounds.max,
    },
  });

  configureSliderPresentation(
    sliderEl,
    interactionsBounds.min,
    interactionsBounds.max,
  );

  sliderEl.noUiSlider.on("update", function (vals) {
    var minInp = document.getElementById("slider-interactions-min");
    var maxInp = document.getElementById("slider-interactions-max");
    if (minInp) minInp.value = String(Math.round(Number(vals[0])));
    if (maxInp) maxInp.value = String(Math.round(Number(vals[1])));
    updateSliderVisualState(sliderEl, vals);
  });

  sliderEl.noUiSlider.on("change", function () {
    applyDatasetFilter();
  });

  function onInteractionInput() {
    var minInp = document.getElementById("slider-interactions-min");
    var maxInp = document.getElementById("slider-interactions-max");
    var minVal = minInp ? Number(minInp.value) : NaN;
    var maxVal = maxInp ? Number(maxInp.value) : NaN;
    if (Number.isFinite(minVal) && Number.isFinite(maxVal)) {
      sliderEl.noUiSlider.set([minVal, maxVal]);
      applyDatasetFilter();
    }
  }

  var minInp = document.getElementById("slider-interactions-min");
  var maxInp = document.getElementById("slider-interactions-max");
  if (minInp) minInp.addEventListener("change", onInteractionInput);
  if (maxInp) maxInp.addEventListener("change", onInteractionInput);
}

function initializeCandidateDatasetFilter(queryOptions) {
  datasetFilterArea.innerHTML = "";
  datasetFilterArea.appendChild(selectAllDatasetArea);

  datasetFilterCheckboxes = [];
  selectedDatasets = [];

  const initialSelectedDatasetIds = parseIdList(
    queryOptions?.datasets,
    datasets.map((ds) => ds.id),
  );

  datasets.forEach((dataset) => {
    const checkbox = createDatasetCheckbox(
      dataset.id,
      "datasetCheckbox",
      dataset.name,
    );
    checkbox.checked = initialSelectedDatasetIds.includes(dataset.id);
    checkbox.onchange = onFilterDataset;

    datasetFilterArea.appendChild(
      createCheckboxWrapper(checkbox, dataset.id, dataset.name),
    );
    datasetFilterCheckboxes.push(checkbox);

    if (checkbox.checked) {
      selectedDatasets.push(dataset.id);
    }
  });

  updateFilterHeader(
    selectedDatasets.length,
    datasetFilterCheckboxes.length,
    datasetFilterHeaderElement,
    selectedDatasets,
    datasets,
    "name",
  );

  updateSelectAllButtonText(
    selectedDatasets.length,
    datasetFilterCheckboxes.length,
    selectAllDatasetButtonText,
  );
}

function initializeRequiredDatasetFilter(queryOptions) {
  requiredDatasetIds = parseIdList(queryOptions?.requiredDatasets, []).filter(
    (id) => datasets.some((dataset) => dataset.id === id),
  );

  renderRequiredChips();
  updateRequiredHeader();
  updateRequiredSuggestions();
}

function initializeEvents() {
  var _exportedImageCanvas = null;
  var _currentExportType = null;

  if (generateButtonElement) {
    generateButtonElement.addEventListener("click", generateRecommendation);
  }
  if (openApsButtonElement) {
    openApsButtonElement.addEventListener("click", openRecommendationInAps);
  }
  if (shareButtonElement) {
    shareButtonElement.addEventListener("click", shareRecommendState);
  }

  // Export button event listeners
  const exportBtn = document.getElementById("recommend-export-btn");
  const exportImage = document.getElementById("export-image");
  const exportMarkdown = document.getElementById("export-markdown");
  const exportHtml = document.getElementById("export-html");
  const exportLatex = document.getElementById("export-latex");
  const exportBibtex = document.getElementById("export-bibtex");
  const exportModal = document.getElementById("exportModal");
  const exportPreviewArea = document.getElementById("export-preview-area");
  const exportImagePreview = document.getElementById("export-image-preview");
  const exportTextarea = document.getElementById("export-textarea");
  const exportCopyBtn = document.getElementById("export-copy-btn");
  const exportDownloadBtn = document.getElementById("export-download-btn");

  if (exportImage) {
    exportImage.addEventListener("click", function (e) {
      e.preventDefault();
      showExportModal("image");
    });
  }
  if (exportMarkdown) {
    exportMarkdown.addEventListener("click", function (e) {
      e.preventDefault();
      showExportModal("markdown");
    });
  }
  if (exportHtml) {
    exportHtml.addEventListener("click", function (e) {
      e.preventDefault();
      showExportModal("html");
    });
  }
  if (exportLatex) {
    exportLatex.addEventListener("click", function (e) {
      e.preventDefault();
      showExportModal("latex");
    });
  }
  if (exportBibtex) {
    exportBibtex.addEventListener("click", function (e) {
      e.preventDefault();
      showExportModal("bibtex");
    });
  }

  if (exportCopyBtn) {
    exportCopyBtn.addEventListener("click", function () {
      if (exportTextarea && exportTextarea.style.display !== "none") {
        exportTextarea.select();
        document.execCommand("copy");
      }
    });
  }
  function setCopyButtonEnabled(enabled) {
    if (!exportCopyBtn) return;
    exportCopyBtn.disabled = !enabled;
    exportCopyBtn.classList.toggle("disabled", !enabled);
  }
  if (exportDownloadBtn) {
    exportDownloadBtn.addEventListener("click", function () {
      if (_exportedImageCanvas) {
        _exportedImageCanvas.toBlob(function (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "finally-dataset-recommendation-v" + versionNumber + ".png";
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }, "image/png");
      } else if (exportTextarea && exportTextarea.style.display !== "none") {
        var exportOptions = {
          markdown: { extension: "md", mime: "text/markdown" },
          html: { extension: "html", mime: "text/html" },
          latex: { extension: "tex", mime: "application/x-tex" },
          bibtex: { extension: "bib", mime: "application/x-bibtex" },
        };
        var selectedOption = exportOptions[_currentExportType] || { extension: "txt", mime: "text/plain" };
        const blob = new Blob([exportTextarea.value], { type: selectedOption.mime + ";charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "finally-dataset-recommendation-v" + versionNumber + "." + selectedOption.extension;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      }
    });
  }

  // Render recommendation results as a canvas image
  function renderRecommendationImageLegacy() {
    const finalDatasets = getFinalDatasets();
    if (finalDatasets.length === 0) return null;

    const canvasWidth = 800;
    const rowHeight = 54;
    const headerHeight = 80;
    const footerHeight = 50;
    const padding = 20;
    const separatorHeight = 6;
    const contentHeight = finalDatasets.length * rowHeight;
    const totalHeight = headerHeight + separatorHeight + contentHeight + separatorHeight + footerHeight + padding * 2;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, totalHeight);

    // Header
    ctx.fillStyle = "#212529";
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Dataset Recommendation", padding, padding + 10);

    ctx.font = "14px Arial, sans-serif";
    ctx.fillStyle = "#6c757d";
    var summaryText = "Final: " + finalDatasets.length + " | Required: " + requiredDatasetIds.length + " | Recommended: " + recommendedDatasetIds.length;
    ctx.fillText(summaryText, padding, padding + 42);

    var y = padding + headerHeight;

    // Separator line
    ctx.strokeStyle = "#dee2e6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();
    y += separatorHeight;

    // Dataset rows
    var metaFontSize = 11;
    var maxNameWidth = canvasWidth - padding * 2 - 200;
    finalDatasets.forEach(function (dataset) {
      var isRequired = requiredDatasetIds.includes(dataset.id);
      var metaParts = getDatasetMetaParts(dataset);

      // Dataset name
      ctx.font = "bold 15px Arial, sans-serif";
      ctx.fillStyle = "#212529";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      var name = dataset.name;
      if (ctx.measureText(name).width > maxNameWidth) {
        while (ctx.measureText(name + "...").width > maxNameWidth && name.length > 1) {
          name = name.slice(0, -1);
        }
        name += "...";
      }
      ctx.fillText(name, padding + 4, y + 14);

      // Metadata line
      ctx.font = metaFontSize + "px Arial, sans-serif";
      ctx.fillStyle = "#6c757d";
      var metaText = metaParts.map(function (p) { return p.label + ": " + p.value; }).join("  ·  ");
      if (metaText.length > 0) {
        ctx.fillText(metaText, padding + 4, y + 34);
      }

      // Badge: Required/Recommended
      var badgeText = isRequired ? "Required" : "Recommended";
      var badgeColor = isRequired ? "#0d6efd" : "#198754";
      ctx.font = "12px Arial, sans-serif";
      var badgeWidth = ctx.measureText(badgeText).width + 20;
      var badgeX = canvasWidth - padding - badgeWidth - 4;
      var badgeY = y + 10;
      var badgeHeight = rowHeight - 20;
      var r = 4;

      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.moveTo(badgeX + r, badgeY);
      ctx.lineTo(badgeX + badgeWidth - r, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + r);
      ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - r);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - r, badgeY + badgeHeight);
      ctx.lineTo(badgeX + r, badgeY + badgeHeight);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - r);
      ctx.lineTo(badgeX, badgeY + r);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

      // Feedback badge next to Required/Recommended
      if (dataset.feedbackType) {
        var fbText = dataset.feedbackType;
        ctx.font = "11px Arial, sans-serif";
        var fbColor = dataset.feedbackType === "explicit" ? "#0dcaf0" : "#ffc107";
        var fbWidth = ctx.measureText(fbText).width + 14;
        var fbX = badgeX - fbWidth - 6;
        var fbY = badgeY + 2;
        var fbH = badgeHeight - 4;

        ctx.fillStyle = fbColor;
        ctx.beginPath();
        ctx.moveTo(fbX + r, fbY);
        ctx.lineTo(fbX + fbWidth - r, fbY);
        ctx.quadraticCurveTo(fbX + fbWidth, fbY, fbX + fbWidth, fbY + r);
        ctx.lineTo(fbX + fbWidth, fbY + fbH - r);
        ctx.quadraticCurveTo(fbX + fbWidth, fbY + fbH, fbX + fbWidth - r, fbY + fbH);
        ctx.lineTo(fbX + r, fbY + fbH);
        ctx.quadraticCurveTo(fbX, fbY + fbH, fbX, fbY + fbH - r);
        ctx.lineTo(fbX, fbY + r);
        ctx.quadraticCurveTo(fbX, fbY, fbX + r, fbY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#212529";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fbText, fbX + fbWidth / 2, fbY + fbH / 2);
      }

      y += rowHeight;
    });

    // Separator before footer
    y += separatorHeight / 2;
    ctx.strokeStyle = "#dee2e6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();

    // Footer with version and source
    var footerY = totalHeight - footerHeight;
    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#6c757d";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("Source: finally.recommender-systems.com", padding, footerY + 18);

    var versionText = "Version: " + versionNumber;
    ctx.textAlign = "right";
    ctx.fillText(versionText, canvasWidth - padding, footerY + 18);

    return canvas;
  }

  // Show export modal and fill preview area
  function showExportModal(type) {
    const exportModal = document.getElementById("exportModal");
    const exportPreviewArea = document.getElementById("export-preview-area");
    const exportImagePreview = document.getElementById("export-image-preview");
    const exportTextarea = document.getElementById("export-textarea");
    const exportModalLabel = document.getElementById("exportModalLabel");
    if (!exportModal) return;
    _currentExportType = type;

    // Set dynamic title
    var titleMap = {
      image: "Image Preview",
      markdown: "Markdown Export",
      html: "HTML Export",
      latex: "LaTeX Export",
      bibtex: "BibTeX Export",
    };
    if (exportModalLabel) {
      exportModalLabel.textContent = titleMap[type] || "Export Preview";
    }

    // Reset
    if (exportPreviewArea) exportPreviewArea.innerHTML = "";
    if (exportImagePreview) exportImagePreview.innerHTML = "";
    if (exportTextarea) {
      exportTextarea.value = "";
      exportTextarea.style.display = "none";
    }

    if (type === "image") {
      _exportedImageCanvas = renderRecommendationImage();
      if (exportImagePreview && _exportedImageCanvas) {
        exportImagePreview.appendChild(_exportedImageCanvas);
        _exportedImageCanvas.style.maxWidth = "100%";
        _exportedImageCanvas.style.border = "1px solid #ddd";
        _exportedImageCanvas.style.borderRadius = "4px";
      }
      if (exportTextarea) {
        exportTextarea.style.display = "none";
      }
      if (exportPreviewArea) {
        exportPreviewArea.innerHTML = "";
      }
      setCopyButtonEnabled(false);
    } else {
      _exportedImageCanvas = null;
      let text = "";
      if (type === "markdown") {
        text = exportAsMarkdown();
      } else if (type === "html") {
        text = exportAsHtml();
      } else if (type === "latex") {
        text = exportAsLatex();
      } else if (type === "bibtex") {
        text = exportAsBibtex();
      }
      if (exportTextarea) {
        exportTextarea.value = text;
        exportTextarea.style.display = "block";
      }
      setCopyButtonEnabled(true);
    }

    // Show modal (Bootstrap 5)
    if (window.bootstrap && window.bootstrap.Modal) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(exportModal);
      modal.show();
    } else {
      exportModal.style.display = "block";
    }
  }

  // Text export functions
  function exportAsMarkdownLegacy() {
    var rows = getFinalDatasets();
    if (rows.length === 0) return "No datasets to export.";
    var lines = [];
    lines.push("# Dataset Recommendation");
    lines.push("");
    lines.push("Final: " + rows.length + " | Required: " + requiredDatasetIds.length + " | Recommended: " + recommendedDatasetIds.length);
    lines.push("");
    lines.push("| # | Dataset | Feedback | Interactions | Users | Items | Density | Ratio | Type |");
    lines.push("|---|---|---|---|---|---|---|---|---|");
    rows.forEach(function (d, i) {
      var isReq = requiredDatasetIds.includes(d.id);
      var parts = getDatasetMetaParts(d);
      var meta = {};
      parts.forEach(function (p) { meta[p.label] = p.value; });
      lines.push("| " + (i + 1) + " | " + (d.name || "") + " | " + (meta["Feedback"] || "\u2014") + " | " + (meta["Interactions"] || "\u2014") + " | " + (meta["Users"] || "\u2014") + " | " + (meta["Items"] || "\u2014") + " | " + (meta["Density"] || "\u2014") + " | " + (meta["Ratio"] || "\u2014") + " | " + (isReq ? "Required" : "Recommended") + " |");
    });
    lines.push("");
    lines.push("_Generated by FINALLY (finally.recommender-systems.com)_");
    return lines.join("\n");
  }

  function exportAsHtmlLegacy() {
    var rows = getFinalDatasets();
    if (rows.length === 0) return "<p>No datasets to export.</p>";
    var h = [];
    h.push("<h2>Dataset Recommendation</h2>");
    h.push("<p>Final: " + rows.length + " | Required: " + requiredDatasetIds.length + " | Recommended: " + recommendedDatasetIds.length + "</p>");
    h.push("<table class=\"table table-bordered table-striped\">");
    h.push("<thead><tr><th>#</th><th>Dataset</th><th>Feedback</th><th>Interactions</th><th>Users</th><th>Items</th><th>Density</th><th>Ratio</th><th>Type</th></tr></thead>");
    h.push("<tbody>");
    rows.forEach(function (d, i) {
      var isReq = requiredDatasetIds.includes(d.id);
      var parts = getDatasetMetaParts(d);
      var meta = {};
      parts.forEach(function (p) { meta[p.label] = p.value; });
      h.push("<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(d.name || "") + "</td><td>" + escapeHtml(d.feedbackType || "\u2014") + "</td><td>" + (meta["Interactions"] || "\u2014") + "</td><td>" + (meta["Users"] || "\u2014") + "</td><td>" + (meta["Items"] || "\u2014") + "</td><td>" + (meta["Density"] || "\u2014") + "</td><td>" + (meta["Ratio"] || "\u2014") + "</td><td>" + (isReq ? "Required" : "Recommended") + "</td></tr>");
    });
    h.push("</tbody>");
    h.push("</table>");
    h.push("<p><em>Generated by FINALLY (finally.recommender-systems.com)</em></p>");
    return h.join("\n");
  }

  function exportAsLatexLegacy() {
    var rows = getFinalDatasets();
    if (rows.length === 0) return "% No datasets to export.";
    var lines = [];
    lines.push("% Dataset Recommendation — FINALLY");
    lines.push("\\begin{table}[h]");
    lines.push("\\centering");
    lines.push("\\caption{Dataset Recommendation}");
    lines.push("\\begin{tabular}{lllrrrrrl}");
    lines.push("\\toprule");
    lines.push("\\# & Dataset & Feedback & Interactions & Users & Items & Density & Ratio & Type \\\\");
    lines.push("\\midrule");
    rows.forEach(function (d, i) {
      var isReq = requiredDatasetIds.includes(d.id);
      var interactions = (d.numberOfInteractions != null) ? String(d.numberOfInteractions) : "\u2014";
      var users = (d.numberOfUsers != null) ? String(d.numberOfUsers) : "\u2014";
      var items = (d.numberOfItems != null) ? String(d.numberOfItems) : "\u2014";
      var density = (d.density != null) ? formatDensity(d.density) : "\u2014";
      var ratio = (d.userItemRatio != null) ? formatRatio(d.userItemRatio) : "\u2014";
      lines.push((i + 1) + " & " + escapeLatex(d.name || "") + " & " + escapeLatex(d.feedbackType || "\u2014") + " & " + interactions + " & " + users + " & " + items + " & " + density + " & " + ratio + " & " + (isReq ? "Required" : "Recommended") + " \\\\");
    });
    lines.push("\\bottomrule");
    lines.push("\\end{tabular}");
    lines.push("\\end{table}");
    return lines.join("\n");
  }

  function exportAsBibtexLegacy() {
    var rows = getFinalDatasets();
    if (rows.length === 0) return "% No datasets to export.";
    var lines = [];
    rows.forEach(function (d) {
      var key = "aps_" + (d.name || "dataset").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      var metaParts = getDatasetMetaParts(d);
      var note = metaParts.map(function (p) { return p.label + ": " + p.value; }).join(", ");
      lines.push("@dataset{" + key + ",");
      lines.push("  title        = {" + (d.name || "Untitled") + "},");
      lines.push("  howpublished = {finally.recommender-systems.com},");
      lines.push("  note         = {" + note + "}");
      lines.push("}");
      lines.push("");
    });
    return lines.join("\n");
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function escapeLatex(str) {
    return String(str).replace(/&/g, "\\&").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/\$/g, "\\$").replace(/#/g, "\\#").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
  }
  if (feedbackTypeElement) {
    feedbackTypeElement.addEventListener("change", applyDatasetFilter);
  }
  if (targetCountElement) {
    targetCountElement.addEventListener("change", applyDatasetFilter);
  }
  [metricSelectElement, kValueSelectElement].forEach(function (element) {
    if (!element) return;
    element.addEventListener("change", function () {
      if (finalDatasetIds.length > 0) updateApsPreview();
    });
  });
  if (apsZoomOutButtonElement) {
    apsZoomOutButtonElement.addEventListener("click", function () { zoomApsPreview(1.38); });
  }
  if (apsZoomInButtonElement) {
    apsZoomInButtonElement.addEventListener("click", function () { zoomApsPreview(0.72); });
  }
  if (apsResetButtonElement) {
    apsResetButtonElement.addEventListener("click", resetApsAxisView);
  }
  if (apsApplyRangeButtonElement) {
    apsApplyRangeButtonElement.addEventListener("click", applyApsAxisInputs);
  }
  [apsXMinInputElement, apsXMaxInputElement, apsYMinInputElement, apsYMaxInputElement].forEach(function (input) {
    if (!input) return;
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        applyApsAxisInputs();
      }
    });
  });
  if (apsPreviewCanvasElement) {
    apsPreviewCanvasElement.addEventListener("dblclick", resetApsAxisView);
  }
  if (!apsPreviewResizeHandler) {
    apsPreviewResizeHandler = function () {
      clearTimeout(apsPreviewResizeTimer);
      if (!apsPreviewIsFitted) return;
      apsPreviewResizeTimer = setTimeout(function () {
        if (apsPreviewIsFitted) fitApsPreviewToPoints(true);
      }, 160);
    };
    window.addEventListener("resize", apsPreviewResizeHandler);
  }

  if (requiredInputElement) {
    requiredInputElement.addEventListener("input", updateRequiredSuggestions);
    requiredInputElement.addEventListener("focus", updateRequiredSuggestions);
    requiredInputElement.addEventListener("blur", () => {
      setTimeout(() => {
        if (requiredSuggestionsElement) {
          requiredSuggestionsElement.classList.remove("show");
          requiredSuggestionsElement.innerHTML = "";
        }
      }, 150);
    });
    requiredInputElement.addEventListener("keydown", onRequiredInputKeydown);
  }
}

function createDatasetCheckbox(id, name, value) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = String(id);
  checkbox.name = name;
  checkbox.value = value;
  checkbox.className = "recommend-candidate-checkbox";
  return checkbox;
}

function createCheckboxWrapper(checkbox, htmlFor, text) {
  const label = document.createElement("label");
  label.htmlFor = String(htmlFor);
  label.textContent = text;

  const wrapper = document.createElement("div");
  wrapper.className = "recommend-candidate-option";
  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  return wrapper;
}

function createSelectAllButtons() {
  selectAllDatasetArea = document.createElement("div");
  selectAllDatasetArea.className = "recommend-select-all-area";

  selectAllDatasetButton = document.createElement("button");
  selectAllDatasetButton.type = "button";
  selectAllDatasetButton.className = "filter-control-btn";
  selectAllDatasetButton.addEventListener("click", toggleAllDatasets);

  let icon = document.createElement("i");
  icon.className = "fa-solid fa-filter";

  selectAllDatasetButtonText = document.createElement("span");
  selectAllDatasetButtonText.textContent = "Deselect All";

  selectAllDatasetButton.appendChild(icon);
  selectAllDatasetButton.appendChild(selectAllDatasetButtonText);
  selectAllDatasetArea.appendChild(selectAllDatasetButton);
}

function toggleAllDatasets() {
  const shouldCheck =
    selectedDatasets.length !== datasetFilterCheckboxes.length;

  datasetFilterCheckboxes.forEach((checkbox) => {
    checkbox.checked = shouldCheck;
  });

  selectedDatasets = shouldCheck ? datasets.map((dataset) => dataset.id) : [];

  updateFilterHeader(
    selectedDatasets.length,
    datasetFilterCheckboxes.length,
    datasetFilterHeaderElement,
    selectedDatasets,
    datasets,
    "name",
  );
  updateSelectAllButtonText(
    selectedDatasets.length,
    datasetFilterCheckboxes.length,
    selectAllDatasetButtonText,
  );
  applyDatasetFilter();
}

function onFilterDataset(e) {
  const datasetId = Number(e.target.id);
  if (e.target.checked) {
    selectedDatasets.push(datasetId);
  } else {
    const index = selectedDatasets.indexOf(datasetId);
    if (index > -1) {
      selectedDatasets.splice(index, 1);
    }
  }

  selectedDatasets = uniqueIds(selectedDatasets);

  updateFilterHeader(
    selectedDatasets.length,
    datasetFilterCheckboxes.length,
    datasetFilterHeaderElement,
    selectedDatasets,
    datasets,
    "name",
  );
  updateSelectAllButtonText(
    selectedDatasets.length,
    datasetFilterCheckboxes.length,
    selectAllDatasetButtonText,
  );

  applyDatasetFilter();
}

function onRequiredInputKeydown(e) {
  if (e.key !== "Enter") {
    return;
  }

  e.preventDefault();
  const query = requiredInputElement?.value.trim();
  if (!query) {
    return;
  }

  const match = datasets.find(
    (dataset) => dataset.name.toLowerCase() === query.toLowerCase(),
  );

  if (match) {
    addRequiredDatasetById(match.id);
    return;
  }

  const suggestions = getRequiredSuggestions(query);
  if (suggestions.length > 0) {
    addRequiredDatasetById(suggestions[0].id);
  }
}

function updateRequiredHeader() {
  updateFilterHeader(
    requiredDatasetIds.length,
    datasets.length,
    requiredFilterHeaderElement,
    requiredDatasetIds,
    datasets,
    "name",
  );
}

function renderRequiredChips() {
  if (!requiredChipsElement) {
    return;
  }

  requiredChipsElement.innerHTML = "";

  requiredDatasetIds
    .map((id) => datasets.find((dataset) => dataset.id === id))
    .filter((dataset) => !!dataset)
    .forEach((dataset) => {
      const chip = document.createElement("span");
      chip.className = "required-dataset-chip";

      const label = document.createElement("span");
      label.textContent = dataset.name;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", "Remove dataset");
      removeButton.textContent = "×";
      removeButton.addEventListener("click", () => {
        removeRequiredDatasetById(dataset.id);
      });

      chip.appendChild(label);
      chip.appendChild(removeButton);
      requiredChipsElement.appendChild(chip);
    });
}

function addRequiredDatasetById(datasetId) {
  if (requiredDatasetIds.includes(datasetId)) {
    return;
  }

  requiredDatasetIds.push(datasetId);
  requiredDatasetIds = uniqueIds(requiredDatasetIds);

  if (requiredInputElement) {
    requiredInputElement.value = "";
  }

  renderRequiredChips();
  updateRequiredHeader();
  updateRequiredSuggestions();
  applyDatasetFilter();
}

function removeRequiredDatasetById(datasetId) {
  requiredDatasetIds = requiredDatasetIds.filter((id) => id !== datasetId);

  renderRequiredChips();
  updateRequiredHeader();
  updateRequiredSuggestions();
  applyDatasetFilter();
}

function getRequiredSuggestions(query) {
  if (!query) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  return datasets
    .filter((dataset) => dataset.name.toLowerCase().includes(lowerQuery))
    .filter((dataset) => !requiredDatasetIds.includes(dataset.id))
    .slice(0, 8);
}

function updateRequiredSuggestions() {
  if (!requiredSuggestionsElement || !requiredInputElement) {
    return;
  }

  const query = requiredInputElement.value.trim();
  const suggestions = getRequiredSuggestions(query);

  requiredSuggestionsElement.innerHTML = "";

  if (suggestions.length === 0) {
    requiredSuggestionsElement.classList.remove("show");
    return;
  }

  suggestions.forEach((dataset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = dataset.name;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      addRequiredDatasetById(dataset.id);
    });
    requiredSuggestionsElement.appendChild(button);
  });

  requiredSuggestionsElement.classList.add("show");
}

function applyDatasetFilter() {
  readActiveFiltersFromUi();

  updateTargetCountBounds();
  const candidatePool = getCandidatePool();
  const targetCount = getValidatedTargetCount();

  setStatus(
    `Candidate pool: ${candidatePool.length} dataset(s). Required: ${requiredDatasetIds.length}. Target: ${targetCount}.`,
    "info",
  );

  if (finalDatasetIds.length > 0) {
    renderResults();
  }
}

function getSelectedMethod() {
  if (methodSelectElement) return methodSelectElement.value;
  return "diverse_convex_hull";
}

function buildApsVectors(datasetIds) {
  if (!metricSelectElement || !kValueSelectElement) return null;
  if (!__allAlgorithms || !__performanceResults) return null;
  var metric = metricSelectElement.value;
  var kValue = kValueSelectElement.value;
  var perfKey = kValueKeyMap[kValue] || kValue;
  var algorithmIds = __allAlgorithms.map(function (a) { return a.id; });
  var vectors = [];
  var validIds = [];
  for (var di = 0; di < datasetIds.length; di++) {
    var id = datasetIds[di];
    var row = algorithmIds.map(function (aid) {
      var rawValue = __performanceResults[id]?.[aid]?.[metric]?.[perfKey];
      var value = rawValue === null || rawValue === undefined || rawValue === ""
        ? NaN
        : Number(rawValue);
      return Number.isFinite(value) ? value : NaN;
    });
    var hasSomeFinite = row.some(function (v) { return Number.isFinite(v); });
    if (!hasSomeFinite) continue;
    vectors.push(row);
    validIds.push(id);
  }
  if (vectors.length === 0) return null;
  var dims = algorithmIds.length;
  for (var j = 0; j < dims; j++) {
    var colVals = [];
    for (var i = 0; i < vectors.length; i++) {
      if (Number.isFinite(vectors[i][j])) colVals.push(vectors[i][j]);
    }
    var mean = colVals.length > 0
      ? colVals.reduce(function (a, b) { return a + b; }, 0) / colVals.length
      : 0;
    for (var i = 0; i < vectors.length; i++) {
      if (!Number.isFinite(vectors[i][j])) vectors[i][j] = mean;
    }
  }
  return { vectors: vectors, datasetIds: validIds };
}

function generateRecommendation() {
  if (loadingElement) loadingElement.style.display = "flex";
  if (statusElement) statusElement.style.display = "none";
  if (generateButtonElement) generateButtonElement.disabled = true;

  setTimeout(function () {
    readActiveFiltersFromUi();
    var method = getSelectedMethod();
    var metric = metricSelectElement ? metricSelectElement.value : "ndcg";
    var kValue = kValueSelectElement ? kValueSelectElement.value : "10";

    var requiredUnique = uniqueIds(requiredDatasetIds).filter(function (id) {
      return datasets.some(function (d) { return d.id === id; });
    });
    requiredDatasetIds = requiredUnique;

    var targetCount = getValidatedTargetCount();
    var candidatePool = getCandidatePool();
    lastRecommendationPoolIds = candidatePool.map(function (dataset) { return dataset.id; });
    var warningText = "";

    if (targetCount < requiredUnique.length) {
      targetCount = requiredUnique.length;
      targetCountElement.value = targetCount;
      warningText = "Target count was smaller than seed datasets and was adjusted.";
    }

    var missingCount = Math.max(0, targetCount - requiredUnique.length);
    var poolWithoutRequired = candidatePool.filter(function (d) {
      return requiredUnique.indexOf(d.id) < 0;
    });

    var selectedRecommendations;
    if (missingCount === 0) {
      selectedRecommendations = [];
    } else if (method === "random") {
      poolWithoutRequired = shuffleArray(poolWithoutRequired);
      selectedRecommendations = poolWithoutRequired
        .slice(0, missingCount)
        .map(function (d) { return d.id; })
        .sort(function (a, b) { return a - b; });
    } else {
      var poolIds = poolWithoutRequired.map(function (d) { return d.id; });
      var apsDatasetIds = uniqueIds(requiredUnique.concat(poolIds));
      var apsData = buildApsVectors(apsDatasetIds);
      if (apsData && apsData.vectors.length > 0 && apsData.vectors[0].length > 0) {
        selectedRecommendations = selectDatasetSet(
          apsData.vectors,
          apsData.datasetIds,
          missingCount,
          method,
          requiredUnique,
        );
        selectedRecommendations = selectedRecommendations.filter(function (id) {
          return poolIds.includes(id);
        });
        selectedRecommendations.sort(function (a, b) { return a - b; });
      } else {
        selectedRecommendations = [];
        warningText = "APS performance data is unavailable for the selected metric and K-value. No random fallback was used.";
      }
    }

    recommendedDatasetIds = selectedRecommendations;
    finalDatasetIds = requiredUnique.concat(selectedRecommendations);

    if (selectedRecommendations.length < missingCount && !warningText) {
      warningText = "Not enough candidate datasets to reach your target count with current filters.";
    }

    renderResults();

    if (loadingElement) loadingElement.style.display = "none";
    if (statusElement) statusElement.style.display = "";
    if (generateButtonElement) generateButtonElement.disabled = false;

    var logRanges = {};
    for (var key in activeFilters.metadataRanges) {
      var range = activeFilters.metadataRanges[key];
      var bounds = metadataRangeBounds[key];
      if (bounds && range.min === bounds.min && range.max === bounds.max) continue;
      logRanges[key] = range;
    }

    var logInteractions = "all";
    if (activeFilters.minInteractions != null || activeFilters.maxInteractions != null) {
      var atDefault = interactionsBounds.min != null && interactionsBounds.max != null
        && activeFilters.minInteractions === interactionsBounds.min
        && activeFilters.maxInteractions === interactionsBounds.max;
      if (!atDefault) {
        logInteractions = { min: activeFilters.minInteractions, max: activeFilters.maxInteractions };
      }
    }

    var logPayload = {
      seedDatasets: requiredUnique,
      datasetFilter: selectedDatasets,
      selectionMethod: method,
      selectionMetric: metric,
      selectionKValue: kValue,
      filters: {
        feedbackType: activeFilters.feedbackType,
        interactions: logInteractions,
        metadataRanges: logRanges,
        targetCount: targetCount,
        candidatePoolSize: poolWithoutRequired.length,
      },
      resultCount: finalDatasetIds.length,
      recommendedDatasets: finalDatasetIds,
    };
    fetch("./index.php?action=log&task=saveUsage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logPayload),
    }).catch(function () {});

    if (warningText) {
      setStatus(warningText, "warning");
    } else {
      setStatus(
        "Generated " + recommendedDatasetIds.length + " recommendation(s) using " + method + ". Final selection contains " + finalDatasetIds.length + " dataset(s).",
        "success",
      );
    }
  }, 30);
}

function renderResultsLegacy() {
  if (!resultsListElement || !resultsSummaryElement) {
    return;
  }

  var finalDatasets = getFinalDatasets();

  resultsListElement.innerHTML = "";

  if (finalDatasets.length === 0) {
    resultsSummaryElement.textContent = "No datasets selected yet.";
    if (openApsButtonElement) {
      openApsButtonElement.disabled = true;
    }
    return;
  }

  resultsSummaryElement.textContent = "Final: " + finalDatasets.length + " | Required: " + requiredDatasetIds.length + " | Recommended: " + recommendedDatasetIds.length;

  finalDatasets.forEach(function (dataset, datasetIndex) {
    var isRequired = requiredDatasetIds.includes(dataset.id);
    var metaParts = getDatasetMetaParts(dataset);

    var listItem = document.createElement("li");
    listItem.className =
      "recommend-result-card" + (isRequired ? " is-required" : "");

    var headerRow = document.createElement("div");
    headerRow.className = "recommend-result-header";

    var nameDiv = document.createElement("div");
    nameDiv.className = "recommend-result-name";
    var indexSpan = document.createElement("span");
    indexSpan.className = "recommend-result-index";
    indexSpan.textContent = String(datasetIndex + 1);
    var nameStrong = document.createElement("strong");
    nameStrong.textContent = dataset.name;
    nameDiv.appendChild(indexSpan);
    nameDiv.appendChild(nameStrong);

    var badgesDiv = document.createElement("div");
    badgesDiv.className = "recommend-result-badges";

    var feedbackBadge = document.createElement("span");
    feedbackBadge.className = "badge " + (dataset.feedbackType === "explicit" ? "text-bg-info" : "text-bg-warning") + " me-1";
    feedbackBadge.textContent = dataset.feedbackType || "—";
    badgesDiv.appendChild(feedbackBadge);

    var typeBadge = document.createElement("span");
    typeBadge.className = isRequired ? "badge text-bg-primary" : "badge text-bg-success";
    typeBadge.textContent = isRequired ? "Required" : "Recommended";
    badgesDiv.appendChild(typeBadge);

    headerRow.appendChild(nameDiv);
    headerRow.appendChild(badgesDiv);
    listItem.appendChild(headerRow);

    if (metaParts.length > 0) {
      var metaDiv = document.createElement("div");
      metaDiv.className = "recommend-result-meta";
      metaParts.forEach(function (part) {
        var span = document.createElement("span");
        span.className = "recommend-meta-chip";
        span.textContent = part.label + ": " + part.value;
        metaDiv.appendChild(span);
      });
      listItem.appendChild(metaDiv);
    }

    resultsListElement.appendChild(listItem);
  });

  if (openApsButtonElement) {
    openApsButtonElement.disabled = false;
  }
}

function loadResultTablePreferences() {
  try {
    var stored = JSON.parse(sessionStorage.getItem(resultTablePreferenceKey) || "null");
    if (!stored) return;

    var optionalKeys = resultColumnDefinitions
      .filter(function (column) { return !column.fixed; })
      .map(function (column) { return column.key; });

    if (Array.isArray(stored.visibleColumns)) {
      visibleResultColumnKeys = stored.visibleColumns.filter(function (key) {
        return optionalKeys.includes(key);
      });
    }
    if (Array.isArray(stored.order)) {
      resultOrderIds = stored.order
        .map(function (id) { return Number(id); })
        .filter(function (id) { return Number.isFinite(id); });
    }
    if (resultColumnDefinitions.some(function (column) { return column.key === stored.sortKey; })) {
      resultSortKey = stored.sortKey;
      resultSortDirection = stored.sortDirection === "desc" ? "desc" : "asc";
    }
  } catch (error) {
    visibleResultColumnKeys = defaultResultColumnKeys.slice();
  }
}

function saveResultTablePreferences() {
  try {
    sessionStorage.setItem(resultTablePreferenceKey, JSON.stringify({
      visibleColumns: visibleResultColumnKeys,
      order: resultOrderIds,
      sortKey: resultSortKey,
      sortDirection: resultSortDirection,
    }));
  } catch (error) {
    // The table remains fully usable when browser storage is unavailable.
  }
}

function initializeResultColumnControls() {
  if (!resultColumnOptionsElement) return;
  resultColumnOptionsElement.innerHTML = "";

  resultColumnDefinitions
    .filter(function (column) { return !column.fixed; })
    .forEach(function (column) {
      var label = document.createElement("label");
      label.className = "recommend-column-option";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = column.key;
      checkbox.checked = visibleResultColumnKeys.includes(column.key);
      checkbox.addEventListener("change", function () {
        if (checkbox.checked) {
          visibleResultColumnKeys = Array.from(new Set(visibleResultColumnKeys.concat(column.key)));
        } else {
          visibleResultColumnKeys = visibleResultColumnKeys.filter(function (key) { return key !== column.key; });
        }
        saveResultTablePreferences();
        renderResults();
      });

      var text = document.createElement("span");
      text.textContent = column.label;
      label.appendChild(checkbox);
      label.appendChild(text);
      resultColumnOptionsElement.appendChild(label);
    });

  var resetButton = document.getElementById("recommend-columns-reset");
  if (resetButton) {
    resetButton.onclick = function () {
      visibleResultColumnKeys = defaultResultColumnKeys.slice();
      resultSortKey = null;
      resultSortDirection = null;
      saveResultTablePreferences();
      initializeResultColumnControls();
      renderResults();
    };
  }
}

function getVisibleResultColumns() {
  return resultColumnDefinitions.filter(function (column) {
    return column.fixed || visibleResultColumnKeys.includes(column.key);
  });
}

function getResultColumn(key) {
  return resultColumnDefinitions.find(function (column) { return column.key === key; });
}

function reconcileResultOrder() {
  var validIds = finalDatasetIds.slice();
  var keptIds = resultOrderIds.filter(function (id) { return validIds.includes(id); });
  var newIds = validIds.filter(function (id) { return !keptIds.includes(id); });
  resultOrderIds = keptIds.concat(newIds);
}

function getConfiguredFinalDatasets() {
  reconcileResultOrder();
  var rows = getFinalDatasets();

  if (resultSortKey) {
    var column = getResultColumn(resultSortKey);
    var direction = resultSortDirection === "desc" ? -1 : 1;
    rows.sort(function (left, right) {
      var leftValue = column.raw ? column.raw(left) : column.value(left);
      var rightValue = column.raw ? column.raw(right) : column.value(right);
      var leftMissing = leftValue === null || leftValue === undefined || (column.numeric && !Number.isFinite(leftValue));
      var rightMissing = rightValue === null || rightValue === undefined || (column.numeric && !Number.isFinite(rightValue));
      if (leftMissing && rightMissing) return 0;
      if (leftMissing) return 1;
      if (rightMissing) return -1;
      if (column.numeric) return (leftValue - rightValue) * direction;
      return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" }) * direction;
    });
    return rows;
  }

  var orderIndex = new Map(resultOrderIds.map(function (id, index) { return [id, index]; }));
  rows.sort(function (left, right) {
    return (orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER);
  });
  return rows;
}

function updateResultSortStatus() {
  if (!resultSortStatusElement) return;
  if (!resultSortKey) {
    resultSortStatusElement.textContent = "Custom Order";
    return;
  }
  var column = getResultColumn(resultSortKey);
  resultSortStatusElement.textContent = "Sorted by " + column.label + (resultSortDirection === "desc" ? " \u2193" : " \u2191");
}

function setResultSort(columnKey) {
  if (resultSortKey !== columnKey) {
    resultSortKey = columnKey;
    resultSortDirection = "asc";
  } else if (resultSortDirection === "asc") {
    resultSortDirection = "desc";
  } else {
    resultSortKey = null;
    resultSortDirection = null;
  }
  saveResultTablePreferences();
  renderResults();
}

function renderResultTableHead(columns) {
  if (!resultsHeadElement) return;
  resultsHeadElement.innerHTML = "";
  var row = document.createElement("tr");

  var dragHeader = document.createElement("th");
  dragHeader.scope = "col";
  dragHeader.setAttribute("aria-label", "Reorder");
  row.appendChild(dragHeader);

  var indexHeader = document.createElement("th");
  indexHeader.scope = "col";
  indexHeader.textContent = "#";
  row.appendChild(indexHeader);

  columns.forEach(function (column) {
    var th = document.createElement("th");
    th.scope = "col";
    th.setAttribute("aria-sort", resultSortKey === column.key
      ? (resultSortDirection === "desc" ? "descending" : "ascending")
      : "none");

    var button = document.createElement("button");
    button.type = "button";
    button.className = "recommend-sort-button" + (resultSortKey === column.key ? " is-active" : "");
    button.setAttribute("aria-label", "Sort by " + column.label);
    button.textContent = column.label;

    var icon = document.createElement("i");
    icon.className = resultSortKey === column.key
      ? "fa-solid " + (resultSortDirection === "desc" ? "fa-arrow-down" : "fa-arrow-up")
      : "fa-solid fa-sort";
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);
    button.addEventListener("click", function () { setResultSort(column.key); });
    th.appendChild(button);
    row.appendChild(th);
  });
  resultsHeadElement.appendChild(row);
}

function reorderResult(draggedId, targetId, placeAfter) {
  var orderedIds = getConfiguredFinalDatasets().map(function (dataset) { return dataset.id; });
  orderedIds = orderedIds.filter(function (id) { return id !== draggedId; });
  var targetIndex = orderedIds.indexOf(targetId);
  if (targetIndex < 0) return;
  orderedIds.splice(targetIndex + (placeAfter ? 1 : 0), 0, draggedId);
  resultOrderIds = orderedIds;
  resultSortKey = null;
  resultSortDirection = null;
  saveResultTablePreferences();
  renderResults();
}

function moveResultByKeyboard(datasetId, direction) {
  var orderedIds = getConfiguredFinalDatasets().map(function (dataset) { return dataset.id; });
  var currentIndex = orderedIds.indexOf(datasetId);
  var nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return;
  var temporary = orderedIds[currentIndex];
  orderedIds[currentIndex] = orderedIds[nextIndex];
  orderedIds[nextIndex] = temporary;
  resultOrderIds = orderedIds;
  resultSortKey = null;
  resultSortDirection = null;
  saveResultTablePreferences();
  renderResults();
  requestAnimationFrame(function () {
    document.querySelector('[data-result-id="' + datasetId + '"] .recommend-drag-handle')?.focus();
  });
}

function clearDragTargets() {
  if (!resultsListElement) return;
  resultsListElement.querySelectorAll("tr").forEach(function (row) {
    row.classList.remove("is-drag-target");
  });
}

function clearDragState() {
  if (!resultsListElement) return;
  resultsListElement.querySelectorAll("tr").forEach(function (row) {
    row.classList.remove("is-dragging", "is-drag-target");
  });
}

function createResultRow(dataset, datasetIndex, columns) {
  var isRequired = requiredDatasetIds.includes(dataset.id);
  var row = document.createElement("tr");
  row.dataset.resultId = String(dataset.id);
  row.draggable = true;
  row.className = isRequired ? "is-required" : "is-recommended";

  var dragCell = document.createElement("td");
  var dragButton = document.createElement("button");
  dragButton.type = "button";
  dragButton.className = "recommend-drag-handle";
  dragButton.innerHTML = '<i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>';
  dragButton.setAttribute("aria-label", "Move " + dataset.name + ". Use the up and down arrow keys to reorder.");
  dragButton.addEventListener("keydown", function (event) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      moveResultByKeyboard(dataset.id, event.key === "ArrowUp" ? -1 : 1);
    }
  });
  dragCell.appendChild(dragButton);
  row.appendChild(dragCell);

  var indexCell = document.createElement("td");
  indexCell.textContent = String(datasetIndex + 1);
  row.appendChild(indexCell);

  columns.forEach(function (column) {
    var cell = document.createElement("td");
    var value = column.value(dataset);
    if (column.key === "name") {
      cell.className = "recommend-dataset-cell";
      cell.textContent = value;
      cell.title = value;
    } else if (column.key === "status") {
      var badge = document.createElement("span");
      badge.className = "recommend-result-status" + (isRequired ? " is-required" : "");
      badge.textContent = value;
      cell.appendChild(badge);
    } else {
      cell.textContent = value;
    }
    row.appendChild(cell);
  });

  row.addEventListener("dragstart", function (event) {
    draggedResultId = dataset.id;
    row.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(dataset.id));
  });
  row.addEventListener("dragover", function (event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDragTargets();
    row.classList.add("is-drag-target");
  });
  row.addEventListener("drop", function (event) {
    event.preventDefault();
    var sourceId = Number(event.dataTransfer.getData("text/plain") || draggedResultId);
    var bounds = row.getBoundingClientRect();
    var placeAfter = event.clientY > bounds.top + bounds.height / 2;
    clearDragState();
    if (Number.isFinite(sourceId) && sourceId !== dataset.id) reorderResult(sourceId, dataset.id, placeAfter);
  });
  row.addEventListener("dragend", function () {
    draggedResultId = null;
    clearDragState();
  });
  row.addEventListener("mouseenter", function () {
    highlightApsPoint(dataset.id);
    highlightResultRow(dataset.id, false);
  });
  row.addEventListener("mouseleave", function () {
    clearApsHighlight();
    highlightResultRow(null, false);
  });
  return row;
}

function renderResults() {
  if (!resultsListElement || !resultsSummaryElement) return;

  var finalDatasets = getConfiguredFinalDatasets();
  var columns = getVisibleResultColumns();
  resultsListElement.innerHTML = "";
  renderResultTableHead(columns);
  updateResultSortStatus();

  if (resultsTableElement) {
    resultsTableElement.style.minWidth = Math.max(610, 76 + 205 + (columns.length - 1) * 112) + "px";
  }

  if (finalDatasets.length === 0) {
    resultsSummaryElement.textContent = "No datasets selected yet.";
    if (resultsEmptyElement) resultsEmptyElement.style.display = "block";
    if (openApsButtonElement) openApsButtonElement.disabled = true;
    if (exportButtonElement) exportButtonElement.disabled = true;
    resetApsPreview("Generate a recommendation to display the dataset pool.");
    return;
  }

  if (resultsEmptyElement) resultsEmptyElement.style.display = "none";
  resultsSummaryElement.textContent = "Final: " + finalDatasets.length + " | Required: " + requiredDatasetIds.length + " | Recommended: " + recommendedDatasetIds.length;
  finalDatasets.forEach(function (dataset, datasetIndex) {
    resultsListElement.appendChild(createResultRow(dataset, datasetIndex, columns));
  });

  if (openApsButtonElement) openApsButtonElement.disabled = false;
  if (exportButtonElement) exportButtonElement.disabled = false;
  updateApsPreview();
}

function getApsControlElements() {
  return [
    apsZoomOutButtonElement,
    apsZoomInButtonElement,
    apsResetButtonElement,
    apsApplyRangeButtonElement,
    apsXMinInputElement,
    apsXMaxInputElement,
    apsYMinInputElement,
    apsYMaxInputElement,
  ].filter(function (element) { return !!element; });
}

function setApsControlsEnabled(enabled) {
  getApsControlElements().forEach(function (element) { element.disabled = !enabled; });
  if (!enabled) {
    [apsXMinInputElement, apsXMaxInputElement, apsYMinInputElement, apsYMaxInputElement].forEach(function (input) {
      if (!input) return;
      input.value = "";
      input.setCustomValidity("");
    });
  }
}

function calculateApsDefaultBounds(points, chartWidth, chartHeight) {
  if (!points || points.length === 0) return null;
  var xValues = points.map(function (point) { return point.x; });
  var yValues = points.map(function (point) { return point.y; });
  var minX = Math.min.apply(null, xValues);
  var maxX = Math.max.apply(null, xValues);
  var minY = Math.min.apply(null, yValues);
  var maxY = Math.max.apply(null, yValues);
  var centerX = (minX + maxX) / 2;
  var centerY = (minY + maxY) / 2;
  var rawXSpan = maxX - minX;
  var rawYSpan = maxY - minY;
  var magnitudeSpan = Math.max(Math.abs(centerX), Math.abs(centerY)) * 0.08;
  var referenceSpan = Math.max(rawXSpan, rawYSpan, magnitudeSpan, 0.01);
  var paddedXSpan = Math.max(rawXSpan * 1.18, referenceSpan * 0.08);
  var paddedYSpan = Math.max(rawYSpan * 1.18, referenceSpan * 0.08);
  var safeWidth = Math.max(Number(chartWidth) || 0, 1);
  var safeHeight = Math.max(Number(chartHeight) || 0, 1);
  var unitsPerPixel = Math.max(paddedXSpan / safeWidth, paddedYSpan / safeHeight);
  var xSpan = unitsPerPixel * safeWidth;
  var ySpan = unitsPerPixel * safeHeight;

  return {
    xMin: centerX - xSpan / 2,
    xMax: centerX + xSpan / 2,
    yMin: centerY - ySpan / 2,
    yMax: centerY + ySpan / 2,
  };
}

function getApsChartAreaSize() {
  if (apsPreviewChart?.chartArea) {
    return {
      width: Math.max(apsPreviewChart.chartArea.width, 1),
      height: Math.max(apsPreviewChart.chartArea.height, 1),
    };
  }
  return {
    width: Math.max((apsPreviewCanvasElement?.clientWidth || 400) - 80, 1),
    height: Math.max((apsPreviewCanvasElement?.clientHeight || 320) - 70, 1),
  };
}

function formatApsAxisValue(value) {
  if (!Number.isFinite(Number(value))) return "";
  return String(Number(Number(value).toPrecision(7)));
}

function writeApsAxisInputs(bounds) {
  if (!bounds) return;
  if (apsXMinInputElement) apsXMinInputElement.value = formatApsAxisValue(bounds.xMin);
  if (apsXMaxInputElement) apsXMaxInputElement.value = formatApsAxisValue(bounds.xMax);
  if (apsYMinInputElement) apsYMinInputElement.value = formatApsAxisValue(bounds.yMin);
  if (apsYMaxInputElement) apsYMaxInputElement.value = formatApsAxisValue(bounds.yMax);
}

function getCurrentApsBounds(chart) {
  var activeChart = chart || apsPreviewChart;
  if (!activeChart?.scales?.x || !activeChart?.scales?.y) return null;
  return {
    xMin: activeChart.scales.x.min,
    xMax: activeChart.scales.x.max,
    yMin: activeChart.scales.y.min,
    yMax: activeChart.scales.y.max,
  };
}

function syncApsAxisInputs(chart) {
  writeApsAxisInputs(getCurrentApsBounds(chart));
}

function setApsChartBounds(bounds, updateMode) {
  if (!apsPreviewChart || !bounds) return;
  apsPreviewChart.options.scales.x.min = bounds.xMin;
  apsPreviewChart.options.scales.x.max = bounds.xMax;
  apsPreviewChart.options.scales.y.min = bounds.yMin;
  apsPreviewChart.options.scales.y.max = bounds.yMax;
  writeApsAxisInputs(bounds);
  apsPreviewChart.update(updateMode || "none");
}

function fitApsPreviewToPoints(withoutAnimation) {
  if (!apsPreviewChart || apsPreviewPoints.length === 0) return;
  var area = getApsChartAreaSize();
  apsPreviewDefaultBounds = calculateApsDefaultBounds(apsPreviewPoints, area.width, area.height);
  apsPreviewIsFitted = true;
  setApsChartBounds(apsPreviewDefaultBounds, withoutAnimation ? "none" : undefined);
}

function resetApsAxisView() {
  fitApsPreviewToPoints(false);
}

function zoomApsPreview(factor) {
  var bounds = getCurrentApsBounds();
  if (!bounds || !Number.isFinite(factor) || factor <= 0) return;
  var centerX = (bounds.xMin + bounds.xMax) / 2;
  var centerY = (bounds.yMin + bounds.yMax) / 2;
  var halfWidth = (bounds.xMax - bounds.xMin) * factor / 2;
  var halfHeight = (bounds.yMax - bounds.yMin) * factor / 2;
  apsPreviewIsFitted = false;
  setApsChartBounds({
    xMin: centerX - halfWidth,
    xMax: centerX + halfWidth,
    yMin: centerY - halfHeight,
    yMax: centerY + halfHeight,
  }, "none");
}

function applyApsAxisInputs() {
  var inputs = [apsXMinInputElement, apsXMaxInputElement, apsYMinInputElement, apsYMaxInputElement];
  if (!apsPreviewChart || inputs.some(function (input) { return !input; })) return;
  inputs.forEach(function (input) { input.setCustomValidity(""); });
  var values = inputs.map(function (input) { return Number(input.value); });
  var invalidInputIndex = values.findIndex(function (value, index) {
    return inputs[index].value.trim() === "" || !Number.isFinite(value);
  });
  if (invalidInputIndex >= 0) {
    inputs[invalidInputIndex].setCustomValidity("Enter a valid number for every axis limit.");
    inputs[invalidInputIndex].reportValidity();
    return;
  }
  if (values[0] >= values[1]) {
    apsXMaxInputElement.setCustomValidity("X Max must be greater than X Min.");
    apsXMaxInputElement.reportValidity();
    return;
  }
  if (values[2] >= values[3]) {
    apsYMaxInputElement.setCustomValidity("Y Max must be greater than Y Min.");
    apsYMaxInputElement.reportValidity();
    return;
  }
  apsPreviewIsFitted = false;
  setApsChartBounds({ xMin: values[0], xMax: values[1], yMin: values[2], yMax: values[3] }, "none");
}

function resetApsPreview(message) {
  apsPreviewRequestId += 1;
  if (apsPreviewChart) {
    apsPreviewChart.destroy();
    apsPreviewChart = null;
  }
  apsPreviewPoints = [];
  apsPreviewDefaultBounds = null;
  apsPreviewIsFitted = true;
  setApsControlsEnabled(false);
  if (apsPreviewCanvasElement) apsPreviewCanvasElement.style.display = "none";
  if (apsPreviewEmptyElement) {
    apsPreviewEmptyElement.style.display = "flex";
    var text = apsPreviewEmptyElement.querySelector("span");
    if (text) text.textContent = message;
  }
  if (apsPreviewMetaElement) apsPreviewMetaElement.textContent = "Waiting for recommendation";
  if (apsPreviewNoteElement) apsPreviewNoteElement.textContent = "The preview uses the APS metric and K-value selected in Step 2.";
}

async function updateApsPreview() {
  if (!apsPreviewCanvasElement || finalDatasetIds.length === 0) return;
  var requestId = ++apsPreviewRequestId;
  var poolIds = lastRecommendationPoolIds.length > 0
    ? lastRecommendationPoolIds.slice()
    : getCandidatePool().map(function (dataset) { return dataset.id; });
  var previewIds = Array.from(new Set(poolIds.concat(requiredDatasetIds)));

  if (apsPreviewEmptyElement) {
    apsPreviewEmptyElement.style.display = "flex";
    var loadingText = apsPreviewEmptyElement.querySelector("span");
    if (loadingText) loadingText.textContent = "Loading the Algorithm Performance Space\u2026";
  }
  apsPreviewCanvasElement.style.display = "none";
  setApsControlsEnabled(false);
  if (apsPreviewMetaElement) apsPreviewMetaElement.textContent = poolIds.length + " Pool Datasets";

  var pcaResults = await ApiService.getPcaResults();
  if (requestId !== apsPreviewRequestId) return;
  if (!pcaResults || typeof Chart === "undefined") {
    resetApsPreview("The APS preview could not be loaded.");
    return;
  }

  var metric = metricSelectElement?.value || "ndcg";
  var kValue = kValueSelectElement?.value || "10";
  var pcaKey = kValueKeyMap[kValue] || kValue;
  var points = pcaResults
    .filter(function (result) { return previewIds.includes(Number(result.datasetId)); })
    .map(function (result) {
      var coordinates = result?.[metric]?.[pcaKey];
      var dataset = datasets.find(function (item) { return item.id === Number(result.datasetId); });
      if (!dataset || !coordinates || !Number.isFinite(Number(coordinates.x)) || !Number.isFinite(Number(coordinates.y))) return null;
      var id = Number(result.datasetId);
      var status = requiredDatasetIds.includes(id)
        ? "Required"
        : recommendedDatasetIds.includes(id) ? "Recommended" : "Pool";
      return { id: id, x: Number(coordinates.x), y: Number(coordinates.y), name: dataset.name, status: status };
    })
    .filter(function (point) { return !!point; });

  if (points.length === 0) {
    resetApsPreview("No APS coordinates are available for the selected metric and K-value.");
    return;
  }

  if (apsPreviewChart) {
    apsPreviewChart.destroy();
    apsPreviewChart = null;
  }
  var groupedPoints = {
    Pool: points.filter(function (point) { return point.status === "Pool"; }),
    Recommended: points.filter(function (point) { return point.status === "Recommended"; }),
    Required: points.filter(function (point) { return point.status === "Required"; }),
  };
  var styles = {
    Pool: { background: "#aeb9c9", border: "#7d899b", radius: 4.5 },
    Recommended: { background: "#1f9d62", border: "#126d43", radius: 7 },
    Required: { background: "#315fd1", border: "#1d429d", radius: 7 },
  };

  apsPreviewCanvasElement.style.display = "block";
  if (apsPreviewEmptyElement) apsPreviewEmptyElement.style.display = "none";
  apsPreviewPoints = points.slice();
  var initialArea = getApsChartAreaSize();
  apsPreviewDefaultBounds = calculateApsDefaultBounds(points, initialArea.width, initialArea.height);
  apsPreviewIsFitted = true;
  apsPreviewChart = new Chart(apsPreviewCanvasElement, {
    type: "scatter",
    data: {
      datasets: ["Pool", "Recommended", "Required"].map(function (status) {
        return {
          label: status,
          data: groupedPoints[status],
          parsing: false,
          pointRadius: styles[status].radius,
          pointHoverRadius: styles[status].radius + 2,
          pointHitRadius: 9,
          pointBackgroundColor: styles[status].background,
          pointBorderColor: styles[status].border,
          pointBorderWidth: status === "Pool" ? 1 : 2,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 260 },
      interaction: { mode: "nearest", intersect: true },
      onClick: function (event, elements, chart) {
        if (!elements.length) return;
        var point = chart.data.datasets[elements[0].datasetIndex].data[elements[0].index];
        highlightResultRow(point.id, true);
      },
      onHover: function (event, elements, chart) {
        chart.canvas.style.cursor = elements.length ? "pointer" : "default";
        if (elements.length) {
          var point = chart.data.datasets[elements[0].datasetIndex].data[elements[0].index];
          highlightResultRow(point.id, false);
        } else {
          highlightResultRow(null, false);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function (contexts) { return contexts[0]?.raw?.name || "Dataset"; },
            label: function (context) {
              var point = context.raw;
              return [point.status, "APS 1: " + point.x.toFixed(3), "APS 2: " + point.y.toFixed(3)];
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "xy",
            modifierKey: "shift",
            onPanComplete: function (context) {
              apsPreviewIsFitted = false;
              syncApsAxisInputs(context.chart);
            },
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "xy",
            onZoomComplete: function (context) {
              apsPreviewIsFitted = false;
              syncApsAxisInputs(context.chart);
            },
          },
        },
      },
      scales: {
        x: {
          min: apsPreviewDefaultBounds.xMin,
          max: apsPreviewDefaultBounds.xMax,
          title: { display: true, text: "APS Dimension 1", color: "#657289", font: { size: 10, weight: "600" } },
          grid: { color: "rgba(124, 141, 169, 0.12)" },
          ticks: { maxTicksLimit: 8, font: { size: 9 } },
        },
        y: {
          min: apsPreviewDefaultBounds.yMin,
          max: apsPreviewDefaultBounds.yMax,
          title: { display: true, text: "APS Dimension 2", color: "#657289", font: { size: 10, weight: "600" } },
          grid: { color: "rgba(124, 141, 169, 0.12)" },
          ticks: { maxTicksLimit: 8, font: { size: 9 } },
        },
      },
    },
  });
  setApsControlsEnabled(true);
  fitApsPreviewToPoints(true);

  var missingCount = previewIds.length - points.length;
  if (apsPreviewMetaElement) apsPreviewMetaElement.textContent = poolIds.length + " Pool Datasets";
  if (apsPreviewNoteElement) {
    var metricLabel = metricSelectElement?.options[metricSelectElement.selectedIndex]?.text || metric.toUpperCase();
    apsPreviewNoteElement.textContent = metricLabel + " @" + kValue
      + (missingCount > 0 ? " \u00b7 " + missingCount + " dataset(s) without coordinates" : " \u00b7 All pool datasets displayed")
      + " \u00b7 Scroll to zoom \u00b7 Shift + drag to pan \u00b7 Double-click to fit";
  }
}

function highlightResultRow(datasetId, shouldScroll) {
  if (!resultsListElement) return;
  var selectedRow = null;
  resultsListElement.querySelectorAll("tr").forEach(function (row) {
    var isSelected = datasetId !== null && Number(row.dataset.resultId) === datasetId;
    row.classList.toggle("is-chart-highlighted", isSelected);
    if (isSelected) selectedRow = row;
  });
  if (selectedRow && shouldScroll) selectedRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function highlightApsPoint(datasetId) {
  if (!apsPreviewChart) return;
  var active = null;
  apsPreviewChart.data.datasets.some(function (chartDataset, datasetIndex) {
    var pointIndex = chartDataset.data.findIndex(function (point) { return point.id === datasetId; });
    if (pointIndex >= 0) {
      active = { datasetIndex: datasetIndex, index: pointIndex };
      return true;
    }
    return false;
  });
  if (!active) return;
  apsPreviewChart.setActiveElements([active]);
  apsPreviewChart.tooltip?.setActiveElements([active], { x: 0, y: 0 });
  apsPreviewChart.update("none");
}

function clearApsHighlight() {
  if (!apsPreviewChart) return;
  apsPreviewChart.setActiveElements([]);
  apsPreviewChart.tooltip?.setActiveElements([], { x: 0, y: 0 });
  apsPreviewChart.update("none");
}

function openRecommendationInAps() {
  if (finalDatasetIds.length === 0) {
    setStatus("Generate a recommendation first.", "warning");
    return;
  }

  const url = getQueryString({
    tab: "aps",
    datasets: finalDatasetIds.join(" "),
    metric: metricSelectElement?.value || "ndcg",
    k: kValueKeyMap[kValueSelectElement?.value || "10"] || "ten",
  });

  window.location.href = url;
}

function shareRecommendState() {
  const queryData = {
    tab: "recommendDatasets",
    datasets: selectedDatasets.join(" "),
    requiredDatasets: requiredDatasetIds.join(" "),
    targetCount: String(getValidatedTargetCount()),
  };

  readActiveFiltersFromUi();
  if (activeFilters.feedbackType !== "all") {
    queryData.feedbackType = activeFilters.feedbackType;
  }
  if (activeFilters.minInteractions !== null) {
    queryData.minInteractions = String(activeFilters.minInteractions);
  }
  if (activeFilters.maxInteractions !== null) {
    queryData.maxInteractions = String(activeFilters.maxInteractions);
  }

  var method = getSelectedMethod();
  if (method !== "diverse_convex_hull") queryData.method = method;
  if (metricSelectElement && metricSelectElement.value !== "ndcg") queryData.metric = metricSelectElement.value;
  if (kValueSelectElement && kValueSelectElement.value !== "10") queryData.kValue = kValueSelectElement.value;

  const url = getQueryString(queryData);
  copyToClipboard(url, "recommend-share-btn");
}

function getCandidatePool() {
  return datasets.filter((dataset) => {
    if (!selectedDatasets.includes(dataset.id)) {
      return false;
    }

    if (
      activeFilters.feedbackType !== "all" &&
      dataset.feedbackType !== activeFilters.feedbackType
    ) {
      return false;
    }

    const interactions = Number(dataset.numberOfInteractions);
    if (
      activeFilters.minInteractions !== null &&
      Number.isFinite(interactions) &&
      interactions < activeFilters.minInteractions
    ) {
      return false;
    }

    if (
      activeFilters.maxInteractions !== null &&
      Number.isFinite(interactions) &&
      interactions > activeFilters.maxInteractions
    ) {
      return false;
    }

    if (!passesMetadataRangeFilters(dataset)) {
      return false;
    }

    return true;
  });
}

function passesMetadataRangeFilters(dataset) {
  const ranges = activeFilters.metadataRanges || {};
  return metadataRangeFields.every((field) => {
    const range = ranges[field.key];
    if (!range) {
      return true;
    }

    const value = Number(dataset[field.key]);
    if (!Number.isFinite(value)) {
      return isDefaultMetadataRange(field.key, range);
    }

    if (range.min !== null && value < range.min) {
      return false;
    }
    if (range.max !== null && value > range.max) {
      return false;
    }
    return true;
  });
}

function isDefaultMetadataRange(key, range) {
  const bounds = metadataRangeBounds[key];
  if (!bounds) {
    return true;
  }

  const minMatches = Math.abs(range.min - bounds.min) < 1e-9;
  const maxMatches = Math.abs(range.max - bounds.max) < 1e-9;
  return minMatches && maxMatches;
}

function readRangesFromSlider(sliderId) {
  var sliderEl = document.getElementById(sliderId);
  if (!sliderEl || !sliderEl.noUiSlider) return { min: null, max: null };
  var vals = sliderEl.noUiSlider.get();
  var min = Number(vals[0]);
  var max = Number(vals[1]);
  return { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null };
}

function readActiveFiltersFromUi() {
  var interactionVals = readRangesFromSlider("slider-interactions");

  activeFilters = {
    feedbackType: feedbackTypeElement?.value || "all",
    minInteractions: interactionVals.min,
    maxInteractions: interactionVals.max,
    metadataRanges: {},
  };

  metadataRangeFields.forEach(function (field) {
    activeFilters.metadataRanges[field.key] = readRangesFromSlider(field.sliderId);
  });
}

function setMetadataRangeBounds() {
  metadataRangeFields.forEach(function (field) {
    var values = datasets
      .map(function (d) { return Number(d[field.key]); })
      .filter(function (v) { return Number.isFinite(v); });

    if (values.length === 0) return;

    var rawMin = Math.min.apply(null, values);
    var rawMax = Math.max.apply(null, values);
    var fmtMin = Number(formatMinRangeValue(rawMin));
    var fmtMax = Number(formatMaxRangeValue(rawMax));
    metadataRangeBounds[field.key] = { min: fmtMin, max: fmtMax };

    var sliderEl = document.getElementById(field.sliderId);
    if (!sliderEl) return;

    if (sliderEl.noUiSlider) {
      sliderEl.noUiSlider.destroy();
    }

    var rangeMin = fmtMin === fmtMax ? fmtMin - 1 : fmtMin;
    var rangeMax = fmtMax === fmtMin ? fmtMax + 1 : fmtMax;

    var createOptions = {
      start: [fmtMin, fmtMax],
      connect: true,
      range: {
        min: rangeMin,
        max: rangeMax,
      },
    };

    if (field.step !== null) {
      createOptions.step = field.step;
    }

    noUiSlider.create(sliderEl, createOptions);

    configureSliderPresentation(sliderEl, fmtMin, fmtMax);

    sliderEl.noUiSlider.on("update", function (vals) {
      var minInp = document.getElementById(field.sliderId + "-min");
      var maxInp = document.getElementById(field.sliderId + "-max");
      if (minInp) minInp.value = String(Number(vals[0]));
      if (maxInp) maxInp.value = String(Number(vals[1]));
      updateSliderVisualState(sliderEl, vals);
    });

    sliderEl.noUiSlider.on("change", function () {
      applyDatasetFilter();
    });

    (function (sEl) {
      function onInput() {
        var minInp = document.getElementById(sEl.id + "-min");
        var maxInp = document.getElementById(sEl.id + "-max");
        var minVal = minInp ? Number(minInp.value) : NaN;
        var maxVal = maxInp ? Number(maxInp.value) : NaN;
        if (Number.isFinite(minVal) && Number.isFinite(maxVal)) {
          sEl.noUiSlider.set([minVal, maxVal]);
          applyDatasetFilter();
        }
      }
      var minInp = document.getElementById(sEl.id + "-min");
      var maxInp = document.getElementById(sEl.id + "-max");
      if (minInp) minInp.addEventListener("change", onInput);
      if (maxInp) maxInp.addEventListener("change", onInput);
    })(sliderEl);
  });
}

function configureSliderPresentation(sliderElement, defaultMin, defaultMax) {
  sliderElement.dataset.defaultMin = String(defaultMin);
  sliderElement.dataset.defaultMax = String(defaultMax);

  const label =
    sliderElement.closest(".recommend-range-card")?.dataset.sliderLabel ||
    "Range";
  const handles = sliderElement.querySelectorAll(".noUi-handle");
  if (handles[0]) {
    handles[0].setAttribute("aria-label", label + " minimum");
  }
  if (handles[1]) {
    handles[1].setAttribute("aria-label", label + " maximum");
  }
}

function updateSliderVisualState(sliderElement, values) {
  const card = sliderElement.closest(".recommend-range-card");
  if (!card) return;

  const currentMin = Number(values[0]);
  const currentMax = Number(values[1]);
  const defaultMin = Number(sliderElement.dataset.defaultMin);
  const defaultMax = Number(sliderElement.dataset.defaultMax);
  const epsilon = Math.max(
    1e-9,
    Math.abs(defaultMax - defaultMin) * 1e-7,
  );
  const isFiltered =
    Math.abs(currentMin - defaultMin) > epsilon ||
    Math.abs(currentMax - defaultMax) > epsilon;

  card.classList.toggle("is-filtered", isFiltered);
}

function formatMinRangeValue(value) {
  const factor = 100;
  const truncated = Math.trunc(value * factor) / factor;
  return truncated.toString();
}

function formatMaxRangeValue(value, step) {
  const factor = 100;
  const ceiled = Math.ceil(value * factor) / factor;
  return ceiled.toString();
}

function getValidatedTargetCount() {
  if (!targetCountElement) {
    return 1;
  }

  const bounds = updateTargetCountBounds();
  let targetCount = Number(targetCountElement.value);
  const minTarget = bounds.minTarget;
  if (!Number.isFinite(targetCount) || targetCount < minTarget) {
    targetCount = minTarget;
    targetCountElement.value = targetCount;
  }
  const maxTarget = bounds.maxTarget;
  if (targetCount > maxTarget) {
    targetCount = maxTarget;
    targetCountElement.value = targetCount;
  }
  return Math.floor(targetCount);
}

function updateTargetCountBounds() {
  const minTarget = Math.max(1, requiredDatasetIds.length + 1);
  let maxTarget = selectedDatasets.length || 1;

  if (maxTarget < minTarget) {
    maxTarget = minTarget;
  }

  if (targetCountElement) {
    targetCountElement.min = String(minTarget);
    targetCountElement.max = String(maxTarget);
  }

  return { minTarget, maxTarget };
}

function updateFilterHeader(
  checkedCount,
  totalCount,
  headerElement,
  selectedItems,
  allItems,
  keyName,
) {
  if (checkedCount === totalCount) {
    headerElement.innerText = "(All Selected)";
  } else if (checkedCount === 0) {
    headerElement.innerText = "(None Selected)";
  } else if (checkedCount === 1) {
    const selectedId = selectedItems[0];
    const selectedItem = allItems.find((item) => item.id === selectedId);
    headerElement.innerText = selectedItem
      ? `(${selectedItem[keyName]})`
      : "(1 selected)";
  } else {
    headerElement.innerText = `(${checkedCount} selected)`;
  }
}

function updateSelectAllButtonText(
  checkedCount,
  totalCount,
  buttonTextElement,
) {
  if (!buttonTextElement) {
    return;
  }

  if (checkedCount === totalCount) {
    buttonTextElement.textContent = "Deselect All";
  } else {
    buttonTextElement.textContent = "Select All";
  }
}

function setStatus(message, type) {
  if (!statusElement) {
    return;
  }

  statusElement.className = "alert";
  statusElement.classList.add("alert-" + type);
  statusElement.textContent = message;
}

function parseIdList(value, fallback) {
  if (!value) {
    return [...fallback];
  }

  const ids = value
    .split(" ")
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  return uniqueIds(ids);
}

function uniqueIds(ids) {
  return [...new Set(ids)];
}

function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export function dispose() {
  apsPreviewRequestId += 1;
  clearTimeout(apsPreviewResizeTimer);
  if (apsPreviewResizeHandler) {
    window.removeEventListener("resize", apsPreviewResizeHandler);
    apsPreviewResizeHandler = null;
  }
  if (apsPreviewChart) {
    apsPreviewChart.destroy();
    apsPreviewChart = null;
  }
  var sliderIds = ["slider-interactions"];
  metadataRangeFields.forEach(function (f) { sliderIds.push(f.sliderId); });
  sliderIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el && el.noUiSlider) {
      el.noUiSlider.destroy();
    }
    ["-min", "-max"].forEach(function (suffix) {
      var inp = document.getElementById(id + suffix);
      if (inp) {
        var clone = inp.cloneNode(true);
        inp.parentNode.replaceChild(clone, inp);
      }
    });
  });
}
