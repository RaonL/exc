import { useState } from 'react';
import { Play, FlaskConical, ShieldCheck, Info } from 'lucide-react';
import { useConsole } from '../store';
import type { Scenario } from '../types';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Field } from './forms';
const scenarios: Scenario[] = [
  'Normal HTTP traffic',
  'SQL Injection',
  'Command Injection',
  'Cross-site Scripting',
  'API Schema Violation',
  'Shadow API Discovery',
  'Bot Detection',
  'L7 DDoS',
  'Origin Server Failure',
  'CE Offline',
  'CE Online',
];
const descriptions: Record<Scenario, string> = {
  'Catalog Signature': 'Select a signature in Security Catalog to evaluate its stored metadata.',
  'Normal HTTP traffic': 'Generate 1,200 successful HTTP requests to the selected application.',
  'Command Injection': 'Evaluate a simulated command-injection signature. No command is executed.',
  'SQL Injection':
    'Generate 48 SQL injection requests. The attached WAF mode determines whether they are blocked or detected.',
  'Cross-site Scripting': 'Generate 48 XSS requests and evaluate the attached WAF policy.',
  'API Schema Violation':
    'Generate 48 invalid API requests. API schema protection on the LB controls blocking.',
  'Shadow API Discovery':
    'Discover an undocumented endpoint and add it to the shadow API inventory.',
  'Bot Detection': 'Generate 48 automated requests. Bot Defense on the LB controls blocking.',
  'L7 DDoS': 'Generate an 8,400-request burst. L7 DDoS protection on the LB controls blocking.',
  'Origin Server Failure':
    'Mark the selected LB’s origin pool unhealthy. Recover it in Origin Pools.',
  'CE Offline': 'Take the first CE in the namespace offline and update Connectivity.',
  'CE Online': 'Restore the first CE in the namespace and update Connectivity.',
};
export function SimulationPanel({
  close,
  notify,
}: {
  close: () => void;
  notify: (message: string) => void;
}) {
  const s = useConsole();
  const lbs = s.lbs.filter((l) => l.namespace === s.namespace);
  const [scenario, setScenario] = useState<Scenario>('SQL Injection');
  const [lbId, setLbId] = useState(
    lbs.find((l) => l.id === s.selectedLbId)?.id ?? lbs[0]?.id ?? '',
  );
  const [result, setResult] = useState('');
  const [path, setPath] = useState('/api/v1/products');
  const [method, setMethod] = useState('GET');
  const [signatureState, setSignatureState] = useState<'Existing' | 'New' | 'Updated'>('Existing');
  return (
    <Dialog
      open
      onOpenChange={close}
      title="Simulation Lab"
      description="Explore application security with controlled, local demo scenarios."
    >
      <div className="resource-form">
        <div className="lab-banner">
          <FlaskConical size={26} />
          <div>
            <strong>Your safe training environment</strong>
            <p>No traffic is sent. All results are simulated in your browser.</p>
          </div>
        </div>
        <Field label="Target HTTP Load Balancer">
          <select value={lbId} onChange={(e) => setLbId(e.target.value)}>
            <option value="" disabled>
              Select a load balancer
            </option>
            {lbs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scenario">
          <select
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value as Scenario);
              setResult('');
            }}
          >
            {scenarios.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Request Method">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Request Path">
            <input
              value={path}
              placeholder="/api/v1/products"
              onChange={(e) => setPath(e.target.value)}
            />
          </Field>
        </div>
        {['SQL Injection', 'Cross-site Scripting'].includes(scenario) && (
          <Field label="Signature State">
            <select
              value={signatureState}
              onChange={(e) => setSignatureState(e.target.value as 'Existing' | 'New' | 'Updated')}
            >
              <option>Existing</option>
              <option>New</option>
              <option>Updated</option>
            </select>
          </Field>
        )}
        <div className="scenario-description">
          <Info size={17} />
          <p>{descriptions[scenario]}</p>
        </div>
        {result && (
          <div className="simulation-result" role="status">
            <ShieldCheck size={20} />
            {result}
          </div>
        )}
        <div className="form-footer">
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          <Button
            disabled={!lbId}
            onClick={() => {
              const message = s.simulate(scenario, lbId, { path, method, signatureState });
              setResult(message);
              notify(message);
            }}
          >
            <Play size={14} />
            Run scenario
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
