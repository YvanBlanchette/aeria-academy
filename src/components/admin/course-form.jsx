"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import clsx from "clsx";
import { Code2, Columns3, Eye, EyeOff, Focus, List, Minimize2, Redo2, Sparkles, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCourse, updateCourse } from "@/app/admin/courses/actions";

const NEW_COURSE_DRAFT_KEY = "admin-course-new-draft-v1";
const HISTORY_LIMIT = 80;

const COURSE_TEMPLATES = {
	foundation: {
		label: "Formation fondamentale",
		title: "Fondamentaux de ",
		description:
			"## A qui s'adresse ce cours\n\nCe cours est concu pour...\n\n## Ce que vous allez apprendre\n\n- Competence 1\n- Competence 2\n- Competence 3\n\n## Structure\n\n- Module 1\n- Module 2\n- Module 3\n\n## Resultat attendu\n\nA la fin, l'etudiant sera capable de...",
		price: "0",
	},
	masterclass: {
		label: "Masterclass premium",
		title: "Masterclass: ",
		description:
			"## Objectif de la masterclass\n\nExpliquez clairement la transformation promise.\n\n## Pre-requis\n\n- Niveau recommande\n- Outils necessaires\n\n## Programme\n\n1. Partie 1\n2. Partie 2\n3. Partie 3\n\n## Livrables\n\nDecrivez les supports fournis.",
		price: "199",
	},
	bootcamp: {
		label: "Bootcamp intensif",
		title: "Bootcamp: ",
		description:
			"## Pourquoi ce bootcamp\n\nLe probleme principal a resoudre.\n\n## Plan sur X semaines\n\n- Semaine 1\n- Semaine 2\n- Semaine 3\n\n## Evaluation\n\nComment mesurer les progres.\n\n## Passage a l'action\n\nConseils pour appliquer immediatement.",
		price: "499",
	},
};

const SLASH_COMMANDS = {
	"/h2": "\n## Nouveau sous-titre\n\n",
	"/h3": "\n### Nouveau titre niveau 3\n\n",
	"/list": "\n- Point 1\n- Point 2\n- Point 3\n",
	"/code": "\n```md\nVotre code ici\n```\n",
	"/quote": "> Citation importante\n\n",
	"/cta": "\n### Passez a l'action\n\nProchaine etape conseillee:\n",
};

function readDraftFromStorage() {
	if (typeof window === "undefined") return null;
	const raw = window.localStorage.getItem(NEW_COURSE_DRAFT_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return null;
		return parsed;
	} catch {
		window.localStorage.removeItem(NEW_COURSE_DRAFT_KEY);
		return null;
	}
}

