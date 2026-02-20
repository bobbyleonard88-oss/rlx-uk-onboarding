CREATE TABLE `matchCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sponsorId` int NOT NULL,
	`attendeeId` varchar(64) NOT NULL,
	`matchScore` int NOT NULL,
	`matchReason` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `sponsor_attendee_unique` UNIQUE(`sponsorId`,`attendeeId`)
);
