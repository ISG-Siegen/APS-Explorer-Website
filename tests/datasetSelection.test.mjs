import assert from "node:assert/strict";

import { ApiService } from "../datasets.recommender-systems.com/apiService.js";
import {
  convexHullDiversity,
  effCovDiversity,
  intrinsicHullVolume,
  meanNearestNeighborDistance,
  selectDatasetSet,
} from "../datasets.recommender-systems.com/tabs/recommendDatasets/datasetSetSelection.js";

function approximately(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `Expected ${actual} to be approximately ${expected}`,
  );
}

function allIndices(points) {
  return points.map((_, index) => index);
}

const line = [[0], [1], [4]];
approximately(meanNearestNeighborDistance(line, allIndices(line)), 5 / 3);
approximately(intrinsicHullVolume(line), 4);
approximately(convexHullDiversity(line, allIndices(line)), 20 / 3);

const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
approximately(intrinsicHullVolume(square), 1);
approximately(convexHullDiversity(square, allIndices(square)), 1);
approximately(effCovDiversity(square, allIndices(square)), 1 / Math.sqrt(3));

const tetrahedron = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
approximately(intrinsicHullVolume(tetrahedron), 1 / 6);
approximately(convexHullDiversity(tetrahedron, allIndices(tetrahedron)), 1 / 6);

const collinear3d = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]];
approximately(intrinsicHullVolume(collinear3d), 3);
approximately(convexHullDiversity(collinear3d, allIndices(collinear3d)), 3);

const pyramid = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0.5, 0.5, 1]];
approximately(intrinsicHullVolume(pyramid), 1 / 3);

const clusteredPool = [[0, 0], [0.01, 0], [0, 0.01], [1, 0], [0, 1], [1, 1]];
const datasetIds = [1, 2, 3, 4, 5, 6];
const diverseConvex = selectDatasetSet(clusteredPool, datasetIds, 3, "diverse_convex_hull", []);
const diverseEffCov = selectDatasetSet(clusteredPool, datasetIds, 3, "diverse_effcov", []);
const nonDiverseConvex = selectDatasetSet(clusteredPool, datasetIds, 3, "non_diverse_convex_hull", []);
const nonDiverseEffCov = selectDatasetSet(clusteredPool, datasetIds, 3, "non_diverse_effcov", []);

assert.deepEqual(new Set(diverseConvex), new Set([2, 5, 6]));
assert.deepEqual(new Set(diverseEffCov), new Set([2, 5, 6]));
assert.deepEqual(nonDiverseConvex, [1, 2, 3]);
assert.deepEqual(nonDiverseEffCov, [1, 2, 3]);
assert.deepEqual(
  selectDatasetSet(clusteredPool, datasetIds, 3, "non_diverse", []),
  nonDiverseEffCov,
);

const fixedSeedSelection = selectDatasetSet(
  clusteredPool,
  datasetIds,
  2,
  "diverse_convex_hull",
  [6],
);
assert.deepEqual(fixedSeedSelection, [1, 4]);
assert.ok(!fixedSeedSelection.includes(6), "Fixed seeds must not be returned as new recommendations");

for (const method of [
  "diverse_convex_hull",
  "diverse_effcov",
  "non_diverse_convex_hull",
  "non_diverse_effcov",
  "random",
]) {
  const selected = selectDatasetSet(clusteredPool, datasetIds, 3, method, []);
  assert.equal(selected.length, 3, `${method} must return the requested number of datasets`);
  assert.equal(new Set(selected).size, 3, `${method} must not return duplicates`);
  selected.forEach((id) => assert.ok(datasetIds.includes(id)));
}

const performanceRows = [
  {
    datasetId: 10,
    algorithmId: 20,
    algorithmConfigIndex: 0,
    algorithmConfiguration: "A",
    hr: { ten: "0.2" },
    ndcg: { ten: "0.3" },
    recall: { ten: "0.4" },
  },
  {
    datasetId: 10,
    algorithmId: 20,
    algorithmConfigIndex: 1,
    algorithmConfiguration: "B",
    hr: { ten: "0.4" },
    ndcg: { ten: "0.5" },
    recall: { ten: "0.8" },
  },
];

globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ data: performanceRows }),
});

const aggregated = await ApiService.getPerformanceResults([10], [20]);
approximately(aggregated[10][20].hr.ten, 0.3);
approximately(aggregated[10][20].ndcg.ten, 0.4);
approximately(aggregated[10][20].recall.ten, 0.6);
assert.equal(aggregated[10][20].algorithmConfigIndex, null);
assert.equal(aggregated[10][20].algorithmConfiguration, "Mean of 2 configurations");

console.log("Dataset selection tests passed.");