export function CourseForm({ course }) {
	const router = useRouter();
	const isEdit = !!course;
	const initialDraft = !isEdit ? readDraftFromStorage() : null;

	const [loading, setLoading] = useState(false);
	const [title, setTitle] = useState(course?.title || initialDraft?.title || "");
	const [description, setDescription] = useState(course?.description || initialDraft?.description || "");
	const [price, setPrice] = useState(course ? (course.price / 100).toFixed(2) : initialDraft?.price || "0");
	const [thumbnail, setThumbnail] = useState(course?.thumbnail || initialDraft?.thumbnail || "");
	const [viewMode, setViewMode] = useState("editor");
	const [isFocusMode, setIsFocusMode] = useState(false);
	const [isDirty, setIsDirty] = useState(Boolean(initialDraft?.title || initialDraft?.description));
	const [autosaving, setAutosaving] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState(null);
	const [templateKey, setTemplateKey] = useState("foundation");
	const [historyPast, setHistoryPast] = useState(Array.isArray(initialDraft?.historyPast) ? initialDraft.historyPast.slice(-HISTORY_LIMIT) : []);
	const [historyFuture, setHistoryFuture] = useState(Array.isArray(initialDraft?.historyFuture) ? initialDraft.historyFuture.slice(0, HISTORY_LIMIT) : []);
	const [slashInput, setSlashInput] = useState("");
	const [commandHint, setCommandHint] = useState("");

	const descriptionRef = useRef(null);
	const checkpointRef = useRef(description);

	function buildFormDataPayload() {
		const formData = new FormData();
		formData.set("title", title);
		formData.set("description", description);
		formData.set("price", price || "0");
		formData.set("thumbnail", thumbnail || "");
		return formData;
	}

	useEffect(() => {
		if (!isEdit && initialDraft && (initialDraft.title || initialDraft.description)) {
			toast.info("Brouillon local restaure");
		}
	}, [initialDraft, isEdit]);

	useEffect(() => {
		if (!isFocusMode) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isFocusMode]);

	useEffect(() => {
		if (description === checkpointRef.current) return;
		const timer = window.setTimeout(() => {
			setHistoryPast((prev) => {
				if (prev[prev.length - 1] === checkpointRef.current) return prev;
				return [...prev.slice(-(HISTORY_LIMIT - 1)), checkpointRef.current];
			});
			checkpointRef.current = description;
			setHistoryFuture([]);
		}, 1200);
		return () => window.clearTimeout(timer);
	}, [description]);

	useEffect(() => {
		if (!isDirty) return;

		const save = async () => {
			if (!isEdit) {
				window.localStorage.setItem(
					NEW_COURSE_DRAFT_KEY,
					JSON.stringify({
						title,
						description,
						price,
						thumbnail,
						historyPast,
						historyFuture,
					}),
				);
				setLastSavedAt(new Date());
				return;
			}

			if (!course?.id || description.trim().length < 10 || title.trim().length < 3) return;
			setAutosaving(true);
			const formData = new FormData();
			formData.set("title", title);
			formData.set("description", description);
			formData.set("price", price || "0");
			formData.set("thumbnail", thumbnail || "");
			const result = await updateCourse(course.id, formData);
			setAutosaving(false);
			if (!result?.error) {
				setLastSavedAt(new Date());
				setIsDirty(false);
			}
		};

		const timer = window.setTimeout(save, 6000);
		return () => window.clearTimeout(timer);
	}, [course?.id, description, historyFuture, historyPast, isDirty, isEdit, price, thumbnail, title]);

	function insertAtCursor(text) {
		const ta = descriptionRef.current;
		if (!ta) return;
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), description]);
		setHistoryFuture([]);
		const next = description.slice(0, start) + text + description.slice(end);
		setIsDirty(true);
		setDescription(next);
		setTimeout(() => {
			ta.focus();
			const pos = start + text.length;
			ta.setSelectionRange(pos, pos);
		}, 0);
	}

	function wrapSelection(prefix, suffix = prefix) {
		const ta = descriptionRef.current;
		if (!ta) return;
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), description]);
		setHistoryFuture([]);
		const selected = description.slice(start, end) || "texte";
		const wrapped = `${prefix}${selected}${suffix}`;
		const next = description.slice(0, start) + wrapped + description.slice(end);
		setIsDirty(true);
		setDescription(next);
		setTimeout(() => {
			ta.focus();
			const pos = start + wrapped.length;
			ta.setSelectionRange(pos, pos);
		}, 0);
	}

	function applySlashCommand(rawCommand, fromInline = false, range = null) {
		const normalized = rawCommand.trim().toLowerCase();
		const snippet = SLASH_COMMANDS[normalized];
		if (!snippet) {
			setCommandHint(`Commande inconnue: ${rawCommand}`);
			return false;
		}

		if (fromInline && range && descriptionRef.current) {
			const ta = descriptionRef.current;
			setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), description]);
			setHistoryFuture([]);
			const next = description.slice(0, range.start) + snippet + description.slice(range.end);
			setIsDirty(true);
			setDescription(next);
			setCommandHint(`Commande appliquee: ${normalized}`);
			setTimeout(() => {
				ta.focus();
				const pos = range.start + snippet.length;
				ta.setSelectionRange(pos, pos);
			}, 0);
			return true;
		}

		insertAtCursor(snippet);
		setCommandHint(`Commande appliquee: ${normalized}`);
		setSlashInput("");
		return true;
	}

	function handleUndo() {
		if (historyPast.length === 0) return;
		const previous = historyPast[historyPast.length - 1];
		setHistoryPast((prev) => prev.slice(0, -1));
		setHistoryFuture((prev) => [description, ...prev].slice(0, HISTORY_LIMIT));
		setDescription(previous);
		setIsDirty(true);
		checkpointRef.current = previous;
	}

	function handleRedo() {
		if (historyFuture.length === 0) return;
		const next = historyFuture[0];
		setHistoryFuture((prev) => prev.slice(1));
		setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), description]);
		setDescription(next);
		setIsDirty(true);
		checkpointRef.current = next;
	}

	function handleEditorKeyDown(e) {
		if (e.key === "Enter") {
			const ta = descriptionRef.current;
			if (ta) {
				const start = ta.selectionStart;
				const lineStart = description.lastIndexOf("\n", start - 1) + 1;
				const lineEndCandidate = description.indexOf("\n", start);
				const lineEnd = lineEndCandidate === -1 ? description.length : lineEndCandidate;
				const line = description.slice(lineStart, lineEnd).trim();
				if (line.startsWith("/")) {
					e.preventDefault();
					const ok = applySlashCommand(line.split(/\s+/)[0], true, { start: lineStart, end: lineEnd });
					if (!ok) toast.error("Commande slash inconnue");
					return;
				}
			}
		}

		if (!(e.ctrlKey || e.metaKey)) return;
		const key = e.key.toLowerCase();

		if (key === "z" && !e.shiftKey) {
			e.preventDefault();
			handleUndo();
			return;
		}

		if (key === "y" || (key === "z" && e.shiftKey)) {
			e.preventDefault();
			handleRedo();
			return;
		}

		if (key === "b") {
			e.preventDefault();
			wrapSelection("**");
			return;
		}

		if (key === "i") {
			e.preventDefault();
			wrapSelection("*");
			return;
		}

		if (key === "k") {
			e.preventDefault();
			const ta = descriptionRef.current;
			if (!ta) return;
			const start = ta.selectionStart;
			const end = ta.selectionEnd;
			const selected = description.slice(start, end) || "texte";
			const markdownLink = `[${selected}](https://)`;
			const next = description.slice(0, start) + markdownLink + description.slice(end);
			setIsDirty(true);
			setDescription(next);
			setTimeout(() => {
				ta.focus();
				const urlStart = start + markdownLink.lastIndexOf("https://");
				ta.setSelectionRange(urlStart, urlStart + "https://".length);
			}, 0);
			return;
		}

		if (e.altKey && key === "2") {
			e.preventDefault();
			insertAtCursor("\n## Sous-titre\n\n");
			return;
		}

		if (e.altKey && key === "3") {
			e.preventDefault();
			insertAtCursor("\n### Sous-section\n\n");
			return;
		}

		if (e.shiftKey && key === "8") {
			e.preventDefault();
			insertAtCursor("\n- Point\n");
			return;
		}

		if (e.shiftKey && key === "c") {
			e.preventDefault();
			insertAtCursor("\n```md\nVotre code ici\n```\n");
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);

		const formData = buildFormDataPayload();

		const result = isEdit ? await updateCourse(course.id, formData) : await createCourse(formData);

		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
			return;
		}

		if (result?.success) {
			toast.success(isEdit ? "Cours mis à jour" : "Cours créé");
			if (!isEdit) {
				window.localStorage.removeItem(NEW_COURSE_DRAFT_KEY);
				setHistoryPast([]);
				setHistoryFuture([]);
			}
			setIsDirty(false);
			router.refresh();
		}
	}

	function applyTemplate() {
		const template = COURSE_TEMPLATES[templateKey];
		if (!template) return;
		const shouldOverwrite = !isEdit || (!title && !description) || window.confirm("Appliquer ce template et remplacer la description actuelle ?");
		if (!shouldOverwrite) return;

		setTitle(template.title);
		setDescription(template.description);
		setPrice(template.price);
		setIsDirty(true);
		setCommandHint(`Template applique: ${template.label}`);
	}

	const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;
	const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));
	const titleSeoState = title.length >= 45 && title.length <= 65 ? "optimal" : title.length >= 30 && title.length <= 80 ? "ok" : "weak";
	const descriptionSeoState =
		description.length >= 120 && description.length <= 180 ? "optimal" : description.length >= 80 && description.length <= 240 ? "ok" : "weak";

	return (
		<div className="grid gap-6 w-full">
			<form
				onSubmit={handleSubmit}
				className="space-y-6"
			>
				<Card>
					<CardHeader>
						<CardTitle>{isEdit ? "Modifier le cours" : "Créer un cours"}</CardTitle>
						<CardDescription>{isEdit ? "Modifie les informations du cours." : "Tu pourras ajouter les modules et leçons ensuite."}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="title">Titre du cours *</Label>
							<Input
								id="title"
								name="title"
								value={title}
								onChange={(e) => {
									setIsDirty(true);
									setTitle(e.target.value);
								}}
								placeholder="Ex: Introduction a AERIA"
								required
								className="bg-neutral-50 shadow-inner"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="price">Prix ($)</Label>
							<Input
								id="price"
								name="price"
								type="number"
								step="0.01"
								min="0"
								value={price}
								onChange={(e) => {
									setIsDirty(true);
									setPrice(e.target.value);
								}}
								required
								className="bg-neutral-50 shadow-inner"
							/>
							<p className="text-xs text-muted-foreground">Mettre 0 pour un cours gratuit</p>
						</div>

						<div className="space-y-2">
							<Label>Miniature du cours</Label>
							<ImageUpload
								name="thumbnail"
								value={thumbnail}
								onChange={(v) => {
									setIsDirty(true);
									setThumbnail(v);
								}}
							/>
						</div>
					</CardContent>
				</Card>

				<Card className={clsx(isFocusMode && "fixed inset-4 z-50 overflow-auto bg-neutral-100 shadow-xl")}>
					<CardHeader>
						<div className="flex flex-col justify-between gap-2">
							<div>
								<CardTitle>Description du cours</CardTitle>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleUndo}
									disabled={historyPast.length === 0}
								>
									<Undo2 className="mr-1 h-4 w-4" />
									Undo
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleRedo}
									disabled={historyFuture.length === 0}
								>
									<Redo2 className="mr-1 h-4 w-4" />
									Redo
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setViewMode("editor")}
									className={clsx(viewMode === "editor" && "bg-neutral-200")}
								>
									<EyeOff className="mr-1 h-4 w-4" />
									Editeur
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setViewMode("preview")}
									className={clsx(viewMode === "preview" && "bg-neutral-200")}
								>
									<Eye className="mr-1 h-4 w-4" />
									Apercu
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setViewMode("split")}
									className={clsx(viewMode === "split" && "bg-neutral-200")}
								>
									<Columns3 className="mr-1 h-4 w-4" />
									Split
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setIsFocusMode((v) => !v)}
								>
									{isFocusMode ? <Minimize2 className="mr-1 h-4 w-4" /> : <Focus className="mr-1 h-4 w-4" />}
									{isFocusMode ? "Quitter focus" : "Mode focus"}
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-2 border-b pb-3">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => insertAtCursor("\n## Sous-titre\n\n")}
							>
								H2
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => insertAtCursor("\n### Sous-section\n\n")}
							>
								H3
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => insertAtCursor("\n- Point 1\n- Point 2\n")}
							>
								Liste
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => insertAtCursor("\n```md\nVotre code ici\n```\n")}
							>
								<Code2 className="mr-1 h-3.5 w-3.5" />
								Code
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => insertAtCursor("\n### Passez a l'action\n\nProchaine etape:\n")}
							>
								CTA
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => insertAtCursor("\n> Citation\n\n")}
							>
								Citation
							</Button>
						</div>

						{/* <div className="rounded-md border bg-muted/20 p-3 space-y-2">
							<div className="flex flex-col gap-2 md:flex-row md:items-center">
								<Input
									value={slashInput}
									onChange={(e) => setSlashInput(e.target.value)}
									placeholder="Commande rapide (ex: /h2, /list, /code, /quote)"
									className="bg-white"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										if (!slashInput.trim()) return;
										const ok = applySlashCommand(slashInput.trim().split(/\s+/)[0]);
										if (!ok) toast.error("Commande slash inconnue");
									}}
								>
									Appliquer /commande
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">Commandes: /h2, /h3, /list, /code, /quote, /cta</p>
							{commandHint ? <p className="text-xs text-primary">{commandHint}</p> : null}
						</div> */}

						{viewMode === "preview" ? (
							<div className="min-h-100 rounded-md border p-6 bg-white">
								{description ? (
									<ReactMarkdown>{description}</ReactMarkdown>
								) : (
									<p className="text-muted-foreground">Apercu vide. Ecris du contenu pour le voir ici.</p>
								)}
							</div>
						) : viewMode === "split" ? (
							<div className="grid gap-3 lg:grid-cols-2">
								<Textarea
									ref={descriptionRef}
									value={description}
									onChange={(e) => {
										setIsDirty(true);
										setDescription(e.target.value);
									}}
									onKeyDown={handleEditorKeyDown}
									rows={5}
									className="font-mono text-sm bg-neutral-50 shadow-inner"
									required
								/>
								<div className="min-h-100 rounded-md border p-6 bg-white overflow-auto">
									{description ? (
										<ReactMarkdown>{description}</ReactMarkdown>
									) : (
										<p className="text-muted-foreground">Apercu vide. Ecris du contenu pour le voir ici.</p>
									)}
								</div>
							</div>
						) : (
							<Textarea
								id="description"
								name="description"
								ref={descriptionRef}
								value={description}
								onChange={(e) => {
									setIsDirty(true);
									setDescription(e.target.value);
								}}
								onKeyDown={handleEditorKeyDown}
								placeholder="Decris le contenu et les objectifs du cours..."
								rows={14}
								className="font-mono text-sm bg-neutral-100 shadow-inner h-full"
								required
							/>
						)}
					</CardContent>
				</Card>

				<div className="flex justify-end items-center gap-3">
					<Button
						type="button"
						variant="secondary"
						onClick={() => {
							if (!isEdit) {
								toast.info("Le brouillon est stocke localement automatiquement");
								return;
							}
							const form = document.querySelector("form");
							if (form) form.requestSubmit();
						}}
						disabled={loading || !isDirty}
					>
						<Sparkles className="mr-1 h-4 w-4" />
						Sauvegarder brouillon
					</Button>
					<Button
						type="submit"
						disabled={loading}
					>
						{loading ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Créer le cours"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/admin/courses")}
					>
						Annuler
					</Button>
				</div>
			</form>

			{/* <aside className={clsx("space-y-4 xl:sticky xl:top-6 h-fit", isFocusMode && "hidden")}>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Templates de cours</CardTitle>
						<CardDescription>Demarre rapidement avec une structure pedagogique.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<Select
							value={templateKey}
							onValueChange={setTemplateKey}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="foundation">Formation fondamentale</SelectItem>
								<SelectItem value="masterclass">Masterclass premium</SelectItem>
								<SelectItem value="bootcamp">Bootcamp intensif</SelectItem>
							</SelectContent>
						</Select>
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={applyTemplate}
						>
							Appliquer le template
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Indicateurs SEO</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Titre ({title.length})</span>
							<Badge variant={titleSeoState === "optimal" ? "default" : titleSeoState === "ok" ? "secondary" : "outline"}>
								{titleSeoState === "optimal" ? "Optimal" : titleSeoState === "ok" ? "Acceptable" : "A ajuster"}
							</Badge>
						</div>
						<div className="h-1.5 rounded bg-muted overflow-hidden">
							<div
								className={clsx(
									"h-full transition-all",
									titleSeoState === "optimal" ? "bg-primary" : titleSeoState === "ok" ? "bg-amber-500" : "bg-muted-foreground",
								)}
								style={{ width: `${Math.min(100, (title.length / 80) * 100)}%` }}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Description ({description.length})</span>
							<Badge variant={descriptionSeoState === "optimal" ? "default" : descriptionSeoState === "ok" ? "secondary" : "outline"}>
								{descriptionSeoState === "optimal" ? "Optimal" : descriptionSeoState === "ok" ? "Acceptable" : "A ajuster"}
							</Badge>
						</div>
						<div className="h-1.5 rounded bg-muted overflow-hidden">
							<div
								className={clsx(
									"h-full transition-all",
									descriptionSeoState === "optimal" ? "bg-primary" : descriptionSeoState === "ok" ? "bg-amber-500" : "bg-muted-foreground",
								)}
								style={{ width: `${Math.min(100, (description.length / 240) * 100)}%` }}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Etat de l&apos;editeur</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Auto-save</span>
							<Badge variant={autosaving ? "secondary" : "outline"}>{autosaving ? "En cours" : "Actif"}</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Mots</span>
							<strong>{wordCount}</strong>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Lecture estimée</span>
							<strong>{readingMinutes} min</strong>
						</div>
						<p className="text-xs text-muted-foreground">
							{lastSavedAt ? `Derniere sauvegarde: ${lastSavedAt.toLocaleTimeString("fr-FR")}` : "Aucune sauvegarde automatique pour l&apos;instant"}
						</p>
					</CardContent>
				</Card>
			</aside> */}
		</div>
	);
}
