ALTER TABLE `rankingsSubmissions` MODIFY COLUMN `status` enum('pending','reviewed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `rankingsSubmissions` ADD `isReviewed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `vendorProfiles` ADD `profileDocument` text;