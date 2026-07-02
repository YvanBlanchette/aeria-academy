"use client";

import { toast } from "sonner";
import { NotificationsProvider } from "@/features/community/notifications/notifications-provider";

export function NotificationsProviderWithToasts({ children, enabled = true }) {
	return (
		<NotificationsProvider
			enabled={enabled}
			onNewNotifications={(fresh) => {
				const message = fresh.find((n) => n.type === "MESSAGE");
				const request = fresh.find((n) => n.type === "FRIEND_REQUEST");
				const accepted = fresh.find((n) => n.type === "FRIEND_ACCEPTED");

				if (message) {
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
