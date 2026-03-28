-- Ad reward system settings
INSERT INTO system_settings (`key`, value, description) VALUES ('ad_reward_points', '5', '每次观看广告获得的积分')
ON DUPLICATE KEY UPDATE value = VALUES(value);

INSERT INTO system_settings (`key`, value, description) VALUES ('ad_daily_limit', '5', '每日广告奖励次数上限')
ON DUPLICATE KEY UPDATE value = VALUES(value);
