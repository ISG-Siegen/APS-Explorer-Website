<?php
/**
 * Migration script: Fetch data from remote API and insert into local database.
 * Usage: php _scripts/migrate-remote-to-local.php
 */

$remoteBaseUrl = 'https://finally.recommender-systems.com/index.php?action=';
$localDbConfig = __DIR__ . '/../configs/db_config.php';

$dbConfig = include($localDbConfig);

try {
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['dbname']};port={$dbConfig['port']}";
    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "Connected to local database '{$dbConfig['dbname']}'\n";
} catch (PDOException $e) {
    die("Local DB connection failed: " . $e->getMessage() . "\n");
}

function fetchFromApi($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) throw new Exception("cURL error: $error");
    if ($httpCode !== 200) throw new Exception("HTTP $httpCode from $url");

    $data = json_decode($response, true);
    if (!$data || !isset($data['isSuccess']) || !$data['isSuccess']) {
        throw new Exception("API error: " . ($data['message'] ?? json_last_error_msg()));
    }
    return $data['data'];
}

echo "\n--- Step 1: Creating tables (if not exist) ---\n";

$pdo->exec("CREATE TABLE IF NOT EXISTS Algorithms (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    CreatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS Datasets (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    CreatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    NumberOfUsers INT,
    NumberOfItems INT,
    NumberOfInteractions INT,
    UserItemRatio FLOAT,
    ItemUserRatio FLOAT,
    Density FLOAT,
    FeedbackType VARCHAR(50),
    HighestNumberOfRatingBySingleUser INT,
    LowestNumberOfRatingBySingleUser INT,
    HighestNumberOfRatingOnSingleItem INT,
    LowestNumberOfRatingOnSingleItem INT,
    MeanNumberOfRatingsByUser FLOAT,
    MeanNumberOfRatingsOnItem FLOAT
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS PerformanceResults (
    AlgorithmId INT NOT NULL,
    DatasetId INT NOT NULL,
    AlgorithmConfigIndex VARCHAR(255),
    AlgorithmConfiguration TEXT,
    Hr_One FLOAT,
    Hr_Three FLOAT,
    Hr_Five FLOAT,
    Hr_Ten FLOAT,
    Hr_Twenty FLOAT,
    Recall_One FLOAT,
    Recall_Three FLOAT,
    Recall_Five FLOAT,
    Recall_Ten FLOAT,
    Recall_Twenty FLOAT,
    Ndcg_One FLOAT,
    Ndcg_Three FLOAT,
    Ndcg_Five FLOAT,
    Ndcg_Ten FLOAT,
    Ndcg_Twenty FLOAT,
    PRIMARY KEY (AlgorithmId, DatasetId),
    FOREIGN KEY (AlgorithmId) REFERENCES Algorithms(Id),
    FOREIGN KEY (DatasetId) REFERENCES Datasets(Id)
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS PcaResults (
    DatasetId INT NOT NULL PRIMARY KEY,
    CreatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    Ndcg_One_X FLOAT, Ndcg_One_Y FLOAT, Ndcg_One_VarianceX FLOAT, Ndcg_One_VarianceY FLOAT,
    Ndcg_Three_X FLOAT, Ndcg_Three_Y FLOAT, Ndcg_Three_VarianceX FLOAT, Ndcg_Three_VarianceY FLOAT,
    Ndcg_Five_X FLOAT, Ndcg_Five_Y FLOAT, Ndcg_Five_VarianceX FLOAT, Ndcg_Five_VarianceY FLOAT,
    Ndcg_Ten_X FLOAT, Ndcg_Ten_Y FLOAT, Ndcg_Ten_VarianceX FLOAT, Ndcg_Ten_VarianceY FLOAT,
    Ndcg_Twenty_X FLOAT, Ndcg_Twenty_Y FLOAT, Ndcg_Twenty_VarianceX FLOAT, Ndcg_Twenty_VarianceY FLOAT,
    Hr_One_X FLOAT, Hr_One_Y FLOAT, Hr_One_VarianceX FLOAT, Hr_One_VarianceY FLOAT,
    Hr_Three_X FLOAT, Hr_Three_Y FLOAT, Hr_Three_VarianceX FLOAT, Hr_Three_VarianceY FLOAT,
    Hr_Five_X FLOAT, Hr_Five_Y FLOAT, Hr_Five_VarianceX FLOAT, Hr_Five_VarianceY FLOAT,
    Hr_Ten_X FLOAT, Hr_Ten_Y FLOAT, Hr_Ten_VarianceX FLOAT, Hr_Ten_VarianceY FLOAT,
    Hr_Twenty_X FLOAT, Hr_Twenty_Y FLOAT, Hr_Twenty_VarianceX FLOAT, Hr_Twenty_VarianceY FLOAT,
    Recall_One_X FLOAT, Recall_One_Y FLOAT, Recall_One_VarianceX FLOAT, Recall_One_VarianceY FLOAT,
    Recall_Three_X FLOAT, Recall_Three_Y FLOAT, Recall_Three_VarianceX FLOAT, Recall_Three_VarianceY FLOAT,
    Recall_Five_X FLOAT, Recall_Five_Y FLOAT, Recall_Five_VarianceX FLOAT, Recall_Five_VarianceY FLOAT,
    Recall_Ten_X FLOAT, Recall_Ten_Y FLOAT, Recall_Ten_VarianceX FLOAT, Recall_Ten_VarianceY FLOAT,
    Recall_Twenty_X FLOAT, Recall_Twenty_Y FLOAT, Recall_Twenty_VarianceX FLOAT, Recall_Twenty_VarianceY FLOAT,
    FOREIGN KEY (DatasetId) REFERENCES Datasets(Id)
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS UsageLogs (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    CreatedDate DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    SeedDatasets TEXT,
    DatasetFilter TEXT,
    Filters TEXT,
    ResultCount INT,
    RecommendedDatasets TEXT
)");
echo "Tables ready\n";

echo "\n--- Step 2: Migrating Algorithms ---\n";
$algorithms = fetchFromApi($remoteBaseUrl . 'algorithm');
echo "Fetched " . count($algorithms) . " algorithms from remote\n";

$count = 0;
$insertAlgo = $pdo->prepare("INSERT INTO Algorithms (Id, Name, CreatedDate) VALUES (:id, :name, NOW(6)) ON DUPLICATE KEY UPDATE Name = VALUES(Name)");
foreach ($algorithms as $algo) {
    $insertAlgo->execute([':id' => $algo['id'], ':name' => $algo['name']]);
    $count++;
}
echo "$count algorithms inserted\n";

$algoIds = array_map(fn($a) => $a['id'], $algorithms);
echo "Algorithm IDs on remote: " . implode(', ', $algoIds) . "\n";

echo "\n--- Step 3: Migrating Datasets ---\n";
$datasets = fetchFromApi($remoteBaseUrl . 'dataset');
echo "Fetched " . count($datasets) . " datasets from remote\n";

$insertDataset = $pdo->prepare("
    INSERT INTO Datasets (Id, Name, CreatedDate, NumberOfUsers, NumberOfItems, NumberOfInteractions,
        UserItemRatio, ItemUserRatio, Density, FeedbackType,
        HighestNumberOfRatingBySingleUser, LowestNumberOfRatingBySingleUser,
        HighestNumberOfRatingOnSingleItem, LowestNumberOfRatingOnSingleItem,
        MeanNumberOfRatingsByUser, MeanNumberOfRatingsOnItem)
    VALUES (:id, :name, NOW(6), :numberOfUsers, :numberOfItems, :numberOfInteractions,
        :userItemRatio, :itemUserRatio, :density, :feedbackType,
        :highestNumberOfRatingBySingleUser, :lowestNumberOfRatingBySingleUser,
        :highestNumberOfRatingOnSingleItem, :lowestNumberOfRatingOnSingleItem,
        :meanNumberOfRatingsByUser, :meanNumberOfRatingsOnItem)
    ON DUPLICATE KEY UPDATE Name = VALUES(Name)
");
$count = 0;
foreach ($datasets as $ds) {
    $insertDataset->execute([
        ':id' => $ds['id'],
        ':name' => $ds['name'],
        ':numberOfUsers' => $ds['numberOfUsers'] ?? null,
        ':numberOfItems' => $ds['numberOfItems'] ?? null,
        ':numberOfInteractions' => $ds['numberOfInteractions'] ?? null,
        ':userItemRatio' => $ds['userItemRatio'] ?? null,
        ':itemUserRatio' => $ds['itemUserRatio'] ?? null,
        ':density' => $ds['density'] ?? null,
        ':feedbackType' => $ds['feedbackType'] ?? null,
        ':highestNumberOfRatingBySingleUser' => $ds['highestNumberOfRatingBySingleUser'] ?? null,
        ':lowestNumberOfRatingBySingleUser' => $ds['lowestNumberOfRatingBySingleUser'] ?? null,
        ':highestNumberOfRatingOnSingleItem' => $ds['highestNumberOfRatingOnSingleItem'] ?? null,
        ':lowestNumberOfRatingOnSingleItem' => $ds['lowestNumberOfRatingOnSingleItem'] ?? null,
        ':meanNumberOfRatingsByUser' => $ds['meanNumberOfRatingsByUser'] ?? null,
        ':meanNumberOfRatingsOnItem' => $ds['meanNumberOfRatingsOnItem'] ?? null,
    ]);
    $count++;
}
echo "$count datasets inserted\n";

$datasetIds = array_map(fn($ds) => $ds['id'], $datasets);

echo "\n--- Step 4: Migrating PCA Results ---\n";
$pcaResults = fetchFromApi($remoteBaseUrl . 'result&task=pcaResults');
echo "Fetched " . count($pcaResults) . " PCA results from remote\n";

$pdo->exec("DELETE FROM PcaResults");
$insertPca = $pdo->prepare("
    INSERT INTO PcaResults (DatasetId, CreatedDate,
        Ndcg_One_X, Ndcg_One_Y, Ndcg_One_VarianceX, Ndcg_One_VarianceY,
        Ndcg_Three_X, Ndcg_Three_Y, Ndcg_Three_VarianceX, Ndcg_Three_VarianceY,
        Ndcg_Five_X, Ndcg_Five_Y, Ndcg_Five_VarianceX, Ndcg_Five_VarianceY,
        Ndcg_Ten_X, Ndcg_Ten_Y, Ndcg_Ten_VarianceX, Ndcg_Ten_VarianceY,
        Ndcg_Twenty_X, Ndcg_Twenty_Y, Ndcg_Twenty_VarianceX, Ndcg_Twenty_VarianceY,
        Hr_One_X, Hr_One_Y, Hr_One_VarianceX, Hr_One_VarianceY,
        Hr_Three_X, Hr_Three_Y, Hr_Three_VarianceX, Hr_Three_VarianceY,
        Hr_Five_X, Hr_Five_Y, Hr_Five_VarianceX, Hr_Five_VarianceY,
        Hr_Ten_X, Hr_Ten_Y, Hr_Ten_VarianceX, Hr_Ten_VarianceY,
        Hr_Twenty_X, Hr_Twenty_Y, Hr_Twenty_VarianceX, Hr_Twenty_VarianceY,
        Recall_One_X, Recall_One_Y, Recall_One_VarianceX, Recall_One_VarianceY,
        Recall_Three_X, Recall_Three_Y, Recall_Three_VarianceX, Recall_Three_VarianceY,
        Recall_Five_X, Recall_Five_Y, Recall_Five_VarianceX, Recall_Five_VarianceY,
        Recall_Ten_X, Recall_Ten_Y, Recall_Ten_VarianceX, Recall_Ten_VarianceY,
        Recall_Twenty_X, Recall_Twenty_Y, Recall_Twenty_VarianceX, Recall_Twenty_VarianceY)
    VALUES (:datasetId, NOW(6),
        :ndcg_One_X, :ndcg_One_Y, :ndcg_One_VarianceX, :ndcg_One_VarianceY,
        :ndcg_Three_X, :ndcg_Three_Y, :ndcg_Three_VarianceX, :ndcg_Three_VarianceY,
        :ndcg_Five_X, :ndcg_Five_Y, :ndcg_Five_VarianceX, :ndcg_Five_VarianceY,
        :ndcg_Ten_X, :ndcg_Ten_Y, :ndcg_Ten_VarianceX, :ndcg_Ten_VarianceY,
        :ndcg_Twenty_X, :ndcg_Twenty_Y, :ndcg_Twenty_VarianceX, :ndcg_Twenty_VarianceY,
        :hr_One_X, :hr_One_Y, :hr_One_VarianceX, :hr_One_VarianceY,
        :hr_Three_X, :hr_Three_Y, :hr_Three_VarianceX, :hr_Three_VarianceY,
        :hr_Five_X, :hr_Five_Y, :hr_Five_VarianceX, :hr_Five_VarianceY,
        :hr_Ten_X, :hr_Ten_Y, :hr_Ten_VarianceX, :hr_Ten_VarianceY,
        :hr_Twenty_X, :hr_Twenty_Y, :hr_Twenty_VarianceX, :hr_Twenty_VarianceY,
        :recall_One_X, :recall_One_Y, :recall_One_VarianceX, :recall_One_VarianceY,
        :recall_Three_X, :recall_Three_Y, :recall_Three_VarianceX, :recall_Three_VarianceY,
        :recall_Five_X, :recall_Five_Y, :recall_Five_VarianceX, :recall_Five_VarianceY,
        :recall_Ten_X, :recall_Ten_Y, :recall_Ten_VarianceX, :recall_Ten_VarianceY,
        :recall_Twenty_X, :recall_Twenty_Y, :recall_Twenty_VarianceX, :recall_Twenty_VarianceY)
");
$count = 0;
foreach ($pcaResults as $pca) {
    $params = [':datasetId' => $pca['datasetId']];
    foreach (['ndcg', 'hr', 'recall'] as $metric) {
        foreach (['one', 'three', 'five', 'ten', 'twenty'] as $k) {
            $K = ucfirst($k);
            $params[":{$metric}_{$K}_X"] = $pca[$metric][$k]['x'] ?? null;
            $params[":{$metric}_{$K}_Y"] = $pca[$metric][$k]['y'] ?? null;
            $params[":{$metric}_{$K}_VarianceX"] = $pca[$metric][$k]['varianceX'] ?? null;
            $params[":{$metric}_{$K}_VarianceY"] = $pca[$metric][$k]['varianceY'] ?? null;
        }
    }
    $insertPca->execute($params);
    $count++;
}
echo "$count PCA results inserted\n";

echo "\n--- Step 5: Migrating Performance Results ---\n";
$queryStr = http_build_query(['ids' => $datasetIds]);
$url = $remoteBaseUrl . 'result&' . $queryStr;
$perfResults = fetchFromApi($url);
echo "Fetched " . count($perfResults) . " performance results from remote\n";

$pdo->exec("DELETE FROM PerformanceResults");
$insertPerf = $pdo->prepare("
    INSERT INTO PerformanceResults (AlgorithmId, DatasetId, AlgorithmConfigIndex, AlgorithmConfiguration,
        Hr_One, Hr_Three, Hr_Five, Hr_Ten, Hr_Twenty,
        Recall_One, Recall_Three, Recall_Five, Recall_Ten, Recall_Twenty,
        Ndcg_One, Ndcg_Three, Ndcg_Five, Ndcg_Ten, Ndcg_Twenty)
    VALUES (:algorithmId, :datasetId, :algorithmConfigIndex, :algorithmConfiguration,
        :hr_one, :hr_three, :hr_five, :hr_ten, :hr_twenty,
        :recall_one, :recall_three, :recall_five, :recall_ten, :recall_twenty,
        :ndcg_one, :ndcg_three, :ndcg_five, :ndcg_ten, :ndcg_twenty)
");
$count = 0;
foreach ($perfResults as $pr) {
    $insertPerf->execute([
        ':algorithmId' => $pr['algorithmId'],
        ':datasetId' => $pr['datasetId'],
        ':algorithmConfigIndex' => $pr['algorithmConfigIndex'] ?? null,
        ':algorithmConfiguration' => $pr['algorithmConfiguration'] ?? null,
        ':hr_one' => $pr['hr']['one'] ?? null,
        ':hr_three' => $pr['hr']['three'] ?? null,
        ':hr_five' => $pr['hr']['five'] ?? null,
        ':hr_ten' => $pr['hr']['ten'] ?? null,
        ':hr_twenty' => $pr['hr']['twenty'] ?? null,
        ':recall_one' => $pr['recall']['one'] ?? null,
        ':recall_three' => $pr['recall']['three'] ?? null,
        ':recall_five' => $pr['recall']['five'] ?? null,
        ':recall_ten' => $pr['recall']['ten'] ?? null,
        ':recall_twenty' => $pr['recall']['twenty'] ?? null,
        ':ndcg_one' => $pr['ndcg']['one'] ?? null,
        ':ndcg_three' => $pr['ndcg']['three'] ?? null,
        ':ndcg_five' => $pr['ndcg']['five'] ?? null,
        ':ndcg_ten' => $pr['ndcg']['ten'] ?? null,
        ':ndcg_twenty' => $pr['ndcg']['twenty'] ?? null,
    ]);
    $count++;
}
echo "$count performance results inserted\n";

echo "\n========================================\n";
echo "  Migration completed successfully!\n";
echo "========================================\n";
