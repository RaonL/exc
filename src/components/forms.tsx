import { useState, type FormEvent } from 'react';
import { useConsole } from '../store';
import type { Origin, Waf, Policy, User } from '../types';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Field } from './form-fields';
export { Field, ToggleField } from './form-fields';
export { LBForm } from './LoadBalancerEditor';
export function FormFooter({
  onClose,
  label = 'Save configuration',
}: {
  onClose: () => void;
  label?: string;
}) {
  return (
    <div className="form-footer">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit">{label}</Button>
    </div>
  );
}
type ResourceType = 'origin' | 'waf' | 'policy' | 'namespace' | 'user';
export function ResourceForm({
  type,
  initial,
  close,
  notify,
}: {
  type: ResourceType;
  initial?: Origin | Waf | Policy | User;
  close: () => void;
  notify: (message: string) => void;
}) {
  const s = useConsole();
  const [name, setName] = useState(initial?.name ?? '');
  const [endpoint, setEndpoint] = useState(
    initial && 'endpoint' in initial ? initial.endpoint : '',
  );
  const [port, setPort] = useState(initial && 'port' in initial ? initial.port : 8080);
  const [mode, setMode] = useState<Waf['mode']>(
    initial && 'mode' in initial ? initial.mode : 'Blocking',
  );
  const [action, setAction] = useState<Policy['action']>(
    initial && 'action' in initial ? initial.action : 'Allow',
  );
  const [email, setEmail] = useState(initial && 'email' in initial ? initial.email : '');
  const [role, setRole] = useState<User['role']>(
    initial && 'role' in initial ? initial.role : 'Operator',
  );
  const [error, setError] = useState('');
  const labels = {
    origin: 'Origin Pool',
    waf: 'App Firewall',
    policy: 'Service Policy',
    namespace: 'Namespace',
    user: 'User',
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (type !== 'user' && !/^[a-z][a-z0-9-]{1,62}$/.test(cleanName))
      return setError('Use 2–63 lowercase letters, numbers or hyphens, starting with a letter.');
    const collection =
      type === 'origin' ? s.origins : type === 'waf' ? s.wafs : type === 'policy' ? s.policies : [];
    if (
      collection.some(
        (item) =>
          item.namespace === s.namespace && item.name === cleanName && item.id !== initial?.id,
      ) ||
      (type === 'namespace' && s.namespaces.includes(cleanName))
    )
      return setError('This name already exists.');
    const id = initial?.id ?? crypto.randomUUID();
    if (type === 'origin') {
      if (
        !/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)$/.test(endpoint) ||
        (/^\d+(\.\d+){3}$/.test(endpoint) && endpoint.split('.').some((n) => Number(n) > 255))
      )
        return setError('Enter a valid hostname or IPv4 address without a protocol.');
      s.saveOrigin({
        id,
        namespace: s.namespace,
        name: cleanName,
        endpoint,
        port,
        healthy: initial && 'healthy' in initial ? initial.healthy : true,
      });
    }
    if (type === 'waf') s.saveWaf({ id, namespace: s.namespace, name: cleanName, mode });
    if (type === 'policy')
      s.savePolicy({
        id,
        namespace: s.namespace,
        name: cleanName,
        action,
        enabled: initial && 'enabled' in initial ? initial.enabled : true,
      });
    if (type === 'namespace') s.addNamespace(cleanName);
    if (type === 'user') {
      if (s.users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id))
        return setError('A user with this email already exists.');
      s.saveUser({ id, name: cleanName, email, role });
    }
    notify(`${labels[type]} saved`);
    close();
  };
  return (
    <Dialog open onOpenChange={close} title={`${initial ? 'Edit' : 'Add'} ${labels[type]}`}>
      <form onSubmit={submit} className="resource-form">
        <Field label="Name *">
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'user' ? 'Full name' : 'resource-name'}
          />
        </Field>
        {type === 'origin' && (
          <div className="form-grid">
            <Field label="Origin server *">
              <input
                required
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="10.10.1.10"
              />
            </Field>
            <Field label="Port *">
              <input
                type="number"
                required
                min={1}
                max={65535}
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
              />
            </Field>
          </div>
        )}
        {type === 'waf' && (
          <>
            <Field label="Enforcement mode">
              <select value={mode} onChange={(e) => setMode(e.target.value as Waf['mode'])}>
                <option>Blocking</option>
                <option>Monitoring</option>
              </select>
            </Field>
            <p className="muted">
              Changing the mode also re-evaluates existing SQL Injection and XSS demo events for
              attached load balancers.
            </p>
          </>
        )}
        {type === 'policy' && (
          <>
            <Field label="Rule action">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as Policy['action'])}
              >
                <option>Allow</option>
                <option>Deny</option>
              </select>
            </Field>
            <p className="muted">
              Policy inventory demonstration. Network rule evaluation is outside this simulator.
            </p>
          </>
        )}
        {type === 'user' && (
          <>
            <Field label="Email *">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value as User['role'])}>
                <option>Admin</option>
                <option>Operator</option>
                <option>Viewer</option>
              </select>
            </Field>
            <p className="muted">
              Demo directory only. No invitation is sent and roles do not enforce access.
            </p>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <FormFooter onClose={close} />
      </form>
    </Dialog>
  );
}
