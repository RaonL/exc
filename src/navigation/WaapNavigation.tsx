import { useEffect, useRef, useState } from 'react';
import { Bell, BookOpen, ChevronRight, FlaskConical, Grid2X2, Info, Wrench } from 'lucide-react';
import type { Page } from '../types';
import { manageMenu, supportMenu, type MenuEntry } from './catalog';

export function WaapNavigation({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  const [open, setOpen] = useState('');
  const [top, setTop] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    setOpen('');
  }, [page]);
  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen('');
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const entries = (items: MenuEntry[]) =>
    items.map((m) => {
      const active = m.page === page || m.children?.some((c) => c.page === page);
      const expand = (button: HTMLButtonElement) => {
        trigger.current = button;
        setTop(Math.max(8, Math.min(button.getBoundingClientRect().top, window.innerHeight - 300)));
        setOpen((v) => (v === m.label ? '' : m.label));
      };
      return (
        <div key={m.label} data-menu-entry={m.label}>
          <button
            type="button"
            className={`nav-item ${active ? 'active' : ''}`}
            aria-current={m.page === page ? 'page' : undefined}
            aria-expanded={m.children ? open === m.label : undefined}
            aria-controls={
              m.children ? `waap-menu-${m.label.replaceAll(/[^a-z0-9]/gi, '-')}` : undefined
            }
            onClick={(e) => (m.children ? expand(e.currentTarget) : onNavigate(m.page!))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' && m.children) {
                e.preventDefault();
                expand(e.currentTarget);
                requestAnimationFrame(() =>
                  ref.current?.querySelector<HTMLButtonElement>('.waap-flyout button')?.focus(),
                );
              }
            }}
          >
            <span>{m.label}</span>
            {m.earlyAccess && <small className="waap-ea">EA</small>}
            {m.children && <ChevronRight size={13} />}
          </button>
          {m.children && open === m.label && (
            <div
              id={`waap-menu-${m.label.replaceAll(/[^a-z0-9]/gi, '-')}`}
              className="waap-flyout"
              style={{ top }}
              role="group"
              aria-label={`${m.label} submenu`}
            >
              {m.children.map((c) => (
                <button
                  key={c.page}
                  className={c.page === page ? 'active' : ''}
                  type="button"
                  aria-current={c.page === page ? 'page' : undefined}
                  onClick={() => {
                    setOpen('');
                    onNavigate(c.page);
                  }}
                >
                  {c.label}
                </button>
              ))}
              {m.children.some((c) => c.basis === 'documented') && (
                <small>문서 기준 · 실제 펼침 캡처 미확인 항목 포함</small>
              )}
            </div>
          )}
        </div>
      );
    });
  return (
    <nav
      ref={ref}
      className="waap-navigation"
      aria-label="Main navigation"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen('');
          trigger.current?.focus();
        }
      }}
    >
      <div className="nav-group">
        <div className="nav-group-label">
          <Grid2X2 size={17} />
          Overview
        </div>
        <button
          className={`nav-item ${page === 'Security' ? 'active' : ''}`}
          onClick={() => onNavigate('Security')}
        >
          Security
        </button>
        <button
          className={`nav-item ${page === 'Overview' ? 'active' : ''}`}
          onClick={() => onNavigate('Overview')}
        >
          Performance
        </button>
      </div>
      <div className="nav-group" aria-label="Manage">
        <div className="nav-group-label">
          <Wrench size={17} />
          Manage
        </div>
        {entries(manageMenu)}
      </div>
      <div className="waap-support-navigation">
        {supportMenu.map((m) => (
          <section key={m.label}>
            <span aria-hidden="true">
              {m.label === 'Notifications' ? <Bell size={18} /> : <Info size={18} />}
            </span>
            {entries([m])}
            <small>
              {m.label === 'Notifications'
                ? 'Alerts, Audit Logs'
                : m.label === 'References'
                  ? 'Attack Signatures'
                  : 'About'}
            </small>
          </section>
        ))}
      </div>
    </nav>
  );
}

export function LearningNavigation({
  onNavigate,
  onLab,
}: {
  onNavigate: (page: Page) => void;
  onLab: () => void;
}) {
  return (
    <div className="waap-learning-navigation">
      <details>
        <summary>
          <BookOpen size={16} />
          Learning Lab <small>Class 1–9</small>
        </summary>
        <button onClick={() => onNavigate('Training Center')}>
          <BookOpen size={15} />
          Training Center · Class 1–9
        </button>
        <button onClick={() => onNavigate('API Quickstarts')}>API Quickstarts</button>
        <button onClick={onLab}>
          <FlaskConical size={15} />
          Simulation Lab
        </button>
        {(
          ['Security Catalog', 'Security Analytics', 'Security Events', 'Bot Defense'] as const
        ).map((p) => (
          <button key={p} onClick={() => onNavigate(p)}>
            {p}
          </button>
        ))}
        <a href="https://docs.cloud.f5.com/docs-v2" target="_blank" rel="noreferrer">
          Documentation ↗
        </a>
      </details>
    </div>
  );
}
