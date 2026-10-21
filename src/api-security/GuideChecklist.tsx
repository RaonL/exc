import { createContext, useContext, useState } from 'react';

export type ChecklistGuide = {
  identity: string; title: string; items: string[];
  stepTitles?: string[]; currentStep?: number; onStepChange?: (step: number) => void;
};
export const ApiGuideContext = createContext<ChecklistGuide | null>(null);

export function ConfigurationChecklist() {
  const guide = useContext(ApiGuideContext);
  return guide ? <GuideChecklist key={guide.identity} {...guide} /> : null;
}

export function GuideChecklist({ identity, title, items, stepTitles, currentStep, onStepChange }: ChecklistGuide) {
  const storageKey = `f5-xc-api-checklist:${identity}`;
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
      return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string') : [];
    } catch { return []; }
  });
  return <aside className="api-guide-panel" aria-label="설정 중 실습 체크리스트">
    <h2>입력값 · 실습 체크리스트</h2>
    <h3>{title}</h3>
    {stepTitles && <label>안내 단계
      <select aria-label="설정 중 안내 단계" value={currentStep} onChange={e => onStepChange?.(Number(e.target.value))}>
        {stepTitles.map((name, index) => <option key={name} value={index}>{index + 1}. {name}</option>)}
      </select>
    </label>}
    <p>직접 확인한 항목에 체크하세요. 설정 저장·검증 완료와 별개인 학습 메모입니다.</p>
    {items.map(item => <label key={item}>
      <input type="checkbox" checked={checked.includes(item)} onChange={e => {
        const next = e.target.checked ? [...checked, item] : checked.filter(x => x !== item);
        setChecked(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
      }} />
      <span>{item}</span>
    </label>)}
    <p>하위 설정 창에서도 계속 표시됩니다. Apply 후 부모 LB의 Save HTTP Load Balancer까지 눌러야 저장됩니다.</p>
  </aside>;
}

export const checklistItems: string[][][] = [
  [
    ['실습 더미 환경 준비', 'Namespace: api-quickstart / LB: shop-lb', 'Domain: shop.example.test'],
    ['API Protection → API Discovery: Enable', 'Learn From Traffic With Direct Response: Disable', 'Purge Duration: 30', 'Save HTTP Load Balancer → 다시 열어 값 확인'],
    ['Code Base Integration → Name: shop-code', 'Code Base: Github Integration / Username: demo-user', 'API Key → Configure → Secret: demo-only → Apply → Save and Exit', 'LB API Repositories → Integration: api-quickstart/shop-code', 'Repository: demo-org/shop → LB 저장'],
    ['API Crawling: Enable → Add Crawl Domain', 'Domain: shop.example.test / User: demo-user', 'Password → Configure → Secret: demo-only', 'Secret Apply → Domain Apply → LB 저장'],
    ['Run Code Discovery → /api/code-products / Source: Code', 'Run API Crawling → /api/crawl-cart / Source: API Crawling', 'Request Lab → Discovery 요청 예제 → Run Sample API Request', '200 Allowed → /api/discovery-check / Source: Traffic', 'Logs 확인 → 새로고침 후 데이터 유지 확인'],
  ],
  [
    ['OpenAPI File → Name: shop-openapi', 'Upload File: shop-openapi.json 또는 Load dummy OpenAPI', 'Save and Exit'],
    ['API Definition → Name: shop-definition', 'OpenAPI Specification Files: shop-openapi 체크', 'Save and Exit (LB 연결은 다음 단계)'],
    ['LB → API Protection → API Definition: Enable', 'Select API Definition: api-quickstart/shop-definition', 'Save HTTP Load Balancer'],
    ['Validation: API Inventory → Configure', 'Request Processing Mode: Validate', 'Request Validation Enforcement Type: Report', 'Request Validation Properties: Request Body 포함', 'Response Processing Mode: Skip', 'Apply → Save HTTP Load Balancer', 'Request Lab → 스키마 위반 예제 → Run → 200 Detected'],
    ['API Inventory → Configure → Request Enforcement: Block', 'Apply → LB 저장 → 스키마 위반 예제 → 403 Blocked / 정상 예제 → 200 Allowed', 'Custom List → Configure → Add Validation Rule', 'Name: orders-only / Path: /api/orders / Method: POST / Action: Block', 'Fall Through Mode: Custom → Add Fall Through Rule', 'Name: unknown-block / Path: /api/unknown / Method: GET / Action: Block', 'Apply → 부모 Apply → LB 저장', 'Request Lab → GET /api/unknown: 403 / GET /api/else: 200 (Redirect 끄기)'],
  ],
  [
    ['LB → API Protection → API Definition: Enable / shop-definition 연결 확인', 'API Testing: Enable', 'Save HTTP Load Balancer'],
    ['API Testing: Enable → Add Testing Environment', 'Domain: shop.example.test', 'Use Destructive Methods: Disable (처음 실습)', 'Environment Apply → LB 저장'],
    ['Testing Environment → Credentials → Add Item (총 3개)', 'user-one: API Key / Role: Standard', 'user-two: API Key / Role: Standard', 'administrator: API Key / Role: Admin', '각 API Key: Key x-demo-key / Secret Configure → demo-only → Apply', '각 Credential Apply → Environment Apply → LB 저장', '실제 계정·토큰 대신 더미값만 사용'],
    ['Frequency of Test: Every Week', 'Custom Header: api-lab (헤더 키 x-f5-apitesting-identifier)', 'Save HTTP Load Balancer → 새로고침 후 값 확인', '예약 실행 비교는 모의 시계 +7일'],
    ['Run API Testing (모의)', 'API Endpoints → ⚙ Last Tested 켜기', '엔드포인트 클릭 → Security Posture / Source: API Testing', 'Logs → Current saved configuration 및 판정 사유 확인', '설정 변경 후에는 재실행 (과거 로그는 당시 설정 유지)'],
  ],
];
