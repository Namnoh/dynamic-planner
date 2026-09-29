export type ActivityCategory =
	| 'work'
	| 'study'
	| 'sport'
	| 'hobby'
	| 'social'
	| 'rest'
	| 'health'
	| 'chores'
	| string;

export interface ActivityTemplate {
	id: string;
	title: string;
	category: ActivityCategory;
	defaultDuration: number; // In minutes
	color: string; // HEX (e.g. #3b82f6) or Tailwind color token
	notes?: string;
	subtasks?: string[];
}

export interface DayTemplateBlock {
	activityId: string;
	startTime: string; // "HH:mm" format (24-hour)
	duration: number; // In minutes
	customTitle?: string;
}

export interface DayTemplate {
	id: string;
	name: string;
	description?: string;
	blocks: DayTemplateBlock[];
}

export interface ScheduledEventSubtask {
	id: string;
	title: string;
	completed: boolean;
}

export interface ScheduledEvent {
	id: string;
	date: string; // "YYYY-MM-DD"
	startTime: string; // "HH:mm"
	endTime: string; // "HH:mm"
	title: string;
	category: ActivityCategory;
	completed: boolean;
	sourceTemplateId?: string;
	notes?: string;
	color?: string;
	subtasks?: ScheduledEventSubtask[];
}

export type SpecialEventType = 'birthday' | 'anniversary' | 'holiday' | 'reminder';

export interface SpecialEvent {
	id: string;
	date: string; // "YYYY-MM-DD" or "MM-DD" for yearly recurring
	title: string;
	type: SpecialEventType;
	notifyBeforeDays: number;
	notes?: string;
}

export interface AppSetting {
	key: string;
	value: any;
}

export interface CategoryMetadata {
	id: ActivityCategory;
	name: string;
	color: string;
	borderColor: string;
	badgeBg: string;
	badgeText: string;
	iconName: string;
}

export interface ExportImageOptions {
	format: 'png' | 'jpeg' | 'webp';
	quality?: number; // 0.1 to 1.0 (for jpeg/webp)
	scale?: number; // 1x or 2x for Retina/HD
	filename?: string;
	backgroundColor?: string;
	hideSelectors?: string[];
}
