"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { createArticle, updateArticle } from "@/app/admin/articles/actions";
import { uploadArticleMedia } from "@/app/admin/articles/upload-actions";
import { slugify } from "@/lib/slugify";
import { ARTICLE_TEMPLATES, HISTORY_LIMIT, NEW_ARTICLE_DRAFT_KEY, SLASH_COMMANDS } from "@/components/admin/article-form.constants";
import { extractPrimaryCategory, injectPrimaryCategoryMarker, readDraftFromStorage, stripPrimaryCategoryMarker } from "@/components/admin/article-form.utils";
import { ArticleFormEditorSection } from "@/components/admin/article-form-editor-section";
import { ArticleFormMetadataSection } from "@/components/admin/article-form-metadata-section";
import { ArticleFormPublicationSection } from "@/components/admin/article-form-publication-section";
import { ArticleFormSidebarSection } from "@/components/admin/article-form-sidebar-section";

const QUICK_INSERT_SNIPPET_META = {
	calloutSuccess: {
		title: "Callout succes",
		description: "Mettre en avant un point cle actionnable.",
	},
	faq: {
		title: "FAQ rapide",
		description: "Structurer une reponse claire aux objections.",
	},
	comparisonTable: {
		title: "Tableau comparatif",
		description: "Comparer options, prix et limites.",
	},
	cta: {
		title: "Bloc CTA",
		description: "Declencher une action concrete.",
	},
	quotePro: {
		title: "Citation expert",
		description: "Ajouter preuve sociale et credibilite.",
	},
};

