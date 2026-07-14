<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Strict');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
    ini_set('session.cookie_secure', '1');
}
session_start();

require_once(__DIR__ . '/../apis/db-conn.php');
require_once(__DIR__ . '/../apis/usage-log.php');

if (empty($_SESSION['admin_csrf_token'])) {
    $_SESSION['admin_csrf_token'] = bin2hex(random_bytes(32));
}

function sendJson($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit();
}

function jsonList($value) {
    $decoded = json_decode($value ?? '[]', true);
    return is_array($decoded) ? $decoded : [];
}

function logToArray($row) {
    return [
        'id' => (int)$row['Id'],
        'createdDate' => $row['CreatedDate'],
        'seedDatasets' => jsonList($row['SeedDatasets']),
        'datasetFilter' => jsonList($row['DatasetFilter']),
        'selectionMethod' => $row['SelectionMethod'] ?: null,
        'selectionMetric' => $row['SelectionMetric'] ?: null,
        'selectionKValue' => $row['SelectionKValue'] !== null ? (int)$row['SelectionKValue'] : null,
        'filters' => jsonList($row['Filters']),
        'resultCount' => (int)$row['ResultCount'],
        'recommendedDatasets' => jsonList($row['RecommendedDatasets']),
    ];
}

function incrementCount(&$counts, $key) {
    $label = trim((string)$key);
    if ($label === '') {
        $label = 'Not specified';
    }
    $counts[$label] = ($counts[$label] ?? 0) + 1;
}

function countDatasetIds(&$counts, $ids) {
    foreach ($ids as $id) {
        $key = (string)$id;
        $counts[$key] = ($counts[$key] ?? 0) + 1;
    }
}

function rankedCounts($counts, $labels = [], $limit = 10) {
    arsort($counts);
    $result = [];
    foreach (array_slice($counts, 0, $limit, true) as $key => $count) {
        $result[] = [
            'label' => $labels[(string)$key] ?? (string)$key,
            'count' => (int)$count,
        ];
    }
    return $result;
}

function hasRange($range) {
    return is_array($range) &&
        (array_key_exists('min', $range) || array_key_exists('max', $range));
}

