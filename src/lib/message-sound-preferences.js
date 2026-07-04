export const MESSAGE_SOUND_PREFERENCE_KEY = "aeria:message-sound-enabled";
export const MESSAGE_SOUND_PREFERENCE_EVENT = "aeria:message-sound-changed";

export function isMessageSoundEnabled() {
	if (typeof window === "undefined") return true;
	const raw = window.localStorage.getItem(MESSAGE_SOUND_PREFERENCE_KEY);
	if (raw === null) return true;
	return raw !== "0";
}

export function setMessageSoundEnabled(enabled) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(MESSAGE_SOUND_PREFERENCE_KEY, enabled ? "1" : "0");
	window.dispatchEvent(
		new CustomEvent(MESSAGE_SOUND_PREFERENCE_EVENT, {
			detail: { enabled: Boolean(enabled) },
		}),
	);
}
