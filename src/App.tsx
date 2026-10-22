import { ApiWorkbench } from './api-security/ApiWorkbench';
import { ApiResources } from './api-security/ApiResources';
import { ApiDashboardPage } from './api-security/ApiDashboard';
import { useEffect, useState, lazy, Suspense, type ElementType } from 'react';
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  Grid2X2,
  Home as HomeIcon,
  Menu,
  Network,
  Search,
  Settings,
  Shield,
  UserRound,
  Users,
  Wrench,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useConsole } from './store';
import type { Workspace, Page } from './types';

import { Dialog } from './components/ui/dialog';
import { Badge, Empty, SearchInput } from './components/common';
import { Dashboard } from './components/Dashboard';
import { SecurityDashboard } from './components/SecurityDashboard';
import { Home } from './components/Home';
import { LoadBalancers, ConfigResources, ApiPages, NetworkPages } from './components/Resources';
import { SecurityEvents } from './components/Events';
import { WaapNavigation, LearningNavigation } from './navigation/WaapNavigation';
import { isReferencePage, menuPages, parentFor } from './navigation/catalog';
import { SupplementalPage } from './navigation/SupplementalPage';
import { ActivityPage } from './components/Administration';
import { Administration } from './components/Administration';
import { DemoResetControl } from './components/DemoResetControl';
import { SimulationPanel } from './components/SimulationPanel';
import { ConsoleApplication } from './components/ConsoleApplication';
import { ConsoleLab1Bar } from './components/ConsoleLab1';
import { TrainingReturn } from './training/TrainingReturn';
const TrainingCenter = lazy(() =>
  import('./training/TrainingCenter').then((module) => ({ default: module.TrainingCenter })),
);
const SecurityCatalog = lazy(() =>
  import('./components/SecurityCatalog').then((module) => ({ default: module.SecurityCatalog })),
);
const workspaces: Workspace[] = [
  'Home',
  'Web App & API Protection',
  'Multi-Cloud Network Connect',
  'Administration',
];
type NavGroup = { label: string; icon: ElementType; items: Page[] };
const nav: Record<Workspace, NavGroup[]> = {
  Home: [
    {
      label: 'Home',
      icon: HomeIcon,
      items: ['Services', 'Dashboard', 'Recent Activity', 'Training Center'],
    },
  ],
  'Web App & API Protection': [
    { label: 'Overview', icon: Grid2X2, items: ['Security', 'Overview'] },
    { label: 'Manage', icon: Wrench, items: menuPages },
    {
      label: 'Learning Lab',
      icon: BookOpen,
      items: [
        'Training Center',
        'API Quickstarts',
        'Security Analytics',
        'Security Events',
        'Bot Defense',
      ],
    },
  ],
  'Multi-Cloud Network Connect': [
    { label: 'Overview', icon: Network, items: ['Site Management', 'Connectivity'] },
    {
      label: 'Manage',
      icon: Wrench,
      items: ['Customer Edge', 'Regional Edge', 'Virtual Networks'],
    },
  ],
  Administration: [
    {
      label: 'Administration',
      icon: Settings,
      items: ['Tenant / Namespace', 'Users / Roles', 'Audit Logs', 'System Settings'],
    },
  ],
};
const defaultPage: Record<Workspace, Page> = {
  Home: 'Services',
  'Web App & API Protection': 'Overview',
  'Multi-Cloud Network Connect': 'Site Management',
  Administration: 'Tenant / Namespace',
};
export default function App() {
  const s = useConsole();
  const [lab, setLab] = useState(false);
  const [toast, setToast] = useState('');
  const [sidebar, setSidebar] = useState(false);
  const [popover, setPopover] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
      if (event.key === 'Escape') {
        setPopover('');
        setSidebar(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    setSidebar(false);
    setPopover('');
    window.scrollTo({ top: 0 });
  }, [s.workspace, s.page]);
  const go = (workspace: Workspace, page: Page) => {
    s.navigate(workspace, page);
    setPopover('');
    setSidebar(false);
  };
  const currentLb = s.lbs.find((l) => l.id === s.selectedLbId);
  const render = () => {
    if (s.page === 'Security Catalog')
      return (
        <Suspense fallback={<p role="status">Loading catalog…</p>}>
          <SecurityCatalog />
        </Suspense>
      );
    if (s.page === 'Training Center')
      return (
        <Suspense fallback={<p>Loading training guide…</p>}>
          <TrainingCenter />
        </Suspense>
      );
    if (s.workspace === 'Home')
      return <Home key={`${s.namespace}-${s.page}`} page={s.page} openLab={() => setLab(true)} />;
    if (s.workspace === 'Administration')
      return <Administration key={`${s.namespace}-${s.page}`} page={s.page} notify={notify} />;
    if (s.workspace === 'Multi-Cloud Network Connect')
      return <NetworkPages page={s.page} notify={notify} />;
    switch (s.page) {
      case 'API Quickstarts':
        return <ApiWorkbench />;
      case 'OpenAPI Files':
        return <ApiResources kind="file" />;
      case 'API Definition':
        return <ApiResources kind="definition" />;
      case 'Code Base Integration':
        return <ApiResources kind="integration" />;
      case 'Overview':
        return <Dashboard key={`${s.namespace}-${s.selectedLbId}`} openLab={() => setLab(true)} />;
      case 'Security':
        return (
          <SecurityDashboard
            key={`${s.namespace}-${s.selectedLbId}`}
            openLab={() => setLab(true)}
          />
        );
      case 'HTTP Load Balancers':
        return <LoadBalancers key={s.namespace} notify={notify} />;
      case 'Origin Pools':
        return <ConfigResources key={`origin-${s.namespace}`} kind="origin" notify={notify} />;
      case 'App Firewall':
        return <ConfigResources key={`waf-${s.namespace}`} kind="waf" notify={notify} />;
      case 'Service Policies':
        return <ConfigResources key={`policy-${s.namespace}`} kind="policy" notify={notify} />;
      case 'API Discovery':
        return (
          <ApiPages key={`discovery-${s.namespace}`} openLab={() => setLab(true)} notify={notify} />
        );
      case 'API Endpoints':
        return <ApiDashboardPage key={s.namespace} />;
      case 'API Protection':
        return (
          <ApiPages
            protection
            key={`protection-${s.namespace}`}
            openLab={() => setLab(true)}
            notify={notify}
          />
        );
      case 'Bot Defense':
        return (
          <ApiPages bot key={`bot-${s.namespace}`} openLab={() => setLab(true)} notify={notify} />
        );
      case 'Security Analytics':
        return <SecurityEvents analytics openLab={() => setLab(true)} />;
      case 'Security Events':
        return <SecurityEvents openLab={() => setLab(true)} />;
      case 'Audit Logs':
        return <ActivityPage audit />;
      default:
        return isReferencePage(s.page) ? <SupplementalPage page={s.page} /> : <Empty />;
    }
  };
  const results = [
    ...s.lbs
      .filter((l) => l.namespace === s.namespace)
      .map((l) => ({
        label: l.name,
        detail: 'HTTP Load Balancer',
        action: () => s.selectLb(l.id),
      })),
    ...Object.entries(nav).flatMap(([workspace, groups]) =>
      groups.flatMap((g) =>
        g.items.map((page) => ({
          label: page,
          detail: workspace,
          action: () => go(workspace as Workspace, page),
        })),
      ),
    ),
  ].filter((r) => `${r.label} ${r.detail}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div
      className="app-shell"
      data-page={s.page}
      data-workspace={s.workspace}
      data-lb={!!currentLb}
    >
      <a className="skip-link" href="#console-main">
        Skip to console content
      </a>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? 'sidebar-open' : ''}`}>
        <button
          className="brand"
          aria-label="XC Simulator Home"
          onClick={() => go('Home', 'Services')}
        >
          <img className="f5-logo" src="/brand/f5.ico" alt="F5" />
          <span>
            DISTRIBUTED<span>CLOUD</span>
          </span>
        </button>
        <button
          className="workspace-select"
          aria-expanded={popover === 'workspace'}
          onClick={() => setPopover(popover === 'workspace' ? '' : 'workspace')}
        >
          <Grid2X2 size={17} />
          <span>Select Workspace</span>
          <ChevronDown size={14} />
        </button>
        {popover === 'workspace' && (
          <div className="workspace-popover">
            <span className="popover-label">WORKSPACES</span>
            {workspaces.map((w) => (
              <button
                key={w}
                className={s.workspace === w ? 'selected' : ''}
                onClick={() => go(w, defaultPage[w])}
              >
                {w === 'Home' ? (
                  <HomeIcon size={16} />
                ) : w === 'Administration' ? (
                  <Settings size={16} />
                ) : w === 'Multi-Cloud Network Connect' ? (
                  <Network size={16} />
                ) : (
                  <Shield size={16} />
                )}
                <span>{w}</span>
                {s.workspace === w && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>
        )}
        <div className="workspace-title">{s.workspace}</div>
        <label className="namespace-selector">
          <span className="namespace-avatar">{s.namespace[0].toUpperCase()}</span>
          <span>
            <select
              id="console-namespace"
              name="namespace"
              aria-label="Namespace"
              value={s.namespace}
              onChange={(e) => s.setNamespace(e.target.value)}
            >
              {s.namespaces.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <small>Namespace</small>
          </span>
          <ChevronDown size={13} />
        </label>
        {s.workspace === 'Web App & API Protection' ? (
          <WaapNavigation page={s.page} onNavigate={(page) => go(s.workspace, page)} />
        ) : (
          <nav aria-label="Main navigation">
            {nav[s.workspace].map((group) => (
              <div className="nav-group" key={group.label}>
                <div className="nav-group-label">
                  <group.icon size={17} />
                  {group.label}
                </div>
                {group.items
                  .filter((page) => page !== 'Training Center')
                  .map((page) => (
                    <button
                      key={page}
                      className={`nav-item ${s.page === page ? 'active' : ''}`}
                      aria-current={s.page === page ? 'page' : undefined}
                      onClick={() => go(s.workspace, page)}
                    >
                      {page}
                    </button>
                  ))}
              </div>
            ))}
          </nav>
        )}
        <LearningNavigation
          onNavigate={(page) =>
            go(page === 'Training Center' ? 'Home' : 'Web App & API Protection', page)
          }
          onLab={() => setLab(true)}
        />
        <div className="waap-sidebar-status">
          <span className="local-status" />
          Local environment<span>v1.0</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            aria-expanded={sidebar}
            onClick={() => setSidebar((v) => !v)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb-block">
            <div className="breadcrumbs">
              <button onClick={() => go('Home', 'Services')}>Home</button>
              <ChevronRight size={12} />
              <button onClick={() => go(s.workspace, defaultPage[s.workspace])}>
                {s.workspace}
              </button>
              <ChevronRight size={12} />
              <span>{s.namespace}</span>
              <ChevronRight size={12} />
              <span>
                {['Security', 'Overview'].includes(s.page)
                  ? 'Overview'
                  : ['HTTP Load Balancers', 'Origin Pools'].includes(s.page)
                    ? 'Manage'
                    : parentFor(s.page)
                      ? 'Manage'
                      : s.page}
              </span>
              {['HTTP Load Balancers', 'Origin Pools'].includes(s.page) && (
                <>
                  <ChevronRight size={12} />
                  <span>Load Balancers</span>
                </>
              )}
            </div>
            <div className="header-context">
              {currentLb
                ? `HTTP Load Balancer: ${currentLb.name}`
                : s.page === 'Overview'
                  ? 'Performance'
                  : s.page === 'Services'
                    ? 'Home'
                    : s.page}
              <ChevronDown size={12} />
              <span>
                {s.page === 'Overview'
                  ? 'Performance Monitoring'
                  : s.page === 'Security'
                    ? 'Security Monitoring'
                    : s.page}
              </span>
            </div>
          </div>
          <div className="topbar-actions">
            <DemoResetControl
              className="console-reset-control"
              onReset={() => notify('데모 환경을 초기화했습니다.')}
            />
            <span className="xc-assistant-orb" aria-label="Local assistant" />
            <button
              className="global-search"
              aria-label="Search console"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="simulation-badge"
              aria-label="Simulation Mode"
              onClick={() => setLab(true)}
            >
              <FlaskConical size={13} />
              <span>비공식 학습용 시뮬레이터</span>
            </button>
            <div className="topbar-divider" />
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              aria-expanded={popover === 'notifications'}
              onClick={() => setPopover(popover === 'notifications' ? '' : 'notifications')}
            >
              <Bell size={19} />
              <i />
            </button>
            <a
              className="support-link"
              aria-label="F5 documentation and support"
              href="https://docs.cloud.f5.com/docs-v2"
              target="_blank"
              rel="noreferrer"
            >
              <CircleHelp size={17} />
              <span>Support</span>
              <ChevronDown size={12} />
            </a>
            <button
              className="avatar-button"
              aria-label="User menu"
              aria-expanded={popover === 'user'}
              onClick={() => setPopover(popover === 'user' ? '' : 'user')}
            >
              <UserRound size={19} />
            </button>
          </div>
          {popover === 'notifications' && (
            <div className="header-popover notifications">
              <strong>Recent notifications</strong>
              {s.activity
                .filter((a) => a.namespace === s.namespace)
                .slice(0, 4)
                .map((a) => (
                  <button key={a.id} onClick={() => go('Home', 'Recent Activity')}>
                    <span className="notification-dot" />
                    <span>
                      {a.message}
                      <small>{new Date(a.timestamp).toLocaleTimeString('en-GB')}</small>
                    </span>
                  </button>
                ))}
              <button className="resource-link" onClick={() => go('Home', 'Recent Activity')}>
                View all activity
                <ArrowRight size={13} />
              </button>
            </div>
          )}
          {popover === 'user' && (
            <div className="header-popover user-popover">
              <div>
                <strong>Demo Administrator</strong>
                <small>{s.settings.email}</small>
              </div>
              <button onClick={() => go('Administration', 'Users / Roles')}>
                <Users size={15} />
                Users & roles
              </button>
              <button onClick={() => go('Administration', 'System Settings')}>
                <Settings size={15} />
                System settings
              </button>
              <Badge tone="blue">Local simulation session</Badge>
            </div>
          )}
        </header>
        <main
          id="console-main"
          tabIndex={-1}
          className="main-content"
          onClick={() => {
            if (popover) setPopover('');
          }}
        >
          {s.storageError && (
            <div className="storage-error" role="alert">
              Browser storage is unavailable. Changes will only last for this session.
            </div>
          )}
          <ConsoleLab1Bar />
          <TrainingReturn />
          {render()}
          <footer className="app-footer">
            <span>F5 Distributed Cloud Console Simulator</span>
            <span>
              <FlaskConical size={12} />
              Educational use · All data is simulated
            </span>
          </footer>
        </main>
      </div>
      {lab && <SimulationPanel close={() => setLab(false)} notify={notify} />}
      <ConsoleApplication />
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search console"
        description={`Search navigation and load balancers in ${s.namespace}.`}
      >
        <div className="command-search">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search pages and load balancers…"
          />
          <div className="search-results">
            {results.slice(0, 15).map((r, i) => (
              <button
                key={`${r.label}-${i}`}
                onClick={() => {
                  r.action();
                  setSearchOpen(false);
                }}
              >
                <Search size={14} />
                <span>
                  {r.label}
                  <small>{r.detail}</small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
            {!results.length && <Empty title="No matching results" />}
          </div>
        </div>
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
