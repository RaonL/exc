import type { ReferencePage } from './catalog';
import { useConsole } from '../store';
import { EventsTable } from '../components/EventsTable';
import { Card } from '../components/common';
import { LocalResourcePage } from './LocalResourcePage';
export function SupplementalPage({ page }: { page: ReferencePage }) {
  const s = useConsole();
  if (page === 'Alerts')
    return (
      <div className="waap-resource-page">
        <Card title="Alerts">
          <p className="waap-local-caption">Local security alerts · 저장된 모의 탐지·차단 이벤트</p>
          <EventsTable
            events={s.events.filter((e) => e.namespace === s.namespace && e.action !== 'Allowed')}
          />
        </Card>
      </div>
    );
  if (page === 'About')
    return (
      <div className="waap-resource-page">
        <Card title="Workspace Info">
          <h2>Web App &amp; API Protection</h2>
          <p>F5 XC Console Simulator · 비공식 학습용</p>
          <dl>
            <dt>Namespace</dt>
            <dd>{s.namespace}</dd>
            <dt>Training</dt>
            <dd>Class 1–9 + API Security Quickstarts</dd>
            <dt>Storage</dt>
            <dd>Local browser storage</dd>
            <dt>External requests</dt>
            <dd>모의 테스트는 외부 트래픽을 생성하지 않습니다.</dd>
          </dl>
        </Card>
      </div>
    );
  return <LocalResourcePage key={`${s.namespace}-${page}`} page={page} />;
}
