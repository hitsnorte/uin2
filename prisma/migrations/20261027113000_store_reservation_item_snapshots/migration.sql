ALTER TABLE `OutletItems`
  ADD COLUMN `item_vat` VARCHAR(45) NULL,
  ADD COLUMN `item_duration` INT NULL,
  ADD COLUMN `schedule_id` INT NULL,
  ADD COLUMN `shift_index` INT NULL,
  ADD COLUMN `is_reservation_item` BOOLEAN NOT NULL DEFAULT FALSE;

DROP INDEX `unique_item_outlet` ON `OutletItems`;

INSERT INTO `OutletItems` (
  `item_id`,
  `outlet_id`,
  `item_vat`,
  `item_duration`,
  `schedule_id`,
  `shift_index`,
  `is_reservation_item`,
  `item_name1`,
  `item_name2`,
  `item_name3`,
  `item_name4`,
  `item_name5`,
  `item_description1`,
  `item_description2`,
  `item_description3`,
  `item_description4`,
  `item_description5`,
  `item_image_url`,
  `item_type`,
  `item_price`,
  `reservation`,
  `checkin`,
  `room`,
  `instantOrder`,
  `sendStaychat`,
  `staychatWebhook`,
  `visiblePrice`,
  `allowReservations`,
  `scheduleID`,
  `preparation`
)
SELECT
  item.`item_id`,
  outlet.`outlet_id`,
  item.`item_vat`,
  item.`item_duration`,
  outlet.`schedule_id`,
  reservation_item.`shift_index`,
  TRUE,
  item.`item_name1`,
  item.`item_name2`,
  item.`item_name3`,
  item.`item_name4`,
  item.`item_name5`,
  item.`item_description1`,
  item.`item_description2`,
  item.`item_description3`,
  item.`item_description4`,
  item.`item_description5`,
  item.`item_image_url`,
  item.`item_type`,
  CAST(NULLIF(item.`item_price`, '') AS DECIMAL(10, 2)),
  item.`reservation`,
  item.`checkin`,
  item.`room`,
  item.`instantOrder`,
  item.`sendStaychat`,
  item.`staychatWebhook`,
  item.`visiblePrice`,
  item.`allowReservations`,
  item.`scheduleID`,
  item.`preparation`
FROM `OutletReservationItems` AS reservation_item
JOIN `Outlets` AS outlet
  ON outlet.`outlet_id` = reservation_item.`outlet_id`
JOIN `Items` AS item
  ON item.`item_id` = reservation_item.`item_id`;
