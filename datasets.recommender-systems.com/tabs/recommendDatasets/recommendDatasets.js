import { ApiService } from "../../apiService.js";
import { copyToClipboard, getQueryString } from "../../main.js";

var datasets = [];

var selectedDatasets = [];
var requiredDatasetIds = [];
var recommendedDatasetIds = [];
var finalDatasetIds = [];

var datasetFilterCheckboxes = [];
var requiredDatasetCheckboxes = [];

var datasetFilterHeaderElement = null;
var datasetFilterArea = null;
var requiredFilterHeaderElement = null;
var requiredFilterArea = null;

var selectAllDatasetArea = null;
var selectAllDatasetButton = null;
var selectAllDatasetButtonText = null;

var targetCountElement = null;
var feedbackTypeElement = null;
var minInteractionsElement = null;
var maxInteractionsElement = null;
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
};

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

  targetCountElement = document.getElementById("recommend-target-count");
  feedbackTypeElement = document.getElementById("recommend-feedback-type");
  minInteractionsElement = document.getElementById(
    "recommend-min-interactions",
  );
  maxInteractionsElement = document.getElementById(
    "recommend-max-interactions",
  );
  generateButtonElement = document.getElementById("recommend-generate-btn");
  openApsButtonElement = document.getElementById("recommend-open-aps-btn");
  shareButtonElement = document.getElementById("recommend-share-btn");
  statusElement = document.getElementById("recommend-status");
  resultsSummaryElement = document.getElementById("recommend-results-summary");
  resultsListElement = document.getElementById("recommend-results-list");
}

function initializeSettingsFromQuery(queryOptions) {
  setInteractionBounds();

  if (feedbackTypeElement) {
    const feedbackTypes = [
      ...new Set(datasets.map((d) => d.feedbackType).filter((v) => !!v)),
    ].sort();

    feedbackTypes.forEach((feedbackType) => {
      const option = document.createElement("option");
      option.value = feedbackType;
      option.textContent = feedbackType;
      feedbackTypeElement.appendChild(option);
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
    feedbackTypeElement.value = queryOptions.feedbackType;
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
  requiredFilterArea.innerHTML = "";

  requiredDatasetCheckboxes = [];
  requiredDatasetIds = [];

  const initialRequiredIds = parseIdList(queryOptions?.requiredDatasets, []);

  datasets.forEach((dataset) => {
    const checkbox = createDatasetCheckbox(
      `required-${dataset.id}`,
      "requiredDatasetCheckbox",
      dataset.name,
    );
    checkbox.dataset.datasetId = String(dataset.id);
    checkbox.checked = initialRequiredIds.includes(dataset.id);
    checkbox.onchange = onRequiredDatasetChange;

    requiredFilterArea.appendChild(
      createCheckboxWrapper(checkbox, `required-${dataset.id}`, dataset.name),
    );
    requiredDatasetCheckboxes.push(checkbox);

    if (checkbox.checked) {
      requiredDatasetIds.push(dataset.id);
    }
  });

  updateFilterHeader(
    requiredDatasetIds.length,
    requiredDatasetCheckboxes.length,
    requiredFilterHeaderElement,
    requiredDatasetIds,
    datasets,
    "name",
  );

  updateSelectAllButtonText(
    requiredDatasetIds.length,
    requiredDatasetCheckboxes.length,
    null,
  );
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
  if (targetCountElement) {
    targetCountElement.addEventListener("change", applyDatasetFilter);
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

function onRequiredDatasetChange(e) {
  const datasetId = Number(e.target.dataset.datasetId);
  if (e.target.checked) {
    requiredDatasetIds.push(datasetId);
  } else {
    const index = requiredDatasetIds.indexOf(datasetId);
    if (index > -1) {
      requiredDatasetIds.splice(index, 1);
    }
  }

  requiredDatasetIds = uniqueIds(requiredDatasetIds);

  updateFilterHeader(
    requiredDatasetIds.length,
    requiredDatasetCheckboxes.length,
    requiredFilterHeaderElement,
    requiredDatasetIds,
    datasets,
    "name",
  );
  updateSelectAllButtonText(
    requiredDatasetIds.length,
    requiredDatasetCheckboxes.length,
    null,
  );

  applyDatasetFilter();
}

function applyDatasetFilter() {
  readActiveFiltersFromUi();

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

  let effectiveTargetCount = targetCount;
  let warningText = "";

  if (targetCount < requiredUnique.length) {
    effectiveTargetCount = requiredUnique.length;
    targetCountElement.value = effectiveTargetCount;
    warningText =
      "Target count was smaller than required datasets and was adjusted.";
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

    return true;
  });
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
  };
}

function getValidatedTargetCount() {
  if (!targetCountElement) {
    return 1;
  }

  let targetCount = Number(targetCountElement.value);
  if (!Number.isFinite(targetCount) || targetCount < 1) {
    targetCount = 1;
    targetCountElement.value = targetCount;
  }
  return Math.floor(targetCount);
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
