#!/bin/bash
# Clean test data
mysql -u root -pdrama2026 drama_platform -e "DELETE FROM episodes WHERE episode_number >= 998;" 2>/dev/null
mysql -u root -pdrama2026 drama_platform -e "DELETE FROM dramas WHERE title='Test Drama';" 2>/dev/null
rm -f /var/www/drama/uploads/videos/33e4bea2-b33e-45a9-84f9-8b652d6d51e8.mp4
echo "Cleaned up test data"
mysql -u root -pdrama2026 drama_platform -e "SELECT COUNT(*) as dramas FROM dramas; SELECT COUNT(*) as episodes FROM episodes;" 2>/dev/null
pm2 flush drama-server 2>&1 | tail -1
