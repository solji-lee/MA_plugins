# Mockup — 배포용 카피 & 에셋

배포 모달에 그대로 붙여넣는 원문. 에셋은 `make_assets.py`로 재생성한다.

---

## Name

```
Mockup
```

## Tagline

```
Any screen, any mockup — fitted in perspective.
```

한국어(Organization 배포용):

```
어떤 목업에든 화면을 원근에 맞춰 끼워 넣습니다.
```

## Category

**Design tools**

> 드롭다운에 `Editing & effects`가 있으면 그쪽이 더 정확하다. 카테고리 목록은
> 피그마가 바꾸므로 배포 모달의 선택지가 최종 기준.

## Tags

```
mockup, perspective, device mockup, screen, warp, presentation,
deck, image, transform, prototype
```

이름이 서술적이지 않은 만큼 검색 키워드는 태그와 태그라인이 짊어진다.

## Description

```markdown
Mockup puts a screen inside a device mockup — with the perspective right.

Pick the mockup and the screen you want in it. Mockup reads the mockup's screen
surface, warps your frame onto it, and sets it as the fill. No manual
corner-dragging, no flattening, no exporting to another tool.

**How to use**
1. Select the mockup (or just its screen layer) and the frame you want inside it
2. Check the detected screen and source — swap them if needed
3. Hit Apply

**Bring your own mockup**
This plugin doesn't ship a mockup library. It works with whatever mockup you already
have — a Community kit, a photo-based scene, your team's own device set — as
long as the screen surface is a flat four-point vector. So you keep your art
direction instead of inheriting someone else's.

**What it does for you**
- Works out which corner is which from the quad and your screen's aspect ratio,
  so portrait and landscape mockups both just work
- Exports your source at exactly the resolution the mockup needs — no upscaling
  blur, no wasted pixels
- Anti-aliases with subpixel sampling in premultiplied space, so edges stay clean
- Remembers the previous image, so Revert is one click

**Options**
Scale (1–3x), rotate, mirror — the last two are only there for the rare mockup
whose screen path runs an unusual direction.

**Notes**
- The result is a raster fill. If you change the source frame, run it again.
- The screen surface must be a flat four-point quad. Curved surfaces aren't supported.
- Output is capped at 4096px per side, which is Figma's image limit.
```

## Assets

| 파일 | 규격 | 용도 |
|---|---|---|
| `cover-1920x1080.png` | 1920×1080 | 썸네일(커버) |
| `icon-128.png` | 128×128 | 플러그인 아이콘 |

캐러셀은 최대 9개까지 추가 가능. 넣는다면 ① 선택 상태 UI ② 적용 전/후 ③ 가로형 목업
사례 순서를 권한다.

**커버 아트에 실제 제품 화면을 쓰지 않았다.** 데모 화면은 `make_assets.py`가 그리는
가상의 UI다. 공개 배포물에 사내 제품 UI나 미공개 리브랜딩(보라 팔레트)이 실려 나가면
곤란하므로 의도적으로 분리했다. 커버의 원근 변형은 플러그인이 쓰는 것과 같은
호모그래피로 렌더된다.

---

## 배포 범위

| | Organization | Community |
|---|---|---|
| 공개 범위 | 사내 전용 | 전체 공개 |
| 피그마 리뷰 | 없음 | 있음 |
| 권장 | 1차 배포 | 안정화 후 |

Organization 배포에는 Organization/Enterprise 플랜이 필요하다. 먼저 사내에 올려
팀에서 굴려보고, 이슈가 정리되면 Community로 올리는 순서를 권한다.

**공개 전에 확인할 것** — 퍼블리셔를 개인 계정으로 할지 회사 계정으로 할지 정하고,
회사 이름/핸들을 달 거라면 브랜드·법무 확인을 받아둔다. 한번 공개된 플러그인의
퍼블리셔는 나중에 바꾸기 번거롭다.

---

## 다음 플러그인들을 위한 네이밍

**이름에 `MDS` 같은 접두어를 붙이지 않는 것을 권한다.** Community에서 여러 플러그인을
하나의 묶음으로 보이게 하는 건 **퍼블리셔 프로필**이지 이름이 아니다. 접두어는 검색
노출만 깎아먹고, 사내에서도 목록이 짧아 굳이 필요 없다.

일관성은 이름이 아니라 이쪽에 둔다:

- **퍼블리셔 프로필** — 핸들, 아바타, 소개문
- **커버 아트 템플릿** — 지금 커버의 골격(어두운 배경 / 좌측 워드마크·태그라인 / 우측
  before→after)을 그대로 재사용
- **아이콘 시스템** — 액센트 라운드 스퀘어 + 흰 도형
- **Description 골격** — 한 줄 요약 → How to use → 차별점 → Notes

이름은 **도구가 하는 일을 그대로 부르는 방식**으로 간다. 사내에서 목록을 훑는 사람이
설명 없이 바로 집어들 수 있는 게 우선이다:

| 도구 | 이름 |
|---|---|
| 목업 원근 삽입 | **Mockup** ← 지금 이것 |
| 컬러 일괄 치환(색상환 회전) | **Recolor** |
| 다크모드 톤 반전 | **Dark Mode** |

### 공개 배포로 넘어갈 때의 단서

`Mockup`은 사내에선 가장 명확하지만 Community에선 약점이 된다. 이미
[Mockup Plugin – Devices Mockups](https://www.figma.com/community/plugin/817043359134136295/mockup-plugin-devices-mockups-print-mockups-branding-mockups)라는
거의 같은 이름의 인기 플러그인이 있고, `Mockup Studio` · `Mockup Design` ·
`MockFrame` · `iMockup` · `Easy Mockup` 등으로 붐빈다. 검색에 묻히고 아류로 읽힐 수 있다.

공개로 넘어갈 때 이름만 갈아끼우면 되도록, 대안을 남겨둔다:

- **Inlay** — 상감(한 재료를 다른 재료에 파낸 자리에 딱 맞게 끼워 넣는 기법). 짧고
  고유해서 이름으로 자산이 쌓인다. 검색 키워드는 태그라인·태그가 짊어진다.
- **Screen Fit** — 서술형이되 `Mockup`보다는 덜 붐빈다.

이름을 바꿔도 손댈 곳은 `manifest.json`의 `name`, `README.md` 제목,
`make_assets.py`의 워드마크, 이 문서뿐이다. 코드는 이름을 참조하지 않는다.
