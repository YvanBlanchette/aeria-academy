"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createCommunityPost, uploadCommunityPostImage } from "@/app/(member)/community/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FaImage } from "react-icons/fa6";
import { BsFillSendFill } from "react-icons/bs";

function initialsFromName(name, email) {
	return (name || email || "U")
		.split(" ")
		.map((s) => s.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function CommunityPostComposer({ user, placeholder, submitLabel = "Publier", cardStyle = "default", initialContent = "" }) {
	const fileInputRef = useRef(null);
	const formRef = useRef(null);
	const [uploadingImage, setUploadingImage] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [imageUrl, setImageUrl] = useState("");
	const [content, setContent] = useState(initialContent || "");
	const initials = initialsFromName(user?.name, user?.email);

	useEffect(() => {
		setContent(initialContent || "");
	}, [initialContent]);

	async function handleImageChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		setUploadingImage(true);
		try {
			const formData = new FormData();
			formData.set("file", file);
			const result = await uploadCommunityPostImage(formData);

			if (result?.error) {
				toast.error(result.error);
				return;
			}

			setImageUrl(result.url || "");
			toast.success("Image ajoutée à la publication");
		} catch {
			toast.error("Impossible d'envoyer l'image pour le moment");
		} finally {
			setUploadingImage(false);
		}
	}

	function clearImage() {
		setImageUrl("");
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	async function handleSubmit(formData) {
		setSubmitting(true);
		try {
			formData.set("imageUrl", imageUrl);

			const result = await createCommunityPost(formData);

			if (result?.error) {
				toast.error(result.error);
				return;
			}

			setImageUrl("");
			setContent("");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			formRef.current?.reset();
			toast.success("Publication créée");
		} catch {
			toast.error("Impossible de publier pour le moment");
		} finally {
			setSubmitting(false);
		}
	}

	const shellClassName = "space-y-2";

	return (
		<form
			ref={formRef}
			action={handleSubmit}
			className={shellClassName}
		>
			{cardStyle === "agency" ? <p className="text-xs font-medium text-amber-700">Publication sur la page de votre agence</p> : null}
			{/* POST HEADER: AVATAR + CONTENT */}
			<div className="flex items-start gap-2.5">
				<div className="flex flex-col items-center gap-2.5">
					{/* AVATAR */}
					<Avatar className="mt-0.5 h-11 w-11">
						<AvatarImage src={user?.image || ""} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>

					{/* IMAGE UPLOAD BUTTONS */}
					<div className="flex justify-end items-center gap-2 pt-1">
						<div className="flex items-center gap-2">
							{/* IMAGE UPLOAD */}
							<button
								type="button"
								className="w-fit h-fit rounded-full border-0 p-0 cursor-pointer"
								onClick={() => fileInputRef.current?.click()}
								disabled={uploadingImage || submitting}
							>
								{uploadingImage ? (
									<Loader2 className="h-6 w-6 animate-spin" />
								) : (
									<FaImage className="size-7  text-[#CE8500] hover:text-[#CE8500]/70 transition-all" />
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
					</div>
				</div>
				{/* INPUT */}
				<div className="min-w-0 flex-1 h-full rounded-3xl border bg-neutral-100 shadow-inner p-3.5 pr-14 relative">
					<Textarea
						name="content"
						rows={2}
						value={content}
						onChange={(event) => setContent(event.target.value)}
						className="resize-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
						placeholder={placeholder}
						required
					/>

					<input
						type="hidden"
						name="imageUrl"
						value={imageUrl}
					/>
					{user?.agencyPostingId ? (
						<input
							type="hidden"
							name="agencyId"
							value={user.agencyPostingId}
						/>
					) : null}
					{/* SUBMIT BUTTON */}
					<Button
						type="submit"
						className="absolute right-2 bottom-2 h-10 w-10 hover:opacity-100 transition-opacity opacity-70 flex items-center justify-center bg-transparent hover:bg-transparent border-0 p-0 cursor-pointer"
						disabled={uploadingImage || submitting}
					>
						{uploadingImage || submitting ? <Loader2 className="size-6 animate-spin" /> : <BsFillSendFill className="size-6 text-neutral-500 transition-all" />}
					</Button>

					{imageUrl ? (
						<div className="mt-3 overflow-hidden rounded-2xl border bg-background">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={imageUrl}
								alt="Aperçu de publication"
								className="max-h-96 w-full object-cover"
							/>
						</div>
					) : null}
				</div>
			</div>
		</form>
	);
}
