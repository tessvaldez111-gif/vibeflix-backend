#!/bin/bash
/www/server/mysql/bin/mysql -u root -pdrama2026 --socket=/tmp/mysql.sock -e "CREATE DATABASE IF NOT EXISTS drama_platform DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_general_ci;"
echo "DB_CREATE=$?"
