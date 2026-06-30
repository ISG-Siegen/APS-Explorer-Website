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

}
