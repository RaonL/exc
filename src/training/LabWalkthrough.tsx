import { useMemo } from 'react';
import type { Lab, RequestInput } from './types';
import { buildWalkthrough } from './walkthrough';
import { Button } from '../components/ui/button';
import './walkthrough.css';
export function LabWalkthrough({
  lab,
  onUse,
}: {
  lab: Lab;
  onUse: (input: RequestInput, repeat: number) => void;
}) {
  const guide = useMemo(() => buildWalkthrough(lab), [lab]);
  return (
    <section className="lab-walkthrough" aria-label="더미 데이터 따라하기">
      <h3>더미 데이터로 따라하기 · Class {lab.classId}</h3>
      <p>
        공식 실습 흐름을 로컬에서 연습하는 예제입니다. 아래 주소·서버·고객·요청은 모두 더미이며
        실제로 접속하지 않습니다.
      </p>
      {lab.id === 'c1-lab1' && (
        <p>
          Class 1 Lab 1은 아래 입력값으로 콘솔에서 직접 생성합니다. 서버·LB를 자동으로 생성하지
          않습니다.
        </p>
      )}
      <details open>
        <summary>① 준비되는 더미 환경과 입력값</summary>
        <dl>
          {guide.fixtures.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </details>
      <details>
        <summary>② 직접 바꿀 설정값 · 초기값 → 목표값</summary>
        <p>
          환경 / 설정 또는 연결된 콘솔 폼에서 아래 값을 직접 변경하세요. 예제 불러오기는 정책을
          바꾸지 않습니다.
        </p>
        <div className="walkthrough-table" tabIndex={0} role="region" aria-label="예제 설정값">
          <table>
            <thead>
              <tr>
                <th>설정 항목</th>
                <th>초기값</th>
                <th>목표 예제값</th>
              </tr>
            </thead>
            <tbody>
              {guide.settings.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>
                    <pre>{item.before}</pre>
                  </td>
                  <td>
                    <pre>{item.after}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details open>
        <summary>③ 테스트 요청과 설정 전후 예상 결과</summary>
        <p>
          예상값은 초기 더미 환경과 목표 예제 구성을 비교한 참고값입니다. 실제 실행은 내가 저장한
          설정을 사용합니다. 반복 테스트 전에는 요청 카운터 초기화를 누르세요.
        </p>
        {guide.samples.map((sample, index) => (
          <article key={index}>
            <h4>
              {index + 1}. {sample.name}
            </h4>
            <code>
              {sample.input.method} {sample.input.path} · {sample.input.transport} · {sample.repeat}
              회
            </code>
            <p>
              설정 전:{' '}
              {sample.before.map((result) => `${result.code}/${result.action}`).join(' → ')}
            </p>
            <p>
              목표 설정 후:{' '}
              {sample.after.map((result) => `${result.code}/${result.action}`).join(' → ')}
            </p>
            <details>
              <summary>입력 JSON · 목표 모의 응답 확인</summary>
              <pre>{JSON.stringify(sample.input, null, 2)}</pre>
              <pre>
                {JSON.stringify(
                  {
                    code: sample.after.at(-1)?.code,
                    headers: sample.after.at(-1)?.headers,
                    body: sample.after.at(-1)?.body,
                    reason: sample.after.at(-1)?.reason,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
            <Button
              variant="outline"
              onClick={() => onUse(structuredClone(sample.input), sample.repeat)}
            >
              {lab.id === 'c1-lab1' ? '콘솔에서 이 실습 시작' : '이 예제를 요청 입력에 불러오기'}
            </Button>
          </article>
        ))}
      </details>
    </section>
  );
}