export function ArticleForm({ article, allTags = [] }) {
	const router = useRouter();
	const isEdit = !!article;
	const initialDraft = !isEdit ? readDraftFromStorage(NEW_ARTICLE_DRAFT_KEY) : null;
	const initialRawContent = article?.content || initialDraft?.content || "";
	const initialPrimaryCategory = initialDraft?.primaryCategoryPath || extractPrimaryCategory(initialRawContent);
	const initialContent = stripPrimaryCategoryMarker(initialRawContent);

	const [loading, setLoading] = useState(false);
	const [title, setTitle] = useState(article?.title || initialDraft?.title || "");
	const [slug, setSlug] = useState(article?.slug || initialDraft?.slug || "");
	const [excerpt, setExcerpt] = useState(article?.excerpt || initialDraft?.excerpt || "");
	const [coverImage, setCoverImage] = useState(article?.coverImage || initialDraft?.coverImage || "");
	const [content, setContent] = useState(initialContent);
	const [primaryCategoryPath, setPrimaryCategoryPath] = useState(initialPrimaryCategory);
	const [requiredTier, setRequiredTier] = useState(article?.requiredTier || initialDraft?.requiredTier || "FREE");
	const [selectedTagIds, setSelectedTagIds] = useState(article?.tags?.map((t) => t.tagId) || initialDraft?.selectedTagIds || []);
	const [viewMode, setViewMode] = useState("editor");
	const [isDirty, setIsDirty] = useState(Boolean(initialDraft?.title || initialDraft?.content));
	const [autosaving, setAutosaving] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState(null);
	const [templateKey, setTemplateKey] = useState("guide");
	const [isFocusMode, setIsFocusMode] = useState(false);
	const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
	const [showQuickToolbar, setShowQuickToolbar] = useState(true);
	const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
	const [hasTextSelection, setHasTextSelection] = useState(false);
	const [rightPanelSections, setRightPanelSections] = useState({
		templates: true,
		seo: true,
		quality: true,
		checklist: true,
	});
	const [historyPast, setHistoryPast] = useState(Array.isArray(initialDraft?.historyPast) ? initialDraft.historyPast.slice(-HISTORY_LIMIT) : []);
	const [historyFuture, setHistoryFuture] = useState(Array.isArray(initialDraft?.historyFuture) ? initialDraft.historyFuture.slice(0, HISTORY_LIMIT) : []);
	const [slashInput, setSlashInput] = useState("");
	const [commandHint, setCommandHint] = useState("");
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

	const textareaRef = useRef(null);
	const checkpointRef = useRef(content);
	const savedSelectionRef = useRef({ start: 0, end: 0 });
	const selectedTagObjects = allTags.filter((tag) => selectedTagIds.includes(tag.id));
	const hierarchicalTagNames = selectedTagObjects
		.map((tag) => tag.name)
		.filter((name) => name.includes("/"))
		.sort((a, b) => b.split("/").length - a.split("/").length);
	const effectivePrimaryCategoryPath =
		hierarchicalTagNames.length === 0 ? "" : hierarchicalTagNames.includes(primaryCategoryPath) ? primaryCategoryPath : hierarchicalTagNames[0];

	function buildFormDataPayload() {
		const formData = new FormData();
		formData.set("title", title);
		formData.set("slug", slug);
		formData.set("excerpt", excerpt);
		formData.set("coverImage", coverImage);
		formData.set("content", injectPrimaryCategoryMarker(content, effectivePrimaryCategoryPath));
		formData.set("requiredTier", requiredTier);
		formData.set("tagIds", selectedTagIds.join(","));
		return formData;
	}

	useEffect(() => {
		if (!isEdit && initialDraft && (initialDraft.title || initialDraft.content)) {
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
		if (content === checkpointRef.current) return;
		const timer = window.setTimeout(() => {
			setHistoryPast((prev) => {
				if (prev[prev.length - 1] === checkpointRef.current) return prev;
				return [...prev.slice(-(HISTORY_LIMIT - 1)), checkpointRef.current];
			});
			checkpointRef.current = content;
			setHistoryFuture([]);
		}, 1200);
		return () => window.clearTimeout(timer);
	}, [content]);

	useEffect(() => {
		if (!isDirty) return;

		const save = async () => {
			if (!isEdit) {
				window.localStorage.setItem(
					NEW_ARTICLE_DRAFT_KEY,
					JSON.stringify({
						title,
						slug,
						excerpt,
						coverImage,
						content,
						primaryCategoryPath: effectivePrimaryCategoryPath,
						requiredTier,
						selectedTagIds,
						historyPast,
						historyFuture,
					}),
				);
				setLastSavedAt(new Date());
				return;
			}

			if (!article?.id || content.trim().length < 10 || title.trim().length < 3) return;
			setAutosaving(true);
			const formData = new FormData();
			formData.set("title", title);
			formData.set("slug", slug);
			formData.set("excerpt", excerpt);
			formData.set("coverImage", coverImage);
			formData.set("content", injectPrimaryCategoryMarker(content, effectivePrimaryCategoryPath));
			formData.set("requiredTier", requiredTier);
			formData.set("tagIds", selectedTagIds.join(","));
			const result = await updateArticle(article.id, formData);
			setAutosaving(false);
			if (!result?.error) {
				setLastSavedAt(new Date());
				setIsDirty(false);
			}
		};

		const timer = window.setTimeout(save, 6000);
		return () => window.clearTimeout(timer);
	}, [
		article?.id,
		content,
		coverImage,
		effectivePrimaryCategoryPath,
		excerpt,
		historyFuture,
		historyPast,
		isDirty,
		isEdit,
		requiredTier,
		selectedTagIds,
		slug,
		title,
	]);

	function toggleTag(tagId) {
		setIsDirty(true);
		setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
	}

	function insertAtCursor(text) {
		const ta = textareaRef.current;
		if (!ta) return;
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), content]);
		setHistoryFuture([]);
		const newContent = content.slice(0, start) + text + content.slice(end);
		setIsDirty(true);
		setContent(newContent);
		setTimeout(() => {
			ta.focus();
			ta.setSelectionRange(start + text.length, start + text.length);
			savedSelectionRef.current = { start: start + text.length, end: start + text.length };
		}, 0);
	}

	function resolveSelectionRange({ fallbackToSavedSelection = false } = {}) {
		const ta = textareaRef.current;
		if (!ta) return { start: 0, end: 0 };

		const start = ta.selectionStart ?? 0;
		const end = ta.selectionEnd ?? start;
		const saved = savedSelectionRef.current;
		const hasSavedSelection = saved.end > saved.start;
		const isTextareaFocused = document.activeElement === ta;

		if (fallbackToSavedSelection && hasSavedSelection && (start === end || !isTextareaFocused)) {
			return saved;
		}

		return { start, end };
	}

	function wrapSelection(prefix, suffix = prefix) {
		const ta = textareaRef.current;
		if (!ta) return;
		const { start, end } = resolveSelectionRange({ fallbackToSavedSelection: true });
		const before = content.slice(0, start);
		const selectedRaw = content.slice(start, end);
		const after = content.slice(end);

		let next = content;
		let nextSelectionStart = start;
		let nextSelectionEnd = end;

		const hasSelection = end > start;
		const isWrappedSelection =
			hasSelection && selectedRaw.startsWith(prefix) && selectedRaw.endsWith(suffix) && selectedRaw.length >= prefix.length + suffix.length;
		const hasOuterWrapper =
			hasSelection && start >= prefix.length && content.slice(start - prefix.length, start) === prefix && content.slice(end, end + suffix.length) === suffix;

		setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), content]);
		setHistoryFuture([]);

		if (isWrappedSelection) {
			const unwrapped = selectedRaw.slice(prefix.length, selectedRaw.length - suffix.length);
			next = before + unwrapped + after;
			nextSelectionStart = start;
			nextSelectionEnd = start + unwrapped.length;
		} else if (hasOuterWrapper) {
			next = content.slice(0, start - prefix.length) + selectedRaw + content.slice(end + suffix.length);
			nextSelectionStart = start - prefix.length;
			nextSelectionEnd = nextSelectionStart + selectedRaw.length;
		} else {
			const selected = selectedRaw || "texte";
			const wrapped = `${prefix}${selected}${suffix}`;
			next = before + wrapped + after;
			nextSelectionStart = start + prefix.length;
			nextSelectionEnd = nextSelectionStart + selected.length;
		}

		setIsDirty(true);
		setContent(next);
		setTimeout(() => {
			ta.focus();
			ta.setSelectionRange(nextSelectionStart, nextSelectionEnd);
			savedSelectionRef.current = { start: nextSelectionStart, end: nextSelectionEnd };
		}, 0);
	}

	function removeSelectionStyles() {
		const ta = textareaRef.current;
		if (!ta) return;
		const { start, end } = resolveSelectionRange({ fallbackToSavedSelection: true });
		if (end <= start) {
			toast.info("Selectionne du texte pour retirer la mise en forme");
			return;
		}

		const before = content.slice(0, start);
		const selected = content.slice(start, end);
		const after = content.slice(end);
		const cleaned = selected
			.replace(/\*\*/g, "")
			.replace(/(?<!\*)\*(?!\*)/g, "")
			.replace(/<\/?u>/g, "")
			.replace(/`/g, "");

		setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), content]);
		setHistoryFuture([]);
		setIsDirty(true);
		setContent(`${before}${cleaned}${after}`);
		setTimeout(() => {
			ta.focus();
			ta.setSelectionRange(start, start + cleaned.length);
			savedSelectionRef.current = { start, end: start + cleaned.length };
		}, 0);
	}

	function applySlashCommand(rawCommand, fromInline = false, range = null) {
		const normalized = rawCommand.trim().toLowerCase();
		const snippet = SLASH_COMMANDS[normalized];
		if (!snippet) {
			setCommandHint(`Commande inconnue: ${rawCommand}`);
			return false;
		}

		if (fromInline && range && textareaRef.current) {
			const ta = textareaRef.current;
			setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), content]);
			setHistoryFuture([]);
			const next = content.slice(0, range.start) + snippet + content.slice(range.end);
			setIsDirty(true);
			setContent(next);
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
		setHistoryFuture((prev) => [content, ...prev].slice(0, HISTORY_LIMIT));
		setContent(previous);
		setIsDirty(true);
		checkpointRef.current = previous;
	}

	function handleRedo() {
		if (historyFuture.length === 0) return;
		const next = historyFuture[0];
		setHistoryFuture((prev) => prev.slice(1));
		setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), content]);
		setContent(next);
		setIsDirty(true);
		checkpointRef.current = next;
	}

	function handleEditorKeyDown(e) {
		if (e.key === "Enter") {
			const ta = textareaRef.current;
			if (ta) {
				const start = ta.selectionStart;
				const lineStart = content.lastIndexOf("\n", start - 1) + 1;
				const lineEndCandidate = content.indexOf("\n", start);
				const lineEnd = lineEndCandidate === -1 ? content.length : lineEndCandidate;
				const line = content.slice(lineStart, lineEnd).trim();
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
			insertMarkdownLink();
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

	function addSnippet(kind) {
		const snippets = {
			table: "\n| Colonne A | Colonne B |\n| --- | --- |\n| Valeur 1 | Valeur 2 |\n",
			cta: '\n::callout[Passer a l\'action]{type="success"}\n',
			checklist: "\n- [ ] Point 1\n- [ ] Point 2\n- [ ] Point 3\n",
			separator: "\n---\n",
		};
		insertAtCursor(snippets[kind] || "");
	}

	function quickInsertSnippet(kind) {
		const snippets = {
			calloutSuccess: '\n::callout[Point cle a retenir]{type="success"}\n',
			faq: "\n### FAQ\n\n#### Question frequente\nReponse courte et actionnable.\n",
			comparisonTable: "\n| Option | Avantage | Limite |\n| --- | --- | --- |\n| Option A | ... | ... |\n| Option B | ... | ... |\n",
			cta: '\n::callout[Passe a l\'action]{type="success"}\n',
			quotePro: '\n::quote[Conseil expert a mettre en avant]{author="Nom de l\'expert"}\n',
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

		if (nextContent.length === 0) {
			return ["calloutSuccess", "cta"].map((key) => ({
				key,
				title: QUICK_INSERT_SNIPPET_META[key].title,
				description: QUICK_INSERT_SNIPPET_META[key].description,
			}));
		}

		const anchor = selectionStart;
		const selectedText = nextContent.slice(selectionStart, selectionEnd).toLowerCase();
		const before = nextContent.slice(Math.max(0, anchor - 220), anchor).toLowerCase();
		const context = `${before}\n${selectedText}`;

		// Keep top suggestions deterministic and focused around author intent.
		const rulebook = [
			{ key: "faq", pattern: /(faq|questions? frequentes?|objection|question|reponse)/i },
			{ key: "comparisonTable", pattern: /(compar|versus|\bvs\b|tableau|benchmark|prix|tarif|offre|plan)/i },
			{ key: "cta", pattern: /(inscri|reserve|contact|demande|acheter|conversion|prochaine etape|action)/i },
			{ key: "quotePro", pattern: /(citation|temoignage|expert|avis client|retour d\Wexperience)/i },
			{ key: "calloutSuccess", pattern: /(important|a retenir|attention|astuce|conseil|point cle|best practice)/i },
		];

		const matches = rulebook.filter((rule) => rule.pattern.test(context)).map((rule) => rule.key);
		const unique = Array.from(new Set(matches));
		const limited = (unique.length > 0 ? unique : ["calloutSuccess", "cta"]).slice(0, 3);

		return limited.map((key) => ({
			key,
			title: QUICK_INSERT_SNIPPET_META[key].title,
			description: QUICK_INSERT_SNIPPET_META[key].description,
		}));
	}

	function insertMarkdownLink() {
		const ta = textareaRef.current;
		if (!ta) return;
		const { start, end } = resolveSelectionRange({ fallbackToSavedSelection: true });
		const selected = content.slice(start, end) || "texte";
		const markdownLink = `[${selected}](https://)`;
		setIsDirty(true);
		setContent(content.slice(0, start) + markdownLink + content.slice(end));
		setTimeout(() => {
			ta.focus();
			const urlStart = start + markdownLink.lastIndexOf("https://");
			ta.setSelectionRange(urlStart, urlStart + "https://".length);
			savedSelectionRef.current = { start: urlStart, end: urlStart + "https://".length };
		}, 0);
	}

	function generateSlugFromTitle() {
		const generated = slugify(title || "");
		if (!generated) {
			toast.error("Impossible de générer un slug avec ce titre");
			return;
		}
		setIsDirty(true);
		setSlug(generated);
		toast.success("Slug généré");
	}

	async function handleMediaUpload(kind, accept) {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = accept;
		input.onchange = async (e) => {
			const file = e.target.files?.[0];
			if (!file) return;

			toast.loading("Upload en cours...");
			const formData = new FormData();
			formData.set("file", file);
			formData.set("kind", kind);
			const result = await uploadArticleMedia(formData);
			toast.dismiss();

			if (result.error) {
				toast.error(result.error);
				return;
			}

			toast.success("Média uploadé");

			const directive =
				kind === "image"
					? `\n::image[${result.url}]{caption=""}\n`
					: kind === "audio"
						? `\n::audio[${result.url}]{caption=""}\n`
						: `\n::pdf[${result.url}]{title=""}\n`;
			insertAtCursor(directive);
		};
		input.click();
	}

	async function handlePasteImageFromClipboard() {
		if (!navigator?.clipboard?.read) {
			toast.error("Collage d'image non supporte par ce navigateur");
			return;
		}

		try {
			const clipboardItems = await navigator.clipboard.read();
			const imageItem = clipboardItems.find((item) => item.types.some((type) => type.startsWith("image/")));

			if (!imageItem) {
				toast.info("Aucune image detectee dans le presse-papiers");
				return;
			}

			const imageType = imageItem.types.find((type) => type.startsWith("image/"));
			const blob = await imageItem.getType(imageType);

			const extension = imageType.includes("png")
				? "png"
				: imageType.includes("jpeg") || imageType.includes("jpg")
					? "jpg"
					: imageType.includes("webp")
						? "webp"
						: "png";

			const file = new File([blob], `capture-${Date.now()}.${extension}`, { type: imageType });

			toast.loading("Import image depuis le presse-papiers...");
			const formData = new FormData();
			formData.set("file", file);
			formData.set("kind", "image");
			const result = await uploadArticleMedia(formData);
			toast.dismiss();

			if (result?.error) {
				toast.error(result.error);
				return;
			}

			insertAtCursor(`\n::image[${result.url}]{caption=""}\n`);
			toast.success("Image collee dans l'article");
		} catch {
			toast.error("Impossible d'acceder au presse-papiers image");
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);

		const formData = buildFormDataPayload();
		const result = isEdit ? await updateArticle(article.id, formData) : await createArticle(formData);

		if (result?.error) {
			toast.error(result.error);
			setLoading(false);
			return;
		}

		if (isEdit) {
			toast.success("Article mis à jour");
			router.refresh();
			setIsDirty(false);
		} else {
			window.localStorage.removeItem(NEW_ARTICLE_DRAFT_KEY);
			setHistoryPast([]);
			setHistoryFuture([]);
			setIsDirty(false);
		}

		setLoading(false);
	}

	function applyTemplate() {
		const template = ARTICLE_TEMPLATES[templateKey];
		if (!template) return;
		const shouldOverwrite = !isEdit || (!title && !content) || window.confirm("Appliquer ce template et remplacer le contenu actuel ?");
		if (!shouldOverwrite) return;

		setTitle(template.title);
		setExcerpt(template.excerpt);
		setContent(template.content);
		setRequiredTier(template.requiredTier);
		setSlug(slugify(template.title));
		setIsDirty(true);
		toast.success(`Template \"${template.label}\" applique`);
	}

	const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
	const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));
	const slugPreview = slugify(slug || title || "");
	const contentQuality = wordCount > 700 ? "Complet" : wordCount > 250 ? "Moyen" : "Court";
	const saveLabel = isEdit ? "Mettre à jour" : "Créer l'article";
	const titleSeoState = title.length >= 45 && title.length <= 65 ? "optimal" : title.length >= 30 && title.length <= 80 ? "ok" : "weak";
	const excerptSeoState = excerpt.length >= 120 && excerpt.length <= 160 ? "optimal" : excerpt.length >= 80 && excerpt.length <= 220 ? "ok" : "weak";
	const commandQueryHint = "Ctrl+K";

	function toggleRightPanelSection(sectionKey) {
		setRightPanelSections((prev) => ({
			...prev,
			[sectionKey]: !prev[sectionKey],
		}));
	}

	function syncSelectionState(event) {
		const ta = textareaRef.current;
		if (!ta || viewMode === "preview") {
			setHasTextSelection(false);
			setContextualQuickInsertSuggestions(getContextualQuickInserts(content));
			return;
		}

		const start = ta.selectionStart ?? 0;
		const end = ta.selectionEnd ?? start;
		const hasCurrentSelection = end > start;
		const isContextMenuEvent = event?.type === "contextmenu";

		if (hasCurrentSelection && !isContextMenuEvent) {
			savedSelectionRef.current = { start, end };
		} else if (!isContextMenuEvent) {
			savedSelectionRef.current = { start, end };
		}

		const useSavedSelection = isContextMenuEvent || !hasCurrentSelection;
		const effectiveStart = useSavedSelection ? savedSelectionRef.current.start : start;
		const effectiveEnd = useSavedSelection ? savedSelectionRef.current.end : end;
		const hasEffectiveSelection = effectiveEnd > effectiveStart;

		setHasTextSelection(hasEffectiveSelection);
		setContextualQuickInsertSuggestions(getContextualQuickInserts(content, effectiveStart, effectiveEnd));
	}

	function submitEditorForm() {
		const form = document.querySelector("form");
		if (form) form.requestSubmit();
	}

	function saveDraftNow() {
		if (!isEdit) {
			toast.info("Le brouillon sera cree au premier enregistrement");
			return;
		}
		submitEditorForm();
	}

	async function copyMarkdownToClipboard() {
		if (!navigator?.clipboard) {
			toast.error("Copie presse-papiers non disponible");
			return;
		}
		try {
			await navigator.clipboard.writeText(content);
			toast.success("Markdown copie");
		} catch {
			toast.error("Impossible de copier le markdown");
		}
	}

	useEffect(() => {
		function onGlobalKeyDown(event) {
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setIsCommandPaletteOpen(true);
				return;
			}

			if (event.key === "Escape" && isCommandPaletteOpen) {
				setIsCommandPaletteOpen(false);
			}
		}

		window.addEventListener("keydown", onGlobalKeyDown);
		return () => window.removeEventListener("keydown", onGlobalKeyDown);
	}, [isCommandPaletteOpen]);

	return (
		<div className={clsx("grid gap-6", isRightPanelOpen && !isFocusMode ? "xl:grid-cols-[1fr_320px]" : "xl:grid-cols-1")}>
			<form
				onSubmit={handleSubmit}
				className="space-y-6"
			>
				<ArticleFormMetadataSection
					title={title}
					onTitleChange={(e) => {
						setIsDirty(true);
						setTitle(e.target.value);
					}}
					slug={slug}
					onSlugChange={(e) => {
						setIsDirty(true);
						setSlug(e.target.value);
					}}
					slugPreview={slugPreview}
					onGenerateSlug={generateSlugFromTitle}
					excerpt={excerpt}
					onExcerptChange={(e) => {
						setIsDirty(true);
						setExcerpt(e.target.value);
					}}
					coverImage={coverImage}
					onCoverImageChange={(v) => {
						setIsDirty(true);
						setCoverImage(v);
					}}
				/>

				<ArticleFormEditorSection
					isFocusMode={isFocusMode}
					onToggleFocusMode={() => setIsFocusMode((v) => !v)}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					onUndo={handleUndo}
					onRedo={handleRedo}
					canUndo={historyPast.length > 0}
					canRedo={historyFuture.length > 0}
					onSaveDraft={saveDraftNow}
					onSubmitForm={submitEditorForm}
					onQuitEditor={() => router.push("/admin/articles")}
					onWrapBold={() => wrapSelection("**")}
					onWrapItalic={() => wrapSelection("*")}
					onWrapUnderline={() => wrapSelection("<u>", "</u>")}
					onInsertMarkdownLink={insertMarkdownLink}
					onMediaUpload={handleMediaUpload}
					onInsertYouTube={() => insertAtCursor("\n::video[https://youtube.com/watch?v=ID]\n")}
					onAddTable={() => addSnippet("table")}
					onAddChecklist={() => addSnippet("checklist")}
					onInsertCodeBlock={() => insertAtCursor("\n```md\nVotre code ici\n```\n")}
					onAddSeparator={() => addSnippet("separator")}
					onInsertH1={() => insertAtCursor("\n# Titre principal\n\n")}
					onInsertSubtitle={() => insertAtCursor("\n## Sous-titre\n\n")}
					onRemoveStyles={removeSelectionStyles}
					onInsertH2={() => insertAtCursor("\n## Sous-titre\n\n")}
					onInsertH3={() => insertAtCursor("\n### Sous-section\n\n")}
					onInsertBulletList={() => insertAtCursor("\n- Point 1\n- Point 2\n")}
					onInsertNumberedList={() => insertAtCursor("\n1. Etape 1\n2. Etape 2\n")}
					onInsertQuote={() => insertAtCursor('\n::quote[Citation]{author="Auteur"}\n')}
					onQuickInsertSnippet={quickInsertSnippet}
					contextualQuickInsertSuggestions={contextualQuickInsertSuggestions}
					onGenerateSlug={generateSlugFromTitle}
					onApplyTemplate={applyTemplate}
					onCopyMarkdown={copyMarkdownToClipboard}
					onShowStats={() => toast.message(`${wordCount} mots · ${readingMinutes} min de lecture`)}
					onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
					onPasteImageFromClipboard={handlePasteImageFromClipboard}
					showQuickToolbar={showQuickToolbar}
					onToggleQuickToolbar={() => setShowQuickToolbar((v) => !v)}
					isRightPanelOpen={isRightPanelOpen}
					onToggleRightPanel={() => setIsRightPanelOpen((v) => !v)}
					rightPanelSections={rightPanelSections}
					onToggleRightPanelSection={toggleRightPanelSection}
					commandQueryHint={commandQueryHint}
					hasTextSelection={hasTextSelection}
					onSyncSelectionState={syncSelectionState}
					textareaRef={textareaRef}
					content={content}
					onContentChange={(value) => {
						const ta = textareaRef.current;
						const start = ta?.selectionStart ?? value.length;
						const end = ta?.selectionEnd ?? start;
						setIsDirty(true);
						setContent(value);
						setContextualQuickInsertSuggestions(getContextualQuickInserts(value, start, end));
					}}
					onEditorKeyDown={handleEditorKeyDown}
					slashInput={slashInput}
					onSlashInputChange={setSlashInput}
					onApplySlashCommand={() => {
						if (!slashInput.trim()) return;
						const ok = applySlashCommand(slashInput.trim().split(/\s+/)[0]);
						if (!ok) toast.error("Commande slash inconnue");
					}}
					commandHint={commandHint}
					wordCount={wordCount}
					readingMinutes={readingMinutes}
					isCommandPaletteOpen={isCommandPaletteOpen}
					onCommandPaletteOpenChange={setIsCommandPaletteOpen}
				/>

				<ArticleFormPublicationSection
					requiredTier={requiredTier}
					onRequiredTierChange={(value) => {
						setIsDirty(true);
						setRequiredTier(value);
					}}
					allTags={allTags}
					selectedTagIds={selectedTagIds}
					onToggleTag={toggleTag}
					hierarchicalTagNames={hierarchicalTagNames}
					effectivePrimaryCategoryPath={effectivePrimaryCategoryPath}
					onPrimaryCategoryPathChange={(value) => {
						setIsDirty(true);
						setPrimaryCategoryPath(value);
					}}
				/>

				<div className="flex justify-end gap-3">
					<Button
						type="button"
						variant="secondary"
						onClick={saveDraftNow}
						disabled={loading || !isDirty}
					>
						<Sparkles className="mr-1 h-4 w-4" />
						Sauvegarder brouillon
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/admin/articles")}
						className="shadow-sm bg-white text-neutral-900 hover:bg-neutral-50 active:shadow-inner active:bg-neutral-200"
					>
						Annuler
					</Button>
					<Button
						type="submit"
						disabled={loading}
					>
						{loading ? "Enregistrement..." : saveLabel}
					</Button>
				</div>
			</form>

			<ArticleFormSidebarSection
				isRightPanelOpen={isRightPanelOpen}
				isFocusMode={isFocusMode}
				rightPanelSections={rightPanelSections}
				templateKey={templateKey}
				onTemplateKeyChange={setTemplateKey}
				onApplyTemplate={applyTemplate}
				title={title}
				titleSeoState={titleSeoState}
				excerpt={excerpt}
				excerptSeoState={excerptSeoState}
				autosaving={autosaving}
				wordCount={wordCount}
				readingMinutes={readingMinutes}
				contentQuality={contentQuality}
				lastSavedAt={lastSavedAt}
				slugPreview={slugPreview}
				content={content}
				selectedTagIds={selectedTagIds}
				coverImage={coverImage}
			/>
		</div>
	);
}
