import { BookOpen, ArrowRight } from 'lucide-react';
import { useConsole } from '../store';
import { useTraining } from './store';
import { labById } from './catalog';
import { Button } from '../components/ui/button';
export function TrainingReturn() {
  const s = useConsole(),
    t = useTraining();
  const active = Object.entries(t.sessions).find(
    ([, session]) => session.environment.lb.namespace === s.namespace,
  );
  if (!active || s.page === 'Training Center') return null;
  return (
    <div className="training-return">
      <BookOpen size={16} />
      <span>
        {active[0]} 실습 환경 · 콘솔에서 변경한 LB / WAF / Origin / CE를 검증에 반영합니다.
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const lab = labById(active[0]);
          t.select(lab.classId, lab.id);
          s.navigate('Home', 'Training Center');
        }}
      >
        가이드로 돌아가기 <ArrowRight size={13} />
      </Button>
    </div>
  );
}
