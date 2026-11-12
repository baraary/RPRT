import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Modality, MedicalShortcut, PatientInfo, ReportStudy, MedicalTemplate } from '../types';
import {
  Sparkles,
  Zap,
  CheckCircle,
  FileText,
  Wand2,
  GitCompare,
  ShieldCheck,
  Plus,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  SpellCheck,
  Check,
  X,
  Hash,
  SlidersHorizontal,
  Pin,
  BookmarkPlus,
} from 'lucide-react';
import { AiService } from '../services/aiService';
import {
  highlightRadiologyIssuesInHtml,
  detectRadiologyIssuesInPlainText,
  stripSpellHighlights,
  expandShortcutInContentEditable,
  expandShortcutInInput,
  SpellIssueItem,
  PRESET_RADIOLOGY_SLOTS,
  createSlotHtml,
  normalizeAndExtractSlots,
  autoWrapNumbersAsSlotsInHtml,
} from '../services/typistUtils';

interface RichMedicalEditorProps {
  studies: ReportStudy[];
  onUpdateStudy: (studyId: string, updates: Partial<ReportStudy>) => void;
  onAddStudy: (modality?: Modality) => void;
  onRemoveStudy: (studyId: string) => void;
  patientInfo: PatientInfo;
  shortcuts: MedicalShortcut[];
  smartSuggestionsEnabled: boolean;
  numberSlotsEnabled?: boolean;
  activeDirection: 'rtl' | 'ltr';
  onRegisterActiveEditorRef?: (el: HTMLDivElement | null) => void;
  isOnline: boolean;
  onOpenTemplates: (targetStudyId: string) => void;
  onOpenShortcuts: () => void;
  headingFont?: string;
  headingFontSize?: string;
  defaultFont?: string;
  defaultFontSize?: number;
  onShowToast?: (msg: string) => void;
  editorZoom?: number;
  templates?: MedicalTemplate[];
  onApplyPinnedTemplate?: (template: MedicalTemplate, targetStudyId: string) => void;
  onTogglePinTemplate?: (templateId: string) => void;
  onStartQuickSaveAsTemplate?: (studyId: string) => void;
}

