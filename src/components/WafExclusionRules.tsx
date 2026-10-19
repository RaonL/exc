import { useState } from 'react';
import type { LB, SecurityEvent, WafExclusion } from '../types';
import { exclusionFromEvent, exclusionGuide, exactPathRegex } from '../lib/waf-exclusions';
import { WafExclusionEditor } from './WafExclusionEditor';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Button } from './ui/button';
export function WafExclusionRules({
  lb,
  initial,
  event,
  newItem,
  close,
  onApply,
}: {
  lb: LB;
  initial: WafExclusion[];
  event?: SecurityEvent;
  newItem?: boolean;
  close: () => void;
  onApply: (rules: WafExclusion[]) => void;
}) {
  const fresh = (): WafExclusion => ({
    id: crypto.randomUUID(),
    name: `waf-exclusion-${initial.length + 1}`,
    path: '/',
    pathMatch: 'Exact',
    domain: lb.domains[0],
    method: 'GET',
    attack: 'SQL Injection',
  });
  const [rules, setRules] = useState(initial);
  const [item, setItem] = useState<WafExclusion | null>(() =>
    event ? exclusionFromEvent(event, lb) : newItem ? fresh() : null,
  );
  return (
    <>
      {!item && (
        <ConfigurationEditor
          kind="WAF Exclusion Rules"
          name={lb.name}
          namespace={lb.namespace}
          className="lb-editor exclusion-editor"
          resourceContext={{
            title: 'HTTP Load Balancer',
            trail: [lb.name, 'Web Application Firewall', 'WAF Exclusion Rules'],
          }}
          guide={exclusionGuide}
          close={close}
          value={{ exclusions: rules }}
          submitLabel="Apply"
          cancelLabel="Back"
          onSave={(e) => {
            e.preventDefault();
            onApply(rules);
          }}
          sections={[
            {
              id: 'rules',
              title: 'WAF Exclusion Rules',
              content: (
                <>
                  <div
                    className="exclusion-table-scroll"
                    role="region"
                    aria-label="WAF exclusion rules table"
                    tabIndex={0}
                  >
                    <table>
                      <thead>
                        <tr>
                          {[
                            'Order',
                            'Name',
                            'Domain',
                            'Path',
                            'Methods',
                            'Attack Type',
                            'Expiration Timestamp',
                            'Actions',
                          ].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((r, i) => (
                          <tr key={r.id}>
                            <td>{i + 1}</td>
                            <td>{r.name}</td>
                            <td>{r.domain || 'Any Domain'}</td>
                            <td>
                              {r.pathMatch === 'Exact'
                                ? exactPathRegex(r.path)
                                : `Prefix: ${r.path}`}
                            </td>
                            <td>{r.method}</td>
                            <td>{r.attack}</td>
                            <td>{r.expiresAt || 'Never'}</td>
                            <td>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setItem(r)}
                                aria-label={`Edit exclusion ${r.name}`}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setRules((v) => v.filter((x) => x.id !== r.id))}
                                aria-label={`Remove exclusion ${r.name}`}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!rules.length && (
                      <p className="configuration-help">
                        There are no items added yet. Start by adding the first item.
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="outline" onClick={() => setItem(fresh())}>
                    + Add Item
                  </Button>
                  <p className="configuration-help">
                    Apply changes only the LB draft. Cancel and Exit on the parent LB discards all
                    unsaved rules.
                  </p>
                </>
              ),
            },
          ]}
        />
      )}
      {item && (
        <WafExclusionEditor
          key={item.id}
          names={rules.filter((x) => x.id !== item.id).map((x) => x.name)}
          lb={lb}
          initial={item}
          close={() => setItem(null)}
          onApply={(r) => {
            setRules((v) =>
              v.some((x) => x.id === r.id) ? v.map((x) => (x.id === r.id ? r : x)) : [...v, r],
            );
            setItem(null);
          }}
        />
      )}
    </>
  );
}
