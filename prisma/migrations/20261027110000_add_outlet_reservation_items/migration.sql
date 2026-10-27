CREATE TABLE `OutletReservationItems` (
  `outlet_reservation_item_id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `item_id` INTEGER NOT NULL,
  `shift_index` INTEGER NOT NULL,
  UNIQUE INDEX `unique_outlet_reservation_item` (`outlet_id`, `item_id`),
  INDEX `idx_outlet_reservation_items_item_id` (`item_id`),
  PRIMARY KEY (`outlet_reservation_item_id`),
  CONSTRAINT `fk_outlet_reservation_items_outlet`
    FOREIGN KEY (`outlet_id`) REFERENCES `Outlets` (`outlet_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_outlet_reservation_items_item`
    FOREIGN KEY (`item_id`) REFERENCES `Items` (`item_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `OutletReservationItems` (`outlet_id`, `item_id`, `shift_index`)
SELECT `outlet_id`, `reservation_item_id`, 0
FROM `Outlets`
WHERE `reservation_item_id` IS NOT NULL;
