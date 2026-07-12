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
  datasets = await ApiService.getDatasets();

  ApiService.getAlgorithms().then(function (a) {
    __allAlgorithms = a;
    var allIds = datasets.map(function (d) { return d.id; });
    return ApiService.getPerformanceResults(allIds, a.map(function (ai) { return ai.id; }));
  }).then(function (r) {
    __performanceResults = r;
  });

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
  initializeEvents();

  applyDatasetFilter();
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
    if (methodSelectElement.querySelector('option[value="' + queryOptions.method + '"]')) {
      methodSelectElement.value = queryOptions.method;
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
          a.download = "aps-dataset-recommendation-v" + versionNumber + ".png";
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }, "image/png");
      } else if (exportTextarea && exportTextarea.style.display !== "none") {
        const blob = new Blob([exportTextarea.value], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "aps-dataset-export.txt";
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
  function renderRecommendationImage() {
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
    ctx.fillText("Source: datasets.recommender-systems.com", padding, footerY + 18);

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
  function exportAsMarkdown() {
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
    lines.push("_Generated by APS Explorer (datasets.recommender-systems.com)_");
    return lines.join("\n");
  }

  function exportAsHtml() {
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
    h.push("<p><em>Generated by APS Explorer (datasets.recommender-systems.com)</em></p>");
    return h.join("\n");
  }

  function exportAsLatex() {
    var rows = getFinalDatasets();
    if (rows.length === 0) return "% No datasets to export.";
    var lines = [];
    lines.push("% Dataset Recommendation — APS Explorer");
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

  function exportAsBibtex() {
    var rows = getFinalDatasets();
    if (rows.length === 0) return "% No datasets to export.";
    var lines = [];
    rows.forEach(function (d) {
      var key = "aps_" + (d.name || "dataset").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      var metaParts = getDatasetMetaParts(d);
      var note = metaParts.map(function (p) { return p.label + ": " + p.value; }).join(", ");
      lines.push("@dataset{" + key + ",");
      lines.push("  title        = {" + (d.name || "Untitled") + "},");
      lines.push("  howpublished = {datasets.recommender-systems.com},");
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
  return "non_diverse";
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
      return __performanceResults[id]?.[aid]?.[metric]?.[perfKey] ?? NaN;
    });
    var hasSomeFinite = row.some(function (v) { return Number.isFinite(v); });
    if (!hasSomeFinite) continue;
    vectors.push(row);
    validIds.push(id);
  }
  if (vectors.length < 2) return null;
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
  for (var j = 0; j < dims; j++) {
    var min = Infinity, max = -Infinity;
    for (var i = 0; i < vectors.length; i++) {
      if (vectors[i][j] < min) min = vectors[i][j];
      if (vectors[i][j] > max) max = vectors[i][j];
    }
    var range = max - min;
    if (range > 1e-12) {
      for (var i = 0; i < vectors.length; i++) {
        vectors[i][j] = (vectors[i][j] - min) / range;
      }
    } else {
      for (var i = 0; i < vectors.length; i++) {
        vectors[i][j] = 0;
      }
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
    if (method === "random") {
      poolWithoutRequired = shuffleArray(poolWithoutRequired);
      selectedRecommendations = poolWithoutRequired
        .slice(0, missingCount)
        .map(function (d) { return d.id; })
        .sort(function (a, b) { return a - b; });
    } else {
      var poolIds = poolWithoutRequired.map(function (d) { return d.id; });
      var apsData = buildApsVectors(poolIds);
      if (apsData && apsData.vectors.length >= 2 && apsData.vectors[0].length > 0) {
        selectedRecommendations = selectDatasetSet(
          apsData.vectors,
          apsData.datasetIds,
          missingCount,
          method,
        );
        var usedMap = {};
        for (var si = 0; si < selectedRecommendations.length; si++) {
          usedMap[selectedRecommendations[si]] = true;
        }
        var remaining = poolIds.filter(function (id) { return !usedMap[id]; });
        var shuffled = shuffleArray(remaining);
        while (selectedRecommendations.length < missingCount && shuffled.length > 0) {
          selectedRecommendations.push(shuffled.pop());
        }
        selectedRecommendations.sort(function (a, b) { return a - b; });
      } else {
        poolWithoutRequired = shuffleArray(poolWithoutRequired);
        selectedRecommendations = poolWithoutRequired
          .slice(0, missingCount)
          .map(function (d) { return d.id; })
          .sort(function (a, b) { return a - b; });
      }
    }

    recommendedDatasetIds = selectedRecommendations;
    finalDatasetIds = requiredUnique.concat(selectedRecommendations);

    if (selectedRecommendations.length < missingCount) {
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

function renderResults() {
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

function openRecommendationInAps() {
  if (finalDatasetIds.length === 0) {
    setStatus("Generate a recommendation first.", "warning");
    return;
  }

  const url = getQueryString({
    tab: "aps",
    datasets: finalDatasetIds.join(" "),
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
  if (method !== "non_diverse") queryData.method = method;
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