function buildSummary($pdo) {
    UsageLog::ensureTableExists($pdo);

    $rows = $pdo->query('SELECT * FROM UsageLogs ORDER BY CreatedDate ASC')->fetchAll(PDO::FETCH_ASSOC);
    $datasetRows = $pdo->query('SELECT Id, Name FROM Datasets')->fetchAll(PDO::FETCH_ASSOC);
    $datasetNames = [];
    foreach ($datasetRows as $dataset) {
        $datasetNames[(string)$dataset['Id']] = $dataset['Name'];
    }

    $now = time();
    $today = date('Y-m-d', $now);
    $dayCounts = [];
    for ($daysAgo = 29; $daysAgo >= 0; $daysAgo--) {
        $day = date('Y-m-d', strtotime('-' . $daysAgo . ' days', $now));
        $dayCounts[$day] = 0;
    }

    $hourCounts = array_fill(0, 24, 0);
    $weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    $weekdayCounts = array_fill_keys($weekdayLabels, 0);
    $methods = [];
    $metrics = [];
    $kValues = [];
    $seedDatasets = [];
    $filteredDatasets = [];
    $recommendedDatasets = [];
    $filterUsage = [];
    $resultCounts = [];
    $totalSeeds = 0;
    $totalCandidates = 0;
    $totalRecommendations = 0;
    $todayCount = 0;
    $last7Count = 0;
    $previous7Count = 0;
    $last30Count = 0;

    foreach ($rows as $row) {
        $createdAt = strtotime($row['CreatedDate']);
        $dateKey = substr($row['CreatedDate'], 0, 10);
        if ($dateKey === $today) {
            $todayCount++;
        }
        if ($createdAt !== false && $createdAt >= strtotime('-7 days', $now)) {
            $last7Count++;
        } elseif ($createdAt !== false && $createdAt >= strtotime('-14 days', $now)) {
            $previous7Count++;
        }
        if ($createdAt !== false && $createdAt >= strtotime('-30 days', $now)) {
            $last30Count++;
        }
        if (array_key_exists($dateKey, $dayCounts)) {
            $dayCounts[$dateKey]++;
        }
        if ($createdAt !== false) {
            $hourCounts[(int)date('G', $createdAt)]++;
            $weekdayCounts[$weekdayLabels[(int)date('N', $createdAt) - 1]]++;
        }

        incrementCount($methods, $row['SelectionMethod']);
        incrementCount($metrics, $row['SelectionMetric']);
        if ($row['SelectionKValue'] !== null) {
            incrementCount($kValues, (string)(int)$row['SelectionKValue']);
        }

        $seeds = jsonList($row['SeedDatasets']);
        $candidates = jsonList($row['DatasetFilter']);
        $recommendations = jsonList($row['RecommendedDatasets']);
        $filters = jsonList($row['Filters']);

        countDatasetIds($seedDatasets, $seeds);
        countDatasetIds($filteredDatasets, $candidates);
        countDatasetIds($recommendedDatasets, $recommendations);
        $totalSeeds += count($seeds);
        $totalCandidates += count($candidates);
        $totalRecommendations += count($recommendations);

        if (!empty($filters['feedbackType']) && $filters['feedbackType'] !== 'all') {
            incrementCount($filterUsage, 'Feedback Type');
        }
        if (hasRange($filters['interactions'] ?? null)) {
            incrementCount($filterUsage, 'Interactions Range');
        }
        if (!empty($filters['metadataRanges']) && is_array($filters['metadataRanges'])) {
            foreach ($filters['metadataRanges'] as $key => $range) {
                if (hasRange($range)) {
                    incrementCount($filterUsage, 'Metadata: ' . $key);
                }
            }
        }
        $resultCounts[] = (int)$row['ResultCount'];
    }

    sort($resultCounts);
    $total = count($rows);
    $resultSum = array_sum($resultCounts);
    $median = 0;
    if ($total > 0) {
        $middle = intdiv($total, 2);
        $median = $total % 2 === 0
            ? ($resultCounts[$middle - 1] + $resultCounts[$middle]) / 2
            : $resultCounts[$middle];
    }

    $activity = [];
    foreach ($dayCounts as $day => $count) {
        $activity[] = ['label' => $day, 'count' => $count];
    }
    $hourly = [];
    foreach ($hourCounts as $hour => $count) {
        $hourly[] = ['label' => sprintf('%02d:00', $hour), 'count' => $count];
    }
    $weekdays = [];
    foreach ($weekdayCounts as $day => $count) {
        $weekdays[] = ['label' => $day, 'count' => $count];
    }

    $change = null;
    if ($previous7Count > 0) {
        $change = round((($last7Count - $previous7Count) / $previous7Count) * 100, 1);
    }

    return [
        'csrfToken' => $_SESSION['admin_csrf_token'],
        'kpis' => [
            'totalUses' => $total,
            'todayUses' => $todayCount,
            'last7Days' => $last7Count,
            'last30Days' => $last30Count,
            'sevenDayChangePercent' => $change,
            'firstUse' => $total ? $rows[0]['CreatedDate'] : null,
            'lastUse' => $total ? $rows[$total - 1]['CreatedDate'] : null,
            'totalResults' => $resultSum,
            'averageResults' => $total ? round($resultSum / $total, 2) : 0,
            'medianResults' => $median,
            'minimumResults' => $total ? min($resultCounts) : 0,
            'maximumResults' => $total ? max($resultCounts) : 0,
            'averageSeeds' => $total ? round($totalSeeds / $total, 2) : 0,
            'averageCandidates' => $total ? round($totalCandidates / $total, 2) : 0,
            'averageRecommendations' => $total ? round($totalRecommendations / $total, 2) : 0,
        ],
        'activity' => $activity,
        'hourly' => $hourly,
        'weekdays' => $weekdays,
        'methods' => rankedCounts($methods, [], 20),
        'metrics' => rankedCounts($metrics, [], 20),
        'kValues' => rankedCounts($kValues, [], 20),
        'topSeedDatasets' => rankedCounts($seedDatasets, $datasetNames),
        'topFilteredDatasets' => rankedCounts($filteredDatasets, $datasetNames),
        'topRecommendedDatasets' => rankedCounts($recommendedDatasets, $datasetNames),
        'filterUsage' => rankedCounts($filterUsage, [], 30),
        'datasetNames' => $datasetNames,
    ];
}