export const RichMedicalEditor: React.FC<RichMedicalEditorProps> = ({
  studies,
  onUpdateStudy,
  onAddStudy,
  onRemoveStudy,
  patientInfo,
  shortcuts,
  smartSuggestionsEnabled,
  numberSlotsEnabled = false,
  activeDirection,
  onRegisterActiveEditorRef,
  isOnline,
  onOpenTemplates,
  onOpenShortcuts,
  headingFont = 'Vazirmatn',
  headingFontSize = '16px',
  defaultFont = 'Vazirmatn',
  defaultFontSize = 14,
  onShowToast,
  editorZoom = 100,
  templates = [],
  onApplyPinnedTemplate,
  onTogglePinTemplate,
  onStartQuickSaveAsTemplate,
}) => {
  const [activeStudyId, setActiveStudyId] = useState<string>(studies[0]?.id || '');
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
  const [ghostSuggestion, setGhostSuggestion] = useState<string>('');
  const [generatingImpressionId, setGeneratingImpressionId] = useState<string | null>(null);
  const [quickMacroFilter, setQuickMacroFilter] = useState<'all' | 'normal' | 'pathology'>('all');
  const [expandedMoreInfo, setExpandedMoreInfo] = useState<Record<string, boolean>>({});

  // Live matched shortcut hint when typing `.xyz`
  const [pendingShortcutMatch, setPendingShortcutMatch] = useState<MedicalShortcut | null>(null);

  // Interactive Spell & Half-Space Highlight State
  const [detectedIssues, setDetectedIssues] = useState<SpellIssueItem[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<SpellIssueItem | null>(null);

  // Smart Number Slot Menu & Active Slot State
  const [showSlotInsertMenu, setShowSlotInsertMenu] = useState(false);
  const [customSlotLabel, setCustomSlotLabel] = useState('');
  const [customSlotValue, setCustomSlotValue] = useState('۱۰۰');
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const slotInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleMoreInfo = (studyId: string) => {
    setExpandedMoreInfo((prev) => ({ ...prev, [studyId]: !prev[studyId] }));
  };

  // Ref map for findings contentEditable elements
  const findingsRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Ref map for title textarea elements
  const titleRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Ensure activeStudyId points to an existing study
  useEffect(() => {
    if (!studies.some((s) => s.id === activeStudyId) && studies.length > 0) {
      setActiveStudyId(studies[0].id);
    }
  }, [studies, activeStudyId]);

  // Register active editor ref for toolbar execCommands
  useEffect(() => {
    const el = findingsRefs.current[activeStudyId] || null;
    if (onRegisterActiveEditorRef) {
      onRegisterActiveEditorRef(el);
    }
  }, [activeStudyId, onRegisterActiveEditorRef]);

  // Sync findings content safely without losing caret
  useEffect(() => {
    studies.forEach((study) => {
      const el = findingsRefs.current[study.id];
      if (el && el.innerHTML !== study.findingsHtml) {
        if (document.activeElement !== el) {
          el.innerHTML = study.findingsHtml;
        }
      }
    });
  }, [studies]);

  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger smart suggestions on typing in active study (instant offline + debounced online AI)
  const updateSuggestions = useCallback(
    (text: string, currentStudy: ReportStudy) => {
      if (!smartSuggestionsEnabled) {
        setActiveSuggestions([]);
        setGhostSuggestion('');
        return;
      }

      // 1. Immediate 0ms offline suggestions so typist never waits
      const instant = AiService.getInstantOfflineSuggestions(text, currentStudy.modality);
      setActiveSuggestions(instant);
      setGhostSuggestion(instant[0] || '');

      // 2. Debounce online AI enhancement to avoid rate limits (429) on fast typing
      if (suggestDebounceRef.current) {
        clearTimeout(suggestDebounceRef.current);
      }

      if (isOnline && text.trim().length > 12) {
        suggestDebounceRef.current = setTimeout(async () => {
          const res = await AiService.getNextSentenceSuggestions(
            text,
            currentStudy.modality,
            currentStudy.titleAndTechnique || 'یافته‌ها',
            isOnline
          );
          if (res.suggestions && res.suggestions.length > 0) {
            setActiveSuggestions(res.suggestions);
            setGhostSuggestion(res.suggestions[0]);
          }
        }, 2000);
      }
    },
    [smartSuggestionsEnabled, isOnline]
  );

  // Insert text at the current cursor in the active findings editor
  const insertSuggestionAtCursor = useCallback(
    (suggestionText: string, studyId: string) => {
      const el = findingsRefs.current[studyId];
      if (!el) return;
      el.focus();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(suggestionText);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        el.innerHTML += ` ${suggestionText}`;
      }

      const updated = el.innerHTML;
      onUpdateStudy(studyId, { findingsHtml: updated });
      setGhostSuggestion('');
    },
    [onUpdateStudy]
  );

  /**
   * FEATURE 4 (UPDATED): Scan and Highlight Spelling & Half-Space Issues (Alt + C)
   * Highlights issues in the text first; when the typist clicks/selects a highlighted item, it suggests the replacement!
   */
  const handleHighlightSpellIssues = useCallback(() => {
    const allIssues: SpellIssueItem[] = [];

    studies.forEach((study) => {
      // 1. Check Title plain text
      const titleIssues = detectRadiologyIssuesInPlainText(study.titleAndTechnique, study.id);
      allIssues.push(...titleIssues);

      // 2. Check & highlight Findings HTML
      const currentHtml = findingsRefs.current[study.id]?.innerHTML || study.findingsHtml;
      const { highlightedHtml, issues: findingsIssues } = highlightRadiologyIssuesInHtml(
        currentHtml,
        study.id
      );
      allIssues.push(...findingsIssues);

      const el = findingsRefs.current[study.id];
      if (el && el.innerHTML !== highlightedHtml) {
        el.innerHTML = highlightedHtml;
      }
      onUpdateStudy(study.id, { findingsHtml: highlightedHtml });
    });

    setDetectedIssues(allIssues);
    if (allIssues.length > 0) {
      setSelectedIssue(allIssues[0]);
      if (onShowToast) {
        onShowToast(
          `🔍 ${allIssues.length} مورد املایی/نیم‌فاصله هایلایت شد. روی هر مورد کلیک کنید تا پیشنهاد جایگزین نمایش داده شود.`
        );
      }
    } else {
      setSelectedIssue(null);
      if (onShowToast) {
        onShowToast('✓ هیچ خطای املایی یا نیم‌فاصله‌ای در گزارش یافت نشد.');
      }
    }
  }, [studies, onUpdateStudy, onShowToast]);

  // Accept a single highlighted spell/half-space suggestion
  const handleAcceptIssueSuggestion = (issue: SpellIssueItem) => {
    const study = studies.find((s) => s.id === issue.studyId);
    if (!study) return;

    if (issue.field === 'title') {
      const updatedTitle = study.titleAndTechnique.replace(issue.original, issue.suggestion);
      onUpdateStudy(study.id, { titleAndTechnique: updatedTitle });
    } else {
      const el = findingsRefs.current[study.id];
      if (el) {
        const markEl = el.querySelector(`mark[data-spell-id="${issue.id}"]`);
        if (markEl) {
          const textNode = document.createTextNode(issue.suggestion);
          markEl.replaceWith(textNode);
        } else {
          el.innerHTML = el.innerHTML.replace(issue.original, issue.suggestion);
        }
        onUpdateStudy(study.id, { findingsHtml: el.innerHTML });
      }
    }

    const remaining = detectedIssues.filter((i) => i.id !== issue.id);
    setDetectedIssues(remaining);
    setSelectedIssue(remaining[0] || null);

    if (onShowToast) {
      onShowToast(`✓ «${issue.original}» با «${issue.suggestion}» جایگزین شد.`);
    }
  };

  // Ignore/dismiss a single highlighted issue (remove highlight, keep original text)
  const handleDismissIssue = (issue: SpellIssueItem) => {
    const study = studies.find((s) => s.id === issue.studyId);
    if (study && issue.field === 'findings') {
      const el = findingsRefs.current[study.id];
      if (el) {
        const markEl = el.querySelector(`mark[data-spell-id="${issue.id}"]`);
        if (markEl) {
          const textNode = document.createTextNode(issue.original);
          markEl.replaceWith(textNode);
          onUpdateStudy(study.id, { findingsHtml: el.innerHTML });
        }
      }
    }

    const remaining = detectedIssues.filter((i) => i.id !== issue.id);
    setDetectedIssues(remaining);
    setSelectedIssue(remaining[0] || null);
  };

  // Clear all spell highlights without changing text
  const handleClearAllHighlights = () => {
    studies.forEach((study) => {
      const el = findingsRefs.current[study.id];
      const cleaned = stripSpellHighlights(el?.innerHTML || study.findingsHtml);
      if (el) {
        el.innerHTML = cleaned;
      }
      onUpdateStudy(study.id, { findingsHtml: cleaned });
    });
    setDetectedIssues([]);
    setSelectedIssue(null);
  };

  // Accept all highlighted suggestions at once
  const handleAcceptAllIssues = () => {
    studies.forEach((study) => {
      let updatedTitle = study.titleAndTechnique;
      const titleIssuesForStudy = detectedIssues.filter(
        (i) => i.studyId === study.id && i.field === 'title'
      );
      titleIssuesForStudy.forEach((iss) => {
        updatedTitle = updatedTitle.replace(iss.original, iss.suggestion);
      });

      const el = findingsRefs.current[study.id];
      if (el) {
        const marks = el.querySelectorAll('mark[data-spell-issue="true"]');
        marks.forEach((m) => {
          const sug = m.getAttribute('data-suggestion') || m.textContent || '';
          m.replaceWith(document.createTextNode(sug));
        });
        onUpdateStudy(study.id, {
          titleAndTechnique: updatedTitle,
          findingsHtml: el.innerHTML,
        });
      }
    });

    const count = detectedIssues.length;
    setDetectedIssues([]);
    setSelectedIssue(null);
    if (onShowToast) {
      onShowToast(`✓ تمامی ${count} مورد هایلایت‌شده اصلاح گردید.`);
    }
  };

  // Global keyboard shortcut: Alt + C -> Highlight Spell & Half-Space Issues
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'ز')) {
        e.preventDefault();
        handleHighlightSpellIssues();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleHighlightSpellIssues]);

  // Insert a Smart Number Slot at the cursor in the active study
  const handleInsertSlotAtCursor = (label: string, defaultValue: string, unit = '') => {
    const studyId = activeStudyId || studies[0]?.id;
    if (!studyId) return;
    const el = findingsRefs.current[studyId];
    const slotId = `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const slotHtml = createSlotHtml(label, defaultValue, slotId) + (unit ? ` ${unit} ` : ' ');

    if (el) {
      el.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
        document.execCommand('insertHTML', false, slotHtml);
      } else {
        el.innerHTML += ` ${slotHtml}`;
      }
      onUpdateStudy(studyId, { findingsHtml: el.innerHTML });
    }

    setShowSlotInsertMenu(false);
    setActiveSlotId(slotId);
    setTimeout(() => {
      const inp = slotInputRefs.current[slotId];
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 60);

    if (onShowToast) {
      onShowToast(`فیلد جایگذاری «${label}» درج شد. می‌توانید عدد را در کادر بالای گزارش تایپ کنید.`);
    }
  };

  // Convert all numbers/dimensions in a study into protected fillable slots
  const handleAutoWrapStudyNumbers = (study: ReportStudy) => {
    const currentHtml = findingsRefs.current[study.id]?.innerHTML || study.findingsHtml;
    const { updatedHtml, count } = autoWrapNumbersAsSlotsInHtml(currentHtml);
    if (count > 0) {
      const el = findingsRefs.current[study.id];
      if (el) {
        el.innerHTML = updatedHtml;
      }
      onUpdateStudy(study.id, { findingsHtml: updatedHtml });
      if (onShowToast) {
        onShowToast(`⚡ ${count} عدد و اندازه در متن به فیلد جایگذاری امن تبدیل شد.`);
      }
    } else if (onShowToast) {
      onShowToast('تمامی اعداد این گزارش از قبل دارای فیلد جایگذاری هستند.');
    }
  };

  // Update a specific slot's value in-place without disturbing the rest of the HTML
  const handleUpdateSlotValue = (study: ReportStudy, slotId: string, newValue: string) => {
    const el = findingsRefs.current[study.id];
    if (el) {
      const slotSpan = el.querySelector(`span[data-slot-id="${slotId}"]`);
      if (slotSpan) {
        slotSpan.textContent = newValue || '---';
        onUpdateStudy(study.id, { findingsHtml: el.innerHTML });
        return;
      }
    }
    // Fallback regex update on HTML string
    const escapedId = slotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(
      `(<span\\b[^>]*data-slot-id="${escapedId}"[^>]*>)[\\s\\S]*?(<\\/span>)`,
      'i'
    );
    const updatedHtml = study.findingsHtml.replace(reg, `$1${newValue || '---'}$2`);
    if (el) {
      el.innerHTML = updatedHtml;
    }
    onUpdateStudy(study.id, { findingsHtml: updatedHtml });
  };

  // Detect if user clicked on a highlighted <mark data-spell-issue="true"> or a <span data-slot="true"> inside the editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>, studyId: string) => {
    setActiveStudyId(studyId);
    const target = e.target as HTMLElement;

    // 1. Check if user clicked on a Smart Number Slot (<span data-slot="true">) when enabled
    if (numberSlotsEnabled) {
      const slotEl = target.closest('span[data-slot="true"]') as HTMLElement | null;
      if (slotEl) {
        const slotId = slotEl.getAttribute('data-slot-id') || '';
        document.querySelectorAll('span.active-rad-slot').forEach((s) => s.classList.remove('active-rad-slot'));
        slotEl.classList.add('active-rad-slot');
        setActiveSlotId(slotId);
        const inp = slotInputRefs.current[slotId];
        if (inp) {
          inp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          inp.focus();
          inp.select();
        }
        return;
      }
    }

    // 2. Check if user clicked on a Spell Issue Highlight (<mark data-spell-issue="true">)
    const markEl = target.closest('mark[data-spell-issue="true"]') as HTMLElement | null;
    if (markEl) {
      const spellId = markEl.getAttribute('data-spell-id') || '';
      const original = markEl.getAttribute('data-original') || markEl.textContent || '';
      const suggestion = markEl.getAttribute('data-suggestion') || '';
      const ruleLabel = markEl.getAttribute('data-label') || 'پیشنهاد اصلاح املا و نیم‌فاصله';

      // Highlight active mark visually
      document.querySelectorAll('mark.active-spell-issue').forEach((m) => m.classList.remove('active-spell-issue'));
      markEl.classList.add('active-spell-issue');

      const found = detectedIssues.find((i) => i.id === spellId) || {
        id: spellId,
        studyId,
        field: 'findings',
        original,
        suggestion,
        ruleLabel,
      };
      setSelectedIssue(found);
    }
  };

  // Detect if user is typing a shortcut trigger like `.abd` or `.nl` right before the cursor
  const detectPendingShortcut = (el: HTMLDivElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setPendingShortcutMatch(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const textBefore = node.textContent.slice(0, range.startOffset);
      const match = textBefore.match(/(\.[a-zA-Z0-9_]+)$/);
      if (match) {
        const typedTrigger = match[1].toLowerCase();
        const found = shortcuts.find(
          (s) => s.trigger.toLowerCase() === typedTrigger || s.trigger.toLowerCase().startsWith(typedTrigger)
        );
        setPendingShortcutMatch(found || null);
        return;
      }
    }
    setPendingShortcutMatch(null);
  };

  // Handle findings keydown:
  // 1. Space -> Instant Auto-Text Expander for `.abd`, `.nl`, `.gb`, etc. (preserving caret!)
  // 2. Tab -> Expand shortcut if matched, or accept AI ghost suggestion
  const handleFindingsKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    study: ReportStudy
  ) => {
    const el = findingsRefs.current[study.id];
    if (!el) return;

    if (e.key === ' ' || e.key === 'Tab' || e.key === 'Enter') {
      const result = expandShortcutInContentEditable(el, shortcuts);
      if (result.expanded) {
        e.preventDefault();
        setPendingShortcutMatch(null);
        onUpdateStudy(study.id, { findingsHtml: el.innerHTML });
        if (onShowToast && result.trigger) {
          onShowToast(`⚡ شورتکات «${result.trigger}» (${result.label}) جایگزین شد.`);
        }
        return;
      }
    }

    if (e.key === 'Tab' && ghostSuggestion) {
      e.preventDefault();
      insertSuggestionAtCursor(` ${ghostSuggestion} `, study.id);
      return;
    }
  };

  // Handle Title & Technique Textarea KeyDown (Supports `.abd` + Space in Title box too!)
  const handleTitleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    study: ReportStudy
  ) => {
    if (e.key === ' ' || e.key === 'Tab') {
      const el = e.currentTarget;
      const res = expandShortcutInInput(el, shortcuts);
      if (res.expanded) {
        e.preventDefault();
        onUpdateStudy(study.id, { titleAndTechnique: res.newValue });
        setTimeout(() => {
          el.setSelectionRange(res.newCursorPos, res.newCursorPos);
        }, 0);
        if (onShowToast && res.trigger) {
          onShowToast(`⚡ شورتکات «${res.trigger}» در عنوان جایگزین شد.`);
        }
      }
    }
  };

  const handleFindingsInput = (study: ReportStudy) => {
    const el = findingsRefs.current[study.id];
    if (!el) return;

    detectPendingShortcut(el);

    const html = el.innerHTML;
    onUpdateStudy(study.id, { findingsHtml: html });

    const plainText = el.innerText || '';
    updateSuggestions(plainText, study);
  };

  const insertShortcut = (shortcut: MedicalShortcut) => {
    insertSuggestionAtCursor(`${shortcut.expansion} `, activeStudyId);
  };

  const handleGenerateImpression = async (study: ReportStudy) => {
    setGeneratingImpressionId(study.id);
    try {
      const generatedHtml = await AiService.generateImpressionFromFindings(
        study.modality,
        study.findingsHtml,
        patientInfo
      );
      onUpdateStudy(study.id, {
        showImpression: true,
        impressionHtml: generatedHtml,
      });
    } finally {
      setGeneratingImpressionId(null);
    }
  };

  const activeStudy = studies.find((s) => s.id === activeStudyId) || studies[0];
  const currentModality: Modality = activeStudy?.modality || 'sonography';

  // Pinned templates filtered ONLY for the currently selected modality
  const pinnedTemplates = templates.filter(
    (t) => t.isPinned && t.modality === currentModality
  );

  // Global keyboard shortcuts F1..F8 for Pinned Templates of the current modality
  useEffect(() => {
    const handlePinnedKeyDown = (e: KeyboardEvent) => {
      if (/^F[1-8]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const idx = parseInt(e.key.slice(1), 10) - 1;
        const targetPinned = pinnedTemplates[idx];
        if (targetPinned && onApplyPinnedTemplate) {
          e.preventDefault();
          onApplyPinnedTemplate(targetPinned, activeStudyId || studies[0]?.id || '');
        }
      }
    };
    window.addEventListener('keydown', handlePinnedKeyDown);
    return () => window.removeEventListener('keydown', handlePinnedKeyDown);
  }, [pinnedTemplates, onApplyPinnedTemplate, activeStudyId, studies]);

  const filteredShortcuts = shortcuts.filter((sc) => {
    const matchesModality = !sc.modality || sc.modality === 'all' || sc.modality === activeStudy?.modality;
    const matchesCat = quickMacroFilter === 'all' || sc.category === quickMacroFilter;
    return matchesModality && matchesCat;
  });

  const modalityNames: Record<Modality, string> = {
    sonography: 'سونوگرافی',
    mri: 'ام‌آر‌آی',
    ct: 'سی‌تی‌اسکن',
  };

  const modalityThemes: Record<
    Modality,
    {
      primaryBtn: string;
      secondaryBtn: string;
      pinStripBg: string;
      pinLabel: string;
      pinChip: string;
      pinDot: string;
      studyHeaderBg: string;
      studyBadge: string;
      activeCardRing: string;
    }
  > = {
    sonography: {
      primaryBtn: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs shadow-sky-600/20',
      secondaryBtn: 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200 hover:border-sky-300',
      pinStripBg: 'bg-sky-50/85 border-sky-200/90',
      pinLabel: 'text-sky-900',
      pinChip: 'bg-white hover:bg-sky-600 text-slate-700 hover:text-white border-sky-200 hover:border-sky-600',
      pinDot: 'bg-sky-500 group-hover:bg-white',
      studyHeaderBg: 'bg-gradient-to-l from-slate-900 via-slate-900 to-sky-950 border-b border-sky-900/50',
      studyBadge: 'bg-sky-500 text-white',
      activeCardRing: 'border-sky-500 ring-2 ring-sky-500/15',
    },
    mri: {
      primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs shadow-indigo-600/20',
      secondaryBtn: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200 hover:border-indigo-300',
      pinStripBg: 'bg-indigo-50/85 border-indigo-200/90',
      pinLabel: 'text-indigo-900',
      pinChip: 'bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border-indigo-200 hover:border-indigo-600',
      pinDot: 'bg-indigo-500 group-hover:bg-white',
      studyHeaderBg: 'bg-gradient-to-l from-slate-900 via-slate-900 to-indigo-950 border-b border-indigo-900/50',
      studyBadge: 'bg-indigo-500 text-white',
      activeCardRing: 'border-indigo-500 ring-2 ring-indigo-500/15',
    },
    ct: {
      primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs shadow-emerald-600/20',
      secondaryBtn: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200 hover:border-emerald-300',
      pinStripBg: 'bg-emerald-50/85 border-emerald-200/90',
      pinLabel: 'text-emerald-900',
      pinChip: 'bg-white hover:bg-emerald-600 text-slate-700 hover:text-white border-emerald-200 hover:border-emerald-600',
      pinDot: 'bg-emerald-500 group-hover:bg-white',
      studyHeaderBg: 'bg-gradient-to-l from-slate-900 via-slate-900 to-emerald-950 border-b border-emerald-900/50',
      studyBadge: 'bg-emerald-500 text-white',
      activeCardRing: 'border-emerald-500 ring-2 ring-emerald-500/15',
    },
  };

  const activeTheme = modalityThemes[currentModality];

  return (
    <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-2 space-y-3">
      {/* 
        STICKY TYPING TOOLS, SPELL/HALF-SPACE HIGHLIGHTER & SLIM MODALITY-COLORED PINNED TEMPLATES
        Stays pinned cleanly below Navbar + EditorToolbar as the user scrolls down through the report!
      */}
      <div
        id="app-editor-quickbar"
        style={{
          top: 'calc(var(--navbar-height, 102px) + var(--tabsbar-height, 44px) + var(--toolbar-height, 46px))',
        }}
        className="w-full sticky z-20 bg-slate-100/95 backdrop-blur-md pt-0.5 pb-1 space-y-1 border-b border-slate-200/80 shadow-2xs no-print transition-all duration-200"
      >
        {/* Slim Height (h-7) Quick Access Bar harmonized with active Modality Color */}
        <div className="bg-white rounded-xl px-2 py-1 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenTemplates(activeStudyId)}
              className={`h-7 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold border whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeTheme.primaryBtn}`}
              title="مشاهده و درج قالب‌های آماده پزشکان برای این تصویربرداری"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>قالب‌های آماده ({modalityNames[currentModality]})</span>
            </button>

            {/* Direct 1-Click Save Current Report as Ready Template */}
            {onStartQuickSaveAsTemplate && (
              <button
                type="button"
                onClick={() => onStartQuickSaveAsTemplate(activeStudyId || studies[0]?.id || '')}
                className={`h-7 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold border whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeTheme.secondaryBtn}`}
                title="ذخیره مستقیم متن تایپ‌شده فعلی به عنوان قالب آماده جدید (در یک مرحله)"
              >
                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                <span>+ ذخیره گزارش در قالب‌ها</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenShortcuts}
              className="h-7 px-2.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
              title="مدیریت کدهای شورتکات و جملات پرکاربرد (جایگزینی خودکار با کلید Space)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>شورتکات‌ها و ماکروها (Space)</span>
            </button>

            {/* Insert Smart Number / Measurement Slot Dropdown (Only when enabled in Settings) */}
            {numberSlotsEnabled && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSlotInsertMenu((prev) => !prev)}
                  className="h-7 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 hover:border-sky-300 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap shadow-2xs transition-all duration-200 cursor-pointer active:scale-95"
                  title="افزودن فیلد جایگذاری عدد در متن فایل خام بدون به هم ریختن متن"
                >
                  <Hash className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>+ درج فیلد عدد</span>
                  <ChevronDown className="w-3 h-3 text-sky-600 shrink-0" />
                </button>

                {showSlotInsertMenu && (
                  <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3.5 z-50 text-xs space-y-3 animate-scaleIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-black text-slate-800">درج جایگذاری عدد در محل نشانگر</span>
                      <button
                        type="button"
                        onClick={() => setShowSlotInsertMenu(false)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Custom Slot Builder */}
                    <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-200 space-y-2">
                      <div className="text-[11px] font-bold text-sky-950">ایجاد جایگذاری دلخواه در فایل خام:</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={customSlotLabel}
                          onChange={(e) => setCustomSlotLabel(e.target.value)}
                          placeholder="نام (مثلاً: سایز کلیه)"
                          className="text-xs px-2 py-1.5 rounded-lg border border-sky-200 bg-white"
                        />
                        <input
                          type="text"
                          value={customSlotValue}
                          onChange={(e) => setCustomSlotValue(e.target.value)}
                          placeholder="عدد اولیه (۱۱۰)"
                          dir="ltr"
                          className="text-xs px-2 py-1.5 rounded-lg border border-sky-200 bg-white font-mono text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleInsertSlotAtCursor(
                            customSlotLabel.trim() || 'مقدار عددی',
                            customSlotValue.trim() || '---'
                          )
                        }
                        className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + درج در متن گزارش
                      </button>
                    </div>

                    {/* Preset Radiology Slots */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                        فیلدهای آماده پرتکرار پرتوپزشکی:
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                        {PRESET_RADIOLOGY_SLOTS.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleInsertSlotAtCursor(item.label, item.defaultValue, item.unit)}
                            className="w-full text-right px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-900 border border-slate-100 hover:border-sky-200 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="font-semibold">{item.label}</span>
                            <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-sky-700" dir="ltr">
                              {item.defaultValue} {item.unit}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Highlight-First Spell & Half-Space Checker (Alt + C) - Slim h-7 */}
            <button
              type="button"
              onClick={handleHighlightSpellIssues}
              className="h-7 px-2.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap shadow-2xs transition-all duration-200 cursor-pointer active:scale-95"
              title="هایلایت کردن غلط‌های املایی و نیم‌فاصله‌ها در متن و پیشنهاد جایگزین هنگام انتخاب (Alt+C)"
            >
              <SpellCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>بررسی املا و نیم‌فاصله</span>
              <kbd className="bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.2 rounded text-[9.5px] font-mono">
                Alt+C
              </kbd>
            </button>
          </div>

          {/* One-Click Convert All Numbers in Current Raw Template to Safe Slots */}
          {numberSlotsEnabled && activeStudy && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAutoWrapStudyNumbers(activeStudy)}
                className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
                title="تمام اعداد و اندازه‌های موجود در متن فعلی را به کادرهای جایگذاری مجزا تبدیل می‌کند"
              >
                <SlidersHorizontal className="w-3 h-3 text-sky-200 shrink-0" />
                <span>تبدیل اعداد به فیلد</span>
              </button>
            </div>
          )}
        </div>

        {/* 
          ULTRA-SLIM SINGLE-LINE PINNED TEMPLATES STRIP (Harmonized with Active Modality Color)
        */}
        {pinnedTemplates.length > 0 && (
          <div
            className={`rounded-xl px-2.5 py-1 border flex items-center justify-between gap-2 transition-colors duration-200 ${activeTheme.pinStripBg}`}
          >
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold ml-1 shrink-0 whitespace-nowrap ${activeTheme.pinLabel}`}
              >
                <Pin className="w-3 h-3 shrink-0" />
                <span>سنجاق‌های {modalityNames[currentModality]}:</span>
              </span>

              {pinnedTemplates.slice(0, 8).map((tpl, idx) => (
                <div
                  key={tpl.id}
                  className={`group h-6 inline-flex items-center rounded-md border text-[11px] font-bold transition-all duration-150 shrink-0 overflow-hidden ${activeTheme.pinChip}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onApplyPinnedTemplate &&
                      onApplyPinnedTemplate(tpl, activeStudyId || studies[0]?.id || '')
                    }
                    title={`اعمال فوری قالب «${tpl.title}» (کلید میانبر: F${idx + 1})`}
                    className="h-full inline-flex items-center gap-1 px-2 cursor-pointer whitespace-nowrap"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full transition-colors ${activeTheme.pinDot}`} />
                    <span>{tpl.title}</span>
                    <span className="text-[9px] font-mono opacity-65">F{idx + 1}</span>
                  </button>

                  {onTogglePinTemplate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinTemplate(tpl.id);
                      }}
                      title="برداشتن سنجاق"
                      className="h-full px-1 opacity-50 hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onOpenTemplates(activeStudyId)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md hover:bg-white/70 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${activeTheme.pinLabel}`}
            >
              + مدیریت
            </button>
          </div>
        )}

        {/* 
          INTERACTIVE HIGHLIGHTED SPELL & HALF-SPACE SUGGESTION PANEL
          Appears inside the sticky header when Alt+C highlights words or when the user clicks a highlighted word!
        */}
        {(detectedIssues.length > 0 || selectedIssue) && (
          <div className="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-3 shadow-md space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                  {detectedIssues.length}
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950">
                    موارد هایلایت‌شده املایی و نیم‌فاصله در متن گزارش
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    روی هر کلمه زردرنگ در متن (یا دکمه‌های زیر) کلیک کنید تا پیشنهاد جایگزین را مشاهده و تایید نمایید:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {detectedIssues.length > 1 && (
                  <button
                    type="button"
                    onClick={handleAcceptAllIssues}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>پذیرش و جایگزینی همه ({detectedIssues.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAllHighlights}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>پاک کردن هایلایت‌ها</span>
                </button>
              </div>
            </div>

            {/* All Highlighted Words Pills (Click to select & inspect) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {detectedIssues.map((iss) => {
                const isSelected = selectedIssue?.id === iss.id;
                return (
                  <button
                    key={iss.id}
                    type="button"
                    onClick={() => setSelectedIssue(iss)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-105'
                        : 'bg-white text-rose-800 border-amber-300 hover:bg-amber-100/70'
                    }`}
                  >
                    <span className="underline decoration-wavy decoration-rose-500">{iss.original}</span>
                    <span className="text-[10px] opacity-75">⬅</span>
                    <span className={isSelected ? 'text-teal-300' : 'text-teal-700'}>{iss.suggestion}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Selected Highlighted Word Suggestion Box */}
            {selectedIssue && (
              <div className="bg-white rounded-xl p-2.5 border border-amber-300 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">
                    عبارت انتخاب‌شده ({selectedIssue.field === 'title' ? 'در عنوان' : 'در متن گزارش'}):
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs line-through">
                    {selectedIssue.original}
                  </span>
                  <span className="text-slate-400 font-bold">⬅</span>
                  <span className="text-xs text-slate-600 font-medium">پیشنهاد استاندارد:</span>
                  <span className="px-3 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-300 font-black text-sm">
                    {selectedIssue.suggestion}
                  </span>
                  <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedIssue.ruleLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAcceptIssueSuggestion(selectedIssue)}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>جایگزینی با «{selectedIssue.suggestion}»</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissIssue(selectedIssue)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    نادیده گرفتن
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Studies on Left (9 cols), Fast Macro Drawer on Right (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 2xl:gap-7">
        {/* Studies List (Supports Multiple Imaging Procedures per Patient) */}
        <div className="lg:col-span-9 space-y-6">
          {studies.map((study, index) => {
            const isActive = study.id === activeStudyId;
            const sTheme = modalityThemes[study.modality] || modalityThemes.sonography;

            return (
              <div
                key={study.id}
                onClick={() => setActiveStudyId(study.id)}
                className={`bg-white rounded-2xl shadow-xs border transition-all duration-200 overflow-hidden divide-y divide-slate-100 ${
                  isActive ? sTheme.activeCardRing : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Study Header Strip Harmonized with Study Modality Color */}
                <div className={`px-4 py-2.5 text-white flex items-center justify-between transition-colors duration-200 ${sTheme.studyHeaderBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shadow-2xs ${sTheme.studyBadge}`}>
                      {index + 1}
                    </span>
                    <h3 className="font-bold text-xs sm:text-sm">
                      بررسی شماره {index + 1}: {modalityNames[study.modality]}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Modality Selector for this specific study (Uniform h-7) */}
                    <select
                      value={study.modality}
                      onChange={(e) => onUpdateStudy(study.id, { modality: e.target.value as Modality })}
                      className="h-7 text-xs px-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-400 transition-colors cursor-pointer"
                    >
                      <option value="sonography">سونوگرافی</option>
                      <option value="mri">ام‌آر‌آی</option>
                      <option value="ct">سی‌تی‌اسکن</option>
                    </select>

                    {/* Quick Template Picker for this study (Matched to Study Modality Color) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTemplates(study.id);
                      }}
                      className={`h-7 text-xs px-2.5 font-semibold rounded-lg inline-flex items-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer border ${sTheme.primaryBtn}`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>قالب آماده</span>
                    </button>

                    {/* Delete study button (only if more than 1 study exists) */}
                    {studies.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveStudy(study.id);
                        }}
                        className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="حذف این تصویربرداری"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 1: عنوان (شامل نوع تصویربرداری، پروتکل و اطلاعات تصویربرداری) - SINGLE UNIFIED BOX */}
                <div className="p-4 sm:p-5 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span>عنوان (شامل نوع تصویربرداری، پروتکل و اطلاعات تصویربرداری)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      پشتیبانی از شورتکات با کلید Space (مثلاً .abd)
                    </span>
                  </div>

                  <textarea
                    ref={(el) => {
                      titleRefs.current[study.id] = el;
                    }}
                    value={study.titleAndTechnique}
                    onChange={(e) => onUpdateStudy(study.id, { titleAndTechnique: e.target.value })}
                    onKeyDown={(e) => handleTitleKeyDown(e, study)}
                    placeholder="عنوان دقیق تصویربرداری، پروتکل، سکانس‌ها و شرایط انجام را اینجا بنویسید..."
                    rows={2}
                    style={{
                      fontFamily: headingFont,
                      fontSize: headingFontSize,
                    }}
                    className="w-full font-bold p-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white leading-relaxed resize-y shadow-2xs high-visibility-editor"
                  />
                </div>

                {/* Section 2: یافته‌های تصویربرداری (Findings - The Core Rich Editor) */}
                <div className="p-5 sm:p-6 min-h-[340px] bg-white relative">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                      <h4 className="text-sm font-black text-slate-900 tracking-tight">
                        یافته‌های تصویربرداری (Findings)
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {numberSlotsEnabled && (
                        <button
                          type="button"
                          onClick={() => handleAutoWrapStudyNumbers(study)}
                          className="text-[11px] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="استخراج خودکار اعداد این گزارش در کادرهای جایگذاری بالا تا هنگام تغییر عدد متن به هم نریزد"
                        >
                          <Hash className="w-3 h-3 text-sky-600" />
                          <span>استخراج فیلدهای عددی این متن</span>
                        </button>
                      )}
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                        کدهای سریع: <strong className="font-mono">.abd</strong> ، <strong className="font-mono">.nl</strong> ، <strong className="font-mono">.gb</strong> + کلید Space
                      </span>
                      {smartSuggestionsEnabled && isActive && (
                        <span className="text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[10px] flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> پیشنهاد هوشمند فعال
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 
                    QUICK NUMBER & MEASUREMENT FILLER BAR (جایگذاری سریع اعداد بدون به هم ریختن متن)
                    Only shown when numberSlotsEnabled is enabled in Settings!
                  */}
                  {numberSlotsEnabled && (() => {
                    const { slots } = normalizeAndExtractSlots(study.findingsHtml);
                    if (slots.length === 0) return null;

                    return (
                      <div className="mb-3.5 p-3 bg-sky-50/80 border border-sky-200 rounded-2xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-950">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
                            <span>جایگذاری سریع اعداد و اندازه‌های گزارش (بدون به هم خوردن متن):</span>
                          </div>
                          <span className="text-[10px] text-sky-700 font-medium">
                            عدد را در کادر مربوطه بنویسید و با کلید Enter یا Tab به عدد بعدی بروید
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {slots.map((slot, sIdx) => {
                            const isSlotActive = activeSlotId === slot.id;
                            return (
                              <div
                                key={slot.id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all bg-white ${
                                  isSlotActive
                                    ? 'border-sky-600 ring-2 ring-sky-500/20 shadow-xs'
                                    : 'border-sky-200 hover:border-sky-400'
                                }`}
                              >
                                <label
                                  htmlFor={`input-${slot.id}`}
                                  className="text-[11px] font-bold text-slate-700 whitespace-nowrap cursor-pointer"
                                >
                                  {slot.label}:
                                </label>
                                <input
                                  id={`input-${slot.id}`}
                                  ref={(el) => {
                                    slotInputRefs.current[slot.id] = el;
                                  }}
                                  type="text"
                                  dir="ltr"
                                  value={slot.value}
                                  onFocus={(e) => {
                                    setActiveSlotId(slot.id);
                                    e.currentTarget.select();
                                  }}
                                  onChange={(e) => handleUpdateSlotValue(study, slot.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextSlot = slots[sIdx + 1];
                                      if (nextSlot && slotInputRefs.current[nextSlot.id]) {
                                        slotInputRefs.current[nextSlot.id]?.focus();
                                        slotInputRefs.current[nextSlot.id]?.select();
                                      }
                                    }
                                  }}
                                  className="w-24 text-xs font-mono font-extrabold text-sky-900 bg-sky-50/70 focus:bg-white px-2 py-0.5 rounded-lg border border-sky-200 focus:border-sky-500 text-center focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Live Floating Auto-Expander Hint Banner when typing `.xyz` */}
                  {isActive && pendingShortcutMatch && (
                    <div className="mb-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950 shadow-xs animate-fadeIn">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="px-2 py-0.5 bg-amber-500 text-white font-mono font-bold rounded text-xs shrink-0">
                          {pendingShortcutMatch.trigger}
                        </span>
                        <span className="font-bold shrink-0">{pendingShortcutMatch.label}:</span>
                        <span className="text-slate-700 truncate italic">
                          «{pendingShortcutMatch.expansion}»
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-900 shrink-0 mr-2">
                        کلید Space یا Tab را بزنید ↹
                      </span>
                    </div>
                  )}

                  {/* ContentEditable Area */}
                  <div
                    ref={(el) => {
                      findingsRefs.current[study.id] = el;
                    }}
                    contentEditable
                    dir={activeDirection}
                    onClick={(e) => handleEditorClick(e, study.id)}
                    onFocus={() => setActiveStudyId(study.id)}
                    onInput={() => handleFindingsInput(study)}
                    onKeyDown={(e) => handleFindingsKeyDown(e, study)}
                    className="max-w-none min-h-[260px] p-2.5 focus:outline-none text-slate-800 leading-[2.05] selection:bg-teal-200 border-none high-visibility-editor"
                    style={{
                      fontFamily: `${defaultFont}, 'Vazirmatn', sans-serif`,
                      fontSize: `${Math.round((((defaultFontSize || 14) + 3) * editorZoom) / 100)}px`,
                      direction: activeDirection,
                      textAlign: activeDirection === 'rtl' ? 'right' : 'left',
                    }}
                    data-placeholder="یافته‌های این تصویربرداری را اینجا تایپ کنید یا کدهای اختصاری (.abd, .nl, .gb) را تایپ کرده و Space بزنید..."
                  />

                  {/* Smart Next-Sentence Ghost Bar (for active study) */}
                  {smartSuggestionsEnabled && isActive && ghostSuggestion && (
                    <div className="mt-4 p-3 bg-linear-to-r from-teal-50/90 via-emerald-50/70 to-teal-50/90 border border-teal-200/90 rounded-xl flex items-center justify-between text-xs text-teal-900 shadow-2xs animate-fadeIn">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-teal-800 ml-1.5">پیشنهاد هوشمند جمله بعدی:</span>
                          <span className="text-slate-700 italic">«{ghostSuggestion}»</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => insertSuggestionAtCursor(` ${ghostSuggestion} `, study.id)}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1 text-[11px] transition-transform active:scale-95 cursor-pointer"
                        >
                          <span>افزودن</span>
                          <kbd className="bg-teal-800 text-teal-100 px-1 rounded text-[9px] font-mono">Tab ↹</kbd>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGhostSuggestion('')}
                          className="text-slate-400 hover:text-slate-600 px-1 text-xs cursor-pointer"
                          title="رد پیشنهاد"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Multiple Context Suggestions Pills */}
                  {smartSuggestionsEnabled && isActive && activeSuggestions.length > 1 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-500 font-medium">سایر پیشنهادات:</span>
                      {activeSuggestions.slice(1).map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => insertSuggestionAtCursor(` ${sug} `, study.id)}
                          className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors text-right max-w-sm truncate cursor-pointer"
                          title={sug}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: اطلاعات بیشتر و بخش‌های تکمیلی (مقایسه، نتیجه‌گیری، توصیه‌ها) - نوار فوق‌باریک تک‌خطی */}
                <div className="border-t border-slate-200 bg-slate-50/80">
                  <button
                    type="button"
                    onClick={() => toggleMoreInfo(study.id)}
                    className="w-full h-7 px-3 flex items-center justify-between text-right hover:bg-slate-100 transition-colors duration-150 cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {expandedMoreInfo[study.id] ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
                      )}
                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 truncate">
                        اطلاعات بیشتر و بخش‌های تکمیلی (مقایسه، نتیجه‌گیری، توصیه‌ها)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {study.showComparison && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-semibold">
                          مقایسه ✓
                        </span>
                      )}
                      {study.showImpression && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-semibold">
                          نتیجه‌گیری ✓
                        </span>
                      )}
                      {study.showRecommendations && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          توصیه‌ها ✓
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-teal-700">
                        {expandedMoreInfo[study.id] ? 'بستن' : 'باز کردن'}
                      </span>
                    </div>
                  </button>

                  {expandedMoreInfo[study.id] && (
                    <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 divide-y divide-slate-100 space-y-3 animate-fadeIn">
                      {/* 1. مقایسه با تصاویر پیشین */}
                      <div className="pb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            onClick={() => onUpdateStudy(study.id, { showComparison: !study.showComparison })}
                            className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={study.showComparison}
                              onChange={(e) => onUpdateStudy(study.id, { showComparison: e.target.checked })}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <GitCompare className="w-3.5 h-3.5 text-slate-500" />
                            <span>مقایسه با تصاویر پیشین (Comparison)</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {study.showComparison ? 'فعال' : 'غیرفعال (مخفی)'}
                          </span>
                        </div>

                        {study.showComparison && (
                          <div className="mt-2 animate-fadeIn">
                            <input
                              type="text"
                              value={study.comparison}
                              onChange={(e) => onUpdateStudy(study.id, { comparison: e.target.value })}
                              placeholder="شرح بررسی پیشین و مقایسه تغییرات..."
                              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 bg-white high-visibility-editor"
                            />
                          </div>
                        )}
                      </div>

                      {/* 2. نتیجه‌گیری و جمع‌بندی نهایی */}
                      <div className="pt-3 pb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            onClick={() => onUpdateStudy(study.id, { showImpression: !study.showImpression })}
                            className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={study.showImpression}
                              onChange={(e) => onUpdateStudy(study.id, { showImpression: e.target.checked })}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            <span>نتیجه‌گیری و جمع‌بندی نهایی (Impression / Conclusion)</span>
                          </label>

                          {study.showImpression && (
                            <button
                              type="button"
                              onClick={() => handleGenerateImpression(study)}
                              disabled={generatingImpressionId === study.id || !study.findingsHtml}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl bg-linear-to-r from-indigo-600 to-teal-600 text-white hover:from-indigo-700 hover:to-teal-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <Wand2
                                className={`w-3.5 h-3.5 ${generatingImpressionId === study.id ? 'animate-spin' : ''}`}
                              />
                              <span>
                                {generatingImpressionId === study.id
                                  ? 'در حال استخراج...'
                                  : 'تولید هوشمند نتیجه‌گیری از یافته‌ها'}
                              </span>
                            </button>
                          )}
                        </div>

                        {study.showImpression && (
                          <div className="mt-2 animate-fadeIn">
                            <div
                              contentEditable
                              dir={activeDirection}
                              dangerouslySetInnerHTML={{ __html: study.impressionHtml }}
                              onInput={(e) => onUpdateStudy(study.id, { impressionHtml: e.currentTarget.innerHTML })}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Tab') {
                                  const res = expandShortcutInContentEditable(e.currentTarget, shortcuts);
                                  if (res.expanded) {
                                    e.preventDefault();
                                    onUpdateStudy(study.id, { impressionHtml: e.currentTarget.innerHTML });
                                  }
                                }
                              }}
                              className="max-w-none min-h-[90px] p-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:outline-none text-slate-800 leading-loose shadow-inner high-visibility-editor"
                              style={{
                                fontFamily: `${defaultFont}, 'Vazirmatn', sans-serif`,
                                fontSize: `${Math.round((((defaultFontSize || 14) + 2) * editorZoom) / 100)}px`,
                                direction: activeDirection,
                                textAlign: activeDirection === 'rtl' ? 'right' : 'left',
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* 3. توصیه‌ها و پیگیری */}
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            onClick={() => onUpdateStudy(study.id, { showRecommendations: !study.showRecommendations })}
                            className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={study.showRecommendations}
                              onChange={(e) => onUpdateStudy(study.id, { showRecommendations: e.target.checked })}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>توصیه‌ها و پیگیری (Recommendations & Follow-up)</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {study.showRecommendations ? 'فعال' : 'غیرفعال (مخفی)'}
                          </span>
                        </div>

                        {study.showRecommendations && (
                          <div className="mt-2 animate-fadeIn">
                            <div
                              contentEditable
                              dir={activeDirection}
                              dangerouslySetInnerHTML={{ __html: study.recommendationsHtml }}
                              onInput={(e) => onUpdateStudy(study.id, { recommendationsHtml: e.currentTarget.innerHTML })}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Tab') {
                                  const res = expandShortcutInContentEditable(e.currentTarget, shortcuts);
                                  if (res.expanded) {
                                    e.preventDefault();
                                    onUpdateStudy(study.id, { recommendationsHtml: e.currentTarget.innerHTML });
                                  }
                                }
                              }}
                              className="max-w-none min-h-[60px] p-2.5 rounded-lg bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:outline-none leading-loose high-visibility-editor"
                              style={{
                                fontFamily: `${defaultFont}, 'Vazirmatn', sans-serif`,
                                fontSize: `${Math.round((((defaultFontSize || 14) + 1.5) * editorZoom) / 100)}px`,
                                direction: activeDirection,
                                textAlign: activeDirection === 'rtl' ? 'right' : 'left',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Ultra-Slim Single-Line Bar to Add Next Imaging Study for the Same Patient */}
          <div className="py-1.5 px-3 bg-white border border-dashed border-slate-300 hover:border-teal-400 rounded-xl flex items-center justify-between flex-wrap gap-2 shadow-2xs transition-colors">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Plus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>افزودن تصویربرداری / گزارش بعدی برای همین بیمار:</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onAddStudy('sonography')}
                className="h-7 px-2.5 bg-sky-50 hover:bg-sky-600 text-sky-800 hover:text-white border border-sky-200 hover:border-sky-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                + سونوگرافی
              </button>
              <button
                type="button"
                onClick={() => onAddStudy('mri')}
                className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-800 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                + ام‌آر‌آی
              </button>
              <button
                type="button"
                onClick={() => onAddStudy('ct')}
                className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                + سی‌تی‌اسکن
              </button>
            </div>
          </div>
        </div>

        {/* Side Quick Actions & Fast Macro Sidebar (3 cols on desktop, sticky on large monitors) */}
        <div
          style={{
            top: 'calc(var(--navbar-height, 102px) + var(--tabsbar-height, 44px) + var(--toolbar-height, 46px) + var(--quickbar-height, 96px) + 12px)',
          }}
          className="lg:col-span-3 lg:sticky lg:self-start space-y-4"
        >
          {/* Quick Shortcuts & Macro Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-900">جایگزینی آنی با کلید Space</h4>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                کد + Space
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mb-2 leading-normal">
              کد اختصاری را در متن تایپ کرده و کلید <strong>Space</strong> را بزنید (یا روی کارت کلیک کنید):
            </p>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 mb-2.5">
              <button
                onClick={() => setQuickMacroFilter('all')}
                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  quickMacroFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setQuickMacroFilter('normal')}
                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  quickMacroFilter === 'normal'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                نرمال
              </button>
              <button
                onClick={() => setQuickMacroFilter('pathology')}
                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  quickMacroFilter === 'pathology'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                پاتولوژی
              </button>
            </div>

            {/* Shortcut Cards List */}
            <div className="space-y-1.5 max-h-[460px] 2xl:max-h-[calc(100vh-340px)] overflow-y-auto pr-0.5">
              {filteredShortcuts.slice(0, 18).map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => insertShortcut(sc)}
                  className="w-full text-right p-2 rounded-xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50/60 transition-all group flex items-start justify-between gap-2 bg-slate-50/50 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-teal-900 flex items-center gap-1.5">
                      <span>{sc.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {sc.expansion}
                    </div>
                  </div>
                  <span
                    dir="ltr"
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0"
                  >
                    {sc.trigger}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
