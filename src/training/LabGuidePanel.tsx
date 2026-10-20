import { useState } from 'react';
import { BookOpen, ChevronDown, Copy, LocateFixed } from 'lucide-react';
import type { GuideField } from './console-guide';
import type { Lab } from './types';

export function LabGuidePanel({
  lab,
  fields,
  saved,
  onLocate,
  current,
  readOnly,
  inEditor = false,
}: {
  lab: Lab;
  fields: GuideField[];
  saved: boolean;
  onLocate?: (field: GuideField) => void;
  current?: string;
  readOnly?: boolean;
  inEditor?: boolean;
}) {
  const [open, setOpen] = useState(true),
    [copied, setCopied] = useState('');
  return (
    <aside
      className="console-guide-panel all-lab-guide"
      aria-label="실습 설정 따라하기 가이드"
      data-collapsed={!open}
    >
      <header>
        <BookOpen size={16} />
        <strong>
          Class {lab.classId} · {lab.unit.replaceAll('/', ' / ')}
        </strong>
        <button
          type="button"
          aria-label={open ? '실습 가이드 접기' : '실습 가이드 펼치기'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown size={16} />
        </button>
      </header>
      {open && (
        <div className="console-guide-content">
          <h3>{lab.title}</h3>
          <p className="guide-instruction">
            {inEditor
              ? '아래 목표값을 직접 입력하세요. 찾기를 누르면 해당 설정으로 이동합니다. Apply 후 부모 화면의 Save까지 눌러야 저장됩니다.'
              : '입력칸 옆 목표값을 보고 직접 설정하세요. 환경 / 설정은 자동 저장됩니다. 요청 / 검증에서는 예제를 불러온 후 실행하고, 로그에서 응답 이유를 확인하세요.'}
          </p>
          <details className="guide-mobile-instructions">
            <summary>설정 순서 보기</summary>
            <p>{lab.steps.join(' → ')}</p>
          </details>
          {readOnly && <p className="guide-readonly">Edit Configuration을 눌러 편집하세요.</p>}
          <p className="guide-legend">☑ 실제 값으로 자동 체크 · 검증 완료는 별도 확인</p>
          <ol className="guide-fields">
            {fields.map((f) => (
              <li key={f.id} data-complete={f.pass} data-current={current === f.id}>
                <div className="guide-field-title">
                  <span
                    className="guide-check"
                    role="checkbox"
                    aria-readonly="true"
                    aria-checked={f.pass}
                    aria-label={`${f.title} 입력 확인`}
                  >
                    {f.pass ? '✓' : ''}
                  </span>
                  <strong>{f.title}</strong>
                </div>
                <code>{f.expected}</code>
                <div className="guide-field-actions">
                  {onLocate && (
                    <button
                      type="button"
                      aria-label={`설정 위치: ${f.title}`}
                      onClick={() => onLocate(f)}
                    >
                      <LocateFixed size={13} /> 찾기
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`입력값 복사: ${f.title}`}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(f.copyValue ?? f.expected);
                        setCopied(f.id);
                      } catch {
                        setCopied('failed');
                      }
                    }}
                  >
                    <Copy size={12} />
                    {copied === f.id ? '복사됨' : '복사'}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {copied === 'failed' && (
            <p role="status">복사 권한이 없습니다. 표시된 값을 직접 복사하세요.</p>
          )}
          <details className="lab-guide-order">
            <summary>실습 전체 순서</summary>
            <ol>
              {lab.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </details>
          <div className={`guide-saved ${saved ? 'complete' : ''}`} role="status">
            {saved ? '☑ 저장된 설정 확인 완료' : '☐ 저장된 설정 / 검증 결과를 확인하세요'}
          </div>
          <p className="guide-save-note">
            {inEditor
              ? '입력 확인은 초안 기준입니다. Cancel and Exit은 초안만 취소합니다.'
              : 'LB·Origin·WAF·CE는 콘솔과 공유합니다. 추가 정책은 콘솔의 실습 설정 / 테스트에서 사용하는 로컬 모델입니다.'}
          </p>
          <a href={lab.source} target="_blank" rel="noreferrer">
            {lab.classId === 9 ? '커뮤니티 참고 원문' : '공식 실습 원문'} ↗
          </a>
        </div>
      )}
    </aside>
  );
}
