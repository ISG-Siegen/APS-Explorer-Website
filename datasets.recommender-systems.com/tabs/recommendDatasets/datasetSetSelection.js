var EPSILON = 1e-12;

function euclideanDistance(a, b) {
  var sum = 0;
  for (var i = 0; i < a.length; i++) {
    var diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHullArea2D(coords) {
  if (coords.length < 3) return 0;
  var pts = coords.map(function (c) { return [c[0], c[1]]; });
  pts.sort(function (a, b) { return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]; });
  var lower = [];
  for (var i = 0; i < pts.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
    lower.push(pts[i]);
  }
  var upper = [];
  for (var i = pts.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
    upper.push(pts[i]);
  }
  lower.pop();
  upper.pop();
  var hull = lower.concat(upper);
  if (hull.length < 3) return 0;
  var area = 0;
  for (var i = 0; i < hull.length; i++) {
    var j = (i + 1) % hull.length;
    area += hull[i][0] * hull[j][1];
    area -= hull[j][0] * hull[i][1];
  }
  return Math.abs(area) / 2;
}

function centerMatrix(X) {
  if (X.length === 0) return [];
  var n = X.length;
  var d = X[0].length;
  var mean = new Array(d).fill(0);
  for (var i = 0; i < n; i++)
    for (var j = 0; j < d; j++)
      mean[j] += X[i][j];
  for (var j = 0; j < d; j++) mean[j] /= n;
  return X.map(function (row) { return row.map(function (v, j) { return v - mean[j]; }); });
}

function eigenDecomposeSymmetric(A) {
  var n = A.length;
  var a = A.map(function (row) { return row.slice(); });
  var v = Array.from({ length: n }, function (_, i) {
    return Array.from({ length: n }, function (_, j) { return i === j ? 1 : 0; });
  });
  var maxIter = 100;
  for (var iter = 0; iter < maxIter; iter++) {
    var maxOff = 0, p = 0, q = 0;
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var abs = Math.abs(a[i][j]);
        if (abs > maxOff) { maxOff = abs; p = i; q = j; }
      }
    }
    if (maxOff < EPSILON) break;
    var beta = (a[q][q] - a[p][p]) / (2 * a[p][q] + (a[p][q] === 0 ? EPSILON : 0));
    var t = Math.sign(beta) / (Math.abs(beta) + Math.sqrt(beta * beta + 1));
    var c = 1 / Math.sqrt(1 + t * t);
    var s = t * c;
    var app = a[p][p], aqq = a[q][q], apq = a[p][q];
    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = a[q][p] = (c * c - s * s) * apq + s * c * (app - aqq);
    for (var r = 0; r < n; r++) {
      if (r !== p && r !== q) {
        var a_rp = a[r][p], a_rq = a[r][q];
        a[r][p] = a[p][r] = c * a_rp - s * a_rq;
        a[r][q] = a[q][r] = s * a_rp + c * a_rq;
      }
    }
    for (var r = 0; r < n; r++) {
      var v_rp = v[r][p], v_rq = v[r][q];
      v[r][p] = c * v_rp - s * v_rq;
      v[r][q] = s * v_rp + c * v_rq;
    }
  }
  var eigenvalues = a.map(function (row, i) { return row[i]; });
  var indices = Array.from({ length: n }, function (_, i) { return i; });
  indices.sort(function (i, j) { return eigenvalues[j] - eigenvalues[i]; });
  return {
    eigenvalues: indices.map(function (i) { return eigenvalues[i]; }),
    eigenvectors: indices.map(function (i) { return v.map(function (row) { return row[i]; }); }),
  };
}