function buildLogFilters(&$params) {
    $where = [];
    $search = trim($_GET['search'] ?? '');
    if ($search !== '') {
        $where[] = '(SelectionMethod LIKE :search OR SelectionMetric LIKE :search OR SeedDatasets LIKE :search OR DatasetFilter LIKE :search OR RecommendedDatasets LIKE :search OR Filters LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }
    if (!empty($_GET['from'])) {
        $where[] = 'CreatedDate >= :fromDate';
        $params[':fromDate'] = $_GET['from'] . ' 00:00:00';
    }
    if (!empty($_GET['to'])) {
        $where[] = 'CreatedDate <= :toDate';
        $params[':toDate'] = $_GET['to'] . ' 23:59:59.999999';
    }
    if (!empty($_GET['method'])) {
        $where[] = 'SelectionMethod = :method';
        $params[':method'] = $_GET['method'];
    }
    if (!empty($_GET['metric'])) {
        $where[] = 'SelectionMetric = :metric';
        $params[':metric'] = $_GET['metric'];
    }
    return $where ? ' WHERE ' . implode(' AND ', $where) : '';
}

function buildLogs($pdo) {
    UsageLog::ensureTableExists($pdo);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = max(10, min(200, (int)($_GET['pageSize'] ?? 25)));
    $params = [];
    $where = buildLogFilters($params);

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM UsageLogs' . $where);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();
    $totalPages = max(1, (int)ceil($total / $pageSize));
    $page = min($page, $totalPages);
    $offset = ($page - 1) * $pageSize;

    $sortColumns = ['date' => 'CreatedDate', 'results' => 'ResultCount', 'id' => 'Id'];
    $sort = $sortColumns[$_GET['sort'] ?? 'date'] ?? 'CreatedDate';
    $direction = strtolower($_GET['direction'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';

    $stmt = $pdo->prepare('SELECT * FROM UsageLogs' . $where . " ORDER BY $sort $direction LIMIT :limit OFFSET :offset");
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    return [
        'csrfToken' => $_SESSION['admin_csrf_token'],
        'logs' => array_map('logToArray', $stmt->fetchAll(PDO::FETCH_ASSOC)),
        'total' => $total,
        'page' => $page,
        'pageSize' => $pageSize,
        'totalPages' => $totalPages,
    ];
}

function requireCsrfToken() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$token || !hash_equals($_SESSION['admin_csrf_token'], $token)) {
        sendJson(403, ['isSuccess' => false, 'message' => 'Invalid CSRF token']);
    }
}

if (defined('APS_ADMIN_API_LIBRARY_ONLY')) {
    return;
}

$pdo = Database::getConnection();
if ($pdo === null) {
    sendJson(500, ['isSuccess' => false, 'message' => 'Database connection failed']);
}

try {
    $action = $_GET['action'] ?? 'summary';
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'summary') {
        sendJson(200, ['isSuccess' => true, 'data' => buildSummary($pdo)]);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'logs') {
        sendJson(200, ['isSuccess' => true, 'data' => buildLogs($pdo)]);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete') {
        requireCsrfToken();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!empty($body['deleteAll'])) {
            $deleted = $pdo->exec('DELETE FROM UsageLogs');
            sendJson(200, ['isSuccess' => true, 'deleted' => (int)$deleted]);
        }
        $id = (int)($body['id'] ?? 0);
        if ($id < 1) {
            sendJson(400, ['isSuccess' => false, 'message' => 'A valid log ID is required']);
        }
        $stmt = $pdo->prepare('DELETE FROM UsageLogs WHERE Id = :id');
        $stmt->execute([':id' => $id]);
        sendJson(200, ['isSuccess' => true, 'deleted' => $stmt->rowCount()]);
    }
    sendJson(404, ['isSuccess' => false, 'message' => 'Unknown admin action']);
} catch (Throwable $exception) {
    error_log('Admin API error: ' . $exception->getMessage());
    $response = ['isSuccess' => false, 'message' => 'The admin request failed'];
    if (Database::isDebugEnabled()) {
        $response['error'] = $exception->getMessage();
    }
    sendJson(500, $response);
}
