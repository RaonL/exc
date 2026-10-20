import type { Lab } from './types';
import { useConsole } from '../store';
import { effectiveEnvironment, isComplete, useTraining } from './store';
import { labGuideFields } from './lab-guide';

export function LabQuickStart({ lab, onTab }: { lab: Lab; onTab: (tab: string) => void }) {
  const t = useTraining(),
    core = useConsole(),
    session = t.sessions[lab.id];
  const e = session ? effectiveEnvironment(session) : undefined;
  const fields = labGuideFields(lab, e);
  const configured = !!e && fields.every((f) => f.pass);
  const ready = !!e && core.lbs.some((lb) => lb.id === e.lb.id);
  const stages = [
    {
      title: '실습 환경 준비',
      tab: 'Environment',
      pass: ready,
      lines: [
        `Namespace: training-${lab.id}`,
        '전용 LB · Origin · WAF · CE를 준비합니다. 기존 실습은 이어서 열립니다.',
      ],
    },
    {
      title: '보호 전 기준 요청',
      tab: 'Test',
      pass: !!session?.baseline,
      lines: [
        '설정을 바꾸기 전에 기준 요청 실행을 누르세요.',
        `기록된 응답: ${session?.baseline?.codes.join(' / ') ?? '아직 실행하지 않음'}`,
      ],
    },
    {
      title: '목표값으로 직접 설정',
      tab: 'Environment',
      pass: configured,
      lines: fields
        .filter((f) => !f.pass)
        .slice(0, 4)
        .map((f) => `${f.title} = ${f.expected}`)
        .concat(
          configured
            ? ['모든 입력값 확인 완료 · 바꾸면 체크가 해제됩니다.']
            : ['찾기 → 실제 입력칸 옆 목표값 확인 → 직접 변경'],
        ),
    },
    {
      title: '요청 예제로 비교 · 검증',
      tab: 'Test',
      pass: !!session && isComplete(session),
      lines: [
        '예제 불러오기 → 로컬 요청 실행 → 기대 응답과 비교',
        '결과 검증 실행으로 정상·차단·예외 조건을 확인하세요.',
      ],
    },
    {
      title: '로그 · 보고서 확인',
      tab: 'Logs',
      pass: !!e?.runtime.logs.length,
      lines: [
        '요청 ID · HTTP 상태 · 적용 정책 · 응답 이유 확인',
        'Scan은 Run Scan, 설명은 Explain을 직접 실행합니다.',
      ],
    },
  ];
  return (
    <section className="lab1-quick-start" aria-label={`${lab.id} 쉬운 따라하기`}>
      <h3>이 순서대로 직접 따라하세요</h3>
      <p>
        설정 화면과 콘솔 편집 창에서도 가이드가 함께 보입니다. 체크는 실제 입력값과 요청 결과를
        기준으로 바뀝니다.
      </p>
      <div className="lab1-quick-steps">
        {stages.map((stage, i) => (
          <article key={stage.title} className={stage.pass ? 'complete' : ''}>
            <h4>
              <span
                className="guide-check"
                role="checkbox"
                aria-readonly="true"
                aria-checked={stage.pass}
                aria-label={`${stage.title} 완료`}
              >
                {stage.pass ? '✓' : ''}
              </span>
              {i + 1}. {stage.title}
            </h4>
            <ul>
              {stage.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <button
              type="button"
              disabled={i > 0 && !ready}
              onClick={() => {
                if (i === 0) t.start(lab.id);
                onTab(stage.tab);
              }}
            >
              {i + 1}. {i === 0 ? (ready ? '환경 계속하기' : '환경 준비하기') : stage.title} →
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
