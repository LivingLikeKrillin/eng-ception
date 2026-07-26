# engception-capture — 실생활 영어 문장 캡처·복습 앱 (RN 전환) — Design

> engception의 **개편(overhaul)**. 웹 PWA(5형식 학습 엔진)를 유지한 채, **별도의 React Native 안드로이드 앱**으로 새 제품 축을 연다: 실생활에서 마주친 영어 문장을 **카메라로 거의 마찰 없이 캡처 → 컬렉션 → 가벼운 복습(+성분 분석)**. Play Store 배포 + 구글 로그인 포함. 5형식 엔진은 **나중에 합류**.

## 1. 문제 / 목표

### 동기
- 기존 앱 컨셉 = "발화 실패 복기 도구 — 사용자의 실제 삶이 콘텐츠가 된다." 그런데 지금은 그 "실제 삶"을 **한국어로 타이핑**해서 넣어야 함.
- 실생활에서 두고두고 복습하고 싶은 영어 문장(책·논문 등)을 만났을 때, **타이핑 등록의 마찰이 너무 커서 캡처 자체가 안 일어남.** 캡처 마찰은 이런 앱(sentence mining, Anki류)을 죽이는 1순위 원인.
- 목표: **캡처를 2~3탭으로 줄이고**, 그 문장을 가볍게 복습·구조 이해하게 한다.

### 왜 네이티브(RN)인가 — 재작성을 정당화하는 핵심 기능
"관심영역(ROI)/구획을 얼마나 잘 쪼개서 원하는 것만 고르느냐"가 관건. 책·논문은 구획(단·문단)이 나뉘어 있고, 사용자가 **원하는 구획만 선택**해야 함.
- 온디바이스 **실시간/구획 검출**(카메라 프레임 처리)은 웹에 깔끔한 대응 API가 없음 → 네이티브 정당화.
- 온디바이스 OCR로 처리하면 **Claude 이미지 토큰이 아예 안 듦**(토큰 비용 구조적 해결). 웹+Claude Vision 경로였으면 못 얻는 이득.

## 2. 결정 (사용자 확정)

- **플랫폼 = React Native (Expo managed + config plugin + EAS Build).** 안드로이드 우선, Play Store 배포. Windows에서 EAS 클라우드 빌드로 해결. (Kotlin/Flutter 대비: 카메라·OCR은 어차피 네이티브 SDK를 RN이 1:1 바인딩 → 기능 격차 없음 + 기존 TS 로직 재사용.)
- **리포 전략 = (a) 새 RN 리포** (가칭 `engception-capture`). 웹앱 무손상, RN 설정 단순. 공유 로직(SRS·저장)은 파일 복사 이식. 5형식 합류 시점에 공유 여부 재판단.
- **복습 모델 = C (가벼운 수집·복습)** + **성분 분석**. 역방향 산출(A)·구조 드릴(B)은 후속.
- **5형식 엔진 = 나중에 합류 (3).** v1 범위 밖. 살아있는 자산으로 보존.
- **분류 체계 = 나중.** v1 YAGNI.
- **v1 로그인 = 구글만.** 카카오는 phase 2(custom-token Cloud Function + Blaze) 보류.
- **오디오/TTS = 범위 밖** (engception-listen 별도 제품). iOS = 후속.

## 3. 캡처 플로우

목표: **"실생활 영어 문장을 2~3탭 안에 카드로" + 이미지 토큰 0.**

```
[촬영] → [온디바이스 OCR·구획검출] → [구획 탭 선택] → [문장 분리·다중선택] → [저장]
 1탭        (자동, ML Kit)              1탭            원하는 문장만 탭      1탭
```

1. **촬영** — `expo-camera`로 사진 한 장. (라이브 오버레이는 `react-native-vision-camera` 프레임 프로세서로 *나중에*; v1은 정지 사진.)
2. **온디바이스 OCR + 구획 검출** — `@react-native-ml-kit/text-recognition`이 사진에서 **Block(구획) / Line / Element + 바운딩박스** 반환. **Claude 미사용 → 이미지 토큰 0.**
3. **구획 선택** — 사진 위에 ML Kit 블록 박스를 **탭 가능한 오버레이**로. 원하는 구획 탭. 블록이 애매하면 **직접 사각형 드래그 크롭** 폴백(그 영역만 재-OCR).
4. **문장 분리 + 다중선택** — 선택 구획 평문을 **온디바이스 로컬 분리**(`Intl.Segmenter`/경량 라이브러리)로 문장 후보 나열 → 원하는 문장만 탭. 분리가 어긋나도 사용자가 탭 선택 단계에서 교정.
5. **저장** — 고른 문장들이 각각 `SentenceCard`가 됨.

**설계 근거:** 사람이 어차피 문장을 탭으로 고르므로 자동 분할이 완벽할 필요 없음. 온디바이스 OCR로 없앤 이미지 토큰 이득을 텍스트 호출로 다시 깎지 않기 위해 문장 분리는 **로컬(오프라인·토큰 0)**. Claude 문장 분리는 실제 품질 이슈 확인 시 후속.

