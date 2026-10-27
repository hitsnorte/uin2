UPDATE `Outlets` AS outlet
JOIN (
  SELECT
    `outlet_id`,
    `item_id`,
    MIN(`outlet_item_id`) AS `outlet_item_id`
  FROM `OutletItems`
  WHERE `is_reservation_item` = TRUE
  GROUP BY `outlet_id`, `item_id`
) AS snapshot
  ON snapshot.`outlet_id` = outlet.`outlet_id`
  AND snapshot.`item_id` = outlet.`reservation_item_id`
SET outlet.`reservation_item_id` = snapshot.`outlet_item_id`;
