import { useState } from 'react';
import { BookOpen, ChevronDown, Copy, LocateFixed } from 'lucide-react';
import { useConsole } from '../store';
import { class1Lab1Source, consoleLab1Checks } from '../lib/console-lab';
import { guideSteps, type GuideField, type GuideStep } from './console-guide';

export function ConsoleGuidePanel({
  fields,
  step,
  kind,
  current,
  onLocate,
  readOnly = false,
}: {
  fields: GuideField[];
  step: GuideStep;
  kind: string;
  current?: string;
  onLocate?: (field: GuideField) => void;
  readOnly?: boolean;
}) {
  const state = useConsole(),
    lab = state.consoleLab1;
  const [copied, setCopied] = useState('');
  if (!lab || state.namespace !== lab.namespace) return null;
  const saved = consoleLab1Checks(state, lab).find((check) => check.id === step)?.pass;
  const instruction = guideSteps.find((item) => item.id === step)!;
  const instructionsByKind: Record<string, string> = {
    'Origin Server':
      'Public DNS 타입을 확인하고 DNS Name을 입력하세요. 하단 Apply로 Origin Pool 화면에 돌아갑니다.',
    'Origin Pool with Weight and Priority':
      '현재 Namespace의 Origin Pool을 선택하고 Weight·Priority는 1로 둡니다. 하단 Apply를 눌러 LB에 연결하세요.',
  };
  const currentInstruction = instructionsByKind[kind] ?? instruction.instruction;
  const setStep = (next: GuideStep) =>
    useConsole.setState({ consoleLab1: { ...lab, guideStep: next, guideOpen: true } });
  return (
    <aside
      className="console-guide-panel"
      aria-label="설정 따라하기 가이드"
      data-collapsed={!lab.guideOpen}
    >
      <header>
        <BookOpen size={16} />
        <strong>Class 1 · Lab 1 따라하기</strong>
        <button
          type="button"
          aria-label={lab.guideOpen ? '설정 가이드 접기' : '설정 가이드 펼치기'}
          aria-expanded={lab.guideOpen}
          onClick={() =>
            useConsole.setState({ consoleLab1: { ...lab, guideOpen: !lab.guideOpen } })
          }
        >
          <ChevronDown size={16} />
        </button>
      </header>
      {lab.guideOpen ? (
        <div className="console-guide-content">
          <p className="guide-namespace">
            Namespace <b>{lab.namespace}</b>
          </p>
          {kind === 'HTTP Load Balancer' && (
            <div className="guide-phase-switch" aria-label="LB 실습 단계">
              <button type="button" aria-pressed={step === 'lb'} onClick={() => setStep('lb')}>
                ② LB 기본 설정
              </button>
              <button type="button" aria-pressed={step === 'waf'} onClick={() => setStep('waf')}>
                ④ WAF 연결
              </button>
            </div>
          )}
          <h3>{instruction.title}</h3>
          <p className="guide-instruction">{currentInstruction}</p>
          <details className="guide-mobile-instructions">
            <summary>설정 순서 보기</summary>
            <p>{currentInstruction}</p>
          </details>
          {readOnly && (
            <p className="guide-readonly">
              읽기 화면입니다. Edit Configuration을 누르면 입력할 수 있습니다.
            </p>
          )}
          <p className="guide-legend">☑ 입력값이 맞으면 자동 체크 · 저장 완료는 별도 확인</p>
          <ol className="guide-fields">
            {fields.map((field) => (
              <li key={field.id} data-complete={field.pass} data-current={current === field.id}>
                <div className="guide-field-title">
                  <span
                    role="checkbox"
                    aria-readonly="true"
                    aria-checked={field.pass}
                    aria-label={`${field.title} 입력 확인`}
                    className="guide-check"
                  >
                    {field.pass ? '✓' : ''}
                  </span>
                  <strong>{field.title}</strong>
                </div>
                <code>{field.expected}</code>
                <div className="guide-field-actions">
                  {onLocate && (
                    <button
                      type="button"
                      aria-label={`설정 위치: ${field.title}`}
                      onClick={() => onLocate(field)}
                    >
                      <LocateFixed size={13} /> 찾기
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`입력값 복사: ${field.title}`}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(field.copyValue ?? field.expected);
                        setCopied(field.id);
                      } catch {
                        setCopied('failed');
                      }
                    }}
                  >
                    <Copy size={12} /> {copied === field.id ? '복사됨' : '복사'}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {copied === 'failed' && (
            <p role="status">복사 권한이 없습니다. 표시된 값을 직접 선택해 복사하세요.</p>
          )}
          {kind === 'Origin Server' || kind === 'Origin Pool with Weight and Priority' ? (
            <p className="guide-save-note">
              입력 후 하단 <b>Apply</b> → 이전 화면에서 최종 저장하세요. <b>Back / Discard</b>는 이
              창의 변경을 버립니다.
            </p>
          ) : (
            onLocate && (
              <p className="guide-save-note">
                입력을 마치면 하단{' '}
                <b>
                  {kind === 'Origin Pool'
                    ? 'Add / Save Origin Pool'
                    : 'Add / Save HTTP Load Balancer'}
                </b>
                를 누르세요. 취소하면 입력한 초안이 저장되지 않습니다.
              </p>
            )
          )}
          <div className={`guide-saved ${saved ? 'complete' : ''}`} role="status">
            {saved
              ? '☑ 이 단계의 저장된 설정 / 요청 확인 완료'
              : '☐ 아직 저장된 결과가 완료 조건에 맞지 않습니다'}
          </div>
          <a href={class1Lab1Source} target="_blank" rel="noreferrer">
            공식 Lab1 원문 ↗
          </a>
        </div>
      ) : (
        <p className="guide-collapsed-note">가이드를 펼쳐 입력값을 확인하세요.</p>
      )}
    </aside>
  );
}
