const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

export function parseNotificationsLimit(value) {
	const parsed = Number.parseInt(String(value || DEFAULT_LIMIT), 10);
	if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
	return Math.min(parsed, MAX_LIMIT);
}

export function parseNotificationId(value) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function parseMarkAll(value) {
	return value === true;
}
