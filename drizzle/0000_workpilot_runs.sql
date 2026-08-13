CREATE TABLE IF NOT EXISTS `workpilot_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request` text NOT NULL,
	`plan_json` text NOT NULL,
	`state` text NOT NULL,
	`events_json` text NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workpilot_runs_owner_idx` ON `workpilot_runs` (`owner`,`created_at`);
