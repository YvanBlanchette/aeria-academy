"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendCommunityMessage } from "@/app/(member)/community/messages/actions";
import { FaThumbsUp } from "react-icons/fa6";
import { FaPaperclip } from "react-icons/fa";

export function CommunityMessageComposer({ conversationId, partnerName }) {
	const router = useRouter();
	const formRef = useRef(null);
	const fileInputRef = useRef(null);
	const [sending, setSending] = useState(false);
	const [selectedFileName, setSelectedFileName] = useState("");

	function handleAttachmentChange(event) {
		const file = event.target.files?.[0];
		setSelectedFileName(file?.name || "");
	}

	function clearSelectedAttachment() {
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
		setSelectedFileName("");
	}

	function handleTextareaKeyDown(event) {
		if (event.key !== "Enter") return;
		if (event.shiftKey) return;
		if (event.nativeEvent?.isComposing) return;

		event.preventDefault();
		if (sending) return;
		formRef.current?.requestSubmit();
	}

	async function handleSubmit(formData) {
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
		clearSelectedAttachment();
		router.refresh();
		window.dispatchEvent(new Event("community-notifications:refresh"));
		toast.success(`Nouveau message envoyé${partnerName ? ` à ${partnerName}` : ""}`);
	}

	return (
		<form
			ref={formRef}
			action={handleSubmit}
			className=""
		>
			<Input
				ref={fileInputRef}
				type="file"
				name="attachment"
				onChange={handleAttachmentChange}
				className="hidden"
				accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
			/>

			<div className="flex items-end gap-1">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => fileInputRef.current?.click()}
					className="rounded-full h-10 w-10 border-0 text-[#CE8500] hover:*:bg-neutral-200 hover:text-[#CE8500]"
				>
					<FaPaperclip className="h-8 w-8" />
				</Button>
				{selectedFileName ? (
					<div className="inline-flex max-w-[70%] items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
						<span className="truncate">{selectedFileName}</span>
						<button
							type="button"
							onClick={clearSelectedAttachment}
							className="rounded-full p-0.5 hover:bg-muted"
							aria-label="Retirer la pièce jointe"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					</div>
				) : null}
				<Button
					type="submit"
					name="quickReaction"
					value="thumbsUp"
					variant="secondary"
					className="h-10 w-10 shrink-0 rounded-full bg-transparent hover:bg-neutral-200"
					disabled={sending}
					aria-label="Envoyer un Like"
					title="Envoyer un Like"
				>
					<FaThumbsUp className="h-8 w-8 text-[#CE8500]" />
				</Button>
				<Textarea
					data-community-message-input="true"
					name="content"
					rows={1}
					onKeyDown={handleTextareaKeyDown}
					placeholder={partnerName ? `Écrire à ${partnerName}...` : "Écrire un message..."}
					className="min-h-8 flex-1 resize-none rounded-md border-border/70 bg-neutral-100 shadow-inner focus-visible:ring-2 focus-visible:ring-[#CE8500]/50 focus-visible:ring-offset-2 px-5 py-2 text-sm placeholder:text-muted-foreground w-ful"
					maxLength={4000}
				/>
			</div>
		</form>
	);
}
