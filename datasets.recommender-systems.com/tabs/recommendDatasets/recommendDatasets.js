import { ApiService } from "../../apiService.js";
import { copyToClipboard, getQueryString, versionNumber } from "../../main.js";

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
var minInteractionsElement = null;
var maxInteractionsElement = null;
var minUsersElement = null;
var maxUsersElement = null;
var minItemsElement = null;
var maxItemsElement = null;
var minUserItemRatioElement = null;
var maxUserItemRatioElement = null;
var minDensityElement = null;
var maxDensityElement = null;
var minMaxUserElement = null;
var maxMaxUserElement = null;
var minMinUserElement = null;
var maxMinUserElement = null;
var minMaxItemElement = null;
var maxMaxItemElement = null;
var minMinItemElement = null;
var maxMinItemElement = null;
var minMeanUserElement = null;
var maxMeanUserElement = null;
var minMeanItemElement = null;
var maxMeanItemElement = null;
var generateButtonElement = null;
var openApsButtonElement = null;
var shareButtonElement = null;
var statusElement = null;
var resultsSummaryElement = null;
var resultsListElement = null;

var interactionsBounds = {
  min: null,
  max: null,
};

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
  return (Number(d) * 100).toFixed(2) + "%";
}

function formatRatio(r) {
  if (r == null || !Number.isFinite(Number(r))) return "—";
  return Number(r).toFixed(2);
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
  {
    key: "numberOfUsers",
    minId: "recommend-min-users",
    maxId: "recommend-max-users",
    step: 1,
  },
  {
    key: "numberOfItems",
    minId: "recommend-min-items",
    maxId: "recommend-max-items",
    step: 1,
  },
  {
    key: "userItemRatio",
    minId: "recommend-min-user-item-ratio",
    maxId: "recommend-max-user-item-ratio",
    step: "any",
  },
  {
    key: "density",
    minId: "recommend-min-density",
    maxId: "recommend-max-density",
    step: "any",
  },
  {
    key: "highestNumberOfRatingBySingleUser",
    minId: "recommend-min-max-user",
    maxId: "recommend-max-max-user",
    step: 1,
  },
  {
    key: "lowestNumberOfRatingBySingleUser",
    minId: "recommend-min-min-user",
    maxId: "recommend-max-min-user",
    step: 1,
  },
  {
    key: "highestNumberOfRatingOnSingleItem",
    minId: "recommend-min-max-item",
    maxId: "recommend-max-max-item",
    step: 1,
  },
  {
    key: "lowestNumberOfRatingOnSingleItem",
    minId: "recommend-min-min-item",
    maxId: "recommend-max-min-item",
    step: 1,
  },
  {
    key: "meanNumberOfRatingsByUser",
    minId: "recommend-min-mean-user",
    maxId: "recommend-max-mean-user",
    step: "any",
  },
  {
    key: "meanNumberOfRatingsOnItem",
    minId: "recommend-min-mean-item",
    maxId: "recommend-max-mean-item",
    step: "any",
  },
];

var metadataRangeBounds = {};

export async function initialize(queryOptions) {
  datasets = await ApiService.getDatasets();

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
  minInteractionsElement = document.getElementById(
    "recommend-min-interactions",
  );
  maxInteractionsElement = document.getElementById(
    "recommend-max-interactions",
  );
  minUsersElement = document.getElementById("recommend-min-users");
  maxUsersElement = document.getElementById("recommend-max-users");
  minItemsElement = document.getElementById("recommend-min-items");
  maxItemsElement = document.getElementById("recommend-max-items");
  minUserItemRatioElement = document.getElementById(
    "recommend-min-user-item-ratio",
  );
  maxUserItemRatioElement = document.getElementById(
    "recommend-max-user-item-ratio",
  );
  minDensityElement = document.getElementById("recommend-min-density");
  maxDensityElement = document.getElementById("recommend-max-density");
  minMaxUserElement = document.getElementById("recommend-min-max-user");
  maxMaxUserElement = document.getElementById("recommend-max-max-user");
  minMinUserElement = document.getElementById("recommend-min-min-user");
  maxMinUserElement = document.getElementById("recommend-max-min-user");
  minMaxItemElement = document.getElementById("recommend-min-max-item");
  maxMaxItemElement = document.getElementById("recommend-max-max-item");
  minMinItemElement = document.getElementById("recommend-min-min-item");
  maxMinItemElement = document.getElementById("recommend-max-min-item");
  minMeanUserElement = document.getElementById("recommend-min-mean-user");
  maxMeanUserElement = document.getElementById("recommend-max-mean-user");
  minMeanItemElement = document.getElementById("recommend-min-mean-item");
  maxMeanItemElement = document.getElementById("recommend-max-mean-item");
  generateButtonElement = document.getElementById("recommend-generate-btn");
  openApsButtonElement = document.getElementById("recommend-open-aps-btn");
  shareButtonElement = document.getElementById("recommend-share-btn");
  statusElement = document.getElementById("recommend-status");
  resultsSummaryElement = document.getElementById("recommend-results-summary");
  resultsListElement = document.getElementById("recommend-results-list");
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
  if (queryOptions?.minInteractions && minInteractionsElement) {
    minInteractionsElement.value = queryOptions.minInteractions;
  }
  if (queryOptions?.maxInteractions && maxInteractionsElement) {
    maxInteractionsElement.value = queryOptions.maxInteractions;
  }

  readActiveFiltersFromUi();
}

