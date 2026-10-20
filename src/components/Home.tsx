import {
  ArrowRight,
  ShieldCheck,
  Network,
  Settings,
  Globe2,
  Activity,
  Layers,
  Server,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import { useConsole } from '../store';
import { Badge, Card, Empty, PageHeading, Stat, TextLink, time } from './common';
import { Button } from './ui/button';
import { ActivityPage } from './Administration';
import type { Workspace, Page } from '../types';
import { ConsoleHome } from './ConsoleHome';
export function Home({ page, openLab }: { page: string; openLab: () => void }) {
  const s = useConsole();
  const lbs = s.lbs.filter((l) => l.namespace === s.namespace);
  const activity = s.activity.filter((a) => a.namespace === s.namespace);
  if (page === 'Recent Activity') return <ActivityPage />;
  if (page === 'Services') return <ConsoleHome />;
  const services: {
    name: Workspace;
    description: string;
    icon: typeof ShieldCheck;
    page: Page;
    color: string;
  }[] = [
    {
      name: 'Web App & API Protection',
      description: 'Protect applications and APIs with WAF, bot mitigation, and API security.',
      icon: ShieldCheck,
      page: 'Overview',
      color: 'blue',
    },
    {
      name: 'Multi-Cloud Network Connect',
      description: 'Connect and observe your distributed customer and regional edge sites.',
      icon: Network,
      page: 'Site Management',
      color: 'purple',
    },
    {
      name: 'Administration',
      description: 'Manage tenant namespaces, demo users, audit logs, and local settings.',
      icon: Settings,
      page: 'Tenant / Namespace',
      color: 'teal',
    },
  ];
  return (
    <>
      <PageHeading
        title={page === 'Dashboard' ? 'Tenant Dashboard' : 'Welcome to Distributed Cloud'}
        description="Your applications. Your infrastructure. One connected view."
      >
        <Badge tone="blue">{s.settings.tenant}</Badge>
      </PageHeading>
      {page === 'Services' && (
        <div className="home-hero">
          <div>
            <span className="eyebrow">F5 DISTRIBUTED CLOUD SERVICES</span>
            <h2>Explore. Configure. Protect.</h2>
            <p>
              A hands-on environment for learning application delivery,
              <br />
              API security, and multi-cloud connectivity.
            </p>
            <Button onClick={openLab}>
              <FlaskConical size={16} />
              Open Simulation Lab
              <ArrowRight size={15} />
            </Button>
          </div>
          <div className="hero-orbit">
            <div className="orbit-ring ring-two" />
            <div className="orbit-ring" />
            <div className="hero-cloud">
              <Globe2 size={49} />
            </div>
            <div className="orbit-icon orbit-1">
              <ShieldCheck />
            </div>
            <div className="orbit-icon orbit-2">
              <Server />
            </div>
            <div className="orbit-icon orbit-3">
              <Layers />
            </div>
          </div>
        </div>
      )}
      <div className="home-section-title">
        <h2>{page === 'Services' ? 'Your workspaces' : 'Tenant resources'}</h2>
        <span className="muted">Namespace: {s.namespace}</span>
      </div>
      {page === 'Services' ? (
        <div className="service-cards">
          {services.map((service) => (
            <button
              className="service-card"
              key={service.name}
              onClick={() => s.navigate(service.name, service.page)}
            >
              <div className={`service-icon ${service.color}`}>
                <service.icon size={25} />
              </div>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <span>
                Open workspace <ArrowRight size={15} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="metric-cards">
          <Card>
            <Stat
              label="HTTP Load Balancers"
              value={lbs.length}
              onClick={() => s.navigate('Web App & API Protection', 'HTTP Load Balancers')}
            />
          </Card>
          <Card>
            <Stat
              label="App Firewalls"
              value={s.wafs.filter((w) => w.namespace === s.namespace).length}
              onClick={() => s.navigate('Web App & API Protection', 'App Firewall')}
            />
          </Card>
          <Card>
            <Stat
              label="Online Customer Edges"
              value={
                s.sites.filter(
                  (site) => site.namespace === s.namespace && site.kind === 'CE' && site.online,
                ).length
              }
              onClick={() => s.navigate('Multi-Cloud Network Connect', 'Connectivity')}
            />
          </Card>
        </div>
      )}
      <div className="home-bottom">
        <Card
          title="Recent Activity"
          action={
            <TextLink onClick={() => s.navigate('Home', 'Recent Activity')}>
              View all activity
            </TextLink>
          }
        >
          {activity.length ? (
            <div className="activity-list">
              {activity.slice(0, 5).map((a) => (
                <div key={a.id}>
                  <div className="activity-icon">
                    <Activity size={15} />
                  </div>
                  <div>
                    <strong>{a.message}</strong>
                    <small>
                      {a.actor} · {time(a.timestamp)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No recent activity"
              description="Create a resource or run a simulation to get started."
            />
          )}
        </Card>
        <Card title="Start learning">
          <div className="learning-card">
            <div className="learning-icon">
              <BookOpen size={23} />
            </div>
            <h3>Build your first protected application</h3>
            <p>
              Create an origin pool, configure an HTTP load balancer, attach a firewall, and
              simulate an attack.
            </p>
            <Button
              variant="outline"
              onClick={() => s.navigate('Web App & API Protection', 'HTTP Load Balancers')}
            >
              Manage load balancers
              <ArrowRight size={14} />
            </Button>
            <a
              href="https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection"
              target="_blank"
              rel="noreferrer"
            >
              Explore official F5 documentation ↗
            </a>
          </div>
        </Card>
      </div>
    </>
  );
}
