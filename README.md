# 🗺️ Travel Quest

나만의 여행 스테이지 앱 — 카카오프렌즈 스타일의 게임형 여행 플래너

## 🚀 배포

- **URL**: https://travel-quest-lilac.vercel.app
- **GitHub**: https://github.com/cmcigies/travel-quest
- **배포**: Vercel (GitHub 자동 배포)

## 🛠️ 기술 스택

| 항목 | 내용 |
|------|------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Auth | NextAuth.js + Google OAuth |
| DB | Google Sheets API |
| PDF | jsPDF |
| Deploy | Vercel |

## 📱 화면 구성

```
메인화면 (/)
 └─ 캐릭터 Idle 애니메이션
 └─ Google 로그인 버튼

여행맵 (/map)
 └─ 스테이지 맵 (지그재그)
 └─ 여행별 스테이지 노드
 └─ 캐릭터 이동 애니메이션
 └─ 여행 추가 FAB

여행스케쥴 (/schedule/[tripId])
 └─ Day별 탭 네비게이션
 └─ 시간순 일정 리스트
 └─ 일정 추가/수정/삭제
 └─ PDF 다운로드
```

## 🗄️ DB 구조 (Google Sheets)

### users
| uid | email | name | photo | created_at |

### trips
| trip_id | uid | title | country | city | start_date | end_date | created_at |

### schedules
| schedule_id | trip_id | uid | day | time | place | memo | created_at |

## ⚙️ 환경변수 (Vercel)

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_SHEETS_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

## 📋 진행 현황

### ✅ 완료
- [x] 프로젝트 초기 설정 (Next.js 14)
- [x] Google OAuth 로그인
- [x] Google Sheets DB 연동
- [x] 메인 페이지 (캐릭터 Idle 애니메이션)
- [x] 여행 맵 페이지 (스테이지 UI)
- [x] 여행 스케쥴 페이지 (Day별 관리)
- [x] PDF 다운로드
- [x] PWA 설정
- [x] AdSense 영역 (placeholder)
- [x] Vercel 배포

### 🔜 다음 단계
- [ ] AdSense 실제 광고 코드 삽입 (심사 후)
- [ ] 캐릭터 커스터마이징
- [ ] 여행지 이미지 업로드
- [ ] 소셜 공유 기능
- [ ] 다국어 지원

## 📅 업데이트 로그

### 2026-04-29
- 초기 버전 완성
- 메인/맵/스케쥴 3화면 구현
- Google Sheets CRUD 완성
- PDF 다운로드 구현
