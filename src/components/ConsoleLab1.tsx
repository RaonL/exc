import { BookOpen, CheckCircle2, ChevronDown, ExternalLink } from 'lucide-react';
import { useConsole } from '../store';
import { class1Lab1Source, consoleLab1Checks } from '../lib/console-lab';
import { Button } from './ui/button';
import { Badge } from './common';

export function ConsoleLab1Bar() {
  const s = useConsole(),
    lab = s.consoleLab1;
  if (!lab || s.namespace !== lab.namespace || s.workspace !== 'Web App & API Protection')
    return null;
  const checks = consoleLab1Checks(s, lab),
    lb = s.lbs.find((l) => l.namespace === lab.namespace && l.name === `${lab.namespace}-lb`);
  return (
    <section className="console-lab-guide">
      <div className="console-lab-guide-head">
        <BookOpen size={16} />
        <strong>Class 1 · Lab 1</strong>
        <span>Public Endpoint</span>
        <Badge tone={checks.every((c) => c.pass) ? 'green' : 'blue'}>
          {checks.filter((c) => c.pass).length}/6 검증
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            useConsole.setState({ consoleLab1: { ...lab, guideOpen: !lab.guideOpen } })
          }
        >
          가이드 {lab.guideOpen ? '접기' : '보기'} <ChevronDown size={12} />
        </Button>
      </div>
      {lab.guideOpen && (
        <>
          <div className="console-lab-checks">
            {checks.map((check, i) => (
              <button
                key={check.id}
                className={check.pass ? 'complete' : ''}
                onClick={() => {
                  if ((check.id === 'baseline' || check.id === 'attacks') && lb) {
                    s.openApplication(lb.id);
                    return;
                  }
                  s.navigate('Web App & API Protection', check.page);
                  if (lb && ['Overview', 'Security Analytics'].includes(check.page))
                    useConsole.setState({ selectedLbId: lb.id });
                }}
              >
                <span>{check.pass ? <CheckCircle2 size={16} /> : i + 1}</span>
                <strong>{check.title}</strong>
                <small>{check.detail}</small>
              </button>
            ))}
          </div>
          <div className="console-lab-guide-foot">
            <span>
              이 Namespace에서 콘솔 메뉴로 직접 생성합니다. LB·Origin은 자동으로 만들지 않습니다.
              원문의 호스트명은 데이터로만 저장합니다.
            </span>
            <a href={class1Lab1Source} target="_blank" rel="noreferrer">
              공식 Lab 1 <ExternalLink size={12} />
            </a>
          </div>
        </>
      )}
    </section>
  );
}
