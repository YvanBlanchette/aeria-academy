"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateManualCertificateForUser } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";

export function ManualCertificateGenerator({ userId, courses }) {
	const router = useRouter();
	const sortedCourses = useMemo(() => {
		return [...(courses || [])].sort((a, b) => {
			if (a.hasCertificate === b.hasCertificate) {
				return a.title.localeCompare(b.title, "fr");
			}
			return a.hasCertificate ? 1 : -1;
		});
	}, [courses]);
	const [courseId, setCourseId] = useState(sortedCourses[0]?.id || "");
	const [loading, setLoading] = useState(false);
	const [certificateId, setCertificateId] = useState("");

	async function handleGenerate() {
		if (!courseId) {
			toast.error("Selectionne un cours");
			return;
		}

		setLoading(true);
		try {
			const result = await generateManualCertificateForUser(userId, courseId);
			if (result?.error) {
				toast.error(result.error);
				return;
			}

			setCertificateId(result?.certificateId || "");
			if (result?.alreadyExists) {
				toast.success("Ce certificat existe deja pour cet etudiant");
			} else {
				toast.success("Certificat genere manuellement avec succes");
			}
			router.refresh();
		} catch {
			toast.error("Impossible de generer le certificat pour le moment");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-3">
			{sortedCourses.length === 0 ? (
				<p className="text-sm text-muted-foreground">Aucun cours disponible pour cet etudiant.</p>
			) : (
				<>
					<select
						value={courseId}
						onChange={(event) => setCourseId(event.target.value)}
						className="h-10 w-full rounded-md border bg-background px-3 text-sm"
						disabled={loading}
					>
						{sortedCourses.map((course) => (
							<option
								key={course.id}
								value={course.id}
							>
								{course.title} {course.hasCertificate ? "(certificat deja emis)" : ""}
							</option>
						))}
					</select>

					<Button
						type="button"
						onClick={handleGenerate}
						disabled={loading || !courseId}
						className="w-full"
					>
						{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
						Generer le certificat manuellement
					</Button>

					{certificateId ? (
						<Button
							asChild
							variant="outline"
							className="w-full"
						>
							<a
								href={`/api/certificates/${certificateId}/download`}
								target="_blank"
								rel="noreferrer"
							>
								<Download className="mr-2 h-4 w-4" /> Telecharger le certificat
							</a>
						</Button>
					) : null}
				</>
			)}
		</div>
	);
}
