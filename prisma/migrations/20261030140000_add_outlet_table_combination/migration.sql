ALTER TABLE `Outlets`
  ADD COLUMN `combine_tables` BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE `availability`
  ADD COLUMN `room_id` INTEGER NOT NULL DEFAULT 0,
  DROP INDEX `uq_availability_typology_date_start`,
  ADD UNIQUE INDEX `uq_availability_typology_date_start_room` (
    `typology_id`,
    `availability_date`,
    `start_time`,
    `room_id`
  );

CREATE TABLE `ReservationTableAllocations` (
  `reservation_table_allocation_id` INTEGER NOT NULL AUTO_INCREMENT,
  `reservation_id` INTEGER NOT NULL,
  `typology_id` BIGINT NOT NULL,
  `room_id` INTEGER NOT NULL DEFAULT 0,
  `table_count` INTEGER NOT NULL,
  INDEX `idx_reservation_table_allocations_reservation` (`reservation_id`),
  INDEX `idx_reservation_table_allocations_typology` (`typology_id`),
  PRIMARY KEY (`reservation_table_allocation_id`),
  CONSTRAINT `fk_reservation_table_allocations_reservation`
    FOREIGN KEY (`reservation_id`) REFERENCES `Reservations` (`reservation_id`)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_reservation_table_allocations_typology`
    FOREIGN KEY (`typology_id`) REFERENCES `typologies` (`typology_id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
