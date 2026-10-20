import { useState } from 'react';
import type { Environment } from './types';
import { lbConfig } from '../lib/config';

/** Read-only views derived from persisted requests and current configuration. */
export function Observations({ environment: e }: { environment: Environment }) {
  const [field, setField] = useState('attack_types.name');
  const [selected, setSelected] = useState('');
  const labels = (log: Environment['runtime']['logs'][number]) =>
    field === 'bot_info.classification'
      ? (log.headers['x-demo-bot'] ?? 'N/A')
      : field === 'device_type'
        ? 'Training Browser (synthetic)'
        : field === 'signatures.name'
          ? `${log.request.attack} (teaching pattern)`
          : log.request.attack;
  const groups = Object.entries(
    e.runtime.logs.reduce<Record<string, number>>((counts, log) => {
      const key = labels(log);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  );
  const vip = lbConfig(e.lb).vip;
  const reachable = vip !== 'Do Not Advertise' && (vip !== 'Custom' || e.ce.online);
  return (
    <section className="training-help" aria-label="Local Observability">
      <h3>Observability · 로컬 모의 데이터</h3>
      <p>DNS·경로·서버 상태는 저장한 설정에서 계산합니다. 실제 DNS 조회나 CE 연결은 없습니다.</p>
      <dl>
        <dt>DNS / VIP</dt>
        <dd>
          {e.lb.domains.join(', ')} →{' '}
          {reachable ? (vip === 'Custom' ? '192.0.2.20' : '192.0.2.10') : 'No reachable VIP'} ·
          TEST-NET 주소
        </dd>
        <dt>Customer Edge</dt>
        <dd>
          {e.ce.name} · {e.ce.online ? 'Online' : 'Offline'}
        </dd>
        <dt>Segments</dt>
        <dd>
          DC {e.controls.segment ? 'attached' : 'isolated'} ↔ AWS{' '}
          {e.controls.segmentPeer ? 'attached' : 'isolated'}
        </dd>
        <dt>Routing / Health</dt>
        <dd>
          {e.origins.map((o) => `${o.name}: ${o.healthy ? 'Healthy' : 'Unhealthy'}`).join(' · ')} ·
          Fallback {e.controls.failover ? 'enabled' : 'disabled'}
        </dd>
        <dt>Pipeline</dt>
        <dd>
          {e.controls.pipeline.join(' → ') || 'Idle'} · {e.controls.artifact || 'No artifact'}
        </dd>
        <dt>Requests</dt>
        <dd>
          {e.runtime.logs.length} stored ·{' '}
          {e.runtime.logs.filter((l) => l.action === 'Blocked').length} blocked ·
          external_requests=0
        </dd>
      </dl>
      <h4>Forensics Panel · 기록된 모의 요청 집계</h4>
      <label>
        Group by{' '}
        <select
          value={field}
          onChange={(ev) => {
            setField(ev.target.value);
            setSelected('');
          }}
        >
          {['attack_types.name', 'signatures.name', 'bot_info.classification', 'device_type'].map(
            (v) => (
              <option key={v}>{v}</option>
            ),
          )}
        </select>
      </label>
      <div className="training-actions">
        <button type="button" onClick={() => setSelected('')}>
          Clear Filter
        </button>
        {groups.map(([key, count]) => (
          <button
            type="button"
            key={key}
            aria-pressed={selected === key}
            onClick={() => setSelected(key)}
          >
            {key} · {count}
          </button>
        ))}
      </div>
      {selected && (
        <p>
          Apply Filter: {selected} ·{' '}
          {e.runtime.logs
            .filter((l) => labels(l) === selected)
            .map((l) => `${l.request.method} ${l.request.path} → ${l.code} [${l.id}]`)
            .join(' / ')}
        </p>
      )}
      <small>
        시그니처 이름·기기 유형은 학습용 분류입니다. F5 탐지·텔레메트리 결과가 아닙니다.
      </small>
    </section>
  );
}
