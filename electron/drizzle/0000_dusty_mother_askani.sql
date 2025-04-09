CREATE TABLE `AnalyticsLookup` (
	`id` integer PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`is_liked` integer DEFAULT false,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `BusinessFlow` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`flowchart` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `BusinessFlow_Documents` (
	`business_flow_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`doc_type` text NOT NULL,
	PRIMARY KEY(`business_flow_id`, `document_id`, `doc_type`),
	FOREIGN KEY (`business_flow_id`) REFERENCES `BusinessFlow`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `Document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Conversation` (
	`id` integer PRIMARY KEY NOT NULL,
	`document_id` integer NOT NULL,
	`title` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`document_id`) REFERENCES `Document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Document` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`jira_id` text,
	`document_type_id` text NOT NULL,
	`metadata_id` integer NOT NULL,
	`count` integer DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`document_type_id`) REFERENCES `DocumentType`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`metadata_id`) REFERENCES `Metadata`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `DocumentType` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type_label` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `Integration` (
	`id` integer PRIMARY KEY NOT NULL,
	`config` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`id` integer PRIMARY KEY NOT NULL,
	`conversation_id` integer NOT NULL,
	`message` text NOT NULL,
	`is_applied` integer DEFAULT false,
	`external_message_id` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`conversation_id`) REFERENCES `Conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Metadata` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tech_stacks` text,
	`is_brownfield` integer DEFAULT false,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
