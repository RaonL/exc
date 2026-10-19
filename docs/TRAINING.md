# Class 1–8 로컬 실습 안내

기준: 사용자가 제공한 F5 CloudDocs Community Training 링크. 확인일: 2026-10-19.
공식 문서의 명령·계정 접속·외부 공격 지시는 참고 자료로만 읽었으며 실행하지 않았습니다.

## 시작

**Class 1 Lab 1은 [콘솔 직접 실습](CLASS1-LAB1.md)으로 전환했습니다.** 해당 단원은 `콘솔에서 실습 시작` → 콘솔 메뉴에서 자원 생성 → 도메인 테스트 → Requests/Security Analytics 순서로 진행합니다. 아래 전용 환경/검증 탭 설명은 나머지 단원에 적용됩니다.

1. `npm run dev` → http://127.0.0.1:5173 → 좌측 하단 **Training Center 1–8**.
2. Class와 Lab/Module 선택 → 실습 가이드 → **실습 환경 시작**.
3. **요청 / 검증 → 기준 요청 실행**으로 보호 전 응답을 기록합니다.
4. **환경 / 설정**에서 해당 가이드의 보호·연결 설정을 구성합니다. 자동 저장됩니다.
5. Request Builder로 경로·메서드·헤더 JSON·합성 공격 입력을 조합해 요청합니다.
6. **현재 설정 검증**으로 양성/음성 조건을 함께 검사합니다. FAIL의 기대값·실제 응답·이유를 보고 수정합니다.
7. 모든 항목 통과 + 기준 요청 기록 + 현재 설정 일치일 때 완료입니다. 설정을 변경하면 재검증해야 합니다.

기준 요청은 실습마다 다릅니다. API Deny는 대상·정상 endpoint, 헤더 정책은 헤더 없음·정답·오답, rate limiting은 반복 4회, 봇 실습은 사람·봇 로그인 요청을 사용합니다. 보호 적용 후에도 실행할 수 있으므로 처음 시작했을 때 먼저 기록해야 전후 비교에 유용합니다.

정답이 필요하면 환경 아래 **정답 구성 보기 → 정답 구성 적용**을 사용합니다. Class 7 정답은 모의 파이프라인, 스캔 정답은 모의 스캔도 실행합니다. 정답 적용 자체로 진도가 완료되지는 않습니다.

## 공식 원문과 실습 범위

