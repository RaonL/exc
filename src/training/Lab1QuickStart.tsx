import { useConsole } from '../store';
import { consoleLab1Checks } from '../lib/console-lab';
import { guideSteps, openGuideStep } from './console-guide';

export function Lab1QuickStart() {
  const state = useConsole(),
    lab = state.consoleLab1;
  const ns = lab?.namespace ?? 'class1-lab1';
  const lbReady = state.lbs.some((lb) => lb.namespace === ns && lb.name === `${ns}-lb`);
  const checks = lab ? consoleLab1Checks(state, lab) : [];
  const details = {
    origin: [
      `Name = ${ns}-pool`,
      'Origin Servers → Add Item → Public DNS',
      'DNS Name = demo-app.amer.myedgedemo.com',
      'Apply → Port = 80 → Add Origin Pool',
    ],
    lb: [
      `Name = ${ns}-lb`,
      `Domains = ${ns}.lab-sec.f5demos.com`,
      'Type = HTTP · DNS 자동 관리 ☑ · Port = 80',
      `Origins → ${ns}/${ns}-pool → Apply → 저장`,
    ],
    baseline: [
      'Open Application → Home → 200',
      'HEADER를 눌러 추가 정상 요청 생성',
      '이 단계에서는 WAF Disable 유지',
    ],
    waf: [
      'Actions → Manage Configuration → Edit',
      'Web Application Firewall → Enable',
      'Enable = shared/base-appfw → 저장',
    ],
    attacks: ['Home → 200', 'SQL Injection → 403', 'XSS → 403 · Command Injection → 403'],
    inspect: [
      'Security Analytics → 공격 이벤트 열기',
      'Information에서 Support ID 확인',
      'Request / JSON에서 signature와 차단 결과 확인',
    ],
  };
  return (
    <section className="lab1-quick-start" aria-label="Class1 Lab1 쉬운 따라하기">
      <h3>이 순서대로 직접 설정하세요</h3>
      <p>
        버튼으로 설정 화면에 이동하세요. <b>설정 창 안에서도 이 가이드가 계속 보입니다.</b> 실제
        입력칸 옆에 목표값이 표시되고 맞게 입력하면 자동으로 체크됩니다.
      </p>
      <div className="lab1-quick-steps">
        {guideSteps.map((step, index) => {
          const pass = checks.find((check) => check.id === step.id)?.pass ?? false;
          const needsLb = !['origin', 'lb'].includes(step.id) && !lbReady;
          return (
            <article key={step.id} className={pass ? 'complete' : ''}>
              <h4>
                <span className="guide-check" aria-hidden="true">
                  {pass ? '✓' : ''}
                </span>
                {index + 1}. {step.title}
              </h4>
              <ul>
                {details[step.id].map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <button type="button" disabled={needsLb} onClick={() => openGuideStep(step.id)}>
                {index + 1}.{' '}
                {['baseline', 'attacks'].includes(step.id)
                  ? '요청 테스트하러 가기'
                  : '콘솔에서 따라하기'}{' '}
                →
              </button>
              <small>
                {needsLb
                  ? '먼저 2단계에서 HTTP LB를 저장하세요.'
                  : pass
                    ? '저장 / 요청 결과 확인 완료'
                    : '설정과 요청 결과로 자동 확인합니다'}
              </small>
            </article>
          );
        })}
      </div>
      <p className="guide-save-note">
        체크는 진행 표시입니다. 클릭해서 완료 처리하거나 설정을 자동 입력하지 않습니다.{' '}
        <b>각 설정 화면의 저장 버튼</b>까지 눌러주세요.
      </p>
    </section>
  );
}
