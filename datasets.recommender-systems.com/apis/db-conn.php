<?php
class Database {
    private static $pdo = null;
    private static $lastError = null;
    private static $debug = false;

    public static function getLastError() {
        return self::$debug ? self::$lastError : null;
    }

    public static function isDebugEnabled() {
        return self::$debug;
    }

    public static function checkConnection() {
        if (self::$pdo === null) {
            self::getConnection();
        }

        if (self::$pdo !== null) {
            http_response_code(200);
        } else {
            http_response_code(500);
        }
    }

    public static function getConnection() {
        if (self::$pdo === null) {
            $config = include(__DIR__ . '/../../configs/db_config.php');
            self::$debug = !empty($config['debug']);
            $host = $config['host'];
            $port = $config['port'];
            $dbname = $config['dbname'];
            $username = $config['username'];
            $password = $config['password'];

            try {
                $dsn = "mysql:host=$host;dbname=$dbname;port=$port";
                $options = [
                    PDO::ATTR_PERSISTENT => true,
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                ];

                self::$pdo = new PDO($dsn, $username, $password, $options);
            } catch (PDOException $e) {
                self::$lastError = $e->getMessage();
                error_log('Database connection failed: ' . self::$lastError);
                return null;
            }
        }

        return self::$pdo;
    }
}
?>
