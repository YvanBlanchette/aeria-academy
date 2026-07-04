"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadCourseImage } from "@/app/admin/upload/actions";

export function ImageUpload({ value, onChange, name, label = "Image" }) {
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef(null);

	async function handleFileChange(e) {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploading(true);
		const formData = new FormData();
		formData.set("file", file);

		const result = await uploadCourseImage(formData);
		setUploading(false);

		if (result.error) {
			toast.error(result.error);
			return;
		}

		toast.success("Image uploadée");
		onChange(result.url);
	}

	function handleRemove() {
		onChange("");
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	return (
		<div className="space-y-3">
			{/* Hidden input pour soumettre l'URL dans le form parent */}
			{value ? (
				<div className="relative aspect-video w-full overflow-hidden rounded-md border bg-neutral-50 shadow-inner">
					<Image
						src={value}
						alt={label}
						fill
						className="object-cover"
						sizes="(max-width: 768px) 100vw, 400px"
					/>
					<Button
						type="button"
						variant="destructive"
						size="icon"
						className="absolute top-2 right-2"
						onClick={handleRemove}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			) : (
				<div
					className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
					onClick={() => fileInputRef.current?.click()}
				>
					{uploading ? (
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<Loader2 className="h-8 w-8 animate-spin" />
							<p className="text-sm">Upload en cours...</p>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<Upload className="h-8 w-8" />
							<p className="text-sm font-medium">Cliquer pour uploader une image</p>
							<p className="text-xs">JPEG, PNG, WebP ou GIF · 5 MB max</p>
						</div>
					)}
				</div>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif"
				onChange={handleFileChange}
				disabled={uploading}
				className="hidden"
			/>
		</div>
	);
}