function setInteractionBounds() {
  const interactions = datasets
    .map((dataset) => Number(dataset.numberOfInteractions))
    .filter((value) => Number.isFinite(value));

  if (interactions.length === 0) {
    interactionsBounds = { min: null, max: null };
    return;
  }

  interactionsBounds = {
    min: Math.min(...interactions),
    max: Math.max(...interactions),
  };

  if (minInteractionsElement) {
    minInteractionsElement.min = String(interactionsBounds.min);
    minInteractionsElement.max = String(interactionsBounds.max);
    minInteractionsElement.value = String(interactionsBounds.min);
  }

  if (maxInteractionsElement) {
    maxInteractionsElement.min = String(interactionsBounds.min);
    maxInteractionsElement.max = String(interactionsBounds.max);
    maxInteractionsElement.value = String(interactionsBounds.max);
  }
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
  if (minInteractionsElement) {
    minInteractionsElement.addEventListener("change", applyDatasetFilter);
  }
  if (maxInteractionsElement) {
    maxInteractionsElement.addEventListener("change", applyDatasetFilter);
  }
  metadataRangeFields.forEach((field) => {
    const minEl = document.getElementById(field.minId);
    const maxEl = document.getElementById(field.maxId);
    if (minEl) {
      minEl.addEventListener("change", applyDatasetFilter);
    }
    if (maxEl) {
      maxEl.addEventListener("change", applyDatasetFilter);
    }
  });
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
  return checkbox;
}

function createCheckboxWrapper(checkbox, htmlFor, text) {
  const label = document.createElement("label");
  label.htmlFor = String(htmlFor);
  label.textContent = text;
  label.style.marginLeft = "0.25rem";

  const wrapper = document.createElement("div");
  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  return wrapper;
}

