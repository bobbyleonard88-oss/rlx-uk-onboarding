CREATE TABLE `delegateProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendeeId` varchar(64) NOT NULL,
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`company` varchar(255) NOT NULL,
	`jobTitle` varchar(255),
	`industry` varchar(255),
	`challenges` text,
	`interests` text,
	`profileData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delegateProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `delegateProfiles_attendeeId_unique` UNIQUE(`attendeeId`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sponsorId` int NOT NULL,
	`attendeeId` varchar(64) NOT NULL,
	`matchScore` int,
	`isTopRanked` int DEFAULT 0,
	`isPriority` int DEFAULT 0,
	`status` enum('suggested','confirmed','declined') NOT NULL DEFAULT 'suggested',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priorityTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sponsorId` int NOT NULL,
	`attendeeId` varchar(64) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priorityTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendorProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sponsorId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`solutions` text,
	`painPoints` text,
	`targetIndustries` text,
	`profileData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendorProfiles_id` PRIMARY KEY(`id`)
);
