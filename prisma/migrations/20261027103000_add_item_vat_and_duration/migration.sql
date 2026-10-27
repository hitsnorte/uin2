ALTER TABLE `Items`
  ADD COLUMN `item_vat` VARCHAR(45) NULL,
  ADD COLUMN `item_duration` INT NULL;

UPDATE `Items` AS item
JOIN (
  SELECT
    `reservation_item_id`,
    MIN(`reservation_duration`) AS `duration`
  FROM `Outlets`
  WHERE `reservation_item_id` IS NOT NULL
    AND `reservation_duration` IS NOT NULL
  GROUP BY `reservation_item_id`
  HAVING MIN(`reservation_duration`) = MAX(`reservation_duration`)
) AS legacy_duration
  ON legacy_duration.`reservation_item_id` = item.`item_id`
SET item.`item_duration` = legacy_duration.`duration`
WHERE item.`item_duration` IS NULL;
