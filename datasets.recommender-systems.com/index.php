<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: *");

include_once('apis/db-conn.php');
include_once('apis/algorithm.php');
include_once('apis/dataset.php');
include_once('apis/performance-result.php');
include_once('apis/admin.php');
include_once('apis/usage-log.php');

$pdo = Database::getConnection();  
if ($pdo === null) {
    header('Content-Type: application/json');
    http_response_code(500);
    $response = [
        "isSuccess" => false,
        "statusCode" => 500,
        "message" => "Connection to the DB failed"
    ];

    $databaseError = Database::getLastError();
    if ($databaseError !== null) {
        $response["error"] = $databaseError;
    }

    echo json_encode($response);
    exit();
}

set_exception_handler(function ($exception) {
    error_log('Unhandled API error: ' . $exception->getMessage());

    header('Content-Type: application/json');
    http_response_code(500);
    $response = [
        "isSuccess" => false,
        "statusCode" => 500,
        "message" => "The API request failed"
    ];

    if (Database::isDebugEnabled()) {
        $response["error"] = $exception->getMessage();
    }

    echo json_encode($response);
});

$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : null;
if ($action === null) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode([
        "isSuccess" => false,
        "statusCode" => 400,
        "message" => "Action is missing"
    ]);
    exit();
}

if ($action === 'algorithm') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if ($id === null) {
        Algorithm::getAll($pdo);
    }
    else {
        if (!is_numeric($id)) {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode([
                "isSuccess" => false,
                "statusCode" => 400,
                "message" => "Wrong query parameter"
            ]);
            exit();
        }

        Algorithm::get($pdo, $id);
    }
}
else if ($action === 'dataset') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if ($id === null) {
        Dataset::getAll($pdo);
    }
    else {
        if (!is_numeric($id)) {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode([
                "isSuccess" => false,
                "statusCode" => 400,
                "message" => "Wrong query parameter"
            ]);
            exit();
        }

        Dataset::get($pdo, $id);
    }
}
else if ($action === 'result') {
    $task = isset($_REQUEST['task']) ? $_REQUEST['task'] : null;
    if ($task === 'compareAlgorithms') {
        $x = isset($_GET['x']) ? $_GET['x'] : null;
        $y = isset($_GET['y']) ? $_GET['y'] : null;
        if ($x === null || $y === null) {
            header('Content-Type: application/json');
            http_response_code(404);
            echo json_encode([
                "isSuccess" => false,
                "statusCode" => 404,
                "message" => "Algorithm IDs are missing"
            ]);
            exit();
        }
        if (!is_numeric($x) || !is_numeric($y)) {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode([
                "isSuccess" => false,
                "statusCode" => 400,
                "message" => "Wrong algorithm IDs"
            ]);
            exit();
        }
        
        PerformanceResult::compareAlgorithms($pdo, $x, $y);
    }
    else if ($task === 'pcaResults') {
        PerformanceResult::getPcaResults($pdo);
    }
    else {
        $ids = isset($_GET['ids']) ? $_GET['ids'] : null;
        if (is_array($ids)) {
            $allIntegers = true;
            foreach ($ids as $id) {
                if (!is_numeric($id) || intval($id) != $id) {
                    header('Content-Type: application/json');
                    http_response_code(400);
                    echo json_encode([
                        "isSuccess" => false,
                        "statusCode" => 400,
                        "message" => "IDs are not integers"
                    ]);
                    exit();
                    break;
                }
            }
        } 
        else {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode([
                "isSuccess" => false,
                "statusCode" => 400,
                "message" => "IDs are not in an array"
            ]);
            exit();
        }

        PerformanceResult::getPerformanceResults($pdo, $ids);
    }
}
else if ($action === 'log') {
    $task = isset($_REQUEST['task']) ? $_REQUEST['task'] : null;
    if ($task === 'saveUsage') {
        $strBody = file_get_contents('php://input');
        $body = json_decode($strBody, true);
        UsageLog::saveUsageLog($pdo, $body);
    }
    else if ($task === 'getUsageLogs') {
        UsageLog::getUsageLogs($pdo);
    }
    else if ($task === 'deleteAllUsageLogs') {
        UsageLog::deleteAllUsageLogs($pdo);
    }
    else {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode([
            "isSuccess" => false,
            "statusCode" => 400,
            "message" => "Wrong task"
        ]);
    }
}
else if ($action === 'admin') {
    $task = isset($_REQUEST['task']) ? $_REQUEST['task'] : null;
    if ($task === 'addResults') {
        $headers = getallheaders();
        $strBody = file_get_contents('php://input');
        $body = json_decode($strBody, true);
        Admin::addPerformanceResults($pdo, $headers, $body);
    }
    else if ($task === 'getResults') {
        $headers = getallheaders();
        Admin::getPerformanceResults($pdo, $headers);
    }
    else if ($task === 'updatePca') {
        $headers = getallheaders();
        $strBody = file_get_contents('php://input');
        $body = json_decode($strBody, true);
        Admin::updatePca($pdo, $headers, $body);
    }
    else {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode([
            "isSuccess" => false,
            "statusCode" => 400,
            "message" => "Wrong task"
        ]);
    }
}
else {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode([
        "isSuccess" => false,
        "statusCode" => 400,
        "message" => "Wrong action"
    ]);
}
?>