function createSelectAllButtons() {
  selectAllDatasetArea = document.createElement("div");
  selectAllDatasetArea.style.width = "100%";

  selectAllDatasetButton = document.createElement("button");
  selectAllDatasetButton.type = "button";
  selectAllDatasetButton.className = "filter-control-btn";
  selectAllDatasetButton.addEventListener("click", toggleAllDatasets);

  let icon = document.createElement("i");
  icon.className = "fa-solid fa-filter";
  icon.style.setProperty("color", "white", "important");
  icon.style.marginRight = "0.3rem";

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

function generateRecommendation() {
  readActiveFiltersFromUi();

  const requiredUnique = uniqueIds(requiredDatasetIds).filter((id) =>
    datasets.some((d) => d.id === id),
  );
  requiredDatasetIds = requiredUnique;

  const targetCount = getValidatedTargetCount();
  const poolWithoutRequired = shuffleArray(
    getCandidatePool().filter(
      (dataset) => !requiredUnique.includes(dataset.id),
    ),
  );

  console.log(getCandidatePool());
  let effectiveTargetCount = targetCount;
  let warningText = "";

  if (targetCount < requiredUnique.length) {
    effectiveTargetCount = requiredUnique.length;
    targetCountElement.value = effectiveTargetCount;
    warningText =
      "Target count was smaller than input datasets and was adjusted.";
  }

  const missingCount = Math.max(
    0,
    effectiveTargetCount - requiredUnique.length,
  );
  const selectedRecommendations = poolWithoutRequired
    .slice(0, missingCount)
    .map((dataset) => dataset.id)
    .sort((a, b) => a - b);

  recommendedDatasetIds = selectedRecommendations;
  finalDatasetIds = [...requiredUnique, ...selectedRecommendations];

  if (selectedRecommendations.length < missingCount) {
    warningText =
      "Not enough candidate datasets to reach your target count with current filters.";
  }

  renderResults();

  if (warningText) {
    setStatus(warningText, "warning");
  } else {
    setStatus(
      `Generated ${recommendedDatasetIds.length} recommendation(s). Final selection contains ${finalDatasetIds.length} dataset(s).`,
      "success",
    );
  }
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

  finalDatasets.forEach(function (dataset) {
    var isRequired = requiredDatasetIds.includes(dataset.id);
    var metaParts = getDatasetMetaParts(dataset);

    var listItem = document.createElement("li");
    listItem.className = "list-group-item";

    var headerRow = document.createElement("div");
    headerRow.className = "d-flex justify-content-between align-items-start";

    var nameDiv = document.createElement("div");
    var nameStrong = document.createElement("strong");
    nameStrong.textContent = dataset.name;
    nameDiv.appendChild(nameStrong);

    var badgesDiv = document.createElement("div");
    badgesDiv.className = "text-nowrap";

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
      metaDiv.className = "text-muted small mt-1";
      metaParts.forEach(function (part, idx) {
        if (idx > 0) {
          var sep = document.createTextNode(" \u00B7 ");
          metaDiv.appendChild(sep);
        }
        var span = document.createElement("span");
        span.className = "me-2";
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

function readActiveFiltersFromUi() {
  const minInteractions = Number(minInteractionsElement?.value);
  const maxInteractions = Number(maxInteractionsElement?.value);
  const boundsMin = interactionsBounds.min;
  const boundsMax = interactionsBounds.max;

  if (minInteractionsElement && Number.isFinite(boundsMin)) {
    const minValue = Number(minInteractionsElement.value);
    if (Number.isFinite(minValue) && minValue < boundsMin) {
      minInteractionsElement.value = String(boundsMin);
    }
    if (Number.isFinite(minValue) && Number.isFinite(boundsMax)) {
      if (minValue > boundsMax) {
        minInteractionsElement.value = String(boundsMax);
      }
    }
  }

  if (maxInteractionsElement && Number.isFinite(boundsMax)) {
    const maxValue = Number(maxInteractionsElement.value);
    if (Number.isFinite(maxValue) && maxValue > boundsMax) {
      maxInteractionsElement.value = String(boundsMax);
    }
    if (Number.isFinite(maxValue) && Number.isFinite(boundsMin)) {
      if (maxValue < boundsMin) {
        maxInteractionsElement.value = String(boundsMin);
      }
    }
  }

  activeFilters = {
    feedbackType: feedbackTypeElement?.value || "all",
    minInteractions:
      minInteractionsElement &&
      minInteractionsElement.value !== "" &&
      Number.isFinite(Number(minInteractionsElement.value))
        ? Number(minInteractionsElement.value)
        : null,
    maxInteractions:
      maxInteractionsElement &&
      maxInteractionsElement.value !== "" &&
      Number.isFinite(Number(maxInteractionsElement.value))
        ? Number(maxInteractionsElement.value)
        : null,
    metadataRanges: readMetadataRangesFromUi(),
  };
}

function readMetadataRangesFromUi() {
  const ranges = {};

  metadataRangeFields.forEach((field) => {
    const minEl = document.getElementById(field.minId);
    const maxEl = document.getElementById(field.maxId);
    const minValue = minEl ? Number(minEl.value) : NaN;
    const maxValue = maxEl ? Number(maxEl.value) : NaN;

    ranges[field.key] = {
      min:
        minEl && minEl.value !== "" && Number.isFinite(minValue)
          ? minValue
          : null,
      max:
        maxEl && maxEl.value !== "" && Number.isFinite(maxValue)
          ? maxValue
          : null,
    };
  });

  return ranges;
}

function setMetadataRangeBounds() {
  metadataRangeFields.forEach((field) => {
    const values = datasets
      .map((dataset) => Number(dataset[field.key]))
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return;
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const formattedMin = formatMinRangeValue(minValue, field.step);
    const formattedMax = formatMaxRangeValue(maxValue, field.step);
    metadataRangeBounds[field.key] = {
      min: Number(formattedMin),
      max: Number(formattedMax),
    };

    const minEl = document.getElementById(field.minId);
    const maxEl = document.getElementById(field.maxId);

    if (minEl) {
      minEl.min = formattedMin;
      minEl.max = formattedMax;
      if (field.step !== undefined) {
        minEl.step = String(field.step);
      }
      minEl.value = formattedMin;
    }
    if (maxEl) {
      maxEl.min = formattedMin;
      maxEl.max = formattedMax;
      if (field.step !== undefined) {
        maxEl.step = String(field.step);
      }
      maxEl.value = formattedMax;
    }
  });
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
    headerElement.innerText = "(All selected)";
  } else if (checkedCount === 0) {
    headerElement.innerText = "(None selected)";
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