## 4. 데이터 모델

```ts
SentenceCard {
  id: string
  text: string                       // 영어 문장 (정본)
  meaning: string | null             // 한국어 뜻 — 캡처 땐 null, 필요 시 지연 채움
  analysis: {                        // 지연, meaning과 같은 Claude 호출에서 함께 채움
    constituents: { text: string; role: string; note?: string }[]
    patternType?: string             // (선택) 5형식 유형 — 합류 대비 씨앗
  } | null
  thumbnailUri: string | null        // 선택 구획 크롭 이미지 (로컬 파일, expo-file-system)
  createdAt: string                  // ISO
  // ── SRS (기존 FSRS 필드 그대로 재사용) ──
  stability: number | null
  difficulty: number | null
  nextDueAt: string | null           // null → 즉시 due
  reps: number
  lapses: number
  cardState: 'new' | 'learning' | 'review' | 'relearning'
  lastGrade: 1 | 2 | 3 | 4 | null
}
```

- **dedup 키 = 정규화된 `text`** (trim/소문자). 같은 문장 중복 저장 방지.
- **번역·분석은 지연 + 캐시:** 캡처 땐 `meaning`/`analysis` 모두 null(오프라인·토큰 0 유지). 복습 중 "뜻 보기"/"성분 분석" 탭 → **Claude 한 번 호출로 둘 다 받아 캐시**, 이후 재호출 없음.

## 5. 복습 루프 (C) + 성분 분석

### 복습 화면 — English-first (read/shadow)
```
[ 영어 문장 크게 ]                        ← 주인공, 소리 내어 읽는다(shadow)
[ 뜻 보기 ]  [ 성분 분석 ]  [ 🖼 출처 ]     ← 뜻/분석은 캐시된 한 호출에서; 출처는 탭 peek
─────────────
[ 성분 분석 펼침 — 색상 청크 ]
   I │ made him │ angry
  주어    동사구      보어
─────────────
[ 다시 ]  [ 됐어 ]  [ 쉬움 ]              ← 자가평가 (3버튼)
```

- **자가평가 → FSRS grade:** 정오답 신호가 없으니 새 초소형 함수 `gradeFromSelfRating`: 다시=1 / 됐어=3 / 쉬움=4. (기존 `gradeFromSignals`는 5형식용; `schedule()`은 그대로 재사용.)
- 평가 즉시 `schedule()` → FSRS 갱신 → 다음 카드. 큐 비면 종료.
- **오디오/TTS 없음.** shadow = 사용자가 직접 소리 내어 읽는 자가 산출 → 가볍지만 "산출" 철학 유지.
- **썸네일 배치:** 복습 화면 기본 미표시(문장 집중), "🖼 출처" 탭 시에만 peek. 썸네일 주역은 컬렉션 뷰.

### 성분 분석
- **출처 = Claude 텍스트 호출** (`services/claude.ts` 구조화 호출 + `validate.ts` 검증 재사용). 평문 → 값싼 텍스트 토큰. 지연·캐시(번역과 1호출).
- **스킴 = (b) SVOC 골격 + 구·절 표시.** 주어/동사/목적어/보어를 주 골격으로 두되, 종속절·주요 수식구를 별도 단위로 묶어 표시(책·논문 복문 대응). 순수 SVOC 4종은 복문에서 부족.
- **시각 언어 = 기존 앱의 슬롯 단위 색상 청크** 재사용(`[I][made him][angry]`). 5형식 합류 시 시각 자산 연속성.
- 솔직한 한계: 네트워크 필요 + 텍스트 토큰(유계). Claude 분석은 아주 모호한 복문에선 불완전 — `validate.ts`로 형식만 가드, 내용 오류는 참고용으로 감수.

### 무덤 방지 (C의 유일한 실패 모드 방어)
1. **홈 넛지** — "복습할 N개 →" (기존 `Home.tsx` 패턴 이식).
2. **캡처 즉시 due** — 새 카드 `nextDueAt=null` → 바로 due 큐(`newCardDefaults` 기존 동작). 캡처-복습 고리가 짧아짐.
3. **organic-first** — 하드 큐·강제 스트릭 없음(기존 철학 유지). 재실습 유도만.
4. **세션 캡** — 한 번에 대량 캡처해도 복습 큐 폭발 방지(세션당 상한 ~20장, 나머진 다음 세션).

### 컬렉션 뷰
전체 카드 리스트(썸네일 + 문장, 스크롤/검색). 카드 탭 → 상세(문장·뜻·썸네일·SRS 상태·삭제).

### 내비게이션
탭 3개: **캡처 / 복습(due) / 컬렉션.**

## 6. 인증·동기화

