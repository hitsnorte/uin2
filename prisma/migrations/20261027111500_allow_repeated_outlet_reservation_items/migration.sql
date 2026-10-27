CREATE INDEX `idx_outlet_reservation_items_outlet_id`
  ON `OutletReservationItems` (`outlet_id`);

DROP INDEX `unique_outlet_reservation_item` ON `OutletReservationItems`;
