import { useCallback, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ChevronLeft,
  FileJson,
  BookOpen,
  HelpCircle,
  Search,
  X,
  Save,
  Settings2,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge, download } from './common';
import { ConfigurationReadView } from './ConfigurationReadView';
import { useConsole } from '../store';
import { guideFields, type GuideField, type GuideStep } from '../training/console-guide';
import { GuideFieldContext } from '../training/GuideFieldContext';
import { ConsoleGuidePanel } from '../training/ConsoleGuidePanel';
import { effectiveEnvironment, useTraining } from '../training/store';
import { labById } from '../training/catalog';
import { resourceGuideFields } from '../training/lab-guide';
import { LabGuidePanel } from '../training/LabGuidePanel';
import { ConfigurationChecklist } from '../api-security/GuideChecklist';
export interface ConfigSection {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  onReset?: () => void;
}
export function ConfigurationEditor({
  kind,
  name,
  namespace,
  sections,
  value,
  onSave,
  close,
  error,
  guide,
  readOnly = false,
  onEdit,
  submitLabel,
  cancelLabel,
  onReset,
  collapsible = false,
  className = '',
  resourceContext,
  onCancelAll,
  toolbarActions,
  initialSection,
}: {
  kind: string;
  name: string;
  namespace: string;
  sections: ConfigSection[];
  value: unknown;
  onSave: (e: FormEvent) => void;
  close: () => void;
  error?: string;
  guide: string;
  readOnly?: boolean;
  onEdit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  onReset?: () => void;
  collapsible?: boolean;
  className?: string;
  resourceContext?: { title: string; trail: string[] };
  onCancelAll?: () => void;
  toolbarActions?: ReactNode;
  initialSection?: string;
}) {
  const editorId = useId();
  const consoleForm = [
    'HTTP Load Balancer',
    'App Firewall',
    'Origin Pool',
    'Origin Server',
    'Health Check',
  ].includes(kind);
  const [view, setView] = useState('Form');
  const [active, setActive] = useState(initialSection ?? sections[0].id);
  const scrollToInitialSection = useCallback((node: HTMLElement | null) => {
    node?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, []);
  const [query, setQuery] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [guideFocus, setGuideFocus] = useState('');
  const consoleState = useConsole();
  const class1Guided =
    !!consoleState.consoleLab1 &&
    consoleState.consoleLab1.namespace === namespace &&
    [
      'Origin Pool',
      'Origin Server',
      'HTTP Load Balancer',
      'Origin Pool with Weight and Priority',
    ].includes(kind);
  const guideStep: GuideStep =
    kind === 'Origin Pool' || kind === 'Origin Server'
      ? 'origin'
      : kind === 'HTTP Load Balancer' && consoleState.consoleLab1?.guideStep === 'waf'
        ? 'waf'
        : 'lb';
  const training = useTraining();
  const activeSession = Object.entries(training.sessions).find(
    ([id, session]) => id !== 'c1-lab1' && session.environment.lb.namespace === namespace,
  );
  const activeLab = activeSession ? labById(activeSession[0]) : undefined;
  const activeEnvironment = activeSession ? effectiveEnvironment(activeSession[1]) : undefined;
  const otherHints =
    activeLab && activeEnvironment
      ? resourceGuideFields(activeLab, activeEnvironment, kind, value)
      : [];
  const guided = class1Guided || otherHints.length > 0;
  const hints = class1Guided ? guideFields(kind, value, consoleState, guideStep) : otherHints;
  const currentHint =
    hints.find((field) => field.id === guideFocus)?.id ??
    hints.find((field) => !field.pass)?.id ??
    hints[0]?.id ??
    '';
  const body = useRef<HTMLDivElement>(null);
  const jump = (id: string) => {
    setView('Form');
    setActive(id);
    setQuery('');
    setCollapsed((items) => items.filter((item) => item !== id));
    requestAnimationFrame(() =>
      body.current
        ?.querySelector(`[data-section="${id}"]`)
        ?.scrollIntoView({ block: 'start', behavior: 'instant' }),
    );
  };
  const locateGuideField = (field: GuideField) => {
    setGuideFocus(field.id);
    if (field.section) jump(field.section);
    requestAnimationFrame(() => {
      const target = body.current?.querySelector<HTMLElement>(`[data-guide-field="${field.id}"]`);
      target?.scrollIntoView({ block: 'center', behavior: 'instant' });
      target
        ?.querySelector<HTMLElement>(
          'input:not([hidden]):not([aria-label^="Search"]),select:not([hidden]),textarea,button',
        )
        ?.focus({ preventScroll: true });
    });
  };
  return (
    <Dialog.Root open onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          onEscapeKeyDown={(event) => {
            if (body.current?.querySelector('.xc-select [aria-expanded="true"]'))
              event.preventDefault();
          }}
          data-mode={readOnly ? 'view' : name ? 'edit' : 'new'}
          className={`config-editor ${['HTTP Load Balancer', 'Origin Pool', 'Origin Server', 'Health Check', 'Origin Pool with Weight and Priority', 'App Firewall', 'Simple WAF Exclusion Rule', 'WAF Exclusion Rules'].includes(kind) ? 'reference-editor' : ''} ${className}`}
          aria-describedby={`${editorId}-description`}
        >
          <ConfigurationChecklist />
          <header className="config-header">
            <button className="config-back" onClick={close} aria-label="Back to resource list">
              <ChevronLeft size={17} />
            </button>
            <div>
              <Dialog.Title>
                {kind}
                {name && <span> / {name}</span>}
              </Dialog.Title>
              <Dialog.Description id={`${editorId}-description`}>
                Namespace: {namespace} · Local simulation configuration
              </Dialog.Description>
            </div>
            <Badge tone="blue">Simulation Mode</Badge>
            <button className="icon-button" aria-label="Close configuration" onClick={close}>
              <X size={19} />
            </button>
          </header>
          <div className="config-viewbar">
            <div className="config-view-tabs" role="tablist" aria-label="Configuration view">
              {['Form', 'Documentation', 'JSON'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`${editorId}-tab-${tab}`}
                  aria-selected={view === tab}
                  aria-controls={`${editorId}-panel`}
                  tabIndex={view === tab ? 0 : -1}
                  className={view === tab ? 'active' : ''}
                  onClick={() => setView(tab)}
                  onKeyDown={(event) => {
                    const tabs = ['Form', 'Documentation', 'JSON'];
                    const index = tabs.indexOf(tab);
                    const next =
                      event.key === 'ArrowRight'
                        ? (index + 1) % 3
                        : event.key === 'ArrowLeft'
                          ? (index + 2) % 3
                          : event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? 2
                              : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    setView(tabs[next]);
                    event.currentTarget.parentElement
                      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                      [next]?.focus();
                  }}
                >
                  {tab === 'JSON' && <FileJson size={13} />} {tab}
                </button>
              ))}
            </div>
            {consoleForm && <span className="editor-learning-label">비공식 학습용 시뮬레이터</span>}
            {onReset && !readOnly && (
              <button
                type="button"
                className="config-reset-all"
                aria-label="Reset all configuration fields"
                title="Restore values from when this form was opened"
                onClick={() => {
                  onReset();
                  setCollapsed([]);
                }}
              >
                <RotateCcw size={13} /> Reset All Fields
              </button>
            )}
            {!readOnly && toolbarActions}
            <label className="config-find">
              <Search size={13} />
              <input
                id={`${editorId}-search`}
                name="configuration-section-search"
                placeholder="Find a section"
                aria-label="Find configuration section"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="advanced-toggle">
              <input
                id={`${editorId}-advanced`}
                name="configuration-advanced-fields"
                type="checkbox"
                checked={advanced}
                onChange={(e) => setAdvanced(e.target.checked)}
              />
              Show Advanced Fields
            </label>
            {readOnly && onEdit && (
              <button type="button" className="xc-edit-configuration" onClick={onEdit}>
                <Settings2 size={19} /> Edit Configuration
              </button>
            )}
          </div>
          <GuideFieldContext.Provider value={{ fields: hints, current: currentHint }}>
            <form
              onSubmit={(event) => {
                event.stopPropagation();
                onSave(event);
              }}
              className={`config-layout ${advanced ? 'show-advanced' : ''} ${guided ? 'with-console-guide' : ''}`}
              onInvalidCapture={(event) => {
                const section = (event.target as HTMLElement).closest<HTMLElement>(
                  '[data-section]',
                );
                if (section?.dataset.section) {
                  setCollapsed((items) => items.filter((id) => id !== section.dataset.section));
                  if ((event.target as HTMLElement).closest('[hidden]')) {
                    event.preventDefault();
                    const control = event.target as HTMLInputElement;
                    requestAnimationFrame(() => {
                      control.focus();
                      control.reportValidity();
                    });
                  }
                }
              }}
            >
              <aside className="config-navigation">
                <div className="config-resource">
                  <Badge tone={readOnly ? 'blue' : 'amber'}>
                    {readOnly ? 'View' : name ? 'Edit' : 'New'}
                  </Badge>
                  <strong>{resourceContext?.title ?? kind}</strong>
                  <small>{name || 'New configuration'}</small>
                  {consoleForm && (
                    <span className="editor-namespace">
                      Namespace <strong>{namespace}</strong>
                    </span>
                  )}
                  {resourceContext && (
                    <ol className="config-resource-trail" aria-label="Parent configuration path">
                      {resourceContext.trail.map((item, index) => (
                        <li key={`${index}-${item}`}>{item}</li>
                      ))}
                    </ol>
                  )}
                </div>
                <nav aria-label="Configuration sections">
                  {sections
                    .filter((section) => section.title.toLowerCase().includes(query.toLowerCase()))
                    .map((section) => (
                      <button
                        type="button"
                        className={active === section.id ? 'active' : ''}
                        aria-current={active === section.id ? 'location' : undefined}
                        onClick={() => jump(section.id)}
                        key={section.id}
                      >
                        {section.title}
                      </button>
                    ))}
                </nav>
                <a href={guide} target="_blank" rel="noreferrer">
                  <BookOpen size={14} />
                  Official F5 guide ↗
                </a>
              </aside>
              <div
                className="config-main"
                ref={body}
                role="tabpanel"
                id={`${editorId}-panel`}
                aria-labelledby={`${editorId}-tab-${view}`}
              >
                {view === 'Form' && (
                  <fieldset>
                    {sections
                      .filter((section) =>
                        section.title.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((section) => (
                        <section
                          className="config-section"
                          data-section={section.id}
                          ref={section.id === initialSection ? scrollToInitialSection : undefined}
                          key={section.id}
                        >
                          <div className="config-section-heading">
                            <h2>{section.title}</h2>
                            <HelpCircle size={13} />
                            <div className="config-section-actions">
                              {section.onReset && !readOnly && (
                                <button
                                  type="button"
                                  aria-label={`Reset ${section.title}`}
                                  title="Restore this section's opened values"
                                  onClick={section.onReset}
                                >
                                  <RotateCcw size={12} /> Reset All Fields
                                </button>
                              )}
                              {collapsible && (
                                <button
                                  type="button"
                                  aria-label={`${collapsed.includes(section.id) ? 'Expand' : 'Collapse'} ${section.title}`}
                                  aria-expanded={!collapsed.includes(section.id)}
                                  aria-controls={`${editorId}-section-${section.id}`}
                                  onClick={() =>
                                    setCollapsed((items) =>
                                      items.includes(section.id)
                                        ? items.filter((id) => id !== section.id)
                                        : [...items, section.id],
                                    )
                                  }
                                >
                                  <ChevronUp
                                    size={15}
                                    className={collapsed.includes(section.id) ? 'is-collapsed' : ''}
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                          <div
                            className="config-section-body"
                            id={`${editorId}-section-${section.id}`}
                            hidden={collapsed.includes(section.id)}
                          >
                            {section.description && (
                              <p className="config-section-description">{section.description}</p>
                            )}
                            {readOnly ? (
                              <ConfigurationReadView
                                kind={kind}
                                id={section.id}
                                value={value}
                                fallback={section.content}
                              />
                            ) : (
                              section.content
                            )}
                          </div>
                        </section>
                      ))}
                  </fieldset>
                )}
                {view === 'JSON' && (
                  <div className="config-json">
                    <div>
                      <h2>Configuration JSON</h2>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          download(
                            `${name || 'resource'}-configuration.json`,
                            JSON.stringify(value, null, 2),
                          )
                        }
                      >
                        Download JSON
                      </Button>
                    </div>
                    <p>Simulator data model. This is not a payload for the F5 API.</p>
                    <pre>{JSON.stringify(value, null, 2)}</pre>
                  </div>
                )}
                {view === 'Documentation' && (
                  <div className="config-documentation">
                    <BookOpen size={30} />
                    <h2>{kind} configuration guide</h2>
                    <p>
                      Use the official guide to compare each configuration section with the F5
                      Distributed Cloud Console. This editor implements a training subset with local
                      data.
                    </p>
                    <a href={guide} target="_blank" rel="noreferrer">
                      Read official F5 documentation ↗
                    </a>
                    <h3>Sections in this simulator</h3>
                    {sections.map((section) => (
                      <button type="button" key={section.id} onClick={() => jump(section.id)}>
                        <Settings2 size={14} />
                        {section.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {class1Guided && (
                <ConsoleGuidePanel
                  fields={hints}
                  step={guideStep}
                  kind={kind}
                  current={currentHint}
                  onLocate={locateGuideField}
                  readOnly={readOnly}
                />
              )}
              {!class1Guided && otherHints.length > 0 && activeLab && activeEnvironment && (
                <LabGuidePanel
                  lab={activeLab}
                  fields={hints}
                  current={currentHint}
                  onLocate={locateGuideField}
                  readOnly={readOnly}
                  inEditor
                  saved={
                    ['HTTP Load Balancer', 'App Firewall', 'Origin Pool'].includes(kind) &&
                    resourceGuideFields(
                      activeLab,
                      activeEnvironment,
                      kind,
                      kind === 'HTTP Load Balancer'
                        ? activeEnvironment.lb
                        : kind === 'App Firewall'
                          ? activeEnvironment.waf
                          : (activeEnvironment.origins.find((o) => o.name === name) ??
                            activeEnvironment.origins[0]),
                    ).every((f) => f.pass)
                  }
                />
              )}
              <footer className="config-footer">
                {error && (
                  <div role="alert" className="config-error">
                    {error}
                  </div>
                )}
                <span>Changes apply to your local training environment.</span>
                {onCancelAll && (
                  <Button type="button" variant="outline" onClick={onCancelAll}>
                    Cancel and Exit
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={close}>
                  {cancelLabel ?? 'Cancel and Exit'}
                </Button>
                {readOnly ? (
                  onEdit && (
                    <Button
                      key="edit-configuration"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        onEdit?.();
                      }}
                    >
                      Edit Configuration
                    </Button>
                  )
                ) : (
                  <Button key="save-configuration" type="submit">
                    <Save size={14} />
                    {submitLabel ?? 'Save and Exit'}
                  </Button>
                )}
              </footer>
            </form>
          </GuideFieldContext.Provider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
