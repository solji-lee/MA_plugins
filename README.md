# MA_plugins

미래에셋증권 UX디자인팀에서 만드는 Figma 플러그인 모음.

각 플러그인은 최상위 폴더 하나를 차지하고, 그 안에서 독립적으로 완결된다.
빌드 단계도 패키지 매니저도 없다 — 폴더를 그대로 Figma에 import하면 동작한다.

## 플러그인

| 폴더 | 이름 | 하는 일 | 상태 |
|---|---|---|---|
| [`mockup/`](mockup/) | **Mockup** | 목업 안에 화면을 원근에 맞춰 넣는다 | 배포 준비 |
| [`color-migration/`](color-migration/) | **Color Migration** | BDL · MDS Master 컬러를 MDS 3.0 Foundation 변수로 바꾼다 | 개발 중 · 사내 전용 |

## 설치 (개발 중인 플러그인)

1. Figma 데스크톱 앱 → **Plugins → Development → Import plugin from manifest…**
2. 해당 플러그인 폴더의 `manifest.json` 선택

계정에 종속되므로 import한 사람에게만 보인다. 팀 배포는 Organization 배포,
전체 공개는 Community 게시가 필요하다. **둘 다 계정에 2FA가 켜져 있어야 한다.**

## 새 플러그인 추가할 때

폴더 하나를 만들고 아래 구조를 따른다. `mockup/`을 그대로 베끼면 된다.

```
<plugin>/
  manifest.json      Figma 매니페스트
  code.js            플러그인 샌드박스 (문서 조작)
  ui.html            UI + 무거운 계산 (샌드박스엔 DOM/canvas가 없다)
  README.md          동작 원리와 한계
  CHANGELOG.md       배포 모달에 붙여넣을 release notes
  branding/          커버·아이콘 + 배포용 카피 (LISTING.md)
  test/run.sh        테스트 — node 없으면 macOS 내장 jsc로 실행
```

### 규칙 몇 가지

- **이름에 접두어를 붙이지 않는다.** Community에서 여러 플러그인을 한 묶음으로
  보이게 하는 건 퍼블리셔 프로필이지 이름이 아니다. 접두어는 검색 노출만 깎는다.
  자세한 근거는 [`mockup/branding/LISTING.md`](mockup/branding/LISTING.md) 참고.
- **일관성은 이름이 아니라 커버 아트 템플릿·아이콘 시스템·description 골격에 둔다.**
- **테스트는 실제 배포되는 코드를 검증한다.** `ui.html`에서 로직 블록을 그대로
  꺼내 돌리는 식. 사본을 만들어 테스트하면 사본만 맞고 배포본은 틀어진다.
- **커버 아트에 사내 제품 UI나 미공개 리브랜딩을 넣지 않는다.** 공개 배포물이다.
