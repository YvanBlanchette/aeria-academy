"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, SendHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendCommunityMessage } from "@/app/(member)/community/messages/actions";
import { FaThumbsUp } from "react-icons/fa6";

export function CommunityMessageComposer({ conversationId, partnerName }) {
	const formRef = useRef(null);
	const fileInputRef = useRef(null);
	const previewUrlsRef = useRef([]);
	// `sending` controls submit lock + visual feedback while server action is in-flight.
	const [sending, setSending] = useState(false);
	// Controlled draft gives us Messenger-like button switching (Send vs Like).
	const [messageDraft, setMessageDraft] = useState("");
	const [selectedAttachments, setSelectedAttachments] = useState([]);
	const hasAttachments = selectedAttachments.length > 0;
	const canSendMessage = messageDraft.trim().length > 0 || hasAttachments;

	function revokeAttachmentPreviews() {
		// Always release object URLs to avoid memory leaks after many uploads.
		for (const url of previewUrlsRef.current) {
			URL.revokeObjectURL(url);
		}
		previewUrlsRef.current = [];
	}

	useEffect(() => {
		return () => {
			revokeAttachmentPreviews();
		};
	}, []);

	function syncAttachmentsFromFileList(fileList) {
		revokeAttachmentPreviews();
		// Mirror browser FileList into a serializable UI model.
		const nextAttachments = Array.from(fileList || []).map((file, index) => {
			const isImage = file?.type?.startsWith("image/");
			const previewUrl = isImage ? URL.createObjectURL(file) : "";
			if (previewUrl) {
				previewUrlsRef.current.push(previewUrl);
			}

			return {
				id: `${file.name}-${file.size}-${index}`,
				name: file.name || `Pièce jointe ${index + 1}`,
				type: file.type || "application/octet-stream",
				isImage,
				previewUrl,
			};
		});

		setSelectedAttachments(nextAttachments);
	}

	function handleAttachmentChange(event) {
		syncAttachmentsFromFileList(event.target.files);
	}

	function removeAttachmentAt(indexToRemove) {
		// FileList is read-only, so DataTransfer is used to rebuild it without one file.
		if (!fileInputRef.current?.files) return;
		const transfer = new DataTransfer();
		Array.from(fileInputRef.current.files).forEach((file, index) => {
			if (index !== indexToRemove) {
				transfer.items.add(file);
			}
		});
		fileInputRef.current.files = transfer.files;
		syncAttachmentsFromFileList(transfer.files);
	}

	function clearSelectedAttachment() {
		revokeAttachmentPreviews();
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
		setSelectedAttachments([]);
	}

	function handleTextareaKeyDown(event) {
		if (event.key !== "Enter") return;
		if (event.shiftKey) return;
		if (event.nativeEvent?.isComposing) return;

		event.preventDefault();
		if (sending) return;
		if (!canSendMessage) return;
		formRef.current?.requestSubmit();
	}

	async function handleSubmit(formData) {
		// Prevent accidental double-send when users click quickly.
		if (sending) return;
		setSending(true);
		const quickReaction = String(formData.get("quickReaction") || "").trim();
		if (quickReaction === "thumbsUp") {
			formData.set("content", "👍");
		}
		formData.set("conversationId", conversationId);

		const result = await sendCommunityMessage(formData);
		setSending(false);

		if (result?.error) {
			toast.error(result.error);
			return;
		}

		formRef.current?.reset();
		setMessageDraft("");
		clearSelectedAttachment();
		// Let the page-level poller own refresh orchestration to avoid duplicate refresh bursts.
		window.dispatchEvent(new Event("community-messages:refresh-now"));
		window.dispatchEvent(new Event("community-notifications:refresh"));
		toast.success(`Nouveau message envoyé${partnerName ? ` à ${partnerName}` : ""}`);
	}

	return (
		<form
			ref={formRef}
			action={handleSubmit}
			className=""
		>
			{/* ATTACHMENT INPUT (HIDDEN) */}
			<Input
				ref={fileInputRef}
				type="file"
				name="attachment"
				multiple
				onChange={handleAttachmentChange}
				className="hidden"
				accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
			/>

			{/* COMPOSER ACTIONS */}
			<div className="flex items-end gap-1">
				{/* ATTACHMENT BUTTON */}
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => fileInputRef.current?.click()}
					className="h-10 w-10 shrink-0 rounded-full bg-transparent hover:bg-transparent opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center border-0 p-0 cursor-pointer"
				>
					<Paperclip className="ml-2 size-6 text-[#CE8500]" />
				</Button>

				{/* MESSAGE INPUT */}
				<div className="relative flex-1">
					{/* ATTACHMENTS PREVIEW STRIP (MESSENGER STYLE) */}
					{hasAttachments ? (
						<div className="absolute inset-x-2 top-2 z-10 flex items-center gap-2 overflow-x-auto pb-1">
							{selectedAttachments.map((attachment, index) =>
								attachment.isImage ? (
									<div
										key={attachment.id}
										className="relative overflow-hidden rounded-xl border border-border bg-background shadow-sm"
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={attachment.previewUrl}
											alt={`Aperçu: ${attachment.name}`}
											className="h-16 w-16 object-cover"
										/>
										<button
											type="button"
											onClick={() => removeAttachmentAt(index)}
											className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white hover:bg-black/80"
											aria-label={`Retirer ${attachment.name}`}
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								) : (
									<div
										key={attachment.id}
										className="inline-flex max-w-56 shrink-0 items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
									>
										<span className="truncate">{attachment.name}</span>
										<button
											type="button"
											onClick={() => removeAttachmentAt(index)}
											className="rounded-full p-0.5 hover:bg-muted"
											aria-label={`Retirer ${attachment.name}`}
										>
											<X className="h-3.5 w-3.5" />
										</button>
									</div>
								),
							)}
							{selectedAttachments.length > 1 ? (
								<button
									type="button"
									onClick={clearSelectedAttachment}
									className="inline-flex shrink-0 items-center rounded-full border border-border bg-background/95 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
								>
									Tout retirer
								</button>
							) : null}
						</div>
					) : null}

					<Textarea
						data-community-message-input="true"
						name="content"
						value={messageDraft}
						onChange={(event) => setMessageDraft(event.target.value)}
						rows={1}
						onKeyDown={handleTextareaKeyDown}
						placeholder={partnerName ? `Écrire à ${partnerName}...` : "Écrire un message..."}
						className={`min-h-8 w-full resize-none rounded-md border-border/70 bg-neutral-100 px-5 py-2 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#CE8500]/50 focus-visible:ring-offset-2 ${hasAttachments ? "pt-22" : ""}`}
						maxLength={4000}
					/>
				</div>

				{/* SEND / QUICK LIKE BUTTON */}
				{canSendMessage ? (
					<Button
						type="submit"
						variant="secondary"
						className="h-10 w-10 shrink-0 rounded-full bg-transparent hover:bg-transparent opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center border-0 p-0 cursor-pointer"
						disabled={sending}
						aria-label="Envoyer le message"
						title="Envoyer le message"
					>
						{sending ? <Loader2 className="ml-2 size-6 animate-spin text-[#CE8500]" /> : <SendHorizontal className="ml-2 size-7 text-[#CE8500]" />}
					</Button>
				) : (
					<Button
						type="submit"
						name="quickReaction"
						value="thumbsUp"
						variant="secondary"
						className="h-10 w-10 shrink-0 rounded-full bg-transparent hover:bg-transparent opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center border-0 p-0 cursor-pointer"
						disabled={sending}
						aria-label="Envoyer un Like"
						title="Envoyer un Like"
					>
						<FaThumbsUp className="ml-2 size-8 text-[#CE8500]" />
					</Button>
				)}
			</div>
		</form>
	);
}
