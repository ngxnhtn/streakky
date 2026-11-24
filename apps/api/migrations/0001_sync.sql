CREATE TABLE `day_records` (
	`user_id` text NOT NULL,
	`habit_id` text NOT NULL,
	`day` text NOT NULL,
	`logged` integer NOT NULL,
	`edited` integer NOT NULL,
	`change_id` text NOT NULL,
	`version` integer NOT NULL,
	PRIMARY KEY(`user_id`, `habit_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `day_records_version_idx` ON `day_records` (`user_id`,`version`);--> statement-breakpoint
CREATE TABLE `habits` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`name_edited` integer NOT NULL,
	`name_change_id` text NOT NULL,
	`color` text NOT NULL,
	`color_edited` integer NOT NULL,
	`color_change_id` text NOT NULL,
	`goal` integer,
	`goal_edited` integer NOT NULL,
	`goal_change_id` text NOT NULL,
	`quit_day` text,
	`quit_day_edited` integer NOT NULL,
	`quit_day_change_id` text NOT NULL,
	`archived` integer NOT NULL,
	`archived_edited` integer NOT NULL,
	`archived_change_id` text NOT NULL,
	`archived_periods` text NOT NULL,
	`archived_periods_edited` integer NOT NULL,
	`archived_periods_change_id` text NOT NULL,
	`sort_order` text NOT NULL,
	`sort_order_edited` integer NOT NULL,
	`sort_order_change_id` text NOT NULL,
	`deleted` integer NOT NULL,
	`version` integer NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `habits_version_idx` ON `habits` (`user_id`,`version`);--> statement-breakpoint
CREATE TABLE `sync_versions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
