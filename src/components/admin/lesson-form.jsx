"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, PanelTop, Quote, Sparkles, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { createLesson, updateLesson } from "@/app/admin/courses/[id]/modules/[moduleId]/actions";
import { LessonFileUpload } from "../ui/lesson-file-upload";

const contentLabels = {
	VIDEO: { label: "Vidéo (URL YouTube/Vimeo ou upload)", placeholder: "https://youtube.com/watch?v=..." },
	AUDIO: { label: "Fichier audio (URL ou upload)", placeholder: "https://.../capsule.mp3" },
	TEXT: { label: "Contenu (Markdown supporté)", placeholder: "# Mon contenu..." },
	PDF: { label: "Document PDF (URL ou upload)", placeholder: "https://.../document.pdf" },
};

const QUICK_INSERT_SNIPPET_META = {
	calloutSuccess: {
		title: "Callout succes",
		description: "Mettre en avant un point cle de la lecon.",
	},
	faq: {
		title: "Mini FAQ",
		description: "Anticiper les questions frequentes des etudiants.",
	},
	checklist: {
		title: "Checklist d'action",
		description: "Transformer la theorie en actions concretes.",
	},
	cta: {
		title: "Bloc CTA",
		description: "Inviter a passer a l'etape suivante.",
	},
	quotePro: {
		title: "Citation experte",
		description: "Renforcer la credibilite de la lecon.",
	},
};

