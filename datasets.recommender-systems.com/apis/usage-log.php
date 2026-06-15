<?php
class UsageLog {
    public static function ensureTableExists($pdo) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS UsageLogs (
            Id INT AUTO_INCREMENT PRIMARY KEY,
            CreatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
            SeedDatasets TEXT,
            DatasetFilter TEXT,
            SelectionMethod VARCHAR(50),
            SelectionMetric VARCHAR(50),
            SelectionKValue INT,
            Filters TEXT,
            ResultCount INT,
            RecommendedDatasets TEXT
        )");
        // add columns if missing (upgrade existing tables)
        try { $pdo->exec("ALTER TABLE UsageLogs ADD COLUMN SelectionMethod VARCHAR(50) DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE UsageLogs ADD COLUMN SelectionMetric VARCHAR(50) DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE UsageLogs ADD COLUMN SelectionKValue INT DEFAULT NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE UsageLogs MODIFY COLUMN SelectionKValue INT DEFAULT NULL"); } catch (Exception $e) {}
    }

    public static function saveUsageLog($pdo, $body) {
        header('Content-Type: application/json');
        self::ensureTableExists($pdo);

        if (!isset($body['seedDatasets']) || !isset($body['datasetFilter']) ||
            !isset($body['filters']) || !isset($body['resultCount']) ||
            !isset($body['recommendedDatasets'])) {
            http_response_code(400);
            echo json_encode([
                "isSuccess" => false,
                "statusCode" => 400,
                "message" => "Missing required fields"
            ]);
            exit();
        }

        $stmt = $pdo->prepare("INSERT INTO UsageLogs (CreatedDate, SeedDatasets, DatasetFilter, SelectionMethod, SelectionMetric, SelectionKValue, Filters, ResultCount, RecommendedDatasets)
            VALUES (NOW(6), :seedDatasets, :datasetFilter, :selectionMethod, :selectionMetric, :selectionKValue, :filters, :resultCount, :recommendedDatasets)");
        $stmt->execute([
            ':seedDatasets' => json_encode($body['seedDatasets']),
            ':datasetFilter' => json_encode($body['datasetFilter']),
            ':selectionMethod' => $body['selectionMethod'] ?? null,
            ':selectionMetric' => $body['selectionMetric'] ?? null,
            ':selectionKValue' => isset($body['selectionKValue']) ? (int)$body['selectionKValue'] : null,
            ':filters' => json_encode($body['filters']),
            ':resultCount' => $body['resultCount'],
            ':recommendedDatasets' => json_encode($body['recommendedDatasets']),
        ]);

        http_response_code(200);
        echo json_encode([
            "isSuccess" => true,
            "statusCode" => 200,
            "message" => "Usage log saved"
        ]);
    }

    public static function deleteAllUsageLogs($pdo) {
        header('Content-Type: application/json');
        self::ensureTableExists($pdo);

        $pdo->exec("DELETE FROM UsageLogs");

        http_response_code(200);
        echo json_encode([
            "isSuccess" => true,
            "statusCode" => 200,
            "message" => "All usage logs deleted"
        ]);
    }

    public static function getUsageLogs($pdo) {
        header('Content-Type: application/json');
        self::ensureTableExists($pdo);

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $pageSize = isset($_GET['pageSize']) ? max(1, min(200, (int)$_GET['pageSize'])) : 50;
        $offset = ($page - 1) * $pageSize;

        $countStmt = $pdo->query("SELECT COUNT(*) as total FROM UsageLogs");
        $total = (int)$countStmt->fetch(PDO::FETCH_OBJ)->total;
        $totalPages = max(1, (int)ceil($total / $pageSize));

        $stmt = $pdo->prepare("SELECT * FROM UsageLogs ORDER BY Id DESC LIMIT :limit OFFSET :offset");
        $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_OBJ);

        $logs = array_map(function ($row) {
            return [
                'id' => (int)$row->Id,
                'createdDate' => $row->CreatedDate,
                'seedDatasets' => json_decode($row->SeedDatasets, true) ?? [],
                'datasetFilter' => json_decode($row->DatasetFilter, true) ?? [],
                'selectionMethod' => $row->SelectionMethod ?? null,
                'selectionMetric' => $row->SelectionMetric ?? null,
                'selectionKValue' => $row->SelectionKValue !== null ? (int)$row->SelectionKValue : null,
                'filters' => json_decode($row->Filters, true) ?? [],
                'resultCount' => (int)$row->ResultCount,
                'recommendedDatasets' => json_decode($row->RecommendedDatasets, true) ?? [],
            ];
        }, $rows);

        echo json_encode([
            "isSuccess" => true,
            "statusCode" => 200,
            "data" => [
                "logs" => $logs,
                "total" => $total,
                "page" => $page,
                "pageSize" => $pageSize,
                "totalPages" => $totalPages,
            ]
        ]);
    }
}
