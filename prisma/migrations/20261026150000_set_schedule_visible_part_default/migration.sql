ALTER TABLE `Outlets`
  ALTER COLUMN `schedule_visible_part` SET DEFAULT 2;

UPDATE `Outlets`
SET `schedule_visible_part` = 2
WHERE `schedule_visible_part` IS NULL OR `schedule_visible_part` = 0;
