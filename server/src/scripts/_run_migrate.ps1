$mysqlPath = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
$sqlPath = 'c:\Users\1\WorkBuddy\20260324180400\server\src\scripts\migrate_payment.sql'
$env:MYSQL_PWD = ''
& $mysqlPath -u root --default-character-set=utf8mb4 drama_platform -e "source $sqlPath" 2>&1
echo "EXIT_CODE: $LASTEXITCODE"