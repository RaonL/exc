import type { Page } from '../types';

export const referencePages = [
  'Health Checks',
  'CDN Distributions',
  'CDN Origin Pools',
  'BIG-IP Virtual Servers',
  'Third-Party Applications',
  'Service Policy Sets',
  'Rate Limiter Policies',
  'IP Prefix Sets',
  'User Identifications',
  'Malicious User Mitigation',
  'App Settings',
  'Public IP Addresses',
  'Active Alert Policies',
  'Alert Policies',
  'Alert Receivers',
  'Report Configurations',
  'TLS Certificates',
  'Bot Infrastructure',
  'Bot Policies',
  'Mobile Base Configurations',
  'Saved Filters',
  'Alerts',
  'About',
] as const;
export type ReferencePage = (typeof referencePages)[number];
export type MenuChild = { label: string; page: Page; basis?: 'documented' };
export type MenuEntry = {
  label: string;
  page?: Page;
  children?: MenuChild[];
  earlyAccess?: boolean;
};
const child = (label: Page): MenuChild => ({ label, page: label, basis: 'documented' });

/** Parent order is transcribed from the user's capture and the saved authenticated REA tree. */
export const manageMenu: MenuEntry[] = [
  {
    label: 'Load Balancers',
    children: [
      { label: 'HTTP Load Balancers', page: 'HTTP Load Balancers' },
      { label: 'Origin Pools', page: 'Origin Pools' },
      child('Health Checks'),
    ],
  },
  { label: 'CDN', children: [child('CDN Distributions'), child('CDN Origin Pools')] },
  { label: 'BIG-IP Virtual Servers', page: 'BIG-IP Virtual Servers' },
  { label: 'Third-Party Applications', page: 'Third-Party Applications', earlyAccess: true },
  { label: 'App Firewall', page: 'App Firewall' },
  {
    label: 'Service Policies',
    children: [child('Service Policies'), child('Service Policy Sets')],
  },
  { label: 'Rate Limiter Policies', page: 'Rate Limiter Policies' },
  {
    label: 'Shared Objects',
    children: [
      child('IP Prefix Sets'),
      child('User Identifications'),
      child('Malicious User Mitigation'),
    ],
  },
  { label: 'AI & ML', children: [child('App Settings')] },
  { label: 'Public IP Addresses', page: 'Public IP Addresses' },
  {
    label: 'Alerts Management',
    children: [child('Active Alert Policies'), child('Alert Policies'), child('Alert Receivers')],
  },
  { label: 'Files', children: [child('OpenAPI Files')] },
  {
    label: 'API Security',
    children: [
      child('API Definition'),
      child('Code Base Integration'),
      child('API Discovery'),
      child('API Protection'),
      child('API Endpoints'),
    ],
  },
  { label: 'Reports', children: [child('Report Configurations')] },
  { label: 'Certificate Management', children: [child('TLS Certificates')] },
  {
    label: 'Bot Defense Management',
    children: [
      child('Bot Infrastructure'),
      child('Bot Policies'),
      child('Mobile Base Configurations'),
    ],
  },
  { label: 'Saved Filters', page: 'Saved Filters' },
];
export const supportMenu: MenuEntry[] = [
  { label: 'Notifications', children: [child('Alerts'), child('Audit Logs')] },
  { label: 'References', children: [{ label: 'Attack Signatures', page: 'Security Catalog' }] },
  { label: 'Workspace Info', children: [child('About')] },
];
export const menuPages = [...manageMenu, ...supportMenu].flatMap((m) =>
  m.page ? [m.page] : (m.children ?? []).map((c) => c.page),
);
export const parentFor = (page: Page) =>
  manageMenu.find((m) => m.page === page || m.children?.some((c) => c.page === page))?.label;
export const isReferencePage = (page: string): page is ReferencePage =>
  (referencePages as readonly string[]).includes(page);
