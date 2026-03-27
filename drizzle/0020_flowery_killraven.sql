CREATE TABLE `meetingRatingsLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`sponsorId` int NOT NULL,
	`attendeeId` varchar(64) NOT NULL,
	`rating` int NOT NULL,
	`notes` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meetingRatingsLog_id` PRIMARY KEY(`id`)
);