function svd(X) {
  var n = X.length;
  var d = X[0].length;
  var useGram = n <= d;
  var G, decomp;
  if (useGram) {
    G = Array.from({ length: n }, function (_, i) {
      return Array.from({ length: n }, function (_, j) {
        var sum = 0;
        for (var k = 0; k < d; k++) sum += X[i][k] * X[j][k];
        return sum;
      });
    });
    decomp = eigenDecomposeSymmetric(G);
    var S = decomp.eigenvalues.map(function (e) { return e > 0 ? Math.sqrt(e) : 0; });
    var U = decomp.eigenvectors;
    var VT = Array.from({ length: d }, function () { return new Array(n).fill(0); });
    for (var col = 0; col < n; col++) {
      if (S[col] > EPSILON) {
        for (var row = 0; row < d; row++) {
          var sum = 0;
          for (var i = 0; i < n; i++) sum += X[i][row] * U[i][col];
          VT[row][col] = sum / S[col];
        }
      }
    }
    return { U: U, S: S, VT: VT };
  } else {
    G = Array.from({ length: d }, function (_, i) {
      return Array.from({ length: d }, function (_, j) {
        var sum = 0;
        for (var k = 0; k < n; k++) sum += X[k][i] * X[k][j];
        return sum;
      });
    });
    decomp = eigenDecomposeSymmetric(G);
    var S = decomp.eigenvalues.map(function (e) { return e > 0 ? Math.sqrt(e) : 0; });
    var V = decomp.eigenvectors;
    var U = Array.from({ length: n }, function () { return new Array(d).fill(0); });
    for (var col = 0; col < d; col++) {
      if (S[col] > EPSILON) {
        for (var row = 0; row < n; row++) {
          var sum = 0;
          for (var i = 0; i < d; i++) sum += X[row][i] * V[i][col];
          U[row][col] = sum / S[col];
        }
      }
    }
    var VT = Array.from({ length: d }, function (_, i) { return V[i].slice(); });
    return { U: U, S: S, VT: VT };
  }
}

function intrinsicHullVolume(X_centered) {
  var result = svd(X_centered);
  var S = result.S;
  var maxS = S[0] || 0;
  var threshold = maxS * EPSILON;
  var r = S.filter(function (s) { return s > threshold; }).length;
  if (r === 0) return 0;
  var VT = result.VT;
  var V_r = VT.slice(0, r).map(function (row) { return row.slice(); });
  var projected = X_centered.map(function (row) {
    var result = new Array(r);
    for (var j = 0; j < r; j++) {
      var sum = 0;
      for (var k = 0; k < row.length; k++) sum += row[k] * V_r[j][k];
      result[j] = sum;
    }
    return result;
  });
  if (r === 1) {
    var vals = projected.map(function (p) { return p[0]; });
    return Math.max.apply(null, vals) - Math.min.apply(null, vals);
  }
  if (r === 2) {
    return convexHullArea2D(projected);
  }
  var posEig = S.filter(function (s) { return s > threshold; });
  var prod = 1;
  for (var i = 0; i < posEig.length; i++) prod *= posEig[i];
  return Math.sqrt(prod);
}

function mnnd(points, indices) {
  var n = indices.length;
  if (n < 2) return 0;
  var total = 0;
  for (var a = 0; a < n; a++) {
    var minDist = Infinity;
    for (var b = 0; b < n; b++) {
      if (a === b) continue;
      var dist = euclideanDistance(points[indices[a]], points[indices[b]]);
      if (dist < minDist) minDist = dist;
    }
    total += minDist;
  }
  return total / n;
}

function convexHullDiversity(points, indices) {
  var n = indices.length;
  if (n < 2) return 0;
  var selected = indices.map(function (i) { return points[i]; });
  var sp = mnnd(points, indices);
  var centered = centerMatrix(selected);
  var vol = intrinsicHullVolume(centered);
  return sp * (vol + EPSILON);
}

function effCovDiversity(points, indices) {
  var n = indices.length;
  if (n < 2) return 0;
  var selected = indices.map(function (i) { return points[i]; });
  var sp = mnnd(points, indices);
  var centered = centerMatrix(selected);
  var d = centered[0].length;
  var maxRank = Math.min(d, n - 1);
  if (maxRank < 1) return 0;
  var G = Array.from({ length: d }, function (_, i) {
    return Array.from({ length: d }, function (_, j) {
      var sum = 0;
      for (var k = 0; k < n; k++) sum += centered[k][i] * centered[k][j];
      return sum / (n - 1);
    });
  });
  var decomp = eigenDecomposeSymmetric(G);
  var maxEig = decomp.eigenvalues[0] || 0;
  var threshold = maxEig * EPSILON;
  var m = 0;
  var prod = 1;
  for (var i = 0; i < decomp.eigenvalues.length; i++) {
    if (decomp.eigenvalues[i] > threshold && i < maxRank) {
      prod *= decomp.eigenvalues[i];
      m++;
    }
  }
  if (m === 0) return 0;
  return sp * (Math.pow(prod, 1 / (2 * m)) + EPSILON);
}

