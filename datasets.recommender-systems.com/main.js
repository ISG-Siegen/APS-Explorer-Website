import { Loading } from "./loading.js";
import { DynamicContent } from "./dynamicContent.js";

var tabContentElement = null;

export const versionNumber = "1.0";

/**
 * Initializes the main script when the DOM is fully loaded.
 * It sets up event listeners for tab buttons and loads the initial tab content.
 */
document.addEventListener("DOMContentLoaded", async () => {
  tabContentElement = document.getElementById("tabContent");

  const compareAlgorithmsBtn = document.getElementById("compare-algo-btn");
  const compareDatasetsBtn = document.getElementById("compare-datasets-btn");
  const apsTabBtn = document.getElementById("aps-tab-btn");
  const recommendDatasetsBtn = document.getElementById(
    "recommend-datasets-btn",
  );

  apsTabBtn.addEventListener("click", async (e) => {
    await loadTab("./tabs/aps/aps.html");
  });
  compareAlgorithmsBtn.addEventListener("click", async (e) => {
    await loadTab("./tabs/compareAlgorithms/compareAlgorithms.html");
  });
  compareDatasetsBtn.addEventListener("click", async (e) => {
    await loadTab("./tabs/compareDatasets/compareDatasets.html");
  });
  recommendDatasetsBtn.addEventListener("click", async (e) => {
    await loadTab("./tabs/recommendDatasets/recommendDatasets.html");
  });
  const queryOptions = readQueryString(window.location.search);

  if (queryOptions.tab) {
    const tabName = queryOptions.tab;
    if (tabName === "compareAlgorithms") {
      compareAlgorithmsBtn.click();
    } else if (tabName === "compareDatasets") {
      compareDatasetsBtn.click();
    } else if (tabName === "aps") {
      apsTabBtn.click();
    } else if (tabName === "recommendDatasets") {
      recommendDatasetsBtn.click();
    }
  } else {
    apsTabBtn.click();
  }

  const versionNumberElement = document.getElementById("version-number");
  versionNumberElement.textContent = "Version " + versionNumber;
});

var activeTabScript = null;

/**
 * Loads the specified tab content into the tab content element.
 * @param {string} fileName - The name of the HTML file to load.
 * @returns {Promise<void>}
 */
async function loadTab(fileName) {
  if (Loading.isLoading()) return;

  Loading.showLoading();

  if (activeTabScript !== null) {
    if (typeof activeTabScript.dispose === "function") {
      activeTabScript.dispose();
    }
    activeTabScript = null;
  }

  await DynamicContent.loadContentToElement(fileName, tabContentElement);

  const jsFileName = fileName.split(".html")[0] + ".js";
  const script = await import(jsFileName);
  const queryOptions = readQueryString(window.location.search);
  await script.initialize(queryOptions);

  activeTabScript = script;
  // Clear query string after successful initialization if there were query parameters
  if (Object.keys(queryOptions).length > 0) {
    clearQueryString();
  }
  Loading.hideLoading();
}

/**
 *  Generates a query string from the given options object.
 * @param {object} options - An object containing key-value pairs to be included in the query string.
 * @returns {string} The generated query string.
 */
export function getQueryString(options) {
  const params = new URLSearchParams(options).toString();
  return window.location.href.split("?")[0] + "?" + params;
}

/**
 * Reads the query string from the URL and returns an object containing the key-value pairs.
 * @param {string} queryString - The query string to parse.
 * @returns {object} An object containing the key-value pairs from the query string.
 */
export function readQueryString(queryString) {
  const params = new URLSearchParams(queryString);
  const options = Object.fromEntries(params.entries());
  return options;
}

/**
 * Clears the query string from the current URL without reloading the page.
 */
export function clearQueryString() {
  const urlWithoutQuery = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, urlWithoutQuery);
}

/**
 * Copies the given text to the clipboard and updates the share button text.
 * Also handles errors if the copy operation fails.
 *
 * @param {string} text The text to copy to the clipboard.
 * @param {string} shareBtnId The ID of the button to update after copying.
 */
export function copyToClipboard(text, shareBtnId) {
  const shareBtn = document.getElementById(shareBtnId);
  navigator.clipboard
    .writeText(text)
    .then(() => {
      shareBtn.textContent = "Copied!";
      setTimeout(() => {
        shareBtn.innerHTML = '<i class="fa-solid fa-link"></i> Share';
      }, 2000);
    })
    .catch(() => {
      shareBtn.textContent = "Failed to copy";
      setTimeout(() => {
        shareBtn.innerHTML = '<i class="fa-solid fa-link"></i> Share';
      }, 2000);
    });
}
