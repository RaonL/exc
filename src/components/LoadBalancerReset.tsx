import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';

export function LoadBalancerReset({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="config-reset-defaults" onClick={() => setOpen(true)}>
        <RotateCcw size={13} /> LB 설정 초기화
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Reset load balancer settings?"
        description="이름·도메인·리소스 ID·요청 집계는 유지합니다. Origin Pool 및 WAF 연결, 설명·라벨, Routes·Exclusions와 나머지 설정을 새 LB 기본값으로 초기화합니다. 저장해야 반영됩니다."
      >
        <p className="lb-reset-help">
          HTTPS / port 443 · Internet advertisement · WAF Disable. 초기화 후 Origin Pool을 다시
          선택하세요. Reset All Fields로 편집 시작 시점의 값을 복원할 수 있습니다.
        </p>
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Keep editing
          </Button>
          <Button
            type="button"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            Reset draft settings
          </Button>
        </div>
      </Dialog>
    </>
  );
}
