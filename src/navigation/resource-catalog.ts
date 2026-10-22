import type { ReferencePage } from './catalog';
export type ResourcePage = Exclude<ReferencePage, 'Alerts' | 'About'>;
export type ResourceField = { name: string; options?: string[]; type?: 'number'; initial?: string };
type Definition = { singular: string; fields: ResourceField[] };
const text = (name: string, initial = ''): ResourceField => ({ name, initial });
const choice = (name: string, options: string[]): ResourceField => ({
  name,
  options,
  initial: options[0],
});
const number = (name: string, initial: string): ResourceField => ({
  name,
  type: 'number',
  initial,
});
/** Local form subsets, not assertions of complete proprietary XC configuration schemas. */
export const resourceDefinitions: Record<ResourcePage, Definition> = {
  'Health Checks': {
    singular: 'Health Check',
    fields: [
      choice('Health Check Type', ['HTTP', 'TCP']),
      text('Path', '/health'),
      number('Interval (seconds)', '15'),
      number('Timeout (seconds)', '3'),
    ],
  },
  'CDN Distributions': {
    singular: 'CDN Distribution',
    fields: [
      text('Domain'),
      choice('Distribution Type', ['HTTPS with Automatic Certificate', 'HTTP']),
      text('Origin Pool'),
    ],
  },
  'CDN Origin Pools': {
    singular: 'CDN Origin Pool',
    fields: [text('Origin Server'), number('Port', '443'), text('Origin Host Header')],
  },
  'BIG-IP Virtual Servers': {
    singular: 'BIG-IP Virtual Server',
    fields: [text('BIG-IP Instance'), text('Virtual Server'), text('Destination Address')],
  },
  'Third-Party Applications': {
    singular: 'Third-Party Application',
    fields: [
      text('Application Domain'),
      choice('Application Type', ['External Application']),
      text('Description Reference'),
    ],
  },
  'Service Policy Sets': {
    singular: 'Service Policy Set',
    fields: [
      text('Service Policy References'),
      choice('Rule Combining Algorithm', ['First Rule Match']),
    ],
  },
  'Rate Limiter Policies': {
    singular: 'Rate Limiter Policy',
    fields: [
      number('Requests per Period', '100'),
      number('Period (seconds)', '60'),
      choice('Mitigation Action', ['Block', 'Report']),
    ],
  },
  'IP Prefix Sets': {
    singular: 'IP Prefix Set',
    fields: [text('Prefixes (comma separated)', '192.0.2.0/24')],
  },
  'User Identifications': {
    singular: 'User Identification',
    fields: [
      choice('Identifier Type', ['Client IP', 'HTTP Header', 'Cookie']),
      text('Identifier Name'),
    ],
  },
  'Malicious User Mitigation': {
    singular: 'Malicious User Mitigation',
    fields: [
      choice('Mitigation Action', ['Block', 'Report']),
      number('Mitigation Duration (seconds)', '60'),
    ],
  },
  'App Settings': {
    singular: 'App Settings',
    fields: [
      choice('User Behavior Analysis', ['Enable', 'Disable']),
      text('HTTP Load Balancer References'),
    ],
  },
  'Public IP Addresses': {
    singular: 'Public IP Address',
    fields: [
      text('Address', '192.0.2.10'),
      choice('IP Version', ['IPv4', 'IPv6']),
      text('Site Reference'),
    ],
  },
  'Active Alert Policies': {
    singular: 'Active Alert Policy',
    fields: [text('Alert Policy Reference')],
  },
  'Alert Policies': {
    singular: 'Alert Policy',
    fields: [text('Alert Receiver References'), choice('Severity', ['Critical', 'Major', 'Minor'])],
  },
  'Alert Receivers': {
    singular: 'Alert Receiver',
    fields: [choice('Receiver Type', ['Email', 'Webhook']), text('Destination (dummy only)')],
  },
  'Report Configurations': {
    singular: 'Report Configuration',
    fields: [
      choice('Report Type', ['Security', 'Performance']),
      choice('Frequency', ['Daily', 'Weekly', 'Monthly']),
      text('HTTP Load Balancer References'),
    ],
  },
  'TLS Certificates': {
    singular: 'TLS Certificate',
    fields: [text('Certificate Reference (dummy only)'), text('Domains'), text('Expiration Date')],
  },
  'Bot Infrastructure': {
    singular: 'Bot Infrastructure',
    fields: [
      choice('Environment', ['Test', 'Production']),
      text('Region'),
      text('HTTP Load Balancer Reference'),
    ],
  },
  'Bot Policies': {
    singular: 'Bot Policy',
    fields: [
      choice('Policy Type', ['Bot Endpoint Policy', 'Bot Allowlist Policy', 'Bot Network Policy']),
      text('Endpoint Path', '/login'),
      choice('Mitigation Action', ['Block', 'Report']),
    ],
  },
  'Mobile Base Configurations': {
    singular: 'Mobile Base Configuration',
    fields: [
      text('Application Identifier'),
      choice('Platform', ['iOS', 'Android']),
      text('SDK Reference'),
    ],
  },
  'Saved Filters': {
    singular: 'Saved Filter',
    fields: [
      choice('View', ['Security Analytics', 'Requests', 'API Endpoints']),
      text('Filter Expression'),
    ],
  },
};
