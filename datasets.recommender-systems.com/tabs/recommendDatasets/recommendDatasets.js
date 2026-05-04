import { ApiService } from "../../apiService.js";
import { copyToClipboard, getQueryString } from "../../main.js";

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
  if (generateButtonElement) {
    generateButtonElement.addEventListener("click", generateRecommendation);
  }
  if (openApsButtonElement) {
    openApsButtonElement.addEventListener("click", openRecommendationInAps);
  }
  if (shareButtonElement) {
    shareButtonElement.addEventListener("click", shareRecommendState);
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

  const finalDatasets = finalDatasetIds
    .map((id) => datasets.find((d) => d.id === id))
    .filter((d) => !!d);

  resultsListElement.innerHTML = "";

  if (finalDatasets.length === 0) {
    resultsSummaryElement.textContent = "No datasets selected yet.";
    if (openApsButtonElement) {
      openApsButtonElement.disabled = true;
    }
    return;
  }

  resultsSummaryElement.textContent = `Final: ${finalDatasets.length} | Required: ${requiredDatasetIds.length} | Recommended: ${recommendedDatasetIds.length}`;

  finalDatasets.forEach((dataset) => {
    const isRequired = requiredDatasetIds.includes(dataset.id);

    const listItem = document.createElement("li");
    listItem.className =
      "list-group-item d-flex justify-content-between align-items-center";

    const label = document.createElement("span");
    label.textContent = dataset.name;

    const badge = document.createElement("span");
    badge.className = isRequired
      ? "badge text-bg-primary"
      : "badge text-bg-success";
    badge.textContent = isRequired ? "Required" : "Recommended";

    listItem.appendChild(label);
    listItem.appendChild(badge);
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
