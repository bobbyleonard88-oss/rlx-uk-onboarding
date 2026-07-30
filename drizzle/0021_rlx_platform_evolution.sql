-- RLX Platform Evolution Migration
-- Adds: events, agendaSessions, meetingRequests, chatThreads, chatMessages, notifications, delegateSchedule
-- Updates: sponsors (credits, tableNumber), meetings (delegateId, sessionId, requestedBy, tableNumber, status)
-- Updates: users (delegate role), delegateProfiles (userId, eventId)

-- Update users role enum to include 'delegate'
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','delegate') NOT NULL DEFAULT 'user';

-- ─── Events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `events` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `tagline` varchar(512),
  `venueName` varchar(255),
  `venueAddress` text,
  `startDate` timestamp NOT NULL,
  `endDate` timestamp NOT NULL,
  `matchWeights` text,
  `isActive` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Agenda Sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `agendaSessions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `eventId` int NOT NULL,
  `dayNumber` int NOT NULL,
  `startTime` varchar(10) NOT NULL,
  `endTime` varchar(10) NOT NULL,
  `title` varchar(512) NOT NULL,
  `description` text,
  `room` varchar(255),
  `format` varchar(255),
  `sessionType` enum('arrival','keynote','session','meeting_block','meal','break','social','wellness') NOT NULL,
  `isOptional` int NOT NULL DEFAULT 0,
  `isHighlight` int NOT NULL DEFAULT 0,
  `meetingSlotNumber` int,
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Update sponsors ──────────────────────────────────────────────────────────
ALTER TABLE `sponsors`
  ADD COLUMN IF NOT EXISTS `eventId` int,
  ADD COLUMN IF NOT EXISTS `meetingCredits` int NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS `creditsUsed` int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `tableNumber` int,
  ADD COLUMN IF NOT EXISTS `logoUrl` text;

-- ─── Update delegateProfiles ──────────────────────────────────────────────────
ALTER TABLE `delegateProfiles`
  ADD COLUMN IF NOT EXISTS `userId` int,
  ADD COLUMN IF NOT EXISTS `eventId` int;

-- ─── Update meetings ──────────────────────────────────────────────────────────
ALTER TABLE `meetings`
  ADD COLUMN IF NOT EXISTS `eventId` int,
  ADD COLUMN IF NOT EXISTS `delegateId` int,
  ADD COLUMN IF NOT EXISTS `sessionId` int,
  ADD COLUMN IF NOT EXISTS `requestedBy` enum('admin','sponsor','delegate') DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS `tableNumber` int,
  ADD COLUMN IF NOT EXISTS `meetingLocation` text;

-- Update meetings status enum to include 'cancelled'
ALTER TABLE `meetings` MODIFY COLUMN `status` enum('suggested','confirmed','declined','cancelled') NOT NULL DEFAULT 'suggested';

-- ─── Delegate Personal Schedule ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `delegateSchedule` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `delegateId` int NOT NULL,
  `sessionId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `delegate_session_unique` (`delegateId`, `sessionId`)
);

-- ─── Meeting Requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `meetingRequests` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `eventId` int,
  `sponsorId` int NOT NULL,
  `delegateId` int NOT NULL,
  `proposedSessionId` int,
  `proposedTimeSlot` int,
  `requestedBy` enum('sponsor','delegate') NOT NULL,
  `status` enum('pending','accepted','declined','cancelled','rescheduled') NOT NULL DEFAULT 'pending',
  `originalMeetingId` int,
  `message` text,
  `adminNotes` text,
  `respondedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Chat Threads ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `chatThreads` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `meetingId` int NOT NULL UNIQUE,
  `sponsorId` int NOT NULL,
  `delegateId` int NOT NULL,
  `lastMessageAt` timestamp NULL,
  `lastMessagePreview` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Chat Messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `chatMessages` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `threadId` int NOT NULL,
  `senderUserId` int NOT NULL,
  `senderRole` enum('sponsor','delegate','admin') NOT NULL,
  `body` text NOT NULL,
  `isRead` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `type` enum('meeting_request','meeting_confirmed','meeting_declined','meeting_cancelled','meeting_rescheduled','new_message','rating_reminder','system') NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text,
  `entityType` varchar(64),
  `entityId` int,
  `isRead` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
