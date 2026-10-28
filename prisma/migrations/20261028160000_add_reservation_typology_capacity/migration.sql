ALTER TABLE `typologies`
  ADD COLUMN `seats` INTEGER NULL;

ALTER TABLE `Reservations`
  MODIFY COLUMN `customer_country` VARCHAR(30) NULL,
  ADD COLUMN `typology_id` BIGINT NULL,
  ADD INDEX `idx_reservations_typology` (`typology_id`),
  ADD CONSTRAINT `fk_reservations_typologies`
    FOREIGN KEY (`typology_id`) REFERENCES `typologies` (`typology_id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
