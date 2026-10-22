export type Workspace =
  'Home' | 'Web App & API Protection' | 'Multi-Cloud Network Connect' | 'Administration';
export type Page =
  | 'API Quickstarts'
  | 'API Endpoints'
  | 'OpenAPI Files'
  | 'API Definition'
  | 'Code Base Integration'
  | 'Security Catalog'
  | 'Training Center'
  | 'Services'
  | 'Dashboard'
  | 'Recent Activity'
  | 'Overview'
  | 'Security'
  | 'HTTP Load Balancers'
  | 'Origin Pools'
  | 'App Firewall'
  | 'Service Policies'
  | 'API Discovery'
  | 'API Protection'
  | 'Bot Defense'
  | 'Security Analytics'
  | 'Security Events'
  | 'Site Management'
  | 'Customer Edge'
  | 'Regional Edge'
  | 'Virtual Networks'
  | 'Connectivity'
  | 'Tenant / Namespace'
  | 'Users / Roles'
  | 'Audit Logs'
  | 'System Settings';
export type Scenario =
  | 'Catalog Signature'
  | 'Normal HTTP traffic'
  | 'SQL Injection'
  | 'Command Injection'
  | 'Cross-site Scripting'
  | 'API Schema Violation'
  | 'Shadow API Discovery'
  | 'Bot Detection'
  | 'L7 DDoS'
  | 'Origin Server Failure'
  | 'CE Offline'
  | 'CE Online';
export interface LB {
  id: string;
  namespace: string;
  name: string;
  domains: string[];
  protocol: 'HTTPS' | 'HTTP';
  originId: string;
  wafId: string;
  apiProtection: boolean;
  botDefense: boolean;
  ddosProtection: boolean;
  requests: number;
  createdAt: string;
  config?: LBConfig;
}
export interface Origin {
  id: string;
  namespace: string;
  name: string;
  endpoint: string;
  port: number;
  healthy: boolean;
  config?: OriginConfig;
}
export interface Waf {
  id: string;
  namespace: string;
  name: string;
  mode: 'Blocking' | 'Monitoring';
  config?: WafConfig;
}
export interface Site {
  id: string;
  namespace: string;
  name: string;
  region: string;
  kind: 'CE' | 'RE';
  online: boolean;
  address: string;
}
export interface SecurityEvent {
  id: string;
  namespace: string;
  timestamp: string;
  scenario: Scenario;
  lbId: string;
  source: string;
  country: string;
  path: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Info';
  action: 'Blocked' | 'Detected' | 'Allowed';
  count: number;
  method?: string;
  responseCode?: number;
  responseBody?: string;
  reason?: string;
  signatureState?: 'Existing' | 'New' | 'Updated';
  evaluatedWafId?: string;
  generatedBy?: 'console-request';
  durationMs?: number;
  authority?: string;
  catalogMatch?: CatalogMatch;
  evaluationTrace?: string[];
  policySnapshot?: {
    id: string;
    name: string;
    namespace: string;
    mode: Waf['mode'];
    config: WafConfig;
  };
}
export interface CatalogMatch {
  appliesTo?: 'Request' | 'Response';
  kind: 'signatures' | 'bots';
  id: string;
  name: string;
  attackType: string;
  accuracy: string;
  risk: string;
  botClass?: string;
}
export interface RouteRule {
  id: string;
  name: string;
  type: 'Simple' | 'Redirect' | 'Direct Response';
  method: string;
  match: 'Prefix' | 'Exact';
  path: string;
  enabled: boolean;
  originId: string;
  wafId: string;
  responseCode: number;
  responseBody: string;
  redirectUrl: string;
}
export interface WafExclusion {
  id: string;
  name: string;
  path: string;
  method: string;
  attack: 'All' | 'SQL Injection' | 'Cross-site Scripting' | 'Command Injection';
  description?: string;
  pathMatch?: 'Prefix' | 'Exact';
  domain?: string;
  expiresAt?: string;
}
export interface LBConfig {
  pathNormalization?: boolean;
  apiSecurity?: import('./api-security/model').ApiSettings;
  description: string;
  labels: string;
  vip: 'Internet' | 'Internet (Specified VIP)' | 'Custom' | 'Do Not Advertise';
  vipAddress: string;
  siteId: string;
  certificate: 'Automatic' | 'Custom';
  certificateRef: string;
  listenPort: number;
  redirectHttps: boolean;
  hsts: boolean;
  tlsLevel: 'High' | 'Medium' | 'Low';
  routes: RouteRule[];
  exclusions: WafExclusion[];
  cdn: boolean;
  timeout: number;
  apiDiscovery: boolean;
  manageDns?: boolean;
  listenPortChoice?: 'HTTP Listen Port' | 'Default Port';
  originWeight?: number;
  originPriority?: number;
}
export interface WafConfig {
  signatureSettings?: 'Default' | 'Custom';
  enhanceWithAi?: boolean;
  riskAction?: 'Mitigate High Risk Only';
  mediumAction?: 'Block' | 'Report' | 'Ignore';
  lowAction?: 'Block' | 'Report' | 'Ignore';
  botProtection?: 'Default' | 'Custom';
  maliciousBotAction?: 'Block' | 'Report' | 'Ignore';
  suspiciousBotAction?: 'Block' | 'Report' | 'Ignore';
  goodBotAction?: 'Block' | 'Report' | 'Ignore';
  description: string;
  labels: string;
  policy: 'Default' | 'Custom';
  disabledAttacks: string[];
  attackTypes?: 'Default' | 'Custom';
  accuracy: 'High and Medium' | 'High' | 'High, Medium and Low';
  highAction: 'Block' | 'Report' | 'Ignore';
  tuning: boolean;
  staging: 'Disabled' | 'New signatures' | 'New and updated signatures';
  stagingDays: number;
  stagingStartedAt?: string;
  threatCampaigns: boolean;
  maskLogs: boolean;
  responseCode: number;
  responseBody: string;
  responsePage?: 'Default' | 'Custom';
}
export interface OriginConfig {
  labels?: string;
  description: string;
  type: 'Public IP' | 'Public DNS' | 'IP on Site' | 'DNS on Site';
  siteId: string;
  network: 'Inside Network' | 'Outside Network';
  algorithm: 'Load Balancer Override' | 'Round Robin' | 'Least Active Requests' | 'Random';
  tls: boolean;
  sni: string;
  healthCheck: 'None' | 'HTTP' | 'TCP';
  healthPath: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}
export interface SimulatedRequest {
  authority?: string;
  path: string;
  method: string;
  signatureState: 'Existing' | 'New' | 'Updated';
}
export interface Activity {
  id: string;
  namespace: string;
  timestamp: string;
  message: string;
  actor: string;
}
export interface Endpoint {
  id: string;
  namespace: string;
  lbId: string;
  method: string;
  path: string;
  shadow: boolean;
  calls: number;
}
export interface Policy {
  id: string;
  namespace: string;
  name: string;
  action: 'Allow' | 'Deny';
  enabled: boolean;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Operator' | 'Viewer';
}
export interface Settings {
  tenant: string;
  email: string;
  retention: number;
}
export interface DemoData {
  namespaces: string[];
  lbs: LB[];
  origins: Origin[];
  wafs: Waf[];
  sites: Site[];
  events: SecurityEvent[];
  activity: Activity[];
  endpoints: Endpoint[];
  policies: Policy[];
  users: User[];
  settings: Settings;
}
