import type { LB, Origin, Site, Waf } from '../types';

export type Exercise =
  | 'public'
  | 'private'
  | 'edge'
  | 'analytics'
  | 'waf'
  | 'bot'
  | 'malicious'
  | 'scan'
  | 'assistant'
  | 'header'
  | 'route'
  | 'api-lb'
  | 'inventory'
  | 'endpoint'
  | 'rate'
  | 'discovery'
  | 'bot-baseline'
  | 'bot-flag'
  | 'human-bot'
  | 'bot-block'
  | 'ce'
  | 'segments'
  | 'failover'
  | 'overlap'
  | 'code'
  | 'pipeline'
  | 'advanced'
  | 'scan-compare'
  | 'negative'
  | 'positive'
  | 'zero-day';
export interface Lab {
  id: string;
  classId: number;
  unit: string;
  title: string;
  source: string;
  exercise: Exercise;
  objective: string;
  steps: string[];
}
export interface Controls {
  policyMode:
    | 'Disabled'
    | 'GET only'
    | 'Header allowlist'
    | 'Negative enforcement'
    | 'Positive enforcement'
    | 'Exploit deny';
  headerName: string;
  headerValue: string;
  allowedCountry: string;
  deniedCountry: string;
  blockBadReputation: boolean;
  allowedPath: string;
  canary: boolean;
  canaryHeader: string;
  canaryValue: string;
  rewriteLogin: boolean;
  namespaceHeader: boolean;
  inventory: boolean;
  apiDeny: boolean;
  deniedEndpoint: string;
  schemaValidation: boolean;
  apiDiscovery: boolean;
  connector: boolean;
  rateLimit: boolean;
  rate: number;
  rateWindow: number;
  ratePath: string;
  rateMethod: 'GET' | 'POST' | 'ANY';
  botMode: 'Disabled' | 'Flag' | 'Blocking';
  botPath: string;
  botExtraPath: string;
  botMethod: 'GET' | 'POST' | 'ANY';
  telemetry: boolean;
  maliciousDetection: boolean;
  maliciousMitigation: boolean;
  segment: boolean;
  segmentPeer: boolean;
  firewall: boolean;
  failover: boolean;
  overlapVip: boolean;
  scanProfile: boolean;
  scanSchedule: 'Manual' | 'Daily (simulated)';
  source: string;
  deployedSource: string;
  artifact: string;
  pipeline: string[];
}
export type Attack =
  'None' | 'SQL Injection' | 'XSS' | 'Bot' | 'Human-like bot' | 'Malicious user' | 'Exploit';
export interface RequestInput {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  source: string;
  country: string;
  reputation: 'Clean' | 'TOR' | 'Spam';
  identity: string;
  attack: Attack;
  transport: 'HTTP' | 'SSH';
}
export interface ProbeResult {
  trace?: string[];
  id: string;
  at: number;
  request: RequestInput;
  code: number;
  action: 'Allowed' | 'Detected' | 'Blocked';
  reason: string;
  origin: string;
  headers: Record<string, string>;
  body: string;
}
export interface Runtime {
  now: number;
  buckets: Record<string, { start: number; count: number }>;
  identities: Record<string, number>;
  logs: ProbeResult[];
  discovered: string[];
  scan?: { at: number; findings: { name: string; severity: string; resolved: boolean }[] };
  scanHistory?: { at: number; findings: { name: string; severity: string; resolved: boolean }[] }[];
  explanation: string;
}
export interface Environment {
  lb: LB;
  waf: Waf;
  origins: Origin[];
  ce: Site;
  controls: Controls;
  runtime: Runtime;
}
export interface Check {
  name: string;
  pass: boolean;
  expected: string;
  actual: string;
}
export interface Verification {
  at: number;
  fingerprint: string;
  checks: Check[];
}
export interface Session {
  environment: Environment;
  baseline?: { at: number; codes: number[] };
  verification?: Verification;
}
