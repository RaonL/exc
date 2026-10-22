export type Enforcement = 'Report' | 'Block';
export type Rule = {
  name: string;
  path: string;
  method: string;
  domain: string;
  action: 'Skip' | Enforcement;
};
export type Credential = {
  name: string;
  type: 'API Key' | 'Basic Authentication' | 'Bearer Token' | 'Login Endpoint';
  role: 'Standard' | 'Admin';
  key?: string;
  value: string;
  user?: string;
  path?: string;
  method?: string;
  payload?: string;
  tokenKey?: string;
  expiresAt?: string;
};
export type TestEnvironment = { domain: string; destructive: boolean; credentials: Credential[] };
export interface ApiSettings {
  discoveryPolicy?: 'Built-in';
  sensitiveDataDiscovery?: 'Default' | 'Disable';
  discovery: boolean;
  redirects: boolean;
  purgeDays: number;
  integrationId: string;
  repositories: string[];
  crawling: boolean;
  crawlDomains: { domain: string; user: string; secret: string }[];
  definitionId: string;
  validation: 'Disabled' | 'API Inventory' | 'Custom List';
  requestMode: 'Skip' | 'Validate';
  requestAction: Enforcement;
  requestProperties: string[];
  responseMode: 'Skip' | 'Validate';
  responseAction: Enforcement;
  rules: Rule[];
  fallMode: 'Allow' | 'Custom';
  fallRules: Rule[];
  testing: boolean;
  environments: TestEnvironment[];
  frequency: 'Every Day' | 'Every Week' | 'Every Month';
  customHeader: string;
}
export const defaults = (): ApiSettings => ({
  discovery: false,
  redirects: false,
  purgeDays: 30,
  integrationId: '',
  repositories: [],
  crawling: false,
  crawlDomains: [],
  definitionId: '',
  validation: 'Disabled',
  requestMode: 'Validate',
  requestAction: 'Report',
  requestProperties: ['Path Parameters', 'Query Parameters', 'HTTP Headers', 'Request Body'],
  responseMode: 'Skip',
  responseAction: 'Report',
  rules: [],
  fallMode: 'Allow',
  fallRules: [],
  testing: false,
  environments: [],
  frequency: 'Every Week',
  customHeader: '',
});
export type Schema = {
  type?: string;
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  additionalProperties?: boolean;
};
export type Operation = {
  parameters?: { name: string; in: string; required?: boolean; schema?: Schema }[];
  requestBody?: { required?: boolean; content?: Record<string, { schema: Schema }> };
  responses?: Record<string, { content?: Record<string, { schema: Schema }> }>;
};
export type Spec = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, Operation>>;
};
export const demoSpec: Spec = {
  openapi: '3.0.3',
  info: {
    title: 'XC local shop',
    version: '1.0',
  },
  paths: {
    '/api/orders': {
      get: {
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
            },
          },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['orders'],
                  properties: {
                    orders: {
                      type: 'array',
                      items: {
                        type: 'object',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quantity'],
                properties: {
                  quantity: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: {
                    id: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'integer',
              minimum: 1,
            },
          },
        ],
      },
    },
    '/api/admin': {
      get: {},
    },
    '/api/orders/{id}': {
      delete: {},
    },
  },
};
export const demoText = JSON.stringify(demoSpec, null, 2);
export function parseSpec(text: string): Spec {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw Error('OpenAPI file exceeds 2 MB.');
  const x = JSON.parse(text);
  if (
    !x ||
    !/^3\.0\./.test(x.openapi) ||
    !x.paths ||
    typeof x.paths !== 'object' ||
    Array.isArray(x.paths) ||
    !Object.keys(x.paths).length
  )
    throw Error('Local subset requires OpenAPI 3.0.x JSON with paths.');
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    for (const [k, val] of Object.entries(v)) {
      if (k === '$ref')
        throw Error(
          '$ref is unsupported in the local subset; inline schemas only. No remote refs fetched.',
        );
      if (
        [
          'oneOf',
          'anyOf',
          'allOf',
          'not',
          'pattern',
          'format',
          'minItems',
          'maxItems',
          'uniqueItems',
          'exclusiveMinimum',
          'exclusiveMaximum',
          'multipleOf',
          'nullable',
        ].includes(k)
      )
        throw Error(k + ' is unsupported by the local validation subset.');
      walk(val);
    }
  };
  walk(x);
  for (const [path, ops] of Object.entries(x.paths)) {
    if (!path.startsWith('/') || !ops || typeof ops !== 'object')
      throw Error('Invalid OpenAPI path.');
    for (const [method, operation] of Object.entries(ops)) {
      if (
        !['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method) ||
        !operation ||
        typeof operation !== 'object'
      )
        throw Error('Only inline HTTP operations are supported.');
    }
  }
  return x as Spec;
}
export type Probe = {
  path: string;
  method: string;
  domain?: string;
  body?: unknown;
  headers?: Record<string, string>;
  responseBody?: unknown;
  responseCode?: number;
};
export type ApiResult = {
  code: number;
  action: 'Allowed' | 'Detected' | 'Blocked';
  reason: string;
  phase: 'request' | 'response' | 'fall-through';
  trace: string[];
};
const matches = (r: Rule, q: Probe) =>
  (r.domain === 'Any Domain' || !r.domain || r.domain === q.domain) &&
  (r.method === 'ANY' || r.method === q.method) &&
  r.path === q.path.split('?')[0];
