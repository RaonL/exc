import { BookOpen, ArrowRight } from 'lucide-react';
import { useConsole } from '../store';
import { useTraining } from './store';
import { labById } from './catalog';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { lazy, Suspense, useState } from 'react';
const TrainingCenter = lazy(() =>
  import('./TrainingCenter').then((m) => ({ default: m.TrainingCenter })),
);
export function TrainingReturn() {
  const s = useConsole(),
    t = useTraining();
  const [open, setOpen] = useState(false);
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
      {active[0] !== 'c1-lab1' && (
        <Button
          size="sm"
          onClick={() => {
            const lab = labById(active[0]);
            t.select(lab.classId, lab.id);
            t.setGuideTab('Environment');
            setOpen(true);
          }}
        >
          실습 설정 / 테스트
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="콘솔 실습 설정 / 테스트"
        description="현재 Namespace의 설정을 직접 바꾸고 가이드를 보면서 로컬 요청을 실행하세요."
        wide
      >
        <Suspense fallback={<p role="status">실습 설정 불러오는 중…</p>}>
          <TrainingCenter embedded onOpenConsole={() => setOpen(false)} />
        </Suspense>
      </Dialog>
    </div>
  );
}
