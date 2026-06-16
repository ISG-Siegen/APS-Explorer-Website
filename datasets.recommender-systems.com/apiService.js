export class ApiService {
  static #apiUrl = "./index.php?action=";

  static #algorithms = null;
  static async getAlgorithms() {
    if (this.#algorithms === null) {
      const response = await fetch(this.#apiUrl + "algorithm");
      if (!response.ok) return null;

      const data = await response.json();
      data.data.sort((a, b) => a.name.localeCompare(b.name));
      this.#algorithms = data.data;
    }

    return this.#algorithms;
  }

  static async getAlgorithm(id) {
    const algorithms = await this.getAlgorithms();
    if (algorithms === null) return null;

    return algorithms.find((alg) => alg.id === id);
  }

  static #datasets = null;
  static async getDatasets() {
    if (this.#datasets === null) {
      const response = await fetch(this.#apiUrl + "dataset");
      if (!response.ok) return null;

      const data = await response.json();
      data.data.sort((a, b) => a.name.localeCompare(b.name));
      this.#datasets = data.data;
    }

    return this.#datasets;
  }

  static async getDataset(id) {
    const datasets = await this.getDatasets();
    if (datasets === null) return null;

    return datasets.find((dataset) => dataset.id === id);
  }

  static #pcaResults = null;
  static async getPcaResults() {
    if (this.#pcaResults === null) {
      const response = await fetch(this.#apiUrl + "result&task=pcaResults");
      if (!response.ok) return null;

      const data = await response.json();
      this.#pcaResults = data.data;
    }

    return this.#pcaResults;
  }

  static async checkHealth() {
    const response = await fetch("./health.php");
    return response.ok;
  }

  static async compareAlgorithms(algoId1, algoId2) {
    const response = await fetch(
      `${this.#apiUrl}result&task=compareAlgorithms&x=${algoId1}&y=${algoId2}`,
    );
    if (!response.ok) return null;

    const data = await response.json();
    return data.data;
  }

  static #performanceResults = null;
  static async getPerformanceResults(datasetIds, algorithmIds) {
    if (this.#performanceResults === null) {
      this.#performanceResults = {};
    }

    const cachedDatasets = [];
    for (const dataset in this.#performanceResults) {
      for (const algorithm in this.#performanceResults[dataset]) {
        if (this.#performanceResults[dataset][algorithm] !== undefined) {
          cachedDatasets.push(dataset);
        }
      }
    }

    const missingIds = datasetIds.filter(
      (id) => !cachedDatasets.includes(String(id)),
    );
    if (missingIds.length !== 0) {
      const ids = new URLSearchParams();
      missingIds.forEach((id) => ids.append("ids[]", id));

      const response = await fetch(`${this.#apiUrl}result&${ids.toString()}`);
      if (!response.ok) return null;

      const data = await response.json();
      data.data.forEach((result) => {
        if (this.#performanceResults[result.datasetId] === undefined) {
          this.#performanceResults[result.datasetId] = {};
        }

        this.#performanceResults[result.datasetId][result.algorithmId] = result;
      });
    }

    return this.#performanceResults;
  }
}
