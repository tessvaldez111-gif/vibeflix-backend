#!/bin/bash
# Clean test drama and verify state
mysql -u root -pdrama2026 drama_platform -e "DELETE FROM dramas WHERE title='测试短剧';" 2>/dev/null
echo "--- Drama count ---"
mysql -u root -pdrama2026 drama_platform -e "SELECT COUNT(*) as drama_count FROM dramas; SELECT COUNT(*) as category_count FROM categories;" 2>/dev/null
echo "--- Test API ---"
curl -s http://localhost/api/dramas?pageSize=5
