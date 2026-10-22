ALTER TABLE `Items`
  ADD COLUMN `item_price` VARCHAR(45) NULL,
  ADD COLUMN `reservation` VARCHAR(1) NULL,
  ADD COLUMN `checkin` VARCHAR(1) NULL,
  ADD COLUMN `room` VARCHAR(1) NULL,
  ADD COLUMN `instantOrder` VARCHAR(1) NULL,
  ADD COLUMN `sendStaychat` VARCHAR(1) NULL,
  ADD COLUMN `staychatWebhook` VARCHAR(255) NULL,
  ADD COLUMN `visiblePrice` VARCHAR(1) NULL,
  ADD COLUMN `allowReservations` VARCHAR(1) NULL,
  ADD COLUMN `scheduleID` VARCHAR(1) NULL,
  ADD COLUMN `preparation` JSON NULL;
