"use client";

import { toast } from "sonner";
import { NotificationsProvider } from "@/features/community/notifications/notifications-provider";
import { isMessageSoundEnabled } from "@/lib/message-sound-preferences";

let audioContextRef = null;
let lastMessageSoundAt = 0;

async function playNewMessageSound() {
	if (typeof window === "undefined") return;
	if (!isMessageSoundEnabled()) return;
	const now = Date.now();
	if (now - lastMessageSoundAt < 500) return;

	const AudioCtx = window.AudioContext || window.webkitAudioContext;
	if (!AudioCtx) return;

	try {
		if (!audioContextRef) {
			audioContextRef = new AudioCtx();
		}

		if (audioContextRef.state === "suspended") {
			await audioContextRef.resume();
		}

		const oscillator = audioContextRef.createOscillator();
		const gain = audioContextRef.createGain();

		oscillator.type = "sine";
		oscillator.frequency.setValueAtTime(880, audioContextRef.currentTime);
		gain.gain.setValueAtTime(0.0001, audioContextRef.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.08, audioContextRef.currentTime + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.currentTime + 0.18);

		oscillator.connect(gain);
		gain.connect(audioContextRef.destination);
		oscillator.start();
		oscillator.stop(audioContextRef.currentTime + 0.2);
		lastMessageSoundAt = now;
	} catch {
		// Browsers may block audio until user interaction; fail silently.
	}
}

export function NotificationsProviderWithToasts({ children, enabled = true, userId = null }) {
	return (
		<NotificationsProvider
			enabled={enabled}
			userId={userId}
			onNewNotifications={(fresh) => {
				const message = fresh.find((n) => n.type === "MESSAGE");
				const request = fresh.find((n) => n.type === "FRIEND_REQUEST");
				const accepted = fresh.find((n) => n.type === "FRIEND_ACCEPTED");

				if (message) {
					playNewMessageSound();
					toast(`Nouveau message de ${message.actor?.name || message.actor?.email || "Membre"}`, {
						description: message.messagePreview || "Ouvre la messagerie pour lire le message.",
					});
				}
				if (request) {
					toast(`Nouvelle demande d'ami de ${request.actor?.name || request.actor?.email || "Membre"}`, {
						description: "Ouvre Relations pour accepter ou refuser la demande.",
					});
				}
				if (accepted) {
					toast(`${accepted.actor?.name || accepted.actor?.email || "Membre"} a accepte ta demande d'ami`, {
						description: "Ouvre Relations pour voir ta nouvelle connexion.",
					});
				}
			}}
		>
			{children}
		</NotificationsProvider>
	);
}
