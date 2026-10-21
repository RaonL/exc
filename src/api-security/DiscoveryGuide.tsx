import { Button } from '../components/ui/button';

const lessons = [
  {
    location: 'API Quickstarts → 실습 더미 환경 준비 → HTTP Load Balancer 선택',
    values: [['Namespace', 'api-quickstart'], ['HTTP Load Balancer', 'shop-lb'], ['Domain', 'shop.example.test'], ['Origin Pool', 'shop-origin']],
    save: '실습 더미 환경 준비를 한 번 누릅니다. 기존 설정은 초기화하지 않습니다.',
    check: '아래 선택기에 shop-lb · api-quickstart가 표시되는지 확인합니다. API 설정은 다음 단계에서 직접 입력합니다.',
  },
  {
    location: 'HTTP LB → Edit Configuration → API Protection → API Discovery',
    values: [['API Discovery', 'Enable'], ['Learn From Traffic With Direct Response', 'Disable (기본 2xx만 학습)'], ['Purge Duration for Inactive Discovered APIs', '30']],
    save: 'Save HTTP Load Balancer를 누릅니다. 다시 열어 Enable·30이 유지되는지 확인하고 새로고침 후에도 재조회합니다.',
    check: 'API Definition과 API Testing은 이 실습의 필수 항목이 아닙니다. 기존 Protection을 켰다면 요청이 차단되어 학습되지 않을 수 있으니 Logs를 확인하세요.',
  },
  {
    location: 'Manage → API Management → Code Base Integration → Add Code Base Integration',
    values: [['Name', 'shop-code'], ['Code Base', 'Github Integration'], ['Username', 'demo-user'], ['API Key → Configure → Secret', 'demo-only'], ['LB → API Repositories → Code Base Integration', 'api-quickstart/shop-code'], ['Repository', 'demo-org/shop']],
    save: 'Secret Apply → Save and Exit. 이후 LB 설정 위치 찾기로 돌아가 API Repositories에 참조·Repository를 입력하고 Save HTTP Load Balancer를 누릅니다. 이미 shop-code가 있으면 새로 만들지 않고 선택합니다.',
    check: '아래 Run Code Discovery (모의)를 누릅니다. API Endpoints에 GET /api/code-products, Discovery Source: Code가 표시되어야 합니다.',
  },
  {
    location: 'HTTP LB → Edit Configuration → API Protection → API Crawling → Add Crawl Domain',
    values: [['API Crawling', 'Enable'], ['Domain', 'shop.example.test'], ['User', 'demo-user'], ['Password → Configure → Secret', 'demo-only']],
    save: 'Secret Apply → Crawl Domain Apply → Save HTTP Load Balancer. Apply만 누르고 나가면 LB에는 저장되지 않습니다.',
    check: '아래 Run API Crawling (모의)를 누릅니다. GET /api/crawl-cart, Discovery Source: API Crawling을 확인합니다. Domain은 현재 선택한 LB 도메인과 같아야 합니다.',
  },
  {
    location: 'API Quickstarts → Request Lab → Run Sample API Request → API Endpoints / Logs',
    values: [['Method', 'GET'], ['Request Path', '/api/discovery-check'], ['Request Headers JSON', '{}'], ['Request Body JSON', '{}'], ['Dummy Response Body JSON', '{}'], ['Redirect response 302', '끄기']],
    save: '요청 예제값 넣기는 Request Lab의 입력란만 채웁니다. Run Sample API Request는 직접 눌러 실행합니다.',
    check: '200 / Allowed → API Endpoints에서 GET /api/discovery-check, Source: Traffic, API Calls 증가를 확인합니다. Logs에서 해당 경로·응답·정책 사유·external_requests=0을 읽습니다. 새로고침 후 endpoint와 로그가 유지되는지도 확인하세요. Code/Crawling은 고정 fixture이며 요청 로그를 생성하지 않습니다.',
  },
];

export function DiscoveryGuide({ step, ready, locate, repository, sample }: {
  step: number; ready: boolean; locate: () => void; repository: () => void; sample: () => void;
}) {
  const lesson = lessons[step];
  return <section className="api-discovery-guide" aria-label="API Discovery 실습 입력값">
    <h3>설정 위치 · 직접 입력할 예제값</h3>
    <p>{lesson.location}</p>
    <div className="api-toolbar">
      <Button variant="outline" disabled={step > 0 && !ready} onClick={locate}>
        {step === 0 ? '실습 환경 준비·LB 찾기' : step === 4 ? '테스트 위치 찾기' : '설정 위치 찾기'}
      </Button>
      {step === 2 && <Button variant="outline" disabled={!ready} onClick={repository}>LB API Repositories 설정 위치 찾기</Button>}
      {step === 4 && <Button variant="outline" disabled={!ready} onClick={sample}>요청 예제값 넣기</Button>}
    </div>
    <div className="table-wrap"><table><thead><tr><th>설정 항목</th><th>입력값</th></tr></thead>
      <tbody>{lesson.values.map(([field, value]) => <tr key={field}><td>{field}</td><td><code>{value}</code></td></tr>)}</tbody>
    </table></div>
    <p><strong>저장 순서: </strong>{lesson.save}</p>
    <p><strong>결과 확인: </strong>{lesson.check}</p>
    <p>비공식 로컬 예제 · 계정·토큰은 demo-only 등 더미값만 사용합니다. 실제 GitHub 연결·크롤링·외부 요청은 없습니다.</p>
  </section>;
}