function schemaError(
  schema: Schema | undefined,
  value: unknown,
  path: string,
  coerce = false,
): string {
  if (!schema) return '';
  if (coerce && typeof value === 'string') {
    if (['integer', 'number'].includes(schema.type ?? '')) {
      if (value.trim() === '' || !Number.isFinite(Number(value)))
        return path + ': expected ' + schema.type;
      value = Number(value);
    } else if (schema.type === 'boolean' && ['true', 'false'].includes(value))
      value = value === 'true';
  }
  const t = schema.type;
  if (t === 'object' && (!value || typeof value !== 'object' || Array.isArray(value)))
    return path + ': expected object';
  if (t === 'array' && !Array.isArray(value)) return path + ': expected array';
  if (t === 'string' && typeof value !== 'string') return path + ': expected string';
  if (t === 'integer' && !Number.isInteger(value)) return path + ': expected integer';
  if (t === 'number' && (typeof value !== 'number' || !Number.isFinite(value)))
    return path + ': expected number';
  if (t === 'boolean' && typeof value !== 'boolean') return path + ': expected boolean';
  if (schema.enum && !schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(value)))
    return path + ': outside enum';
  if (
    typeof value === 'number' &&
    ((schema.minimum !== undefined && value < schema.minimum) ||
      (schema.maximum !== undefined && value > schema.maximum))
  )
    return path + ': outside allowed range';
  if (
    typeof value === 'string' &&
    ((schema.minLength !== undefined && value.length < schema.minLength) ||
      (schema.maxLength !== undefined && value.length > schema.maxLength))
  )
    return path + ': invalid string length';
  if (t === 'array')
    for (const [i, item] of (value as unknown[]).entries()) {
      const e = schemaError(schema.items, item, `${path}[${i}]`);
      if (e) return e;
    }
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? [])
      if (!Object.hasOwn(obj, key)) return path + '.' + key + ': required';
    for (const [key, v] of Object.entries(obj)) {
      if (schema.additionalProperties === false && !schema.properties?.[key])
        return path + '.' + key + ': additional property';
      const e = schemaError(schema.properties?.[key], v, path + '.' + key);
      if (e) return e;
    }
  }
  return '';
}
export function evaluateApi(c: ApiSettings, spec: Spec | undefined, q: Probe): ApiResult {
  let error = '',
    phase: ApiResult['phase'] = 'request',
    action: 'Skip' | Enforcement = c.requestAction;
  const trace = [
    `REQUEST ${q.method} ${q.path} domain=${q.domain ?? 'LB domain'}`,
    `API_DEFINITION ${c.definitionId || 'Disabled'} validation=${c.validation}`,
    `REQUEST_PROCESSING ${c.requestMode} enforcement=${c.requestAction} properties=${c.requestProperties.join(',')}`,
    `RESPONSE_PROCESSING ${c.responseMode} enforcement=${c.responseAction}`,
  ];
  const result = (): ApiResult => {
    const hit = !!error && action !== 'Skip';
    const code = hit && action === 'Block' ? 403 : (q.responseCode ?? 200);
    const a = hit ? (action === 'Block' ? 'Blocked' : 'Detected') : 'Allowed';
    return {
      code,
      action: a,
      phase,
      reason: hit ? `${phase}: ${error} · ${action}` : phase + ': validation passed or skipped',
      trace: [
        ...trace,
        `DECISION ${a} status=${code} reason=${error || 'none'}`,
        'END simulation=true external_requests=0',
      ],
    };
  };
  if (!c.definitionId || c.validation === 'Disabled') return result();
  if (!spec) {
    error = 'Referenced API Definition/OpenAPI file is unavailable';
    action = 'Block';
    return result();
  }
  const u = new URL(q.path, 'https://local.invalid');
  const entry = Object.entries(spec.paths).find(
    ([p, ops]) =>
      ops[q.method.toLowerCase()] &&
      p.split('/').length === u.pathname.split('/').length &&
      p.split('/').every((seg, i) => /^\{.+\}$/.test(seg) || seg === u.pathname.split('/')[i]),
  );
  const custom = c.rules.find((r) => matches(r, q));
  if (!entry || (c.validation === 'Custom List' && !custom)) {
    phase = 'fall-through';
    const r = c.fallMode === 'Custom' ? c.fallRules.find((r) => matches(r, q)) : undefined;
    if (r) {
      action = r.action;
      error = 'Custom Fall Through ' + r.name;
    }
    trace.push(`FALL_THROUGH ${r?.name ?? 'Allow (unmatched)'}`);
    return result();
  }
  if (custom && c.validation === 'Custom List') action = custom.action;
  trace.push(`SCHEMA_MATCH ${entry[0]} ${q.method} rule=${custom?.name ?? 'API Inventory'}`);
  const [path, ops] = entry,
    op = ops[q.method.toLowerCase()];
  if (c.requestMode === 'Validate' && action !== 'Skip') {
    for (const p of op.parameters ?? []) {
      const group =
        p.in === 'query'
          ? 'Query Parameters'
          : p.in === 'path'
            ? 'Path Parameters'
            : 'HTTP Headers';
      if (!c.requestProperties.includes(group)) continue;
      const index = path.split('/').indexOf('{' + p.name + '}');
      const val =
        p.in === 'query'
          ? u.searchParams.get(p.name)
          : p.in === 'path'
            ? u.pathname.split('/')[index]
            : Object.entries(q.headers ?? {}).find(
                ([k]) => k.toLowerCase() === p.name.toLowerCase(),
              )?.[1];
      if (val === undefined || val === null) {
        if (p.required) error = group + ' ' + p.name + ': required';
      } else error = schemaError(p.schema, val, group + '.' + p.name, true);
      if (error) break;
    }
    if (!error && c.requestProperties.includes('Request Body') && op.requestBody) {
      if (q.body === undefined && op.requestBody.required) error = 'Request Body: required';
      else if (q.body !== undefined)
        error = schemaError(op.requestBody.content?.['application/json']?.schema, q.body, 'body');
    }
  }
  if (error) return result();
  if (c.responseMode === 'Validate') {
    phase = 'response';
    action = c.responseAction;
    const sch =
      op.responses?.[String(q.responseCode ?? 200)]?.content?.['application/json']?.schema;
    error = schemaError(sch, q.responseBody, 'response');
    trace.push('RESPONSE_VALIDATION ' + c.responseMode);
  }
  return result();
}
export function environmentError(
  env: TestEnvironment,
  domains: string[],
  now = Date.now(),
): string {
  if (!domains.includes(env.domain)) return 'Domain must belong to this HTTP Load Balancer.';
  if (
    env.credentials.length < 3 ||
    env.credentials.filter((c) => c.role === 'Standard').length < 2 ||
    !env.credentials.some((c) => c.role === 'Admin')
  )
    return 'At least 3 credentials: 2 Standard and 1 Admin.';
  if (new Set(env.credentials.map((c) => c.name)).size !== env.credentials.length)
    return 'Credential names must be unique.';
  for (const c of env.credentials) {
    if (!c.name.trim() || !c.value.trim())
      return 'Credential Name and dummy secret value are required.';
    if (c.type === 'API Key' && !c.key) return 'API Key requires key/value.';
    if (c.type === 'Basic Authentication' && !c.user)
      return 'Basic Authentication requires User/Password.';
    if (c.type === 'Login Endpoint') {
      if (!c.path?.startsWith('/') || !c.method || !c.tokenKey)
        return 'Login Endpoint requires path, method, payload, token response key.';
      try {
        JSON.parse(c.payload ?? '');
      } catch {
        return 'Login payload must be JSON.';
      }
    }
    if (
      c.expiresAt &&
      (!Number.isFinite(Date.parse(c.expiresAt)) || Date.parse(c.expiresAt) <= now)
    )
      return 'Credential is expired or expiry is invalid.';
  }
  return '';
}
export type Endpoint = {
  lbId: string;
  path: string;
  method: string;
  sources: string[];
  lastSeen: number;
  calls: number;
};
export function learnEndpoint(
  items: Endpoint[],
  c: ApiSettings,
  lbId: string,
  q: { path: string; method: string; code: number; source?: string },
  now: number,
): Endpoint[] {
  if (
    !c.discovery ||
    !((q.code >= 200 && q.code < 300) || (c.redirects && q.code >= 300 && q.code < 400))
  )
    return items;
  const path = q.path.split('?')[0],
    found = items.find((e) => e.lbId === lbId && e.path === path && e.method === q.method),
    source = q.source ?? 'Traffic';
  return found
    ? items.map((e) =>
        e === found
          ? {
              ...e,
              sources: [...new Set([...e.sources, source])],
              lastSeen: now,
              calls: e.calls + 1,
            }
          : e,
      )
    : [...items, { lbId, path, method: q.method, sources: [source], lastSeen: now, calls: 1 }];
}
export type Suite = {
  at: number;
  checks: {
    name: string;
    path: string;
    method: string;
    outcome: 'Open' | 'Mitigated' | 'Skipped';
    source: 'API Testing';
    reason: string;
  }[];
  trace: string[];
  fingerprint: string;
};
export function runSuite(
  c: ApiSettings,
  spec: Spec | undefined,
  domains: string[],
  now: number,
): Suite {
  if (!c.testing) throw Error('API Testing must be enabled and saved.');
  if (!c.environments.length) throw Error('Add Testing Environments.');
  for (const env of c.environments) {
    const error = environmentError(env, domains, now);
    if (error) throw Error(error);
  }
  const env = c.environments[0],
    checks: Suite['checks'] = [];
  for (const [path, ops] of Object.entries(spec?.paths ?? {}))
    for (const method of Object.keys(ops)) {
      const destructive = ['delete', 'put', 'patch'].includes(method);
      if (destructive && !env.destructive) {
        checks.push({
          name: 'Destructive method',
          path,
          method: method.toUpperCase(),
          outcome: 'Skipped',
          source: 'API Testing',
          reason: 'Use Destructive Methods is disabled; no fixture mutation.',
        });
        continue;
      }
      const q = {
        path: path.replace('{id}', '1'),
        method: method.toUpperCase(),
        domain: env.domain,
        body: { quantity: 'invalid' },
      };
      const evaluation = evaluateApi(c, spec, q);
      checks.push({
        name:
          method === 'post'
            ? 'Invalid request schema'
            : path === '/api/admin'
              ? 'Standard role access to admin endpoint'
              : 'Cross-user authorization fixture',
        path,
        method: q.method,
        outcome: evaluation.action === 'Blocked' ? 'Mitigated' : 'Open',
        source: 'API Testing',
        reason: `Dummy ${env.credentials.filter((x) => x.role === 'Standard').length} Standard/ ${env.credentials.filter((x) => x.role === 'Admin').length} Admin comparison; ${evaluation.reason}. Authorization behavior is a fixed vulnerable dummy backend, not an F5 finding.`,
      });
    }
  if (!checks.length)
    throw Error('No OpenAPI endpoints to test. Create and attach an API Definition.');
  return {
    at: now,
    checks,
    trace: [
      `START API Testing ${new Date(now).toISOString()}`,
      `ENVIRONMENT ${env.domain} roles=Standard,Standard,Admin credentials=REDACTED`,
      `HEADER x-f5-apitesting-identifier=${c.customHeader || '(unset)'}`,
      `SCHEDULE ${c.frequency} · simulated clock only`,
      ...checks.map((x) => `${x.method} ${x.path} ${x.outcome} ${x.reason}`),
      'END simulation=true external_requests=0',
    ],
    fingerprint: JSON.stringify(c),
  };
}
