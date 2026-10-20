import { useState } from 'react';
import {
  ShieldCheck,
  Network,
  Layers,
  Globe2,
  Bot,
  BrainCircuit,
  Fingerprint,
  ScanLine,
  Hexagon,
  Server,
  Cloud,
  ChevronRight,
  Grid2X2,
} from 'lucide-react';
import { useConsole } from '../store';
import { Dialog } from './ui/dialog';
export function ConsoleHome() {
  const s = useConsole();
  const [unavailable, setUnavailable] = useState('');
  const cards = [
    [
      'Web App & API Protection',
      'Create a load balancer and configure WAF, Bot, and API security services for your apps',
      ShieldCheck,
      () => s.navigate('Web App & API Protection', 'Security'),
    ],
    [
      'Multi-Cloud Network Connect',
      'Networking & security across clouds, edge and on-premises',
      Network,
      () => s.navigate('Multi-Cloud Network Connect', 'Site Management'),
    ],
    [
      'Multi-Cloud App Connect',
      'Connect apps across clouds, edge and on-premises using Load Balancers',
      Layers,
      () => s.navigate('Web App & API Protection', 'HTTP Load Balancers'),
    ],
    ['Distributed Apps', 'Deploy apps in our global PoPs (REs) or your cloud/edge sites', Grid2X2],
    ['DNS Management', 'Configure and manage primary or secondary DNS service', Globe2],
    [
      'Bot Defense',
      'Deploy bot mitigation for F5 BIG-IP and other 3rd party services',
      Bot,
      () => s.navigate('Web App & API Protection', 'Bot Defense'),
    ],
    ['Data Intelligence', 'Advance Your Security Intelligence and Fraud Defenses', BrainCircuit],
    [
      'Client-Side Defense',
      'Monitor and mitigate fraudulent app requests at the client devices',
      Fingerprint,
    ],
    [
      'Web App Scanning',
      'Run automated penetration tests to catch and fix security vulnerabilities in your web apps',
      ScanLine,
      () => s.navigate('Home', 'Training Center'),
    ],
    ['NGINX One', 'View, monitor, secure, and configure your NGINX fleet.', Hexagon],
    [
      'BIG-IP Utilities',
      'Monitor the health of all of your BIG-IP systems in a single place',
      Server,
    ],
    ['Content Delivery Network', 'Optimize asset delivery with content caching', Cloud],
  ] as const;
  return (
    <section className="xc-home">
      <h1>Welcome to the F5 Distributed Cloud Console</h1>
      <p>
        F5 Distributed Cloud Console delivers a set of networking, security, and app
        <br className="desktop-break" /> management services that can be used to solve various
        use-cases.
      </p>
      <div className="xc-home-heading">
        <h2>Common workspaces</h2>
        <button onClick={() => setUnavailable('Workspace Catalog')}>
          <Grid2X2 size={21} /> View Catalog
        </button>
      </div>
      <div className="xc-workspaces">
        {cards.map(([name, description, Icon, action]) => (
          <button
            className="xc-workspace-card"
            key={name}
            onClick={() => (action ? action() : setUnavailable(name))}
          >
            <Icon size={46} />
            <h3>
              {name}
              <ChevronRight size={21} />
            </h3>
            <p>{description}</p>
          </button>
        ))}
      </div>
      <div className="xc-home-learning">
        <button onClick={() => s.navigate('Home', 'Training Center')}>
          Training Center · Class 1–9
        </button>
        <span>비공식 학습용 시뮬레이터 · LOCAL ONLY</span>
      </div>
      {unavailable && (
        <Dialog open title={unavailable} onOpenChange={() => setUnavailable('')}>
          <p>
            이 서비스는 미구현입니다. 현재 로컬 실습 범위는 WAAP·Load Balancer 및 Class 1–9입니다.
          </p>
        </Dialog>
      )}
    </section>
  );
}
