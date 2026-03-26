INSERT INTO system_settings (`key`, `value`, description) VALUES
('signin_streak_bonus', '{"1":5,"2":5,"3":5,"4":5,"5":5,"6":5,"7":15,"14":20,"30":50}', 'streak signin bonus'),
('share_reward_points', '10', 'share reward points'),
('daily_share_limit', '5', 'daily share limit'),
('invite_reward_points', '50', 'invite reward points'),
('invitee_reward_points', '20', 'invitee reward points'),
('vip_enabled', 'true', 'vip feature toggle'),
('vip_signin_bonus', '5', 'vip signin bonus')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO vip_plans (name, duration_days, price, original_price, free_episodes, points_bonus, features, sort_order, is_hot, status) VALUES
('Weekly', 7, 2.99, 4.99, 10, 5, '["Double signin bonus","10 free episodes","VIP badge"]', 1, 0, 1),
('Monthly', 30, 9.99, 14.99, 0, 10, '["Double signin bonus","All episodes free","VIP badge","Priority support"]', 2, 1, 1),
('Quarterly', 90, 24.99, 39.99, 0, 15, '["Triple signin bonus","All episodes free","VIP badge","Priority support","Early access"]', 3, 0, 1),
('Yearly', 365, 79.99, 149.99, 0, 20, '["Triple signin bonus","All episodes free","VIP badge","Priority support","Early access","Birthday bonus"]', 4, 0, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

UPDATE users u
JOIN (
  SELECT id, LPAD(HEX(id), 8, '0') AS base_code
  FROM users WHERE share_code IS NULL
) t ON u.id = t.id
SET u.share_code = CONCAT(t.base_code, SUBSTRING(MD5(RAND()), 1, 4))
WHERE u.share_code IS NULL;
