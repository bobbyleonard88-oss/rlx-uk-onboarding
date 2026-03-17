CREATE TABLE `sponsorActivityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sponsorId` int NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('login','download') NOT NULL,
	`downloadType` varchar(128),
	`downloadLabel` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsorActivityLog_id` PRIMARY KEY(`id`)
);