export function LessonForm({ courseId, moduleId, lesson }) {
	const router = useRouter();
	const textareaRef = useRef(null);
	const savedSelectionRef = useRef({ start: 0, end: 0 });
	const [content, setContent] = useState(lesson?.content || "");
	const [loading, setLoading] = useState(false);
	const [type, setType] = useState(lesson?.type || "VIDEO");
	const [audioUrl, setAudioUrl] = useState(lesson?.audioUrl || "");
	const [audioUrlExpress, setAudioUrlExpress] = useState(lesson?.audioUrlExpress || "");
	const [hasTextSelection, setHasTextSelection] = useState(false);
	const [contextualQuickInsertSuggestions, setContextualQuickInsertSuggestions] = useState([
		{
			key: "calloutSuccess",
			title: QUICK_INSERT_SNIPPET_META.calloutSuccess.title,
			description: QUICK_INSERT_SNIPPET_META.calloutSuccess.description,
		},
		{
			key: "cta",
			title: QUICK_INSERT_SNIPPET_META.cta.title,
			description: QUICK_INSERT_SNIPPET_META.cta.description,
		},
	]);
	const isEdit = !!lesson;

	function insertAtCursor(text) {
		const ta = textareaRef.current;
		if (!ta) return;
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		const next = content.slice(0, start) + text + content.slice(end);
		setContent(next);
		setTimeout(() => {
			ta.focus();
			const cursor = start + text.length;
			ta.setSelectionRange(cursor, cursor);
			savedSelectionRef.current = { start: cursor, end: cursor };
		}, 0);
	}

	function resolveSelectionRange({ fallbackToSavedSelection = false } = {}) {
		const ta = textareaRef.current;
		if (!ta) return { start: 0, end: 0 };

		const start = ta.selectionStart ?? 0;
		const end = ta.selectionEnd ?? start;
		const saved = savedSelectionRef.current;

		if (fallbackToSavedSelection && start === end && saved.end > saved.start) {
			return saved;
		}

		return { start, end };
	}

	function wrapSelection(prefix, suffix = prefix) {
		const ta = textareaRef.current;
		if (!ta) return;
		const { start, end } = resolveSelectionRange({ fallbackToSavedSelection: true });
		const selected = content.slice(start, end) || "texte";
		const wrapped = `${prefix}${selected}${suffix}`;
		const next = content.slice(0, start) + wrapped + content.slice(end);
		setContent(next);
		setTimeout(() => {
			ta.focus();
			const selectionStart = start + prefix.length;
			const selectionEnd = selectionStart + selected.length;
			ta.setSelectionRange(selectionStart, selectionEnd);
			savedSelectionRef.current = { start: selectionStart, end: selectionEnd };
		}, 0);
	}

	function insertMarkdownLink() {
		const ta = textareaRef.current;
		if (!ta) return;
		const { start, end } = resolveSelectionRange({ fallbackToSavedSelection: true });
		const selected = content.slice(start, end) || "texte";
		const markdownLink = `[${selected}](https://)`;
		setContent(content.slice(0, start) + markdownLink + content.slice(end));
		setTimeout(() => {
			ta.focus();
			const urlStart = start + markdownLink.lastIndexOf("https://");
			ta.setSelectionRange(urlStart, urlStart + "https://".length);
			savedSelectionRef.current = { start: urlStart, end: urlStart + "https://".length };
		}, 0);
	}

	function quickInsertSnippet(kind) {
		const snippets = {
			calloutSuccess: '\n::callout[Point cle de la lecon]{type="success"}\n',
			faq: "\n### FAQ de la lecon\n\n#### Question frequente\nReponse claire et concise.\n",
			checklist: "\n### Checklist\n\n- [ ] Action 1\n- [ ] Action 2\n- [ ] Action 3\n",
			cta: '\n::callout[Prochaine etape]{type="success"}\n',
			quotePro: '\n::quote[Conseil expert a retenir]{author="Mentor"}\n',
		};

		const snippet = snippets[kind] || "";
		if (!snippet) return;
		insertAtCursor(snippet);
		toast.success("Bloc insere");
	}

	function getContextualQuickInserts(nextContent = content, selectionStart = null, selectionEnd = null) {
		if (typeof selectionStart !== "number" || typeof selectionEnd !== "number") {
			const ta = textareaRef.current;
			if (!ta) {
				return ["calloutSuccess", "cta"].map((key) => ({
					key,
					title: QUICK_INSERT_SNIPPET_META[key].title,
					description: QUICK_INSERT_SNIPPET_META[key].description,
				}));
			}
			selectionStart = ta.selectionStart ?? nextContent.length;
			selectionEnd = ta.selectionEnd ?? selectionStart;
		}

		const anchor = selectionStart;
		const selectedText = nextContent.slice(selectionStart, selectionEnd).toLowerCase();
		const before = nextContent.slice(Math.max(0, anchor - 220), anchor).toLowerCase();
		const context = `${before}\n${selectedText}`;

		const rulebook = [
			{ key: "faq", pattern: /(faq|questions? frequentes?|objection|question|reponse)/i },
			{ key: "checklist", pattern: /(etape|plan d'action|checklist|a faire|todo|exercice)/i },
			{ key: "cta", pattern: /(prochaine etape|action|pratique|essaie|applique|mission)/i },
			{ key: "quotePro", pattern: /(citation|mentor|expert|temoignage|retour)/i },
			{ key: "calloutSuccess", pattern: /(important|a retenir|attention|astuce|conseil|point cle)/i },
		];

		const keys = rulebook.filter((rule) => rule.pattern.test(context)).map((rule) => rule.key);
		const unique = Array.from(new Set(keys));
		const selected = (unique.length ? unique : ["calloutSuccess", "cta", "checklist"]).slice(0, 3);

		return selected.map((key) => ({
			key,
			title: QUICK_INSERT_SNIPPET_META[key].title,
			description: QUICK_INSERT_SNIPPET_META[key].description,
		}));
	}

	function syncSelectionState(event) {
		const ta = textareaRef.current;
		if (!ta || type !== "TEXT") {
			setHasTextSelection(false);
			setContextualQuickInsertSuggestions(getContextualQuickInserts(content));
			return;
		}

		const start = ta.selectionStart ?? 0;
		const end = ta.selectionEnd ?? start;
		const hasCurrentSelection = end > start;
		const isContextMenuEvent = event?.type === "contextmenu";

		if (hasCurrentSelection) {
			savedSelectionRef.current = { start, end };
		} else if (!isContextMenuEvent) {
			savedSelectionRef.current = { start, end };
		}

		const effectiveStart = hasCurrentSelection ? start : savedSelectionRef.current.start;
		const effectiveEnd = hasCurrentSelection ? end : savedSelectionRef.current.end;
		const hasEffectiveSelection = effectiveEnd > effectiveStart;

		setHasTextSelection(hasEffectiveSelection);
		setContextualQuickInsertSuggestions(getContextualQuickInserts(content, effectiveStart, effectiveEnd));
	}

	function handleTextEditorKeyDown(event) {
		if (!(event.ctrlKey || event.metaKey)) return;
		const key = event.key.toLowerCase();

		if (key === "b") {
			event.preventDefault();
			wrapSelection("**");
			return;
		}

		if (key === "i") {
			event.preventDefault();
			wrapSelection("*");
			return;
		}

		if (key === "u") {
			event.preventDefault();
			wrapSelection("<u>", "</u>");
			return;
		}

		if (key === "k") {
			event.preventDefault();
			insertMarkdownLink();
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);

		const fd = new FormData(e.currentTarget);
		fd.set("content", content);
		fd.set("audioUrl", audioUrl);
		fd.set("audioUrlExpress", audioUrlExpress);
		const result = isEdit ? await updateLesson(courseId, moduleId, lesson.id, fd) : await createLesson(courseId, moduleId, fd);

		if (result?.error) {
			toast.error(result.error);
			setLoading(false);
			return;
		}

		if (isEdit) {
			toast.success("Leçon mise à jour");
			router.refresh();
		}
		setLoading(false);
	}

	const contentField = contentLabels[type];

	function renderTextEditorContextMenu() {
		return (
			<ContextMenuContent
				className="w-72 rounded-xl border-border/80 bg-background/95 p-2 shadow-xl backdrop-blur"
				onOpenAutoFocus={(event) => {
					// Keep focus in the textarea so native text selection highlight remains visible.
					event.preventDefault();
				}}
			>
				<ContextMenuLabel className="pb-1 text-[11px] uppercase tracking-wide">Edition de lecon</ContextMenuLabel>
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<PanelTop className="h-4 w-4" />
						Format rapide
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-56">
						<ContextMenuItem onSelect={() => wrapSelection("**")}>
							<Bold className="h-4 w-4" />
							Gras
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => wrapSelection("*")}>
							<Italic className="h-4 w-4" />
							Italique
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => wrapSelection("<u>", "</u>")}>
							<Underline className="h-4 w-4" />
							Souligne
						</ContextMenuItem>
						<ContextMenuItem onSelect={insertMarkdownLink}>
							<Link2 className="h-4 w-4" />
							Lien
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem onSelect={() => insertAtCursor("\n## Sous-titre\n\n")}>
							<Heading2 className="h-4 w-4" />
							Titre H2
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => insertAtCursor("\n### Sous-section\n\n")}>
							<Heading3 className="h-4 w-4" />
							Titre H3
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => insertAtCursor("\n- Point 1\n- Point 2\n")}>
							<List className="h-4 w-4" />
							Liste a puces
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => insertAtCursor("\n1. Etape 1\n2. Etape 2\n")}>
							<ListOrdered className="h-4 w-4" />
							Liste numerotee
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => insertAtCursor('\n::quote[Citation]{author="Mentor"}\n')}>
							<Quote className="h-4 w-4" />
							Citation
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				{contextualQuickInsertSuggestions.length > 0 ? (
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<Sparkles className="h-4 w-4" />
							Suggestions contextuelles
						</ContextMenuSubTrigger>
						<ContextMenuSubContent className="w-72">
							{contextualQuickInsertSuggestions.map((suggestion) => (
								<ContextMenuItem
									key={suggestion.key}
									onSelect={() => quickInsertSnippet(suggestion.key)}
									className="flex flex-col items-start gap-0.5"
								>
									<span className="font-medium">{suggestion.title}</span>
									<span className="text-[11px] text-muted-foreground">{suggestion.description}</span>
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				) : null}

				<ContextMenuSeparator />
				<ContextMenuItem
					disabled={!hasTextSelection}
					onSelect={() => wrapSelection("**")}
				>
					Accentuer la selection
				</ContextMenuItem>
			</ContextMenuContent>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-6 w-full"
		>
			<div className="space-y-2">
				<Label htmlFor="title">Titre de la leçon *</Label>
				<Input
					id="title"
					name="title"
					defaultValue={lesson?.title}
					placeholder="Ex: Bienvenue dans AERIA"
					required
					className="bg-neutral-50 shadow-inner"
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="type">Type *</Label>
				<Select
					name="type"
					value={type}
					onValueChange={setType}
				>
					<SelectTrigger className="bg-neutral-50 shadow-inner">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="VIDEO">Vidéo</SelectItem>
						<SelectItem value="AUDIO">Capsule audio</SelectItem>
						<SelectItem value="TEXT">Texte / Markdown</SelectItem>
						<SelectItem value="PDF">Document PDF</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label htmlFor="content">{contentField.label} *</Label>

				{type === "TEXT" ? (
					<div className="rounded-xl border border-border/80 bg-white shadow-sm overflow-hidden">
						{/* LESSON EDITOR TOOLBAR */}
						<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-3 py-2">
							<div className="inline-flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => wrapSelection("**")}
								>
									<Bold className="h-4 w-4" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => wrapSelection("*")}
								>
									<Italic className="h-4 w-4" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => wrapSelection("<u>", "</u>")}
								>
									<Underline className="h-4 w-4" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={insertMarkdownLink}
								>
									<Link2 className="h-4 w-4" />
								</Button>
							</div>

							<div className="inline-flex items-center gap-1">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => quickInsertSnippet("checklist")}
									className="h-8"
								>
									Checklist
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => quickInsertSnippet("cta")}
									className="h-8"
								>
									CTA
								</Button>
							</div>
						</div>

						<ContextMenu>
							<ContextMenuTrigger className="block">
								<Textarea
									id="content"
									name="content"
									ref={textareaRef}
									value={content}
									onChange={(e) => {
										const value = e.target.value;
										const start = e.target.selectionStart ?? value.length;
										const end = e.target.selectionEnd ?? start;
										setContent(value);
										setContextualQuickInsertSuggestions(getContextualQuickInserts(value, start, end));
									}}
									onSelect={syncSelectionState}
									onKeyUp={syncSelectionState}
									onMouseUp={syncSelectionState}
									onContextMenu={syncSelectionState}
									onKeyDown={handleTextEditorKeyDown}
									placeholder={contentField.placeholder}
									rows={14}
									required
									className="border-0 rounded-none bg-white px-5 py-4 shadow-none focus-visible:ring-0"
								/>
							</ContextMenuTrigger>
							{renderTextEditorContextMenu()}
						</ContextMenu>

						<p className="px-3 py-2 text-xs text-muted-foreground border-t border-border/60 bg-muted/20">
							Astuce: clic droit pour les actions premium ou Ctrl+B / Ctrl+I / Ctrl+K.
						</p>
					</div>
				) : (
					<LessonFileUpload
						type={type}
						value={content}
						onChange={setContent}
						name="content"
					/>
				)}
			</div>

			{/* Capsule audio optionnelle (pour les leçons TEXT principalement) */}
			{type === "TEXT" && (
				<>
					<div className="space-y-2">
						<Label htmlFor="audioUrl">Capsule audio (version régulière optionnel)</Label>
						<p className="text-xs text-muted-foreground">Version principale de la capsule audio, jouée par défaut.</p>
						<LessonFileUpload
							type="AUDIO"
							value={audioUrl}
							onChange={setAudioUrl}
							name="audioUrl"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="audioUrlExpress">Capsule audio (version express optionnel)</Label>
						<p className="text-xs text-muted-foreground">
							Version courte ou condensée. L&apos;étudiant peut basculer entre les deux versions depuis le lecteur.
						</p>
						<LessonFileUpload
							type="AUDIO"
							value={audioUrlExpress}
							onChange={setAudioUrlExpress}
							name="audioUrlExpress"
						/>
					</div>
				</>
			)}

			<div className="space-y-2">
				<Label htmlFor="duration">Durée (en secondes)</Label>
				<Input
					id="duration"
					name="duration"
					type="number"
					min="0"
					defaultValue={lesson?.duration || ""}
					placeholder="Ex: 300 pour 5 min"
					className="bg-neutral-50 shadow-inner"
				/>
			</div>

			<div className="flex gap-3">
				<Button
					type="submit"
					disabled={loading}
				>
					{loading ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Créer la leçon"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push(`/admin/courses/${courseId}/modules/${moduleId}`)}
				>
					Annuler
				</Button>
			</div>
		</form>
	);
}
