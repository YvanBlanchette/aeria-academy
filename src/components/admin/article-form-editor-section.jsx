import clsx from "clsx";
import {
	Bold,
	Code2,
	Columns3,
	FileAudio,
	FileText,
	Eye,
	EyeOff,
	Focus,
	Heading2,
	Heading3,
	ImageIcon,
	Italic,
	Link2,
	List,
	ListOrdered,
	Minimize2,
	PanelTop,
	Quote,
	Redo2,
	ScanText,
	Sparkles,
	Underline,
	Undo2,
	Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { ArticleContent } from "@/components/articles/article-content";
import ButtonTooltip from "../ui/button-tooltip";

export function ArticleFormEditorSection({
	isFocusMode,
	onToggleFocusMode,
	viewMode,
	onViewModeChange,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
	onSaveDraft,
	onSubmitForm,
	onQuitEditor,
	onWrapBold,
	onWrapItalic,
	onWrapUnderline,
	onInsertMarkdownLink,
	onMediaUpload,
	onInsertYouTube,
	onAddTable,
	onAddChecklist,
	onInsertCodeBlock,
	onAddSeparator,
	onInsertSubtitle,
	onRemoveStyles,
	onInsertH1,
	onInsertH2,
	onInsertH3,
	onInsertBulletList,
	onInsertNumberedList,
	onInsertQuote,
	onQuickInsertSnippet,
	contextualQuickInsertSuggestions,
	onGenerateSlug,
	onApplyTemplate,
	onCopyMarkdown,
	onShowStats,
	onOpenCommandPalette,
	onPasteImageFromClipboard,
	showQuickToolbar,
	onToggleQuickToolbar,
	isRightPanelOpen,
	onToggleRightPanel,
	rightPanelSections,
	onToggleRightPanelSection,
	hasTextSelection,
	onSyncSelectionState,
	textareaRef,
	content,
	onContentChange,
	onEditorKeyDown,
	onCommandPaletteOpenChange,
	commandQueryHint,
	slashInput,
	onSlashInputChange,
	onApplySlashCommand,
	commandHint,
	wordCount,
	readingMinutes,
	isCommandPaletteOpen,
}) {
	function renderEditorContextMenu() {
		return (
			<ContextMenuContent
				className="w-72 rounded-xl border-border/80 bg-background/95 p-2 shadow-xl backdrop-blur"
				onOpenAutoFocus={(event) => {
					// Keep focus in the textarea so native text selection highlight remains visible.
					event.preventDefault();
				}}
			>
				<ContextMenuLabel className="pb-1 text-[11px] uppercase tracking-wide">Actions principales</ContextMenuLabel>
				<ContextMenuItem onSelect={onUndo}>
					<Undo2 className="h-4 w-4" />
					Annuler
					<ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem onSelect={onRedo}>
					<Redo2 className="h-4 w-4" />
					Retablir
					<ContextMenuShortcut>Ctrl+Y</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuSeparator />

				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<ScanText className="h-4 w-4" />
						Format
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-56">
						<ContextMenuItem onSelect={onWrapBold}>
							<Bold className="h-4 w-4" />
							Gras
							<ContextMenuShortcut>Ctrl+B</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={onWrapItalic}>
							<Italic className="h-4 w-4" />
							Italique
							<ContextMenuShortcut>Ctrl+I</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={onWrapUnderline}>
							<Underline className="h-4 w-4" />
							Souligne
							<ContextMenuShortcut>Ctrl+U</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={onInsertMarkdownLink}>
							<Link2 className="h-4 w-4" />
							Lien
							<ContextMenuShortcut>Ctrl+K</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem onSelect={onInsertH1}>Titre H1</ContextMenuItem>
						<ContextMenuItem onSelect={onInsertH2}>
							<Heading2 className="h-4 w-4" />
							Titre H2
						</ContextMenuItem>
						<ContextMenuItem onSelect={onInsertH3}>
							<Heading3 className="h-4 w-4" />
							Titre H3
						</ContextMenuItem>
						<ContextMenuItem onSelect={onInsertQuote}>
							<Quote className="h-4 w-4" />
							Citation
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				{Array.isArray(contextualQuickInsertSuggestions) && contextualQuickInsertSuggestions.length > 0 ? (
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<Sparkles className="h-4 w-4" />
							Suggestions contextuelles
						</ContextMenuSubTrigger>
						<ContextMenuSubContent className="w-72">
							{contextualQuickInsertSuggestions.map((suggestion) => (
								<ContextMenuItem
									key={suggestion.key}
									onSelect={() => onQuickInsertSnippet(suggestion.key)}
									className="flex flex-col items-start gap-0.5"
								>
									<span className="font-medium">{suggestion.title}</span>
									<span className="text-[11px] text-muted-foreground">{suggestion.description}</span>
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				) : null}

				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<List className="h-4 w-4" />
						Listes et blocs
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-56">
						<ContextMenuItem onSelect={onInsertBulletList}>
							<List className="h-4 w-4" />
							Liste a puces
						</ContextMenuItem>
						<ContextMenuItem onSelect={onInsertNumberedList}>
							<ListOrdered className="h-4 w-4" />
							Liste numerotee
						</ContextMenuItem>
						<ContextMenuItem onSelect={onAddChecklist}>Checklist</ContextMenuItem>
						<ContextMenuItem onSelect={onAddTable}>
							<Columns3 className="h-4 w-4" />
							Tableau
						</ContextMenuItem>
						<ContextMenuItem onSelect={onInsertCodeBlock}>
							<Code2 className="h-4 w-4" />
							Bloc de code
						</ContextMenuItem>
						<ContextMenuItem onSelect={onAddSeparator}>Separateur</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<PanelTop className="h-4 w-4" />
						Quick Insert
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-72">
						<ContextMenuItem
							onSelect={() => onQuickInsertSnippet("calloutSuccess")}
							className="flex flex-col items-start gap-0.5"
						>
							<span className="font-medium">Callout succès</span>
							<span className="text-[11px] text-muted-foreground">Encadré d&apos;action clair pour mettre un point en valeur.</span>
						</ContextMenuItem>
						<ContextMenuItem
							onSelect={() => onQuickInsertSnippet("faq")}
							className="flex flex-col items-start gap-0.5"
						>
							<span className="font-medium">FAQ rapide</span>
							<span className="text-[11px] text-muted-foreground">Structure question/réponse prête à compléter.</span>
						</ContextMenuItem>
						<ContextMenuItem
							onSelect={() => onQuickInsertSnippet("comparisonTable")}
							className="flex flex-col items-start gap-0.5"
						>
							<span className="font-medium">Tableau comparatif</span>
							<span className="text-[11px] text-muted-foreground">Comparaison fournisseur, prix et bénéfices.</span>
						</ContextMenuItem>
						<ContextMenuItem
							onSelect={() => onQuickInsertSnippet("cta")}
							className="flex flex-col items-start gap-0.5"
						>
							<span className="font-medium">Bloc CTA</span>
							<span className="text-[11px] text-muted-foreground">Appel à l&apos;action prêt à personnaliser.</span>
						</ContextMenuItem>
						<ContextMenuItem
							onSelect={() => onQuickInsertSnippet("quotePro")}
							className="flex flex-col items-start gap-0.5"
						>
							<span className="font-medium">Citation expert</span>
							<span className="text-[11px] text-muted-foreground">Bloc citation avec auteur pour crédibiliser le contenu.</span>
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<ImageIcon className="h-4 w-4" />
						Inserer media
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-56">
						<ContextMenuItem onSelect={() => onMediaUpload("image", "image/*")}>
							<ImageIcon className="h-4 w-4" />
							Image
						</ContextMenuItem>
						<ContextMenuItem onSelect={onPasteImageFromClipboard}>
							<ImageIcon className="h-4 w-4" />
							Coller image presse-papiers
							<ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => onMediaUpload("audio", "audio/*")}>
							<FileAudio className="h-4 w-4" />
							Audio
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => onMediaUpload("pdf", "application/pdf")}>
							<FileText className="h-4 w-4" />
							PDF
						</ContextMenuItem>
						<ContextMenuItem onSelect={onInsertYouTube}>
							<Video className="h-4 w-4" />
							Video YouTube
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				<ContextMenuSeparator />
				<ContextMenuItem onSelect={onOpenCommandPalette}>
					<PanelTop className="h-4 w-4" />
					Palette de commandes
					<ContextMenuShortcut>{commandQueryHint || "Ctrl+K"}</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem onSelect={onShowStats}>Statistiques du texte</ContextMenuItem>
			</ContextMenuContent>
		);
	}

	return (
		<>
			<Card className={clsx(isFocusMode && "fixed inset-4 z-50 overflow-auto bg-neutral-100 shadow-xl p-0")}>
				{/* <CardHeader>
					<div className="flex items-center justify-between px-4.5 pt-6 -mb-3">
						<div>
							<CardTitle className="text-2xl">Éditeur</CardTitle>
						</div>
					</div>
				</CardHeader> */}
				<CardContent className="relative space-y-4 pt-4 px-0">
					<div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-1 px-6 -mb-px">
						<div>
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 min-w-20 px-2 py-2 text-sm whitespace-nowrap rounded-b-none"
									>
										Fichier
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onSelect={onSaveDraft}>Sauvegarder brouillon</DropdownMenuItem>
									<DropdownMenuItem onSelect={onSubmitForm}>Enregistrer article</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onSelect={onQuitEditor}>Quitter l&apos;editeur</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{/*  ÉDITION */}
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 min-w-20 px-2 py-2 text-sm whitespace-nowrap rounded-b-none"
									>
										Edition
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onSelect={onUndo}>Annuler</DropdownMenuItem>
									<DropdownMenuItem onSelect={onRedo}>Retablir</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onSelect={onWrapBold}>Gras</DropdownMenuItem>
									<DropdownMenuItem onSelect={onWrapItalic}>Italique</DropdownMenuItem>
									<DropdownMenuItem onSelect={onWrapUnderline}>Sous-ligne</DropdownMenuItem>
									<DropdownMenuItem onSelect={onInsertMarkdownLink}>Lien</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{/*  INSERTION */}
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 min-w-20 px-2 py-2 text-sm whitespace-nowrap rounded-b-none"
									>
										Insertion
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onSelect={() => onMediaUpload("image", "image/*")}>Image</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => onMediaUpload("audio", "audio/*")}>Audio</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => onMediaUpload("pdf", "application/pdf")}>PDF</DropdownMenuItem>
									<DropdownMenuItem onSelect={onInsertYouTube}>Video YouTube</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onSelect={onAddTable}>Tableau</DropdownMenuItem>
									<DropdownMenuItem onSelect={onAddChecklist}>Checklist</DropdownMenuItem>
									<DropdownMenuItem onSelect={onInsertCodeBlock}>Bloc code</DropdownMenuItem>
									<DropdownMenuItem onSelect={onAddSeparator}>Separateur</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{/*  FORMAT */}
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 min-w-20 px-2 py-2 text-sm whitespace-nowrap rounded-b-none"
									>
										Format
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onSelect={onInsertH2}>Titre H2</DropdownMenuItem>
									<DropdownMenuItem onSelect={onInsertH3}>Titre H3</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onSelect={onInsertBulletList}>Liste a puces</DropdownMenuItem>
									<DropdownMenuItem onSelect={onInsertNumberedList}>Liste numerotee</DropdownMenuItem>
									<DropdownMenuItem onSelect={onInsertQuote}>Citation</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{/*  OUTILS */}
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 min-w-20 px-2 py-2 text-sm whitespace-nowrap rounded-b-none"
									>
										Outils
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onSelect={onGenerateSlug}>Generer slug depuis le titre</DropdownMenuItem>
									<DropdownMenuItem onSelect={onApplyTemplate}>Appliquer template courant</DropdownMenuItem>
									<DropdownMenuItem onSelect={onCopyMarkdown}>Copier markdown</DropdownMenuItem>
									<DropdownMenuItem onSelect={onOpenCommandPalette}>Palette de commandes</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onSelect={onShowStats}>Statistiques du texte</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{/*  AFFICHAGE */}
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 min-w-20 px-2 py-2 text-sm whitespace-nowrap rounded-b-none"
									>
										Affichage
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onSelect={() => onViewModeChange("editor")}>Mode Editeur</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => onViewModeChange("preview")}>Mode Apercu</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => onViewModeChange("split")}>Mode Split</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuCheckboxItem
										checked={isFocusMode}
										onCheckedChange={onToggleFocusMode}
									>
										Mode focus
									</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem onCheckedChange={onToggleQuickToolbar}>Afficher barre rapide</DropdownMenuCheckboxItem>
									<DropdownMenuSeparator />
									<DropdownMenuCheckboxItem
										checked={isRightPanelOpen}
										onCheckedChange={onToggleRightPanel}
									>
										Afficher panneau droit
									</DropdownMenuCheckboxItem>
									<DropdownMenuLabel>Sections panneau droit</DropdownMenuLabel>
									<DropdownMenuCheckboxItem
										checked={rightPanelSections.templates}
										onCheckedChange={() => onToggleRightPanelSection("templates")}
									>
										Templates
									</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem
										checked={rightPanelSections.seo}
										onCheckedChange={() => onToggleRightPanelSection("seo")}
									>
										SEO
									</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem
										checked={rightPanelSections.quality}
										onCheckedChange={() => onToggleRightPanelSection("quality")}
									>
										Qualite
									</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem
										checked={rightPanelSections.checklist}
										onCheckedChange={() => onToggleRightPanelSection("checklist")}
									>
										Checklist
									</DropdownMenuCheckboxItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{showQuickToolbar ? (
						// QUICK TOOLBAR
						<div className="flex flex-wrap justify-between items-center bg-muted py-2 px-8 mt-0 border-b-2 border-border">
							<div className="flex justify-start items-center gap-0.5">
								{/* STYLES */}
								<DropdownMenu modal={false}>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="bg-muted px-3 hover:bg-muted/80 rounded-l-full"
										>
											Styles
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start">
										<DropdownMenuItem onSelect={onRemoveStyles}>Texte</DropdownMenuItem>
										<DropdownMenuItem onSelect={onInsertH1}>Titre</DropdownMenuItem>
										<DropdownMenuItem onSelect={onInsertSubtitle}>Sous-titre</DropdownMenuItem>
										<DropdownMenuItem onSelect={onInsertH2}>Titre 2</DropdownMenuItem>
										<DropdownMenuItem onSelect={onInsertH3}>Titre 3</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								{/* BOLD */}
								<ButtonTooltip
									type="button"
									variant="ghost"
									size="sm"
									onClick={onWrapBold}
									className="bg-muted hover:muted/80 rounded-none"
									label="Gras Ctrl+B"
									side="bottom"
								>
									<Bold className="h-4 w-4" />
								</ButtonTooltip>

								{/* ITALIC */}
								<ButtonTooltip
									type="button"
									variant="ghost"
									size="sm"
									onClick={onWrapItalic}
									className="bg-muted hover:muted/80 rounded-none"
									label="Italique Ctrl+I"
									side="bottom"
								>
									<Italic className="h-4 w-4" />
								</ButtonTooltip>

								{/* UNDERLINE */}
								<ButtonTooltip
									type="button"
									variant="ghost"
									size="sm"
									onClick={onWrapUnderline}
									className="bg-muted hover:muted/80 rounded-none"
									label="Souligné Ctrl+U"
									side="bottom"
								>
									<Underline className="h-4 w-4" />
								</ButtonTooltip>

								{/* LINK */}
								<ButtonTooltip
									type="button"
									variant="ghost"
									size="sm"
									onClick={onInsertMarkdownLink}
									className="bg-muted hover:muted/80 rounded-none"
									label="Lien Ctrl+K"
									side="bottom"
								>
									<Link2 className="h-4 w-4" />
								</ButtonTooltip>

								{/* BULLET LIST */}
								<ButtonTooltip
									type="button"
									variant="ghost"
									size="sm"
									onClick={onInsertBulletList}
									className="bg-muted hover:muted/80 rounded-none"
									label="Liste à puces"
									side="bottom"
								>
									<List className="h-4 w-4" />
								</ButtonTooltip>

								{/* NUMBERED LIST */}
								<ButtonTooltip
									type="button"
									variant="ghost"
									size="sm"
									onClick={onInsertNumberedList}
									className="bg-muted hover:muted/80 rounded-r-full"
									label="Liste numerotée"
									side="bottom"
								>
									<ListOrdered className="h-4 w-4" />
								</ButtonTooltip>
							</div>

							<div className="flex justify-end items-center gap-0.5">
								{/* UNDO */}
								<ButtonTooltip
									type="button"
									variant="ghost"
									size="sm"
									onClick={onUndo}
									disabled={!canUndo}
									className="bg-muted hover:muted/80 rounded-l-full"
									label="Undo Ctrl+Z"
									side="bottom"
								>
									<Undo2 className="mr-1 h-4 w-4" />
								</ButtonTooltip>

								{/* REDO */}
								<ButtonTooltip
									type="button"
									variant="ghost"
									size="sm"
									onClick={onRedo}
									disabled={!canRedo}
									className="bg-muted hover:muted/80 rounded-r-full"
									label="Redo Ctrl+Y"
									side="bottom"
								>
									<Redo2 className="mr-1 h-4 w-4" />
								</ButtonTooltip>
							</div>
						</div>
					) : null}

					{/* PREVIEW */}
					{viewMode === "preview" ? (
						<div className="min-h-100 rounded-md border p-6 bg-white">
							{content ? <ArticleContent content={content} /> : <p className="text-muted-foreground">Aperçu vide. Écris du contenu pour le voir ici.</p>}
						</div>
					) : viewMode === "split" ? (
						<div className="grid gap-3 lg:grid-cols-2">
							<ContextMenu>
								<ContextMenuTrigger className="block">
									<div>
										<Textarea
											ref={textareaRef}
											value={content}
											onChange={(e) => onContentChange(e.target.value)}
											placeholder="Commence a ecrire ton article en markdown..."
											rows={20}
											className="font-mono text-sm bg-white px-12 rounded-none py-6 border-none focus-within:ring-0"
											onKeyDown={onEditorKeyDown}
											onSelect={onSyncSelectionState}
											onKeyUp={onSyncSelectionState}
											onMouseUp={onSyncSelectionState}
											onContextMenu={onSyncSelectionState}
											required
										/>
									</div>
								</ContextMenuTrigger>
								{renderEditorContextMenu()}
							</ContextMenu>
							<div className="min-h-100 rounded-md border p-6 bg-white overflow-auto">
								{content ? <ArticleContent content={content} /> : <p className="text-muted-foreground">Aperçu vide. Écris du contenu pour le voir ici.</p>}
							</div>
						</div>
					) : (
						<ContextMenu>
							<ContextMenuTrigger className="block">
								<div>
									<Textarea
										ref={textareaRef}
										value={content}
										onChange={(e) => onContentChange(e.target.value)}
										placeholder="Commence a ecrire ton article en markdown..."
										rows={20}
										className="font-mono text-sm bg-white px-12 rounded-none py-6 border-none focus:ring-0"
										onKeyDown={onEditorKeyDown}
										onSelect={onSyncSelectionState}
										onKeyUp={onSyncSelectionState}
										onMouseUp={onSyncSelectionState}
										onContextMenu={onSyncSelectionState}
										required
									/>
								</div>
							</ContextMenuTrigger>
							{renderEditorContextMenu()}
						</ContextMenu>
					)}

					<div className="mx-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
						<p>Astuce: clic droit dans l&apos;editeur pour ouvrir les actions rapides.</p>
						<div className="inline-flex items-center gap-2">
							<span className="rounded bg-background px-1.5 py-0.5 font-mono">{commandQueryHint || "Ctrl+K"}</span>
							<span>Palette</span>
							<span>•</span>
							<span>{wordCount || 0} mots</span>
							<span>•</span>
							<span>{readingMinutes || 1} min</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<CommandDialog
				open={isCommandPaletteOpen}
				onOpenChange={onCommandPaletteOpenChange}
			>
				<Command>
					<CommandInput
						placeholder="Rechercher une action..."
						value={slashInput || ""}
						onValueChange={onSlashInputChange}
					/>
					<CommandList>
						<CommandEmpty>Aucune commande.</CommandEmpty>
						<CommandGroup heading="Edition">
							<CommandItem onSelect={onUndo}>
								<Undo2 className="h-4 w-4" /> Annuler
								<CommandShortcut>Ctrl+Z</CommandShortcut>
							</CommandItem>
							<CommandItem onSelect={onRedo}>
								<Redo2 className="h-4 w-4" /> Retablir
								<CommandShortcut>Ctrl+Y</CommandShortcut>
							</CommandItem>
							<CommandItem onSelect={onWrapBold}>
								<Bold className="h-4 w-4" /> Gras
							</CommandItem>
							<CommandItem onSelect={onWrapItalic}>
								<Italic className="h-4 w-4" /> Italique
							</CommandItem>
						</CommandGroup>
						<CommandGroup heading="Insertion">
							<CommandItem onSelect={() => onMediaUpload("image", "image/*")}>
								<ImageIcon className="h-4 w-4" /> Inserer image
							</CommandItem>
							<CommandItem onSelect={() => onMediaUpload("pdf", "application/pdf")}>
								<FileText className="h-4 w-4" /> Inserer PDF
							</CommandItem>
							<CommandItem onSelect={onInsertYouTube}>
								<Video className="h-4 w-4" /> Inserer video YouTube
							</CommandItem>
							<CommandItem onSelect={onInsertCodeBlock}>
								<Code2 className="h-4 w-4" /> Inserer bloc code
							</CommandItem>
						</CommandGroup>
						<CommandGroup heading="Commandes slash">
							<CommandItem onSelect={onApplySlashCommand}>Executer la commande slash saisie</CommandItem>
							{commandHint ? <CommandItem disabled>{commandHint}</CommandItem> : null}
						</CommandGroup>
					</CommandList>
				</Command>
			</CommandDialog>
		</>
	);
}