| Class | 단원     | 공식 원문                                                                                             | 로컬에서 검사하는 핵심 동작                                                                      |
| ----- | -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | Lab 1    | [Public Endpoint](https://clouddocs.f5.com/training/community/f5xc/html/class1/lab1.html)             | HTTP/80/Internet/Public DNS, WAF 전후 정상·SQLi·XSS                                              |
| 1     | Lab 2    | [Private via RE](https://clouddocs.f5.com/training/community/f5xc/html/class1/lab2.html)              | 사설 Origin+CE, RE 광고, CE 단절, WAF                                                            |
| 1     | Lab 3    | [Private Endpoint](https://clouddocs.f5.com/training/community/f5xc/html/class1/lab3.html)            | Custom CE 광고, 사설 Origin, WAF                                                                 |
| 1     | Lab 4    | [Security Analytics](https://clouddocs.f5.com/training/community/f5xc/html/class1/lab4.html)          | 정상/차단 요청, 요청 ID·JSON·콘솔 이벤트                                                         |
| 2     | Lab 1    | [WAF Configuration](https://clouddocs.f5.com/training/community/f5xc/html/class2/lab1.html)           | 연결·Monitoring/Blocking·SQLi·XSS                                                                |
| 2     | Lab 2    | [Bots](https://clouddocs.f5.com/training/community/f5xc/html/class2/lab2.html)                        | 보호 endpoint, Flag/Blocking, 정상 사용자 유지                                                   |
| 2     | Lab 3    | [Malicious Users](https://clouddocs.f5.com/training/community/f5xc/html/class2/lab3.html)             | 공유 IP의 fingerprint별 합성 임계값·임시 차단                                                    |
| 2     | Lab 4    | [Web App Scanning](https://clouddocs.f5.com/training/community/f5xc/html/class2/lab4.html)            | profile, 수동 모의 스캔, 보호 전후 finding 비교                                                  |
| 2     | Lab 5    | [AI Assistant](https://clouddocs.f5.com/training/community/f5xc/html/class2/lab5.html)                | 실제 로컬 로그 ID를 포함한 템플릿 설명                                                           |
| 3     | Lab 1    | [Service Policy](https://clouddocs.f5.com/training/community/f5xc/html/class3/lab1.html)              | `x-f5-appworld` 헤더의 정확한 값만 허용                                                          |
| 3     | Lab 2    | [Routes](https://clouddocs.f5.com/training/community/f5xc/html/class3/lab2.html)                      | `X-App-Version: green`, `/login` Route WAF, prefix rewrite, `XC-Namespace`                       |
| 3     | Lab 3    | [Dashboards / AI](https://clouddocs.f5.com/training/community/f5xc/html/class3/lab3.html)             | 트래픽/차단 로그와 Explain 연결                                                                  |
| 4     | Lab 1    | [LB and Origin](https://clouddocs.f5.com/training/community/f5xc/html/class4/lab1.html)               | HTTPS/443 → Origin/80, Swagger 모의 요청                                                         |
| 4     | Lab 2    | [API Inventory](https://clouddocs.f5.com/training/community/f5xc/html/class4/lab2.html)               | 고정 OpenAPI inventory, Shadow endpoint fall-through Deny                                        |
| 4     | Lab 3    | [API Protection](https://clouddocs.f5.com/training/community/f5xc/html/class4/lab3.html)              | `/api/customerlookup/getbydob` endpoint Deny/ANY, 정상 endpoint 허용                             |
| 4     | Lab 4    | [WAF](https://clouddocs.f5.com/training/community/f5xc/html/class4/lab4.html)                         | API 앱의 WAF 연결·공격 차단                                                                      |
| 4     | Lab 5    | [Rate Limiting](https://clouddocs.f5.com/training/community/f5xc/html/class4/lab5.html)               | 모의 API 요청 시간 창·429·다른 클라이언트 허용                                                   |
| 4     | Lab 6    | [Analytics / Users](https://clouddocs.f5.com/training/community/f5xc/html/class4/lab6.html)           | 악성 식별자 차단·정상 식별자 유지                                                                |
| 4     | Lab 7    | [BIG-IP Connector](https://clouddocs.f5.com/training/community/f5xc/html/class4/lab7.html)            | connector 토글+합성 `/qrcode/form` 텔레메트리·Shadow/OpenAPI                                     |
| 5     | Lab 1    | [Traffic Baseline](https://clouddocs.f5.com/training/community/f5xc/html/class5/lab1.html)            | 항공 앱 로그인 봇의 보호 전 응답                                                                 |
| 5     | Lab 2    | [Bot Profile](https://clouddocs.f5.com/training/community/f5xc/html/class5/lab2.html)                 | POST `/user/vipsignin`, Flag, 추론 헤더                                                          |
| 5     | Lab 3    | [Human-Simulated Stuffing](https://clouddocs.f5.com/training/community/f5xc/html/class5/lab3.html)    | 초기 10회 Human → 이후 BadBot 합성 분류                                                          |
| 5     | Lab 4    | [Ongoing Attack](https://clouddocs.f5.com/training/community/f5xc/html/class5/lab4.html)              | GET `/flight` 스크래핑 Flag → Blocking                                                           |
| 6     | M1 Lab 1 | [CE Inspection](https://clouddocs.f5.com/training/community/f5xc/html/class6/module1/lab1.html)       | CE Online/Offline와 사설 연결                                                                    |
| 6     | M1 Lab 2 | [Segments](https://clouddocs.f5.com/training/community/f5xc/html/class6/module1/lab2.html)            | DC/AWS 세그먼트 격리·연결, HTTP 허용/SSH 거부                                                    |
| 6     | M2 Lab 3 | [Global Frontend](https://clouddocs.f5.com/training/community/f5xc/html/class6/module2/lab3.html)     | AWS 우선, Azure failover, 전체 장애, 복구                                                        |
| 6     | M2 Lab 4 | [IP Overlap](https://clouddocs.f5.com/training/community/f5xc/html/class6/module2/lab4.html)          | 동일 사설 IP의 CE VIP 분리·서비스 접근                                                           |
| 7     | Module 1 | [Vibe Coding](https://clouddocs.f5.com/training/community/f5xc/html/class7/module1/module1.html)      | JSON 앱 manifest 편집, artifact 해시, route 계약 테스트                                          |
| 7     | Module 2 | [CI/CD](https://clouddocs.f5.com/training/community/f5xc/html/class7/module2/module2.html)            | Build/Test/Deploy, WAF 필수 배포 gate, 배포 소스 일치                                            |
| 7     | Module 3 | [Advanced Runtime](https://clouddocs.f5.com/training/community/f5xc/html/class7/module3/module3.html) | API Discovery, `/login`·`/contact` Bot Blocking                                                  |
| 7     | Module 4 | [Scanning](https://clouddocs.f5.com/training/community/f5xc/html/class7/module4/module4.html)         | 배포된 앱의 모의 스캔·보호 전후 보고서                                                           |
| 8     | Lab 1    | [Negative Policy](https://clouddocs.f5.com/training/community/f5xc/html/class8/lab1.html)             | Fiji·TOR·Spam 거부, 정상 요청 허용                                                               |
| 8     | Lab 2    | [Positive Policy](https://clouddocs.f5.com/training/community/f5xc/html/class8/lab2.html)             | 기본 거부, 국가+GET+경로 allowlist                                                               |
| 8     | Lab 3    | [Zero Day](https://clouddocs.f5.com/training/community/f5xc/html/class8/lab3.html)                    | 분당 3회·burst 1, POST `/auth.php`·GET `/ratelimit.php`, 나머지 bypass, 사용자 정의 exploit 패턴 |

Class 2 개요는 [공식 Class 2 목차](https://clouddocs.f5.com/training/community/f5xc/html/class2/class2.html)도 참조했습니다. 중복 URL은 합치고, 붙어 있던 Class 4 Lab 4/5 URL은 분리했습니다. 공식 목차로 이어지는 Class 1 Lab 3/4와 Class 2 Lab 2를 추가해 총 34개입니다. Class 7은 사용자가 지정한 Module 1–4 단위이며 UDF 접속/초기 안내 Module 0는 실습 수에 포함하지 않습니다.

## 실제 서비스와 다른 점

- **공유 자원:** LB·Origin·WAF·CE를 기본 콘솔과 공유합니다. 실습 요청은 같은 Namespace의 Security Events와 요청 수에 반영됩니다. 탐색한 endpoint는 API Discovery 목록에 반영됩니다.
- **실습 전용 규칙:** 서비스 정책·header canary·API inventory/Deny·Bot profile·rate limiter·network segment/failover/VIP 해소는 Training Center의 추가 평가기에서 동작합니다. 일반 Simulation Lab과 콘솔 정책 인벤토리에는 이 추가 평가기가 연결되지 않습니다. `/login`의 Origin/WAF route 자체는 공통 LB routes를 사용합니다.
- **독립 환경:** 각 단원은 이전 단원의 상태를 이어받지 않고 자체 fixture로 시작합니다. `training-{labId}` Namespace와 고정 소유 리소스 ID로 분리하며, 초기화는 해당 단원 fixture만 교체합니다. 다른 단원의 진도·사용자 데모 자원은 유지합니다.
- **WAF:** SQLi/XSS라고 선택한 입력을 공통 정책 평가기에 전달합니다. 실제 payload 파싱·시그니처 엔진은 없습니다. 원문의 WAF 튜닝 전체를 복제하지 않습니다.
- **봇/악성 사용자:** fingerprint는 입력 문자열이며 실제 JA4를 수집하지 않습니다. Human-like bot의 10회와 악성 사용자의 3회는 교육용 고정 임계값입니다. OpenBullet/Selenium/공격 스크립트·브라우저 challenge·CAPTCHA를 실행하지 않습니다.
- **시간 창:** 클라이언트 IP+fingerprint+메서드+경로별 고정 창입니다. 일반 요청은 현재 시각을 반영하고 `모의 시간 +61초`로 즉시 만료를 시험할 수 있습니다. 검증은 격리한 카운터로 실행하고 원래 카운터·시간·자원 health를 보존합니다. 실제 F5 내부 rate-limit 알고리즘의 복제는 아닙니다.
- **API:** 고정된 최소 OpenAPI inventory와 합성 응답만 사용합니다. 임의 OpenAPI 업로드/실제 schema learning은 미구현입니다. `getbydob`의 SSN 자리는 `DEMO-NOT-REAL`이며 개인정보가 아닙니다. Class 4 Lab 3은 schema 오류 실습이 아니라 원문처럼 endpoint Deny입니다.
- **네트워크:** 세그먼트·SSH·CE VIP·장애 전환은 객체 상태를 계산합니다. HTTP 503은 로컬 모델의 연결 실패 표현입니다. 실제 라우팅 테이블·터널·클라우드 interface를 만들지 않습니다. AWS/Azure 명칭은 모의 Origin 이름입니다.
- **스캔/AI:** Scan 버튼은 현재 보호 설정에 따른 3개 합성 finding을 계산하고 최근 10개 보고서를 보관합니다. Daily 설정은 연습용 저장값이며 자동 실행하지 않습니다. Explain은 현재 로그 ID와 집계를 넣은 템플릿이며 실제 AI 모델이 아닙니다.
- **Class 7:** 원문의 Cline/LLM·Git/CI·Docker·UDF 배포를 JSON route manifest 편집과 로컬 artifact/계약 테스트/배포 상태로 대체합니다. WAF Blocking이 없으면 Deploy가 실패하고, 소스를 변경하면 다시 Build/Test가 필요합니다.
- **화면:** Training Center는 시뮬레이터에 추가한 학습 UI입니다. 실제 F5 콘솔에 존재하는 메뉴라고 주장하지 않습니다. 각 단원의 원문/차이점 탭에 재현 경계를 표시합니다.

## 상태·파일 구조

`f5-xc-training-v1` localStorage에 선택 단원, fixture, 기준 요청, 검증, 시간 창, 로그와 보고서를 저장합니다. 기존 콘솔은 `f5-xc-simulator-v1`을 계속 사용합니다. 기본 콘솔의 Reset Demo Data는 콘솔 자원을 초기화하며 별도 학습 기록은 보존합니다. 그 후 실습 자원이 없어지면 완료 상태가 해제되고 각 실습에서 초기화할 수 있습니다.

```text
src/training/
  catalog.ts                 8개 Class / 34개 단원 / 공식 원문 / 한국어 단계
  types.ts                   fixture·설정·요청·로그·검증 타입
  engine.ts                  로컬 평가기·스캔·파이프라인·검증·정답 구성
  store.ts                   persist·콘솔 자원/이벤트 연결·초기화·진도
  TrainingCenter.tsx         가이드·설정·Request Builder·검증·보고서 UI
  training.css               독립 학습 화면·반응형 스타일
  engine.test.ts             34개 정답/오답 환경 및 상태 연동 회귀 검사
  TrainingCenter.test.ts     불완전 JSON 편집 중 렌더링 회귀 검사
```

`catalog.ts`의 단원·원문·단계를 교체하고 `engine.ts`의 exercise별 조건을 보강하면 더 정밀한 재현으로 확장할 수 있습니다.

## 검증

`npm test`, `npm run build`를 실행합니다. 앱 안의 **34개 모델 자체 검증**은 격리 메모리의 정답 fixture에 검증을 실행하며 학습 진도와 콘솔 상태를 변경하지 않습니다. 각 단원의 현재 설정 검증은 사용자가 실제 편집한 값을 검사하며 정답 구성을 호출하지 않습니다.
