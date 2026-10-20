import { useState } from 'react';
import type { CatalogMatch, SecurityEvent, SimulatedRequest } from '../types';
import type { CatalogEntry } from '../lib/security-catalog';
import { resolveRequestContext } from '../lib/config';
import { useConsole } from '../store';
import { Button } from './ui/button';
import { WafEditor } from './SecurityEditors';
import { download } from './common';
import './security-catalog.css';

export function CatalogTestLog({ event }: { event: SecurityEvent }) {
  const log = [
    `[${event.timestamp}] Support ID: ${event.id}`,
    ...(event.evaluationTrace ?? []).map(
      (line, index) => `${String(index + 1).padStart(2, '0')} ${line}`,
    ),
  ].join('\n');
  return (
    <div className="catalog-run-result">
      <strong>
        HTTP {event.responseCode} / {event.action} · {event.catalogMatch?.name}
      </strong>
      <p>{event.reason}</p>
      <p>
        실행 시각: {event.timestamp} · 정책: {event.policySnapshot?.name ?? '연결 없음'} /{' '}
        {event.policySnapshot?.mode ?? 'N/A'}
      </p>
      <p className="catalog-source">
        실행 당시 설정을 기록합니다. 정책 변경 후 다시 실행해 전후 결과를 비교하세요.
      </p>
      <pre tabIndex={0} aria-label="Catalog evaluation log">
        {log}
      </pre>
      {event.responseBody && (
        <details>
          <summary>모의 응답 본문</summary>
          <pre>{event.responseBody}</pre>
        </details>
      )}
      <Button
        variant="outline"
        onClick={() => download(`catalog-${event.id}.txt`, log, 'text/plain;charset=utf-8')}
      >
        Download log
      </Button>
    </div>
  );
}
export function CatalogTestPanel({
  entry,
  kind,
}: {
  entry: CatalogEntry;
  kind: CatalogMatch['kind'];
}) {
  const s = useConsole(),
    lbs = s.lbs.filter((lb) => lb.namespace === s.namespace);
  const [lbId, setLbId] = useState(lbs[0]?.id ?? ''),
    [path, setPath] = useState('/catalog-test'),
    [method, setMethod] = useState('GET');
  const [state, setState] = useState<SimulatedRequest['signatureState']>('Existing'),
    [error, setError] = useState(''),
    [edit, setEdit] = useState(false);
  const lb = lbs.find((item) => item.id === lbId);
  const waf = lb
    ? resolveRequestContext(lb, s.wafs, { path, method, signatureState: state }).waf
    : undefined;
  const history = s.events
    .filter(
      (event) =>
        event.namespace === s.namespace &&
        event.catalogMatch?.kind === kind &&
        event.catalogMatch.id === entry.id,
    )
    .slice(0, 5);
  const run = () => {
    try {
      s.runCatalogTest(
        lbId,
        {
          kind,
          id: entry.id,
          name: entry.name,
          attackType:
            typeof entry.original.attack_type === 'string' ? entry.original.attack_type : '',
          accuracy: entry.accuracy,
          appliesTo: entry.original.applies_to === 'Response' ? 'Response' : 'Request',
          risk: entry.risk,
          botClass:
            typeof entry.original.bot_class === 'string' ? entry.original.bot_class : undefined,
        },
        { path, method, signatureState: state },
      );
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '모의 테스트를 실행하지 못했습니다.');
    }
  };
  return (
    <section className="catalog-test" aria-label="Catalog sample test">
      <h3>모의 테스트 · 저장된 WAF 정책 사용</h3>
      <p className="configuration-help">
        선택 항목이 매치되었다고 가정합니다. 실제 페이로드 탐지·외부 요청은 수행하지 않습니다. 검사
        위치:{' '}
        {kind === 'signatures' && entry.original.applies_to === 'Response'
          ? 'Response (응답 서명 매치 가정)'
          : 'Request (요청 매치 가정)'}
        .
      </p>
      <label>
        HTTP Load Balancer
        <select
          aria-label="Catalog test load balancer"
          value={lbId}
          onChange={(e) => {
            setLbId(e.target.value);
            setError('');
          }}
        >
          <option value="">Select HTTP Load Balancer</option>
          {lbs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="catalog-test-request">
        <label>
          Method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Path
          <input value={path} maxLength={2048} onChange={(e) => setPath(e.target.value)} />
        </label>
      </div>
      {kind === 'signatures' && (
        <label>
          Signature State
          <select
            value={state}
            onChange={(e) => setState(e.target.value as SimulatedRequest['signatureState'])}
          >
            {['Existing', 'New', 'Updated'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      )}
      <p className="catalog-policy-context">
        적용 WAF:{' '}
        {waf ? `${waf.namespace}/${waf.name} · ${waf.mode}` : '연결 없음 · WAF 검사 없이 통과'}
        <br />
        Namespace: {s.namespace} · Route에 별도 WAF가 있으면 우선 적용
      </p>
      <div className="catalog-test-actions">
        <Button disabled={!lb} onClick={run}>
          Run Catalog Sample · 모의 실행
        </Button>
        {waf && (
          <Button variant="outline" onClick={() => setEdit(true)}>
            Edit App Firewall
          </Button>
        )}
      </div>
      {!lbs.length && <p>현재 Namespace에서 HTTP LB를 먼저 생성하세요.</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {history[0] && <CatalogTestLog event={history[0]} />}
      {history.length > 1 && (
        <details>
          <summary>이전 테스트 결과 {history.length - 1}개 · 변경 전후 비교</summary>
          {history.slice(1).map((event) => (
            <CatalogTestLog key={event.id} event={event} />
          ))}
        </details>
      )}
      {edit && waf && <WafEditor initial={waf} close={() => setEdit(false)} notify={() => {}} />}
    </section>
  );
}
