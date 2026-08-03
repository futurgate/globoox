'use client';

import { useId, useState } from 'react';
import { Globe } from 'lucide-react';
import { ReaderThemeProvider } from '@/components/Reader/ReaderThemeProvider';
import ReaderSettings from '@/components/Reader/ReaderSettings';
import TableOfContents from '@/components/Reader/TableOfContents';
import DeleteBookConfirmDialog from '@/components/Store/DeleteBookConfirmDialog';
import SignInToUploadModal from '@/components/SignInToUploadModal';
import JoinAlphaDialog from '@/components/JoinAlphaDialog';
import UploadBookModal from '@/components/UploadBookModal';
import TranslationLimitDialog from '@/components/TranslationLimitDialog';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import {
  IOSAction,
  IOSActionDivider,
  IOSActionRow,
  IOSActionStack,
  IOSActionVerticalDivider,
} from '@/components/ui/ios-action-group';
import IOSDialog from '@/components/ui/ios-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import IOSDialogHeaderCenterLarge from '@/components/ui/ios-dialog-header-center-large';
import IOSFeatureDialog from '@/components/ui/ios-feature-dialog';
import IOSFlowDialog from '@/components/ui/ios-flow-dialog';
import IOSIconFeatureListItem from '@/components/ui/ios-icon-feature-list-item';
import IOSReaderHeader from '@/components/ui/ios-reader-header';
import IOSBottomDrawer from '@/components/ui/ios-bottom-drawer';
import IOSBottomDrawerHeader from '@/components/ui/ios-bottom-drawer-header';
import IOSItemsStack from '@/components/ui/ios-items-stack';
import { Button } from '@/components/ui/button';
import {
  uiDrawerItemButton,
  uiDropdownItemButton,
  uiFilterPillActive,
  uiFilterPillBase,
  uiFilterPillInactive,
  uiMenuItemButton,
  uiTextActionButton,
  uiTextActionButtonPressed,
} from '@/components/ui/button-styles';

type OverlayKey =
  | null
  | 'ios-alert'
  | 'ios-dialog'
  | 'ios-flow'
  | 'ios-feature-dialog'
  | 'ios-bottom-drawer'
  | 'reader-sheet-pattern'
  | 'unlimited-limit'
  | 'unlimited-alpha'
  | 'upload-book'
  | 'sign-in-upload'
  | 'delete-book'
  | 'reader-settings'
  | 'table-of-contents';

type Layer = 'Primitive' | 'Pattern' | 'Example';

type CatalogItem = {
  title: string;
  layer: Layer;
  builtOn: string;
  useWhen: string;
  avoidWhen: string;
  inlinePreview?: React.ReactNode;
  openKey?: Exclude<OverlayKey, null>;
  secondaryOpenKey?: Exclude<OverlayKey, null>;
  secondaryLabel?: string;
  notes?: string;
};

function LayerBadge({ layer }: { layer: Layer }) {
  const palette =
    layer === 'Primitive'
      ? 'bg-[var(--fill-secondary)] text-[var(--app-text-muted)]'
      : layer === 'Pattern'
        ? 'bg-[color:color-mix(in_srgb,var(--app-accent)_10%,transparent)] text-[var(--app-accent)]'
        : 'bg-[var(--fill-tertiary)] text-[var(--app-text)]';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${palette}`}>
      {layer}
    </span>
  );
}

const previewPanelClassName = 'rounded-[22px] bg-[var(--app-section-bg)] p-4 text-[var(--app-text)]';
const previewMutedTextClassName = 'text-[var(--app-text-muted)]';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-[var(--app-surface-bg)] p-6 text-[var(--app-text)]">
      <div className="mb-5">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--app-text-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CatalogCard({
  item,
  onOpen,
}: {
  item: CatalogItem;
  onOpen: (key: Exclude<OverlayKey, null>) => void;
}) {
  return (
    <div className="rounded-[24px] bg-[var(--app-section-bg)] p-5 text-[var(--app-text)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[17px] font-semibold text-[var(--app-text)]">{item.title}</h3>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">Built on: {item.builtOn}</p>
        </div>
        <div className="shrink-0">
          <LayerBadge layer={item.layer} />
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-relaxed">
        <p className="text-[var(--app-text)]">
          <span className="font-medium">Use when:</span> {item.useWhen}
        </p>
        <p className="text-[var(--app-text-muted)]">
          <span className="font-medium text-[var(--app-text)]">Avoid when:</span> {item.avoidWhen}
        </p>
        {item.inlinePreview ? item.inlinePreview : null}
        {item.notes ? (
          <p className="text-[var(--app-text-muted)]">
            <span className="font-medium text-[var(--app-text)]">Notes:</span> {item.notes}
          </p>
        ) : null}
      </div>

      {item.openKey ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onOpen(item.openKey!)}
            className={`${uiTextActionButton} flex h-14 items-center justify-center rounded-2xl text-[17px] font-medium px-4`}
          >
            Open Preview
          </button>
          {item.secondaryOpenKey && item.secondaryLabel ? (
            <button
              type="button"
              onClick={() => onOpen(item.secondaryOpenKey!)}
              className={`${uiTextActionButton} flex h-14 items-center justify-center rounded-2xl text-[17px] font-medium px-4`}
            >
              {item.secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SchematicPlaceholder({
  label,
  items,
  className = '',
}: {
  label: string;
  items: string[];
  className?: string;
}) {
  return (
    <div className={`border border-dashed border-pink-300 bg-pink-50 p-4 dark:border-pink-500/40 dark:bg-pink-500/10 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-700 dark:text-pink-300">
        {label}
      </p>
      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-pink-900 dark:text-pink-100">
        {items.join('\n')}
      </div>
    </div>
  );
}

