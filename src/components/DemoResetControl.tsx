import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useConsole } from '../store';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';

export function DemoResetControl({
  onReset,
  label = '설정 초기화',
  className,
}: {
  onReset: () => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <RotateCcw size={14} />
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="전체 데모 환경 초기화"
        description="이 브라우저에 저장된 모든 Namespace의 LB·Origin Pool·WAF와 사용자·이벤트·시스템 설정을 최초 데모 데이터로 되돌립니다. 직접 만든 리소스와 변경사항이 제거됩니다."
      >
        <div className="confirm-body">
          개별 LB 설정만 초기화하려면 LB 편집 화면의 ‘LB 설정 초기화’를 사용하세요.
        </div>
        <div className="form-footer">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              useConsole.getState().reset();
              setOpen(false);
              onReset();
            }}
          >
            전체 데모 데이터 초기화
          </Button>
        </div>
      </Dialog>
    </>
  );
}
