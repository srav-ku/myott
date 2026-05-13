CREATE TABLE `collection_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`movie_id` integer,
	`tv_id` integer,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tv_id`) REFERENCES `tv`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "collection_items_movie_or_tv_xor" CHECK((("collection_items"."movie_id" IS NOT NULL AND "collection_items"."tv_id" IS NULL) OR ("collection_items"."movie_id" IS NULL AND "collection_items"."tv_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE INDEX `collection_items_coll_idx` ON `collection_items` (`collection_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collections_user_idx` ON `collections` (`user_id`);--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tv_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`title` text,
	`overview` text,
	`still_path` text,
	`runtime` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tv_id`) REFERENCES `tv`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_tv_season_episode_unique` ON `episodes` (`tv_id`,`season_number`,`episode_number`);--> statement-breakpoint
CREATE INDEX `episodes_tv_season_idx` ON `episodes` (`tv_id`,`season_number`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`movie_id` integer,
	`episode_id` integer,
	`last_watched_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "history_movie_or_episode_xor" CHECK((("history"."movie_id" IS NOT NULL AND "history"."episode_id" IS NULL) OR ("history"."movie_id" IS NULL AND "history"."episode_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_user_movie_unique` ON `history` (`user_id`,`movie_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `history_user_episode_unique` ON `history` (`user_id`,`episode_id`);--> statement-breakpoint
CREATE INDEX `history_user_idx` ON `history` (`user_id`);--> statement-breakpoint
CREATE TABLE `languages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `languages_name_unique` ON `languages` (`name`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movie_id` integer,
	`episode_id` integer,
	`quality` text NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`extracted_url` text,
	`expires_at` integer,
	`languages` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "links_movie_or_episode_xor" CHECK((("links"."movie_id" IS NOT NULL AND "links"."episode_id" IS NULL) OR ("links"."movie_id" IS NULL AND "links"."episode_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `links_movie_quality_unique` ON `links` (`movie_id`,`quality`);--> statement-breakpoint
CREATE UNIQUE INDEX `links_episode_quality_unique` ON `links` (`episode_id`,`quality`);--> statement-breakpoint
CREATE INDEX `links_movie_idx` ON `links` (`movie_id`);--> statement-breakpoint
CREATE INDEX `links_episode_idx` ON `links` (`episode_id`);--> statement-breakpoint
CREATE TABLE `movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdb_id` integer,
	`imdb_id` text,
	`title` text NOT NULL,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`rating` real,
	`release_date` text,
	`release_year` integer,
	`runtime` integer,
	`genres` text DEFAULT '[]',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movies_tmdb_id_unique` ON `movies` (`tmdb_id`);--> statement-breakpoint
CREATE INDEX `movies_title_idx` ON `movies` (`title`);--> statement-breakpoint
CREATE INDEX `movies_year_idx` ON `movies` (`release_year`);--> statement-breakpoint
CREATE TABLE `tv` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdb_id` integer,
	`imdb_id` text,
	`name` text NOT NULL,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`rating` real,
	`first_air_date` text,
	`release_year` integer,
	`number_of_seasons` integer,
	`number_of_episodes` integer,
	`genres` text DEFAULT '[]',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tv_tmdb_id_unique` ON `tv` (`tmdb_id`);--> statement-breakpoint
CREATE INDEX `tv_name_idx` ON `tv` (`name`);--> statement-breakpoint
CREATE INDEX `tv_year_idx` ON `tv` (`release_year`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`photo_url` text,
	`auth_provider` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`stealth_mode` integer DEFAULT false NOT NULL,
	`stealth_enabled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `watched` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`movie_id` integer,
	`episode_id` integer,
	`season_number` integer,
	`episode_number` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "watched_movie_or_episode_xor" CHECK((("watched"."movie_id" IS NOT NULL AND "watched"."episode_id" IS NULL) OR ("watched"."movie_id" IS NULL AND "watched"."episode_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watched_user_movie_unique` ON `watched` (`user_id`,`movie_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `watched_user_episode_unique` ON `watched` (`user_id`,`episode_id`);--> statement-breakpoint
CREATE INDEX `watched_user_idx` ON `watched` (`user_id`);--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`content_type` text NOT NULL,
	`content_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_user_content_unique` ON `watchlist` (`user_id`,`content_type`,`content_id`);--> statement-breakpoint
CREATE INDEX `watchlist_user_idx` ON `watchlist` (`user_id`);