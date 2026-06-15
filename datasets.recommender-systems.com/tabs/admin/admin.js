import { ApiService } from "../../apiService.js";

var datasets = [];
var logs = [];
var currentPage = 1;
var totalPages = 1;
var tbodyElement = null;
var prevBtn = null;
var nextBtn = null;
var pageText = null;
var paginationNav = null;
var deleteAllBtn = null;

export async function initialize(queryOptions) {
  datasets = await ApiService.getDatasets();

  tbodyElement = document.getElementById("admin-logs-tbody");
  prevBtn = document.getElementById("admin-prev-page");
  nextBtn = document.getElementById("admin-next-page");
  pageText = document.getElementById("admin-page-text");
  paginationNav = document.getElementById("admin-pagination");
  deleteAllBtn = document.getElementById("admin-delete-all-btn");

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--;
        loadLogs();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (currentPage < totalPages) {
        currentPage++;
        loadLogs();
      }
    });
  }

  if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", function () {
      if (confirm("Are you sure you want to delete ALL usage logs? This cannot be undone.")) {
        deleteAllLogs();
      }
    });
  }

  await loadLogs();
}

async function deleteAllLogs() {
  try {
    var response = await fetch("./index.php?action=log&task=deleteAllUsageLogs", { method: "POST" });
    var data = await response.json();
    if (data.isSuccess) {
      currentPage = 1;
      await loadLogs();
    } else {
      alert("Failed to delete logs: " + (data.message || "Unknown error"));
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function getDatasetName(id) {
  var ds = datasets.find(function (d) { return d.id === id; });
  return ds ? ds.name : "Dataset #" + id;
}

function getDatasetNames(ids) {
  if (!ids || ids.length === 0) return "—";
  return ids.map(getDatasetName).join(", ");
}

function getDatasetNamesLines(ids) {
  if (!ids || ids.length === 0) return "—";
  return ids.map(getDatasetName).join("\n");
}

var metadataLabels = {
  numberOfUsers: "Users",
  numberOfItems: "Items",
  numberOfInteractions: "Interactions",
  userItemRatio: "U/I Ratio",
  itemUserRatio: "I/U Ratio",
  density: "Density",
  highestNumberOfRatingBySingleUser: "Max Ratings/User",
  lowestNumberOfRatingBySingleUser: "Min Ratings/User",
  highestNumberOfRatingOnSingleItem: "Max Ratings/Item",
  lowestNumberOfRatingOnSingleItem: "Min Ratings/Item",
  meanNumberOfRatingsByUser: "Mean Ratings/User",
  meanNumberOfRatingsOnItem: "Mean Ratings/Item",
};

function formatFilterSummary(filters) {
  if (!filters) return "—";

  var lines = [];

  if (filters.feedbackType && filters.feedbackType !== "all") {
    lines.push("Feedback: " + filters.feedbackType);
  }

  if (filters.interactions) {
    var min = filters.interactions.min;
    var max = filters.interactions.max;
    if (min != null || max != null) {
      lines.push("Interactions: " + (min != null ? min : "0") + " – " + (max != null ? max : "∞"));
    }
  }

  if (filters.metadataRanges) {
    for (var key in filters.metadataRanges) {
      var r = filters.metadataRanges[key];
      if (r.min != null || r.max != null) {
        var label = metadataLabels[key] || key;
        lines.push(label + ": " + (r.min != null ? r.min : "0") + " – " + (r.max != null ? r.max : "∞"));
      }
    }
  }

  if (filters.targetCount != null) {
    lines.push("Target: " + filters.targetCount);
  }

  if (filters.candidatePoolSize != null) {
    lines.push("Pool: " + filters.candidatePoolSize);
  }

  return lines.length > 0 ? lines.join("\n") : "—";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  var d = new Date(dateStr.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString();
}

async function loadLogs() {
  try {
    var url = "./index.php?action=log&task=getUsageLogs&page=" + currentPage + "&pageSize=50";
    var response = await fetch(url);
    if (!response.ok) {
      tbodyElement.innerHTML = '<tr><td colspan="7" class="text-danger">Failed to load logs</td></tr>';
      return;
    }
    var data = await response.json();
    if (!data.isSuccess) {
      tbodyElement.innerHTML = '<tr><td colspan="7" class="text-danger">' + (data.message || "Error") + '</td></tr>';
      return;
    }

    logs = data.data.logs || [];
    totalPages = data.data.totalPages || 1;

    renderTable();
    updatePagination();
  } catch (err) {
    tbodyElement.innerHTML = '<tr><td colspan="6" class="text-danger">' + err.message + "</td></tr>";
  }
}

function renderTable() {
  if (logs.length === 0) {
    tbodyElement.innerHTML = '<tr><td colspan="7" class="text-muted text-center">No usage logs found.</td></tr>';
    return;
  }

  var html = "";
  logs.forEach(function (log) {
    var seedNames = getDatasetNames(log.seedDatasets);
    var filterCount = (log.datasetFilter || []).length;
    var recNames = getDatasetNames(log.recommendedDatasets);
    var filterDetails = formatFilterSummary(log.filters);
    var dateFormatted = formatDate(log.createdDate);

    var configParts = [];
    if (log.selectionMethod) configParts.push("Method: " + log.selectionMethod);
    if (log.selectionMetric) configParts.push("Metric: " + log.selectionMetric);
    if (log.selectionKValue) configParts.push("K: " + log.selectionKValue);
    var configText = configParts.length > 0 ? configParts.join("\n") : "—";

    var recNamesLines = getDatasetNamesLines(log.recommendedDatasets);

    html += "<tr>"
      + "<td style='white-space: nowrap;'>" + dateFormatted + "</td>"
      + "<td style='max-width: 200px; overflow: hidden; text-overflow: ellipsis;' title='" + escapeHtml(seedNames) + "'>" + escapeHtml(seedNames) + "</td>"
      + "<td>" + filterCount + " dataset(s)</td>"
      + "<td style='white-space: pre-line;'>" + escapeHtml(configText) + "</td>"
      + "<td style='max-width: 300px; white-space: pre-line;' title='" + escapeHtml(filterDetails) + "'>" + escapeHtml(filterDetails) + "</td>"
      + "<td>" + log.resultCount + "</td>"
      + "<td style='max-width: 200px; white-space: pre-line;' title='" + escapeHtml(recNamesLines) + "'>" + escapeHtml(recNamesLines) + "</td>"
      + "</tr>";
  });

  tbodyElement.innerHTML = html;
}

function updatePagination() {
  if (!pageText || !prevBtn || !nextBtn || !paginationNav) return;

  pageText.textContent = "Page " + currentPage + " of " + totalPages;
  paginationNav.style.display = totalPages > 1 ? "block" : "none";

  if (currentPage <= 1) {
    prevBtn.classList.add("disabled");
  } else {
    prevBtn.classList.remove("disabled");
  }
  if (currentPage >= totalPages) {
    nextBtn.classList.add("disabled");
  } else {
    nextBtn.classList.remove("disabled");
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
