#!/bin/bash
# Stop MySQL
/etc/init.d/mysqld stop 2>&1
sleep 3

# Start with skip-grant-tables
/www/server/mysql/bin/mysqld_safe --skip-grant-tables --skip-networking &
sleep 5

# Reset password
/www/server/mysql/bin/mysql -u root -e "UPDATE mysql.user SET password=PASSWORD('drama2026') WHERE user='root' AND host='localhost'; FLUSH PRIVILEGES;" 2>&1

echo "PASSWORD_RESET_RESULT=$?"

# Stop and restart normally
kill $(pgrep -f mysqld_safe) 2>/dev/null
sleep 3
kill $(pgrep -f mysqld) 2>/dev/null
sleep 3
/etc/init.d/mysqld start 2>&1
sleep 3

# Test
/www/server/mysql/bin/mysql -u root -pdrama2026 --socket=/tmp/mysql.sock -e "SELECT 1 as test" 2>&1
echo "CONNECT_TEST=$?"