function selectOptimizedSubset(points, k, scoreFn, maximize) {
  var n = points.length;
  if (k >= n) return Array.from({ length: n }, function (_, i) { return i; });
  if (k <= 0) return [];
  var numStarts = Math.min(n, 60);
  var bestScore = maximize ? -Infinity : Infinity;
  var bestSet = null;
  for (var start = 0; start < numStarts; start++) {
    var selected = [start];
    while (selected.length < k) {
      var bestNextScore = maximize ? -Infinity : Infinity;
      var bestNext = -1;
      for (var i = 0; i < n; i++) {
        if (selected.indexOf(i) >= 0) continue;
        var candidate = selected.concat([i]);
        var score = scoreFn(points, candidate);
        if ((maximize && score > bestNextScore) || (!maximize && score < bestNextScore)) {
          bestNextScore = score;
          bestNext = i;
        } else if (Math.abs(score - bestNextScore) < EPSILON) {
          if (i < bestNext) bestNext = i;
        }
      }
      if (bestNext >= 0) selected.push(bestNext);
      else break;
    }
    if (selected.length < k) continue;
    var finalScore = scoreFn(points, selected);
    if ((maximize && finalScore > bestScore) || (!maximize && finalScore < bestScore)) {
      bestScore = finalScore;
      bestSet = selected.slice();
    } else if (Math.abs(finalScore - bestScore) < EPSILON && bestSet) {
      if (selected[0] < bestSet[0]) bestSet = selected.slice();
    }
  }
  return bestSet || Array.from({ length: k }, function (_, i) { return i; });
}

function selectSingle(points, datasetIds, maximize) {
  var n = points.length;
  if (n === 0) return [];
  var centroid = new Array(points[0].length).fill(0);
  for (var i = 0; i < n; i++)
    for (var j = 0; j < points[i].length; j++)
      centroid[j] += points[i][j];
  for (var j = 0; j < centroid.length; j++) centroid[j] /= n;
  var bestIdx = 0;
  var bestDist = maximize ? -Infinity : Infinity;
  for (var i = 0; i < n; i++) {
    var dist = euclideanDistance(points[i], centroid);
    if ((maximize && dist > bestDist) || (!maximize && dist < bestDist)) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return [datasetIds[bestIdx]];
}

export function selectRandom(datasetIds, k) {
  var pool = datasetIds.slice();
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, k);
}

export function selectDiverseConvexHull(points, datasetIds, k) {
  if (k <= 0) return [];
  if (k === 1) return selectSingle(points, datasetIds, true);
  var indices = selectOptimizedSubset(points, k, convexHullDiversity, true);
  return indices.map(function (i) { return datasetIds[i]; });
}

export function selectDiverseEffCov(points, datasetIds, k) {
  if (k <= 0) return [];
  if (k === 1) return selectSingle(points, datasetIds, true);
  var indices = selectOptimizedSubset(points, k, effCovDiversity, true);
  return indices.map(function (i) { return datasetIds[i]; });
}

export function selectNonDiverse(points, datasetIds, k) {
  if (k <= 0) return [];
  if (k === 1) return selectSingle(points, datasetIds, false);
  var indices = selectOptimizedSubset(points, k, effCovDiversity, false);
  return indices.map(function (i) { return datasetIds[i]; });
}

export function selectDatasetSet(points, datasetIds, k, method) {
  switch (method) {
    case "diverse_convex_hull":
      return selectDiverseConvexHull(points, datasetIds, k);
    case "diverse_effcov":
      return selectDiverseEffCov(points, datasetIds, k);
    case "non_diverse":
      return selectNonDiverse(points, datasetIds, k);
    case "random":
    default:
      return selectRandom(datasetIds, k);
  }
}
