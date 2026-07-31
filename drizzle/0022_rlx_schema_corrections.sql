-- RLX Schema Corrections Migration
-- Removes meeting_block concept, adds event-level meeting configuration fields.
-- Safe to run on a fresh database (all ADD COLUMN IF NOT EXISTS).

-- ─── Events: add meeting configuration columns ────────────────────────────────
ALTER TABLE `events`
  ADD COLUMN IF NOT EXISTS `meetingDurationMins` int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS `meetingBufferMins` int NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS `minMeetings` int NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS `sponsorRequestsEnabled` int NOT NULL DEFAULT 0;

-- ─── agendaSessions: remove meetingSlotNumber (no longer used) ────────────────
-- Note: Only run this if the column exists. MySQL 8.0+ supports IF EXISTS.
ALTER TABLE `agendaSessions`
  DROP COLUMN IF EXISTS `meetingSlotNumber`;

-- ─── agendaSessions: update sessionType enum to remove meeting_block ──────────
-- We need to update any existing meeting_block rows to 'session' first,
-- then alter the enum. This is safe on a fresh DB.
UPDATE `agendaSessions` SET `sessionType` = 'session' WHERE `sessionType` = 'meeting_block';

-- Alter the enum to remove meeting_block
ALTER TABLE `agendaSessions`
  MODIFY COLUMN `sessionType` enum('arrival','keynote','session','meal','break','social','wellness') NOT NULL;

-- ─── meetings: add admin_confirmed to status enum ─────────────────────────────
ALTER TABLE `meetings`
  MODIFY COLUMN `status` enum('suggested','admin_confirmed','confirmed','declined','cancelled') NOT NULL DEFAULT 'suggested';
