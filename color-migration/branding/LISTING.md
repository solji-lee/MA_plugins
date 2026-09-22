# Color Migration — 배포용 카피 & 에셋

Organization 배포 모달에 그대로 붙여넣는 원문. 에셋은 `make_assets.py`(커버·아이콘)와
`make_guide_shots.py`(캐러셀 스크린샷)로 재생성한다.

**이 문서는 Community 배포를 전제하지 않는다.** 아래 "배포 범위" 참고.

---

## Name

```
Color Migration
```

## Tagline

```
레거시 컬러를 MDS 3.0 Foundation 변수로.
```

## Category

**Design tools**

## Tags

```
color, design tokens, design system, variables, migration, dark mode
```

## Description

```markdown
선택한 프레임의 레거시 컬러(BDL 스타일, MDS Master 변수, 원시 컬러, hex)를
MDS 3.0 Foundation 변수로 바꿉니다. 뭘 뭘로 바꿀지 먼저 보여주고, 체크한 것만
적용합니다.

1. 프레임을 선택하고 실행
2. 바꿀 항목 · 확인 필요 · 대상 없음 탭으로 훑기
3. 필요하면 목적지를 드롭다운에서 바꾸기
4. 적용 — ⌘Z로 되돌릴 수 있습니다

색이 아니라 스타일 이름과 변수 키로 찾습니다. 변수·스타일 없이 원시 컬러만 쓰인
곳은 레이어 맥락(글자·아이콘·배지·테두리)을 보고 어울리는 토큰을 제안합니다.
BDL Dark/ 스타일을 쓰던 프레임은 Foundation 다크 모드 지정도 같이 제안합니다.

그러데이션·이미지·이펙트 색은 건드리지 않고, 인스턴스 내부는 기본적으로
건너뜁니다.
```

## Assets

| 파일 | 규격 | 용도 |
|---|---|---|
| `cover-1920x1080.png` | 1920×1080 | 썸네일(커버) |
| `icon-128.png` | 128×128 | 플러그인 아이콘 |
| `guide-1-list.png` | 460×760 | 캐러셀 ① — 바꿀 항목 목록. 맥락별로 묶여 원본 → Foundation을 보여준다 |
| `guide-2-review.png` | 460×760 | 캐러셀 ② — 확인 필요 탭. ΔE와 근거를 보여주고 기본은 체크하지 않는다 |
| `guide-3-pick.png` | 460×760 | 캐러셀 ③ — 목적지를 직접 고르는 드롭다운. 후보 근거 · 원시 대응 · 전체 검색 |

**커버의 네 행은 지어낸 예시가 아니다.** `make_assets.py`가 배포되는 `code.js`의
매핑표를 직접 읽어 실제 변환 쌍을 그린다. 매핑표가 바뀌면 커버도 그 값을 따라간다.
캐러셀 세 장도 마찬가지로 배포되는 `ui.html`을 헤드리스 브라우저로 그대로 렌더링한
스크린샷이지, 목업이 아니다 — 실제 제품 화면이나 사내 데이터는 담기지 않는다(예시
프레임 이름 "주문 상세"만 자리표시자).

---

## 배포 범위

| | Organization | Community |
|---|---|---|
| 공개 범위 | 사내 전용 | 전체 공개 |
| 이 플러그인 | **여기까지** | **올리지 않는다** |

**Community에는 올리지 않는다.** `code.js`에 MDS Master·Foundation의 실제 토큰
이름과 40자리 Figma 변수 키(`mapping.json`)가 그대로 들어 있다 — 사내 디자인
시스템의 구조를 드러내는 정보라 공개 배포물에 실어 나갈 수 없다. 값을 코드 밖으로
빼서 런타임에 불러오는 방식으로 바꾸지 않는 한 이 플러그인은 Organization 배포가
최종 형태다. `manifest.json`의 `id`는 개발용 임시값이므로 Organization 배포 시
Figma가 발급하는 id로 바꿔야 한다.

Organization 배포에는 Organization/Enterprise 플랜이 필요하다. 퍼블리셔는
`Mockup`과 같은 프로필(팀 계정)로 묶어 사내 플러그인 목록에서 한 번에 보이게 한다.
