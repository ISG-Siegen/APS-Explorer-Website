var EPSILON = 1e-12;
var GEOMETRY_TOLERANCE = 1e-10;
var MULTI_START_COUNT = 60;

function euclideanDistance(a, b) {
  var sum = 0;
  for (var i = 0; i < a.length; i++) {
    var difference = a[i] - b[i];
    sum += difference * difference;
  }
  return Math.sqrt(sum);
}

function dot(a, b) {
  var sum = 0;
  for (var i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function centerMatrix(matrix) {
  if (matrix.length === 0) return [];
  var dimensions = matrix[0].length;
  var mean = new Array(dimensions).fill(0);
  for (var i = 0; i < matrix.length; i++) {
    for (var j = 0; j < dimensions; j++) mean[j] += matrix[i][j];
  }
  for (var j = 0; j < dimensions; j++) mean[j] /= matrix.length;
  return matrix.map(function (row) {
    return row.map(function (value, index) { return value - mean[index]; });
  });
}

function eigenDecomposeSymmetric(matrix) {
  var size = matrix.length;
  if (size === 0) return { eigenvalues: [], eigenvectors: [] };
  var values = matrix.map(function (row) { return row.slice(); });
  var vectors = Array.from({ length: size }, function (_, row) {
    return Array.from({ length: size }, function (_, column) { return row === column ? 1 : 0; });
  });
  var scale = 0;
  for (var i = 0; i < size; i++) {
    for (var j = 0; j < size; j++) scale = Math.max(scale, Math.abs(values[i][j]));
  }
  var tolerance = EPSILON * (scale || 1);
  var maxIterations = Math.max(100, size * size * 100);

  for (var iteration = 0; iteration < maxIterations; iteration++) {
    var maxOffDiagonal = 0;
    var p = 0;
    var q = 0;
    for (var row = 0; row < size; row++) {
      for (var column = row + 1; column < size; column++) {
        var magnitude = Math.abs(values[row][column]);
        if (magnitude > maxOffDiagonal) {
          maxOffDiagonal = magnitude;
          p = row;
          q = column;
        }
      }
    }
    if (maxOffDiagonal <= tolerance) break;

    var app = values[p][p];
    var aqq = values[q][q];
    var apq = values[p][q];
    if (Math.abs(apq) <= tolerance) continue;
    var tau = (aqq - app) / (2 * apq);
    var tangent = tau >= 0
      ? 1 / (tau + Math.sqrt(1 + tau * tau))
      : -1 / (-tau + Math.sqrt(1 + tau * tau));
    var cosine = 1 / Math.sqrt(1 + tangent * tangent);
    var sine = tangent * cosine;

    values[p][p] = cosine * cosine * app - 2 * sine * cosine * apq + sine * sine * aqq;
    values[q][q] = sine * sine * app + 2 * sine * cosine * apq + cosine * cosine * aqq;
    values[p][q] = 0;
    values[q][p] = 0;

    for (var index = 0; index < size; index++) {
      if (index !== p && index !== q) {
        var aip = values[index][p];
        var aiq = values[index][q];
        values[index][p] = values[p][index] = cosine * aip - sine * aiq;
        values[index][q] = values[q][index] = sine * aip + cosine * aiq;
      }
      var vip = vectors[index][p];
      var viq = vectors[index][q];
      vectors[index][p] = cosine * vip - sine * viq;
      vectors[index][q] = sine * vip + cosine * viq;
    }
  }

  var unsortedValues = values.map(function (row, index) { return row[index]; });
  var order = Array.from({ length: size }, function (_, index) { return index; });
  order.sort(function (left, right) { return unsortedValues[right] - unsortedValues[left]; });
  return {
    eigenvalues: order.map(function (index) { return unsortedValues[index]; }),
    eigenvectors: order.map(function (index) {
      return vectors.map(function (row) { return row[index]; });
    }),
  };
}

function rightSingularSystem(matrix) {
  var rows = matrix.length;
  var columns = matrix[0].length;
  var singularValues = [];
  var rightVectors = [];

  if (rows <= columns) {
    var rowGram = Array.from({ length: rows }, function (_, row) {
      return Array.from({ length: rows }, function (_, column) {
        return dot(matrix[row], matrix[column]);
      });
    });
    var rowDecomposition = eigenDecomposeSymmetric(rowGram);
    rowDecomposition.eigenvalues.forEach(function (eigenvalue, component) {
      var singularValue = Math.sqrt(Math.max(eigenvalue, 0));
      singularValues.push(singularValue);
      var vector = new Array(columns).fill(0);
      if (singularValue > 0) {
        for (var column = 0; column < columns; column++) {
          for (var row = 0; row < rows; row++) {
            vector[column] += matrix[row][column] * rowDecomposition.eigenvectors[component][row];
          }
          vector[column] /= singularValue;
        }
        var norm = Math.sqrt(dot(vector, vector));
        if (norm > 0) vector = vector.map(function (value) { return value / norm; });
      }
      rightVectors.push(vector);
    });
  } else {
    var columnGram = Array.from({ length: columns }, function (_, row) {
      return Array.from({ length: columns }, function (_, column) {
        var sum = 0;
        for (var index = 0; index < rows; index++) sum += matrix[index][row] * matrix[index][column];
        return sum;
      });
    });
    var columnDecomposition = eigenDecomposeSymmetric(columnGram);
    singularValues = columnDecomposition.eigenvalues.map(function (eigenvalue) {
      return Math.sqrt(Math.max(eigenvalue, 0));
    });
    rightVectors = columnDecomposition.eigenvectors;
  }

  return { singularValues: singularValues, rightVectors: rightVectors };
}

export function projectToIntrinsicSubspace(centeredMatrix) {
  var system = rightSingularSystem(centeredMatrix);
  var maximum = system.singularValues[0] || 0;
  if (maximum <= 0) return { rank: 0, projected: [], singularValues: system.singularValues };
  var threshold = EPSILON * maximum;
  var rank = system.singularValues.filter(function (value) { return value > threshold; }).length;
  var projected = centeredMatrix.map(function (row) {
    return Array.from({ length: rank }, function (_, component) {
      return dot(row, system.rightVectors[component]);
    });
  });
  return { rank: rank, projected: projected, singularValues: system.singularValues };
}

function cross2D(origin, a, b) {
  return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
}

function convexHullArea2D(points) {
  if (points.length < 3) return 0;
  var sorted = points.map(function (point) { return point.slice(); });
  sorted.sort(function (a, b) { return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]; });
  var lower = [];
  for (var i = 0; i < sorted.length; i++) {
    while (lower.length >= 2 && cross2D(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) lower.pop();
    lower.push(sorted[i]);
  }
  var upper = [];
  for (var i = sorted.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross2D(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) upper.pop();
    upper.push(sorted[i]);
  }
  lower.pop();
  upper.pop();
  var hull = lower.concat(upper);
  var twiceArea = 0;
  for (var i = 0; i < hull.length; i++) {
    var next = (i + 1) % hull.length;
    twiceArea += hull[i][0] * hull[next][1] - hull[next][0] * hull[i][1];
  }
  return Math.abs(twiceArea) / 2;
}

function determinant(matrix) {
  var size = matrix.length;
  if (size === 0) return 1;
  var values = matrix.map(function (row) { return row.slice(); });
  var result = 1;
  var sign = 1;
  for (var column = 0; column < size; column++) {
    var pivot = column;
    for (var row = column + 1; row < size; row++) {
      if (Math.abs(values[row][column]) > Math.abs(values[pivot][column])) pivot = row;
    }
    if (Math.abs(values[pivot][column]) <= Number.EPSILON) return 0;
    if (pivot !== column) {
      var temporary = values[pivot];
      values[pivot] = values[column];
      values[column] = temporary;
      sign *= -1;
    }
    var pivotValue = values[column][column];
    result *= pivotValue;
    for (var row = column + 1; row < size; row++) {
      var factor = values[row][column] / pivotValue;
      for (var nextColumn = column + 1; nextColumn < size; nextColumn++) {
        values[row][nextColumn] -= factor * values[column][nextColumn];
      }
    }
  }
  return sign * result;
}

function factorial(value) {
  var result = 1;
  for (var i = 2; i <= value; i++) result *= i;
  return result;
}

function affineDistanceSquared(point, selectedPoints) {
  var base = selectedPoints[0];
  var basis = [];
  for (var i = 1; i < selectedPoints.length; i++) {
    var vector = selectedPoints[i].map(function (value, dimension) { return value - base[dimension]; });
    for (var j = 0; j < basis.length; j++) {
      var projection = dot(vector, basis[j]);
      vector = vector.map(function (value, dimension) { return value - projection * basis[j][dimension]; });
    }
    var norm = Math.sqrt(dot(vector, vector));
    if (norm > 0) basis.push(vector.map(function (value) { return value / norm; }));
  }
  var residual = point.map(function (value, dimension) { return value - base[dimension]; });
  for (var i = 0; i < basis.length; i++) {
    var projection = dot(residual, basis[i]);
    residual = residual.map(function (value, dimension) { return value - projection * basis[i][dimension]; });
  }
  return dot(residual, residual);
}

function buildInitialSimplex(points, dimensions) {
  var centroid = new Array(dimensions).fill(0);
  points.forEach(function (point) {
    for (var dimension = 0; dimension < dimensions; dimension++) centroid[dimension] += point[dimension];
  });
  centroid = centroid.map(function (value) { return value / points.length; });
  var first = 0;
  var firstDistance = -1;
  points.forEach(function (point, index) {
    var distance = euclideanDistance(point, centroid);
    if (distance > firstDistance) { firstDistance = distance; first = index; }
  });
  var selected = [first];
  while (selected.length < dimensions + 1) {
    var selectedPoints = selected.map(function (index) { return points[index]; });
    var next = -1;
    var maximumDistance = -1;
    points.forEach(function (point, index) {
      if (selected.indexOf(index) >= 0) return;
      var distance = affineDistanceSquared(point, selectedPoints);
      if (distance > maximumDistance) { maximumDistance = distance; next = index; }
    });
    if (next < 0) return [];
    selected.push(next);
  }
  return selected;
}

function hyperplaneNormal(points, vertexIndices) {
  var dimensions = points[0].length;
  var base = points[vertexIndices[0]];
  var differences = vertexIndices.slice(1).map(function (index) {
    return points[index].map(function (value, dimension) { return value - base[dimension]; });
  });
  var normal = new Array(dimensions).fill(0);
  for (var column = 0; column < dimensions; column++) {
    var minor = differences.map(function (row) {
      return row.filter(function (_, index) { return index !== column; });
    });
    normal[column] = (column % 2 === 0 ? 1 : -1) * determinant(minor);
  }
  var norm = Math.sqrt(dot(normal, normal));
  if (norm <= Number.EPSILON) return null;
  return normal.map(function (value) { return value / norm; });
}

function createFacet(points, vertexIndices, interiorPoint, tolerance) {
  var normal = hyperplaneNormal(points, vertexIndices);
  if (!normal) return null;
  var offset = dot(normal, points[vertexIndices[0]]);
  if (dot(normal, interiorPoint) - offset > tolerance) {
    normal = normal.map(function (value) { return -value; });
    offset *= -1;
  }
  return { vertices: vertexIndices.slice(), normal: normal, offset: offset };
}

function facetKey(vertices) {
  return vertices.slice().sort(function (a, b) { return a - b; }).join(":");
}

function convexHullVolumeND(points) {
  var dimensions = points[0].length;
  if (points.length < dimensions + 1) return 0;
  var coordinateScale = 0;
  points.forEach(function (point) {
    point.forEach(function (value) { coordinateScale = Math.max(coordinateScale, Math.abs(value)); });
  });
  var tolerance = GEOMETRY_TOLERANCE * (coordinateScale || 1);
  var simplex = buildInitialSimplex(points, dimensions);
  if (simplex.length !== dimensions + 1) return 0;
  var interiorPoint = new Array(dimensions).fill(0);
  simplex.forEach(function (index) {
    for (var dimension = 0; dimension < dimensions; dimension++) interiorPoint[dimension] += points[index][dimension];
  });
  interiorPoint = interiorPoint.map(function (value) { return value / simplex.length; });

  var facets = [];
  for (var omitted = 0; omitted < simplex.length; omitted++) {
    var vertices = simplex.filter(function (_, index) { return index !== omitted; });
    var facet = createFacet(points, vertices, interiorPoint, tolerance);
    if (facet) facets.push(facet);
  }

  var simplexSet = new Set(simplex);
  for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
    if (simplexSet.has(pointIndex)) continue;
    var visibleIndices = [];
    facets.forEach(function (facet, index) {
      if (dot(facet.normal, points[pointIndex]) - facet.offset > tolerance) visibleIndices.push(index);
    });
    if (visibleIndices.length === 0) continue;

    var visibleSet = new Set(visibleIndices);
    var ridgeCounts = new Map();
    visibleIndices.forEach(function (facetIndex) {
      var vertices = facets[facetIndex].vertices;
      for (var omittedVertex = 0; omittedVertex < vertices.length; omittedVertex++) {
        var ridge = vertices.filter(function (_, index) { return index !== omittedVertex; });
        var key = facetKey(ridge);
        if (!ridgeCounts.has(key)) ridgeCounts.set(key, { count: 0, vertices: ridge });
        ridgeCounts.get(key).count += 1;
      }
    });

    facets = facets.filter(function (_, index) { return !visibleSet.has(index); });
    var existingKeys = new Set(facets.map(function (facet) { return facetKey(facet.vertices); }));
    ridgeCounts.forEach(function (ridge) {
      if (ridge.count !== 1) return;
      var vertices = ridge.vertices.concat([pointIndex]);
      var key = facetKey(vertices);
      if (existingKeys.has(key)) return;
      var facet = createFacet(points, vertices, interiorPoint, tolerance);
      if (facet) {
        facets.push(facet);
        existingKeys.add(key);
      }
    });
  }

  var volume = 0;
  facets.forEach(function (facet) {
    var edgeMatrix = facet.vertices.map(function (index) {
      return points[index].map(function (value, dimension) { return value - interiorPoint[dimension]; });
    });
    volume += Math.abs(determinant(edgeMatrix)) / factorial(dimensions);
  });
  return Number.isFinite(volume) ? volume : 0;
}

export function intrinsicHullVolume(points) {
  if (points.length < 2) return 0;
  var projection = projectToIntrinsicSubspace(centerMatrix(points));
  if (projection.rank === 0) return 0;
  if (projection.rank === 1) {
    var values = projection.projected.map(function (point) { return point[0]; });
    return Math.max.apply(null, values) - Math.min.apply(null, values);
  }
  if (projection.rank === 2) return convexHullArea2D(projection.projected);
  return convexHullVolumeND(projection.projected);
}

export function meanNearestNeighborDistance(points, indices) {
  if (indices.length < 2) return 0;
  var total = 0;
  for (var a = 0; a < indices.length; a++) {
    var nearest = Infinity;
    for (var b = 0; b < indices.length; b++) {
      if (a === b) continue;
      nearest = Math.min(nearest, euclideanDistance(points[indices[a]], points[indices[b]]));
    }
    total += nearest;
  }
  return total / indices.length;
}

export function convexHullDiversity(points, indices) {
  if (indices.length < 2) return 0;
  var selected = indices.map(function (index) { return points[index]; });
  return meanNearestNeighborDistance(points, indices) * intrinsicHullVolume(selected);
}

export function effCovDiversity(points, indices) {
  if (indices.length < 2) return 0;
  var selected = indices.map(function (index) { return points[index]; });
  var centered = centerMatrix(selected);
  var singularValues = rightSingularSystem(centered).singularValues;
  var covarianceEigenvalues = singularValues.map(function (value) {
    return Math.max(0, value * value / (selected.length - 1));
  }).sort(function (a, b) { return b - a; });
  var maximum = covarianceEigenvalues[0] || 0;
  if (!Number.isFinite(maximum) || maximum <= 0) return 0;
  var effective = covarianceEigenvalues.filter(function (value) { return value > EPSILON * maximum; });
  if (effective.length === 0) return 0;
  var logProduct = effective.reduce(function (sum, value) { return sum + Math.log(value); }, 0);
  var structure = Math.exp(logProduct / (2 * effective.length));
  return meanNearestNeighborDistance(points, indices) * (Number.isFinite(structure) ? structure : 0);
}

function seededRandom(seed) {
  var state = seed >>> 0;
  return function () {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function farthestFirstStartPoints(points, candidateIndices, count) {
  if (candidateIndices.length === 0) return [];
  var random = seededRandom(0);
  var first = candidateIndices[Math.floor(random() * candidateIndices.length)];
  var starts = [first];
  var selected = new Set(starts);
  var minimumDistances = new Map();
  candidateIndices.forEach(function (index) {
    minimumDistances.set(index, euclideanDistance(points[index], points[first]));
  });
  while (starts.length < Math.min(count, candidateIndices.length)) {
    var next = -1;
    var farthestDistance = -Infinity;
    candidateIndices.forEach(function (index) {
      if (selected.has(index)) return;
      var distance = minimumDistances.get(index);
      if (distance > farthestDistance || (Math.abs(distance - farthestDistance) <= EPSILON && index < next)) {
        farthestDistance = distance;
        next = index;
      }
    });
    if (next < 0) break;
    starts.push(next);
    selected.add(next);
    candidateIndices.forEach(function (index) {
      minimumDistances.set(index, Math.min(minimumDistances.get(index), euclideanDistance(points[index], points[next])));
    });
  }
  return starts;
}

function isBetterScore(score, reference, maximize) {
  if (!Number.isFinite(score)) return false;
  if (!Number.isFinite(reference)) return true;
  var tolerance = EPSILON * Math.max(1, Math.abs(score), Math.abs(reference));
  return maximize ? score > reference + tolerance : score < reference - tolerance;
}

function selectOptimizedSubset(points, additions, scoreFunction, maximize, candidateIndices, fixedIndices) {
  if (additions <= 0 || candidateIndices.length === 0) return [];
  if (additions >= candidateIndices.length) return candidateIndices.slice();
  var fixed = fixedIndices.slice();
  var starts = fixed.length > 0
    ? [null]
    : farthestFirstStartPoints(points, candidateIndices, MULTI_START_COUNT);
  var bestScore = maximize ? -Infinity : Infinity;
  var bestAdditions = null;

  starts.forEach(function (start) {
    var chosen = fixed.slice();
    var added = [];
    if (start !== null) {
      chosen.push(start);
      added.push(start);
    }
    while (added.length < additions) {
      var next = -1;
      var nextScore = maximize ? -Infinity : Infinity;
      candidateIndices.forEach(function (index) {
        if (added.indexOf(index) >= 0) return;
        var score = scoreFunction(points, chosen.concat([index]));
        if (isBetterScore(score, nextScore, maximize)
          || (Number.isFinite(score) && Math.abs(score - nextScore) <= EPSILON && (next < 0 || index < next))) {
          nextScore = score;
          next = index;
        }
      });
      if (next < 0) break;
      chosen.push(next);
      added.push(next);
    }
    if (added.length !== additions) return;
    var finalScore = scoreFunction(points, chosen);
    if (isBetterScore(finalScore, bestScore, maximize)
      || (Number.isFinite(finalScore) && Math.abs(finalScore - bestScore) <= EPSILON
        && (!bestAdditions || added.join(":") < bestAdditions.join(":")))) {
      bestScore = finalScore;
      bestAdditions = added.slice();
    }
  });
  return bestAdditions || [];
}

function selectSingle(points, candidateIndices, maximize) {
  if (candidateIndices.length === 0) return [];
  var dimensions = points[0].length;
  var centroid = new Array(dimensions).fill(0);
  candidateIndices.forEach(function (index) {
    for (var dimension = 0; dimension < dimensions; dimension++) centroid[dimension] += points[index][dimension];
  });
  centroid = centroid.map(function (value) { return value / candidateIndices.length; });
  var best = candidateIndices[0];
  var bestDistance = euclideanDistance(points[best], centroid);
  candidateIndices.slice(1).forEach(function (index) {
    var distance = euclideanDistance(points[index], centroid);
    if ((maximize && distance > bestDistance) || (!maximize && distance < bestDistance)) {
      best = index;
      bestDistance = distance;
    }
  });
  return [best];
}

function selectByMetric(points, datasetIds, k, scoreFunction, maximize, fixedDatasetIds) {
  if (k <= 0 || points.length === 0) return [];
  var fixedSet = new Set(fixedDatasetIds || []);
  var fixedIndices = [];
  var candidateIndices = [];
  datasetIds.forEach(function (datasetId, index) {
    if (fixedSet.has(datasetId)) fixedIndices.push(index);
    else candidateIndices.push(index);
  });
  if (k >= candidateIndices.length) return candidateIndices.map(function (index) { return datasetIds[index]; });
  var selectedIndices = fixedIndices.length === 0 && k === 1
    ? selectSingle(points, candidateIndices, maximize)
    : selectOptimizedSubset(points, k, scoreFunction, maximize, candidateIndices, fixedIndices);
  return selectedIndices.map(function (index) { return datasetIds[index]; });
}

export function selectRandom(datasetIds, k, fixedDatasetIds) {
  var fixedSet = new Set(fixedDatasetIds || []);
  var pool = datasetIds.filter(function (datasetId) { return !fixedSet.has(datasetId); });
  for (var i = pool.length - 1; i > 0; i--) {
    var randomIndex = Math.floor(Math.random() * (i + 1));
    var temporary = pool[i];
    pool[i] = pool[randomIndex];
    pool[randomIndex] = temporary;
  }
  return pool.slice(0, k);
}

export function selectDiverseConvexHull(points, datasetIds, k, fixedDatasetIds) {
  return selectByMetric(points, datasetIds, k, convexHullDiversity, true, fixedDatasetIds);
}

export function selectDiverseEffCov(points, datasetIds, k, fixedDatasetIds) {
  return selectByMetric(points, datasetIds, k, effCovDiversity, true, fixedDatasetIds);
}

export function selectNonDiverseConvexHull(points, datasetIds, k, fixedDatasetIds) {
  return selectByMetric(points, datasetIds, k, convexHullDiversity, false, fixedDatasetIds);
}

export function selectNonDiverseEffCov(points, datasetIds, k, fixedDatasetIds) {
  return selectByMetric(points, datasetIds, k, effCovDiversity, false, fixedDatasetIds);
}

export function selectNonDiverse(points, datasetIds, k, fixedDatasetIds) {
  return selectNonDiverseEffCov(points, datasetIds, k, fixedDatasetIds);
}

export function selectDatasetSet(points, datasetIds, k, method, fixedDatasetIds) {
  switch (method) {
    case "diverse_convex_hull":
      return selectDiverseConvexHull(points, datasetIds, k, fixedDatasetIds);
    case "diverse_effcov":
      return selectDiverseEffCov(points, datasetIds, k, fixedDatasetIds);
    case "non_diverse_convex_hull":
      return selectNonDiverseConvexHull(points, datasetIds, k, fixedDatasetIds);
    case "non_diverse_effcov":
    case "non_diverse":
      return selectNonDiverseEffCov(points, datasetIds, k, fixedDatasetIds);
    case "random":
    default:
      return selectRandom(datasetIds, k, fixedDatasetIds);
  }
}
