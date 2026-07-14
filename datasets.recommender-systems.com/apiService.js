export class ApiService {
  static #apiUrl = "./index.php?action=";

  static #algorithms = null;
  static async getAlgorithms() {
    if (this.#algorithms === null) {
      const response = await fetch(this.#apiUrl + "algorithm");
      if (!response.ok) return null;

      const data = await response.json();
      data.data.forEach((algorithm) => {
        const id = Number(algorithm.id);
        if (Number.isFinite(id)) algorithm.id = id;
      });
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
      data.data.forEach((dataset) => {
        const id = Number(dataset.id);
        if (Number.isFinite(id)) dataset.id = id;
      });
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
      data.data.forEach((result) => {
        const datasetId = Number(result.datasetId);
        if (Number.isFinite(datasetId)) result.datasetId = datasetId;
      });
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
      const groupedResults = new Map();
      data.data.forEach((result) => {
        const groupKey = `${result.datasetId}:${result.algorithmId}`;
        if (!groupedResults.has(groupKey)) {
          groupedResults.set(groupKey, {
            base: { ...result },
            configurations: 0,
            sums: {},
            counts: {},
          });
        }
        const group = groupedResults.get(groupKey);
        group.configurations += 1;
        ["hr", "ndcg", "recall"].forEach((metric) => {
          const metricValues = result[metric] || {};
          Object.keys(metricValues).forEach((cutoff) => {
            const value = Number(metricValues[cutoff]);
            if (!Number.isFinite(value)) return;
            const valueKey = `${metric}:${cutoff}`;
            group.sums[valueKey] = (group.sums[valueKey] || 0) + value;
            group.counts[valueKey] = (group.counts[valueKey] || 0) + 1;
          });
        });
      });

      groupedResults.forEach((group) => {
        const result = { ...group.base };
        const datasetId = Number(result.datasetId);
        const algorithmId = Number(result.algorithmId);
        if (Number.isFinite(datasetId)) result.datasetId = datasetId;
        if (Number.isFinite(algorithmId)) result.algorithmId = algorithmId;
        ["hr", "ndcg", "recall"].forEach((metric) => {
          result[metric] = {};
          const sourceValues = group.base[metric] || {};
          Object.keys(sourceValues).forEach((cutoff) => {
            const valueKey = `${metric}:${cutoff}`;
            result[metric][cutoff] = group.counts[valueKey]
              ? group.sums[valueKey] / group.counts[valueKey]
              : null;
          });
        });
        if (group.configurations > 1) {
          result.algorithmConfigIndex = null;
          result.algorithmConfiguration = `Mean of ${group.configurations} configurations`;
        }
        if (this.#performanceResults[result.datasetId] === undefined) {
          this.#performanceResults[result.datasetId] = {};
        }

        this.#performanceResults[result.datasetId][result.algorithmId] = result;
      });
    }

    return this.#performanceResults;
  }
}
