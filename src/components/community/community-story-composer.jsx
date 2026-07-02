"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { createCommunityStory, uploadCommunityStoryImage } from "@/app/(member)/community/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FaRegImage } from "react-icons/fa6";

function initialsFromName(name, email) {
	return (name || email || "U")
		.split(" ")
		.map((part) => part.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function CommunityStoryComposer({ user, onSuccess }) {
	const fileInputRef = useRef(null);
	const formRef = useRef(null);
	const [uploadingImage, setUploadingImage] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [imageUrl, setImageUrl] = useState("");
	const initials = initialsFromName(user?.name, user?.email);

	async function handleImageChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		setUploadingImage(true);
		const formData = new FormData();
		formData.set("file", file);
		const result = await uploadCommunityStoryImage(formData);
		setUploadingImage(false);

		if (result?.error) {
			toast.error(result.error);
			return;
		}

		setImageUrl(result.url || "");
		toast.success("Image ajoutée à la story");
	}

	function clearImage() {
		setImageUrl("");
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	async function handleSubmit(formData) {
		setSubmitting(true);
		formData.set("imageUrl", imageUrl);

		const result = await createCommunityStory(formData);
		setSubmitting(false);

		if (result?.error) {
			toast.error(result.error);
			return;
		}

		setImageUrl("");
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
		formRef.current?.reset();
		onSuccess?.();
		toast.success("Story publiée pendant 24 h");
	}

	return (
		<form
			ref={formRef}
			action={handleSubmit}
			className="space-y-3"
		>
			<div className="flex items-start gap-3">
				<Avatar className="mt-0.5 h-11 w-11">
					<AvatarImage src={user?.image || ""} />
					<AvatarFallback>{initials}</AvatarFallback>
				</Avatar>

				<div className="min-w-0 flex-1 rounded-3xl border bg-neutral-100 p-3.5 shadow-inner">
					<Textarea
						name="content"
						rows={2}
						maxLength={500}
						className="min-h-12 resize-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
						placeholder="Partager une story pendant 24 h..."
					/>

					<input
						type="hidden"
						name="imageUrl"
						value={imageUrl}
					/>

					{imageUrl ? (
						<div className="mt-3 overflow-hidden rounded-2xl border bg-background">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={imageUrl}
								alt="Aperçu de story"
								className="max-h-96 w-full object-cover"
							/>
						</div>
					) : null}
				</div>
			</div>

			<div className="flex items-center justify-end gap-2 pt-1">
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="h-fit w-fit cursor-pointer rounded-full border-0 p-0"
						onClick={() => fileInputRef.current?.click()}
						disabled={uploadingImage || submitting}
					>
						{uploadingImage ? (
							<Loader2 className="h-6 w-6 animate-spin" />
						) : (
							<FaRegImage className="h-6 w-6 text-neutral-400 transition-all hover:text-neutral-800" />
						)}
					</button>
					{imageUrl ? (
						<Button
							type="button"
							variant="ghost"
							className="rounded-full"
							onClick={clearImage}
							disabled={uploadingImage || submitting}
						>
							<X className="mr-2 h-4 w-4" />
							Retirer
						</Button>
					) : null}
					<input
						ref={fileInputRef}
						type="file"
						accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
						onChange={handleImageChange}
						disabled={uploadingImage || submitting}
						className="hidden"
					/>
				</div>

				<Button
					type="submit"
					className="rounded-full"
					disabled={uploadingImage || submitting}
				>
					{uploadingImage || submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
					Publier la story
				</Button>
			</div>
		</form>
	);
}