export default function ComponentsPreviewPage() {
  const [activeOverlay, setActiveOverlay] = useState<OverlayKey>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertDestructive] = useState(false);
  const sheetTitleId = useId();
  const sheetDescriptionId = useId();

  const openOverlay = (key: Exclude<OverlayKey, null>) => setActiveOverlay(key);
  const closeOverlay = () => {
    setActiveOverlay(null);
    setAlertLoading(false);
  };

  const handleAlertConfirm = () => {
    if (alertLoading) return;
    setAlertLoading(true);
    window.setTimeout(() => {
      setAlertLoading(false);
      setActiveOverlay(null);
    }, 900);
  };

  const primitives: CatalogItem[] = [
    {
      title: 'IOSModalShell',
      layer: 'Primitive',
      builtOn: 'Portal + overlay + animation',
      useWhen: 'Building a new modal container inside the UI layer.',
      avoidWhen: 'Writing product-level dialogs or feature modals directly.',
      notes: 'Lowest level. Product code should not import this. No standalone preview.',
    },
    {
      title: 'IOSDialog',
      layer: 'Primitive',
      builtOn: 'IOSModalShell',
      useWhen: 'Building a higher-level centered or sheet-like dialog pattern in the UI layer.',
      avoidWhen: 'Implementing feature dialogs directly.',
      openKey: 'ios-dialog',
    },
    {
      title: 'IOSBottomDrawer',
      layer: 'Primitive',
      builtOn: 'IOSModalShell',
      useWhen: 'Building draggable bottom-sheet experiences, especially in reader surfaces.',
      avoidWhen: 'Short alerts or confirmations.',
      openKey: 'ios-bottom-drawer',
    },
    {
      title: 'IOSBottomDrawerHeader',
      layer: 'Primitive',
      builtOn: 'IOSBottomDrawer header layout',
      useWhen: 'Shared header for bottom sheets with title, subtitle, optional leading content, and close action.',
      avoidWhen: 'Flow dialog headers or reader top chrome.',
      inlinePreview: (
        <IOSBottomDrawerHeader
          title="Drawer title"
          subtitle="Optional subtitle"
          leading={(
            <div className="flex h-16 w-12 items-center justify-center border border-dashed border-pink-300 bg-pink-50 text-sm text-pink-700 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-300">
              Cover
            </div>
          )}
          onClose={() => {}}
        />
      ),
    },
    {
      title: 'IOSDialogHeaderCenterLarge',
      layer: 'Primitive',
      builtOn: 'IOSDialog header layout',
      useWhen: 'Centered title and optional description inside compact dialogs and flow dialogs.',
      avoidWhen: 'Alert rows or reader-sheet headers.',
      inlinePreview: (
        <IOSDialogHeaderCenterLarge
          title="Centered dialog title"
          description="Optional supporting description"
        />
      ),
    },
    {
      title: 'IOSDialogFooter',
      layer: 'Primitive',
      builtOn: 'Shared action-row container',
      useWhen: 'Single or stacked action rows in flow dialogs.',
      avoidWhen: 'Embedding arbitrary body content or reader-sheet controls.',
      inlinePreview: (
        <IOSDialogFooter>
          <IOSActionStack>
            <IOSAction emphasized>Primary Action</IOSAction>
            <IOSActionDivider />
            <IOSAction>Secondary Action</IOSAction>
          </IOSActionStack>
        </IOSDialogFooter>
      ),
      notes: 'Action typography rule: regular by default. Use medium only for one primary action in light theme.',
    },
    {
      title: 'IOSDialogFooter (Horizontal)',
      layer: 'Primitive',
      builtOn: 'Shared action-row container',
      useWhen: 'Two side-by-side actions in a shared bottom action row.',
      avoidWhen: 'Vertical action stacks or body content.',
      inlinePreview: (
        <IOSDialogFooter>
          <IOSActionRow>
            <IOSAction>Cancel</IOSAction>
            <IOSActionVerticalDivider />
            <IOSAction emphasized>Confirm</IOSAction>
          </IOSActionRow>
        </IOSDialogFooter>
      ),
      notes: 'Horizontal pair follows the same rule: both actions stay regular unless there is exactly one primary action in light theme.',
    },
    {
      title: 'IOSReaderHeader',
      layer: 'Primitive',
      builtOn: 'Reader top chrome layout',
      useWhen: 'Top header in ReaderView with back, title, language, and trailing actions.',
      avoidWhen: 'Modal headers or generic page headers.',
      notes: 'Use one shared header-control pattern: icon controls use `uiIconTriggerButton`, text+icon uses `uiTextActionButton`, all controls keep 44x44 touch geometry, rounded corners, and shared `uiHeaderControlHitArea`.',
      inlinePreview: (
        <div className="relative overflow-hidden">
          <IOSReaderHeader
            title="Title"
            subtitle="Subtitle"
            trailingLeft={<span className="sr-only">Trailing control</span>}
            trailingRight={<span className="sr-only">Trailing control</span>}
            className="[&_button]:opacity-0"
          />
          <div className="pointer-events-none absolute left-2 top-[calc(env(safe-area-inset-top)+16px)] flex h-[44px] w-[44px] items-center justify-center border border-dashed border-pink-300 bg-pink-50 text-[10px] text-pink-700 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-300">
            44x44
          </div>
          <div className="pointer-events-none absolute right-12 top-[calc(env(safe-area-inset-top)+16px)] flex h-[44px] w-[44px] items-center justify-center border border-dashed border-pink-300 bg-pink-50 text-[10px] text-pink-700 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-300">
            44x44
          </div>
          <div className="pointer-events-none absolute right-0 top-[calc(env(safe-area-inset-top)+16px)] flex h-[44px] w-[44px] items-center justify-center border border-dashed border-pink-300 bg-pink-50 text-[10px] text-pink-700 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-300">
            44x44
          </div>
        </div>
      ),
    },
    {
      title: 'IOSIconFeatureListItem',
      layer: 'Primitive',
      builtOn: 'Small icon + label row',
      useWhen: 'Short benefit or feature lists inside dialogs and sheets.',
      avoidWhen: 'Dense settings rows or action rows.',
      inlinePreview: (
        <ul>
          <IOSIconFeatureListItem icon={Globe}>
            Benefit or feature summary
          </IOSIconFeatureListItem>
        </ul>
      ),
    },
  ];

  const patterns: CatalogItem[] = [
    {
      title: 'IOSAlertDialog',
      layer: 'Pattern',
      builtOn: 'IOSDialog',
      useWhen: 'Alerts, confirmations, warnings, and any short blocking decision.',
      avoidWhen: 'Long flows, forms, or rich content.',
      openKey: 'ios-alert',
      notes: 'This is the only alert/confirm pattern.',
    },
    {
      title: 'IOSFlowDialog',
      layer: 'Pattern',
      builtOn: 'IOSBottomDrawer + IOSDialogHeaderCenterLarge + IOSDialogFooter',
      useWhen: 'Bottom-sheet flows with richer task content, like upload and multi-step actions.',
      avoidWhen: 'Short alerts or compact feature prompts.',
      openKey: 'ios-flow',
      notes: 'Header drag-dismiss is built in. Use this instead of composing IOSBottomDrawer directly in feature code.',
    },
    {
      title: 'IOSFeatureDialog',
      layer: 'Pattern',
      builtOn: 'IOSDialog + IOSDialogHeaderCenterLarge + IOSDialogFooter',
      useWhen: 'Compact prompts with richer explanatory content, like benefits lists or feature pitches.',
      avoidWhen: 'Short alerts or full sheet flows.',
      openKey: 'ios-feature-dialog',
      notes: 'Use this when content is richer than an alert but still fits a compact dialog.',
    },
    {
      title: 'Reader BottomDrawer Pattern',
      layer: 'Pattern',
      builtOn: 'IOSBottomDrawer + IOSBottomDrawerHeader',
      useWhen: 'Reader-specific bottom drawers like Appearance and Chapters.',
      avoidWhen: 'General app modals outside the reader experience.',
      openKey: 'reader-sheet-pattern',
      notes: 'Appearance and Chapters are the current reference implementations.',
    },
  ];

  const examples: CatalogItem[] = [
    {
      title: 'DeleteBookConfirmDialog',
      layer: 'Example',
      builtOn: 'IOSAlertDialog',
      useWhen: 'Destructive confirmation example.',
      avoidWhen: 'Any flow with richer content or follow-up state.',
      openKey: 'delete-book',
    },
    {
      title: 'TranslationLimitDialog',
      layer: 'Example',
      builtOn: 'IOSFeatureDialog',
      useWhen: 'Translation limit prompt with richer explanatory copy and async request state.',
      avoidWhen: 'Creating new modal types without mapping to an existing pattern.',
      openKey: 'unlimited-limit',
    },
    {
      title: 'JoinAlphaDialog',
      layer: 'Example',
      builtOn: 'IOSAlertDialog',
      useWhen: 'Short alpha-program request prompt from profile or account surfaces.',
      avoidWhen: 'Richer monetization or limit-explainer prompts.',
      openKey: 'unlimited-alpha',
    },
    {
      title: 'UploadBookModal',
      layer: 'Example',
      builtOn: 'IOSFlowDialog',
      useWhen: 'File upload flow inside a modal.',
      avoidWhen: 'Simple one-step alerts.',
      openKey: 'upload-book',
    },
    {
      title: 'SignInToUploadModal',
      layer: 'Example',
      builtOn: 'IOSFeatureDialog',
      useWhen: 'Account gate that redirects to the canonical auth page.',
      avoidWhen: 'Provider-specific auth shortcuts inside a modal.',
      openKey: 'sign-in-upload',
    },
    {
      title: 'ReaderSettings (Appearance)',
      layer: 'Example',
      builtOn: 'IOSBottomDrawer + IOSBottomDrawerHeader',
      useWhen: 'Reader-specific settings bottom sheet.',
      avoidWhen: 'General app settings or non-reader flows.',
      openKey: 'reader-settings',
      notes: 'Reference implementation. Lives in [ReaderSettings.tsx] and is intentionally unchanged.',
    },
    {
      title: 'TableOfContents (Chapters)',
      layer: 'Example',
      builtOn: 'IOSBottomDrawer + IOSBottomDrawerHeader',
      useWhen: 'Reader chapter navigation sheet.',
      avoidWhen: 'Generic list modals elsewhere in the app.',
      openKey: 'table-of-contents',
      notes: 'Reference implementation. Lives in [TableOfContents.tsx] and is intentionally unchanged.',
    },
  ];

  return (
    <ReaderThemeProvider>
    <main className="min-h-screen bg-[var(--app-section-bg)] px-6 py-10 text-[var(--app-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="max-w-4xl">
          <p className="text-sm font-medium text-[var(--app-accent)]">Design Catalog</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            Components Preview
          </h1>
          <p className="mt-3 text-[17px] leading-[24px] text-[var(--app-text-muted)]">
            This page documents the modal stack by layer so it is obvious what can be inserted where.
          </p>
        </header>

        <Section
          title="Rules"
          description="These are the constraints for how modal code should be composed in product code."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className={`${previewPanelClassName} text-sm`}>
              <p className="font-medium">Allowed in feature code</p>
              <p className={`mt-2 ${previewMutedTextClassName}`}>
                `IOSAlertDialog`, `IOSFlowDialog`, and reader-specific sheet components built on `IOSBottomDrawer`.
              </p>
            </div>
            <div className={`${previewPanelClassName} text-sm`}>
              <p className="font-medium">Do not use directly</p>
              <p className={`mt-2 ${previewMutedTextClassName}`}>
                `IOSModalShell` and `IOSDialog` should stay in the UI layer unless you are defining a new canonical pattern.
              </p>
            </div>
            <div className={`${previewPanelClassName} text-sm`}>
              <p className="font-medium">Action weight</p>
              <p className={`mt-2 ${previewMutedTextClassName}`}>
                Use regular by default. `font-medium` is allowed only for a single primary action in light theme.
              </p>
            </div>
            <div className={`${previewPanelClassName} text-sm`}>
              <p className="font-medium">Do not hand-roll chrome</p>
              <p className={`mt-2 ${previewMutedTextClassName}`}>
                Reuse `IOSBottomDrawerHeader`, `IOSDialogHeaderCenterLarge`, and `IOSDialogFooter`. Do not rebuild modal chrome locally in feature files.
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="Buttons"
          description="Canonical button states tied to semantic tokens. Reuse these classes to keep hover/pressed behavior consistent."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className={previewPanelClassName}>
              <p className="text-sm font-medium text-[var(--app-text)]">Text Action</p>
              <p className={`mt-1 text-xs ${previewMutedTextClassName}`}>For top-bar actions like Add/Sort and low-emphasis toolbar actions.</p>
              <div className="mt-3">
                <button type="button" className={`${uiTextActionButton} h-10 px-3 text-[15px] font-medium`}>
                  Add
                </button>
                <button type="button" className={`${uiTextActionButton} ${uiTextActionButtonPressed} ml-2 h-10 px-3 text-[15px] font-medium`}>
                  Sort (Pressed)
                </button>
              </div>
            </div>

            <div className={previewPanelClassName}>
              <p className="text-sm font-medium text-[var(--app-text)]">Design-System Variants (`Button`)</p>
              <p className={`mt-1 text-xs ${previewMutedTextClassName}`}>Use these first before inventing custom button chrome. For `outline/secondary/ghost`: hover = `fill-tertiary`, pressed = `fill-secondary`.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            <div className={previewPanelClassName}>
              <p className="text-sm font-medium text-[var(--app-text)]">Design-System Sizes</p>
              <p className={`mt-1 text-xs ${previewMutedTextClassName}`}>Use size tokens for spacing consistency.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Icon">+</Button>
                <Button size="icon-sm" aria-label="Icon small">+</Button>
                <Button size="icon-lg" aria-label="Icon large">+</Button>
              </div>
            </div>

            <div className={previewPanelClassName}>
              <p className="text-sm font-medium text-[var(--app-text)]">Items Stack (Container Rule)</p>
              <p className={`mt-1 text-xs ${previewMutedTextClassName}`}>Stack owns only clipping/radius. Rows own size/hover/pressed.</p>
              <IOSItemsStack className="mt-3 border border-[var(--app-border)] bg-[var(--app-surface-bg)]">
                <button type="button" className={uiMenuItemButton}>
                  <span>Row A</span>
                  <span className="text-[var(--app-text-muted)]">›</span>
                </button>
                <div className="mx-4 h-[0.5px] bg-[var(--app-border)]" />
                <button type="button" className={uiMenuItemButton}>
                  <span>Row B</span>
                  <span className="text-[var(--app-accent)]">✓</span>
                </button>
              </IOSItemsStack>
              <p className={`mt-3 text-xs ${previewMutedTextClassName}`}>Dropdown example (compact rows)</p>
              <IOSItemsStack className="mt-2 w-full max-w-[260px] border border-[var(--app-border)] bg-[var(--app-surface-bg)]">
                <button type="button" className={uiDropdownItemButton}>
                  <span>Recently Added</span>
                  <span className="text-[var(--app-accent)]">✓</span>
                </button>
                <div className="mx-4 h-[0.5px] bg-[var(--app-border)]" />
                <button type="button" className={uiDropdownItemButton}>
                  <span>Title A → Z</span>
                </button>
              </IOSItemsStack>
              <p className={`mt-3 text-xs ${previewMutedTextClassName}`}>Drawer example (large rows)</p>
              <IOSItemsStack className="mt-2 border border-[var(--app-border)] bg-[var(--app-surface-bg)]">
                <button type="button" className={`${uiDrawerItemButton} border-b border-[var(--app-border)]`}>
                  <span>Recently Read</span>
                  <span className="text-[var(--app-accent)]">✓</span>
                </button>
                <button type="button" className={uiDrawerItemButton}>
                  <span>Title Z → A</span>
                </button>
              </IOSItemsStack>
            </div>

            <div className={previewPanelClassName}>
              <p className="text-sm font-medium text-[var(--app-text)]">Filter Pills</p>
              <p className={`mt-1 text-xs ${previewMutedTextClassName}`}>Status chips in library/store-like toolbars.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className={`${uiFilterPillBase} ${uiFilterPillActive}`}>
                  Visible
                </Button>
                <Button variant="outline" size="sm" className={`${uiFilterPillBase} ${uiFilterPillInactive}`}>
                  Archived
                </Button>
                <Button variant="outline" size="sm" className={`${uiFilterPillBase} ${uiFilterPillInactive}`}>
                  All
                </Button>
              </div>
            </div>

            <div className={previewPanelClassName}>
              <p className="text-sm font-medium text-[var(--app-text)]">IOS Action Rows</p>
              <p className={`mt-1 text-xs ${previewMutedTextClassName}`}>For modal footer decisions. Do not replace with generic `Button`.</p>
              <div className="mt-3 overflow-hidden rounded-[18px] bg-transparent">
                <div className="h-12" />
                <IOSDialogFooter>
                  <IOSActionRow>
                    <IOSAction>Cancel</IOSAction>
                    <IOSActionVerticalDivider />
                    <IOSAction emphasized>Continue</IOSAction>
                  </IOSActionRow>
                </IOSDialogFooter>
              </div>
            </div>

            <div className={`${previewPanelClassName} text-sm ${previewMutedTextClassName}`}>
              <p className="font-medium text-[var(--app-text)]">Rules</p>
              <ul className="mt-2 space-y-1">
                <li>Use `uiTextActionButton` for text-only actions and add `uiTextActionButtonPressed` when a menu is open.</li>
                <li>Use `IOSItemsStack` as the only clipping/radius owner for stacked interactive rows.</li>
                <li>Use `uiDropdownItemButton` for popover/dropdown options.</li>
                <li>Use `uiDrawerItemButton` for bottom-drawer list rows.</li>
                <li>Use `Button` variants/sizes for primary product actions.</li>
                <li>Use `IOSAction*` only inside iOS dialog footers.</li>
                <li>In reader header controls, keep visual styles by button type and always add `uiHeaderControlHitArea` for a shared touch target.</li>
                <li>Reader header controls must stay in one geometry pattern: min 44x44 and rounded corners for back, language, and overflow buttons.</li>
                <li>Do not customize `::after` hit-area offsets per header button; use `uiHeaderControlHitArea` as the single source.</li>
                <li>Do not hardcode black/white hover colors; rely on semantic fill tokens.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section
          title="Typography & Motion"
          description="Baseline semantic text roles and motion rules across app and reader-adjacent UI. Landing keeps its own subsystem voice on top of this foundation."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className={previewPanelClassName}>
              <p className="text-[var(--app-text)]" style={{ fontSize: 'var(--app-type-display-size)', lineHeight: 'var(--app-type-display-line)', letterSpacing: '-0.03em', fontWeight: 600 }}>Display</p>
              <p className="mt-3 text-[var(--app-text)]" style={{ fontSize: 'var(--app-type-title-size)', lineHeight: 'var(--app-type-title-line)', fontWeight: 600 }}>Title</p>
              <p className="mt-3 text-[var(--app-text)]" style={{ fontSize: 'var(--app-type-heading-size)', lineHeight: 'var(--app-type-heading-line)', fontWeight: 600 }}>Heading</p>
              <p className="mt-3 text-[var(--app-text)]" style={{ fontSize: 'var(--app-type-body-size)', lineHeight: 'var(--app-type-body-line)' }}>Body text should remain readable first and decorative second.</p>
              <p className="mt-3 text-[var(--app-text-muted)]" style={{ fontSize: 'var(--app-type-caption-size)', lineHeight: 'var(--app-type-caption-line)' }}>Caption text supports nearby content without competing with it.</p>
              <p className="mt-2 uppercase tracking-[0.12em] text-[var(--app-text-muted)]" style={{ fontSize: 'var(--app-type-meta-size)', lineHeight: 'var(--app-type-meta-line)', fontWeight: 600 }}>Meta label</p>
            </div>

            <div className={previewPanelClassName}>
              <p className="text-sm font-medium text-[var(--app-text)]">Motion rules</p>
              <div className={`mt-3 space-y-2 text-sm ${previewMutedTextClassName}`}>
                <p><span className="text-[var(--app-text)] font-medium">Fast:</span> `var(--motion-fast)` for small press and opacity feedback.</p>
                <p><span className="text-[var(--app-text)] font-medium">Base:</span> `var(--motion-base)` for dropdowns and standard overlay transitions.</p>
                <p><span className="text-[var(--app-text)] font-medium">Slow:</span> `var(--motion-slow)` for drawers and emphasized surface movement.</p>
                <p><span className="text-[var(--app-text)] font-medium">Standard easing:</span> `var(--motion-ease-standard)`.</p>
                <p><span className="text-[var(--app-text)] font-medium">Exit easing:</span> `var(--motion-ease-exit)`.</p>
                <p><span className="text-[var(--app-text)] font-medium">Rule:</span> hover/pressed/focus may vary by control, but timing roles should not be re-invented per component.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Which One"
          description="Pick the pattern by interaction shape first, then by content density."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className={`${previewPanelClassName} text-sm`}>
              <p className="font-medium text-[var(--app-text)]">IOSAlertDialog</p>
              <p className={`mt-2 ${previewMutedTextClassName}`}>Use for short blocking decisions, warnings, confirmations, and simple access requests.</p>
            </div>
            <div className={`${previewPanelClassName} text-sm`}>
              <p className="font-medium text-[var(--app-text)]">IOSFeatureDialog</p>
              <p className={`mt-2 ${previewMutedTextClassName}`}>Use for compact prompts with richer copy or benefits lists, but not full flows.</p>
            </div>
            <div className={`${previewPanelClassName} text-sm`}>
              <p className="font-medium text-[var(--app-text)]">IOSFlowDialog</p>
              <p className={`mt-2 ${previewMutedTextClassName}`}>Use for sheet-based tasks with custom body layout, inputs, uploads, and drag-to-dismiss.</p>
            </div>
            <div className={`${previewPanelClassName} text-sm`}>
              <p className="font-medium text-[var(--app-text)]">Reader BottomDrawer Pattern</p>
              <p className={`mt-2 ${previewMutedTextClassName}`}>Use only inside the reader for Chapters, Appearance, and other reader-specific drawers.</p>
            </div>
          </div>
        </Section>

        <Section
          title="Primitives"
          description="Low-level building blocks. These define behavior and container geometry, not product semantics."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {primitives.map((item) => (
              <CatalogCard key={item.title} item={item} onOpen={openOverlay} />
            ))}
          </div>
        </Section>

        <Section
          title="Patterns"
          description="Canonical modal patterns. Product code should choose one of these instead of inventing new layouts."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {patterns.map((item) => (
              <CatalogCard key={item.title} item={item} onOpen={openOverlay} />
            ))}
          </div>
        </Section>

        <Section
          title="Examples"
          description="Real project components grouped under the pattern they belong to."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {examples.map((item) => (
              <CatalogCard key={item.title} item={item} onOpen={openOverlay} />
            ))}
          </div>
        </Section>
      </div>

      <IOSAlertDialog
        open={activeOverlay === 'ios-alert'}
        onOpenChange={(open) => !open && closeOverlay()}
        title="Alert Title"
        description={(
          <SchematicPlaceholder
            label="Alert content"
            items={['Short description', 'Optional short supporting text']}
            className="mt-1"
          />
        )}
        confirmLabel={alertLoading ? 'Loading...' : alertDestructive ? 'Delete' : 'OK'}
        cancelLabel="Cancel"
        onConfirm={handleAlertConfirm}
        destructive={alertDestructive}
        loading={alertLoading}
        showCancel
      />

      <IOSDialog
        open={activeOverlay === 'ios-dialog'}
        onOpenChange={(open) => !open && closeOverlay()}
        className="sm:max-w-sm"
      >
        <div className="px-6 py-6">
          <SchematicPlaceholder
            label="Dialog body"
            items={['Header', 'Body content', 'Optional footer row']}
          />
        </div>
      </IOSDialog>

      <IOSFlowDialog
        open={activeOverlay === 'ios-flow'}
        onOpenChange={(open) => !open && closeOverlay()}
        title="Upload a book"
        description="Use this pattern for richer bottom-drawer tasks."
      >
        <div className="mt-5">
          <SchematicPlaceholder
            label="Flow content"
            items={['Form fields', 'Task-specific content', 'Primary flow action']}
          />
        </div>
      </IOSFlowDialog>

      <IOSFeatureDialog
        open={activeOverlay === 'ios-feature-dialog'}
        onOpenChange={(open) => !open && closeOverlay()}
        title="Save your library"
        description="Use this pattern for compact prompts with richer explanatory content."
        footer={(
          <IOSActionStack>
            <IOSAction emphasized>Continue</IOSAction>
            <IOSActionDivider />
            <IOSAction>Maybe later</IOSAction>
          </IOSActionStack>
        )}
      >
        <SchematicPlaceholder
          label="Feature content"
          items={['Benefits list', 'Short supporting copy', 'Prompt-specific details']}
        />
      </IOSFeatureDialog>

      <IOSBottomDrawer
        open={activeOverlay === 'ios-bottom-drawer'}
        onOpenChange={(open) => !open && closeOverlay()}
        dragHandle={<div className="h-1 w-10 rounded-full bg-[var(--label-tertiary)]/40" />}
        enableDragDismiss
      >
        <div className="px-5 pb-5">
          <SchematicPlaceholder
            label="Sheet container"
            items={['Optional header', 'Scrollable body', 'Optional bottom spacing']}
          />
        </div>
      </IOSBottomDrawer>

      <IOSBottomDrawer
        open={activeOverlay === 'reader-sheet-pattern'}
        onOpenChange={(open) => !open && closeOverlay()}
        labelledBy={sheetTitleId}
        describedBy={sheetDescriptionId}
        side="bottom"
        enableDragDismiss
        dragHandle={<div className="h-1 w-12 rounded-full bg-black/12 dark:bg-white/16" />}
        dragRegion={(
          <IOSBottomDrawerHeader
            title={<span id={sheetTitleId}>Appearance</span>}
            subtitle={<span id={sheetDescriptionId}>Reader controls and grouped content.</span>}
            onClose={closeOverlay}
          />
        )}
        className="mt-[max(240px,46vh)] flex h-[calc(100dvh-max(240px,46vh))] max-h-none flex-col rounded-t-[20px] bg-[var(--bg-grouped-secondary)] sm:mt-0 sm:h-auto sm:max-w-[320px] sm:rounded-[24px]"
      >
        <div className="p-5 pt-0">
          <SchematicPlaceholder
            label="Reader sheet content"
            items={['Grouped setting rows', 'Reader-specific controls', 'Chapter list or appearance controls']}
          />
        </div>
      </IOSBottomDrawer>

      <TranslationLimitDialog
        open={activeOverlay === 'unlimited-limit'}
        onOpenChange={(open) => !open && closeOverlay()}
        userEmail="preview@globoox.co"
      />

      <JoinAlphaDialog
        open={activeOverlay === 'unlimited-alpha'}
        onOpenChange={(open) => !open && closeOverlay()}
        userEmail="preview@globoox.co"
              />

      <UploadBookModal
        isOpen={activeOverlay === 'upload-book'}
        onClose={closeOverlay}
      />

      <SignInToUploadModal
        isOpen={activeOverlay === 'sign-in-upload'}
        onClose={closeOverlay}
      />

      <DeleteBookConfirmDialog
        open={activeOverlay === 'delete-book'}
        title="The Left Hand of Darkness"
        onConfirm={closeOverlay}
        onCancel={closeOverlay}
      />

      <ReaderSettings
        open={activeOverlay === 'reader-settings'}
        onOpenChange={(open) => !open && closeOverlay()}
      />

      <TableOfContents
        bookTitle="The Left Hand of Darkness"
        bookAuthor="Ursula K. Le Guin"
        coverUrl={null}
        isContentPending={false}
        chapters={[
          { number: 1, title: 'A Parade in Erhenrang' },
          { number: 2, title: 'The Place Inside the Blizzard' },
          { number: 3, title: 'The Mad King', depth: 2 },
          { number: 4, title: 'The Nineteenth Day', depth: 2 },
          { number: 5, title: 'On the Ice' },
        ]}
        currentChapter={2}
        onSelectChapter={closeOverlay}
        open={activeOverlay === 'table-of-contents'}
        onOpenChange={(open) => !open && closeOverlay()}
      />
    </main>
    </ReaderThemeProvider>
  );
}