### 인증 — 코드가 아니라 "설계"가 재사용됨
- 기존 `auth.ts`/`firestoreDataStore.ts`는 **웹 Firebase SDK + 팝업 로그인** → RN에 직접 이식 불가.
- RN 표준(네이티브): `@react-native-firebase/app` + `/auth` + `/firestore`, `@react-native-google-signin/google-signin`.
- **재사용되는 것 = 아키텍처:** `DataStore` 인터페이스 + `db` 파사드 스왑 + local-first + 선택적 로그인 + **비파괴 union 병합**(`migrateToCloud.ts` 개념). **구체 Firestore/auth 코드는 RN 네이티브 라이브러리로 재작성.**
- **v1 = 구글 로그인만.** 카카오 = phase 2 보류.

### 로컬 저장소
- **(a) MMKV** — 카드 배열을 KV에 JSON으로, 웹 `localStorage.ts` 배열 방식 미러. v1은 전 카드 메모리 로드 후 `srsView`로 due 계산(기존 패턴 동일). 수천 장 초과 시 `expo-sqlite`로 업그레이드.
- **썸네일 = `expo-file-system` 파일** 저장, URI만 카드에 보관.

### Claude 프록시 — 기존 재사용
- API 키는 RN 앱에 미포함. **기존 `api/chat.ts`(Vercel Edge)는 플랫폼 무관 HTTPS 엔드포인트** → RN이 URL 호출. 프록시 유지, **번역·성분분석 프롬프트만 추가.** 새 서버 인프라 불필요.

## 7. 프로젝트 구조 (새 Expo 리포 `engception-capture`)

```
├── app.config.ts / eas.json      # Expo config plugins(camera·ml-kit·firebase·google-signin) + EAS 프로필
├── src/
│   ├── services/
│   │   ├── srs.ts                 # ← 이식 (거의 그대로; schedule()는 CardSchedule 서브셋만 받음)
│   │   ├── srsView.ts             # ← 이식 (Pattern[] → Card 타입 일반화)
│   │   ├── ocr.ts                 # 신규 (ML Kit 래핑)
│   │   ├── analysis.ts            # 신규 (Claude 번역+성분분석 1호출 + validate)
│   │   ├── claude.ts / prompts.ts / validate.ts  # 이식·개작
│   ├── store/
│   │   ├── dataStore.ts / db.ts   # 인터페이스·파사드 이식 (SentenceCard용)
│   │   ├── localStore.ts          # 신규 (MMKV 어댑터)
│   │   ├── firestoreStore.ts      # 재작성 (@react-native-firebase)
│   │   ├── auth.ts                # 재작성 (native google-signin)
│   │   ├── cardStore.ts           # 신규 (Zustand — 캡처/복습/컬렉션 상태)
│   ├── screens/                   # Capture / Review / Collection / CardDetail
│   ├── components/
│   └── types/                     # SentenceCard 등
```

- analytics sink 구조도 이식 가능하나 **v1 필수 아님** — noop + 로컬만, 나중에 게이트(기존 `VITE_DISABLE_ANALYTICS` 평행).

## 8. 재사용 vs 신규 요약

| 물려받음 (순수 TS 로직) | 재작성 (RN/네이티브) | 신규 |
|---|---|---|
| `srs.ts` (FSRS 스케줄러) | Firestore 어댑터 (RN Firebase) | 캡처 UI (카메라·ML Kit·구획 선택) |
| `srsView.ts` (dueQueue/mastery) | auth (native google-signin) | 컬렉션·복습 UI |
| `DataStore` 인터페이스 + `db` 파사드 | 로컬 저장소 (MMKV) | `SentenceCard` 데이터 모델 |
| `claude.ts`/`validate.ts` 패턴 | — | `ocr.ts` / `analysis.ts` |
| 비파괴 병합 설계 | — | `cardStore.ts` (Zustand) |
| Claude 프록시 (`api/chat.ts`, 그대로) | — | 앱 셸·3탭 내비 |

## 9. 범위 밖 (Deferred)

- **5형식 엔진 합류** — 나중. 캡처 문장 성분 분석의 `patternType` 씨앗이 진입로.
- **역방향 산출(A) / 구조 드릴(B) 복습** — C 이후 업그레이드.
- **분류 체계** — 나중.
- **라이브 프레임 오버레이**(vision-camera) — 정지 사진 v1 이후.
- **Claude 문장 분리** — 로컬 분리 품질 이슈 확인 시.
- **카카오 로그인** — phase 2 (custom-token Cloud Function + Blaze).
- **iOS / 오디오·TTS(engception-listen) / SQLite 업그레이드 / analytics sink 활성화.**

## 10. 열린 위험 / 검증 필요

- ML Kit 블록 분할이 다단(multi-column) 논문에서 어정쩡할 수 있음 → 수동 크롭 폴백으로 흡수(사용자 선택이 자동화 정확도 부담을 덜음).
- 로컬 문장 분리 정확도(약어/소수점) → 탭 선택 단계에서 교정, 실측 후 필요 시 Claude 보강.
- RN 핵심 라이브러리(vision-camera·ml-kit) 유지보수 의존 리스크 → 커뮤니티 성숙도 높아 감내 가능.
- EAS Build/네이티브 모듈은 Expo Go 불가 → dev build 필수(정상 경로).
