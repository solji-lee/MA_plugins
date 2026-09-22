# Color Migration

선택한 프레임 안의 **레거시 컬러를 MDS 3.0 Foundation 변수로** 바꾸는 피그마 플러그인.
Figma의 Check designs처럼 원본 → 목적지를 나열하고, 체크한 항목만 적용한다.

| 찾는 것 | 알아보는 방법 | 목적지 |
|---|---|---|
| Better Design Library 스타일 | 스타일 이름. `Light/` · `Dark/` 접두어를 떼고 매핑표에서 찾는다 | 매핑표 |
| MDS Master 변수 (`mode` · `chart`) | 변수 이름 + 컬렉션 이름 | 매핑표 |
| MDS Master 원시 (`globalcolor`) | 변수 이름 + 컬렉션 이름 | 맥락 시맨틱 → 없으면 원시 대응 |
| Foundation 원시 (`colorScale`) 직접 사용 | 변수 키 | 맥락 시맨틱 |
| 스타일·변수 없는 hex | 값 | 맥락 시맨틱 (값이 같을 때만 체크) |

이미 Foundation 시맨틱에 묶인 페인트, 그러데이션, 이미지는 건드리지 않는다.

## 설치

1. Figma 데스크톱 앱 → **Plugins → Development → Import plugin from manifest…**
2. 이 폴더의 `manifest.json` 선택
3. 작업 파일에서 **MDS 3.0 Foundation** 라이브러리를 쓸 수 있어야 한다(변수를 키로 불러온다)

`manifest.json`의 `id`는 개발용 자리표시자다. 조직 배포할 때 Figma가 발급한 id로 바꾼다.
사내 토큰 이름과 키가 들어 있으므로 **Community에는 올리지 않는다.**

## 사용

1. 바꿀 프레임(여러 개 가능)을 선택하고 플러그인 실행
2. 탭으로 훑는다
   - **바꿀 항목** — 매핑표가 확정했거나, 원시·hex가 시맨틱과 정확히 맞는 것. 기본 체크
   - **확인 필요** — 후보는 있지만 값이 다르거나 역할 추정인 것. 기본 체크 해제
   - **대상 없음** — 매핑표 보류(차트·elevation·그러데이션 토큰 등)이거나 가까운 토큰이 없는 것
3. 목적지 칸을 눌러 다른 토큰을 고르거나 **바꾸지 않음**. 원본 칸을 누르면 해당 레이어가 선택된다
4. **적용**. 한 번의 ⌘Z로 되돌릴 수 있다

| 배지 | 뜻 |
|---|---|
| 자동 | 매핑표가 확정한 목적지 |
| 정확 | 원시 컬러가 그 시맨틱의 별칭과 같고 값도 같음 |
| 값 일치 | hex가 시맨틱 값과 같음 |
| 근사 | ΔE 3 이하 |
| 확인 | 역할 추정이거나 ΔE 10 이하. 직접 보고 체크 |
| 원시 | 가까운 시맨틱이 없어 원시 → 원시로 옮김 |

## 어떻게 동작하나

- **이름으로 찾는다.** 같은 hex가 여러 역할에 걸려 있고, 같은 이름도 라이브러리 버전마다 값이 다르다.
  Master와 Foundation 모두 `gray/10`이 있는데 서로 반대쪽 끝이라, 이름만으로 판단하지 않고 변수 키와 컬렉션 이름을 함께 본다.
- **맥락 판정** — 레이어 타입, 자기와 가까운 조상 3단계의 이름, 크기, 불투명도로 8가지 맥락 중 하나를 고른다.
  배지 글자 → 배지 면 → 글자 → 아이콘 → 구분선 → 테두리 → 딤 → 면 순서. 이름 규칙(badge·뱃지·tag·chip, icon·ic_·아이콘)은 `code.js`의 `BADGE_RE` · `ICON_RE`.
- **시맨틱 순위** — 맥락의 후보 그룹 안에서 ① 원시 별칭이 같은 것 ② 역할 힌트 ③ ΔE 순. 맥락별로 뒤로 미는 그룹(`demote`)은 ①②의 우선권을 받지 못한다.
  역할 힌트는 BDL 원시(Gray 등)와 Light·Dark 값 쌍이 같은 BDL 시맨틱 스타일이 매핑표에서 받은 목적지다. Gray/70은 Divider/dark와 같은 쌍이라 테두리에서 `plain/border/normal`이 먼저 온다.
- **Light·Dark 쌍** — BDL Gray처럼 스타일 하나가 모드 짝을 가진 원본은 두 값 중 큰 차이로 비교한다. 시맨틱으로 가야 다크 모드 전환이 살아 있으므로 원시 대응은 대비책이다.
- **다크 모드 프레임** — 최상위 프레임이 Master `mode` 컬렉션에서 Dark이거나, 안의 BDL 스타일이 전부 `Dark/`면 Foundation colorSemantic Dark 모드를 명시하자고 제안한다. `Light/`와 섞여 있으면 체크하지 않고 경고만 띄운다.
- **인스턴스** — 기본은 인스턴스 안을 건너뛴다(메인 컴포넌트에서 바꿔야 한다). 필요하면 **안까지 검사**.

## 매핑표 갱신

매핑표 원본은 North_star 저장소 `migration/color/`의 CSV다. 판단을 고칠 때는 그쪽에서 고치고 가져온다.

```bash
python3 ~/Desktop/North_star/migration/color/build.py   # CSV 검증 → mapping.json
python3 update-mapping.py                               # mapping.json → code.js
test/run.sh
```

## 테스트

```bash
test/run.sh
```

`code.js`의 매핑 블록과 `// --- core:begin … core:end` 블록을 **그대로 꺼내서** 돌린다.
node가 있으면 node로, 없으면 macOS 내장 JavaScriptCore로 실행된다.

- 모든 목적지에 40자리 Foundation 변수 키가 있는지
- BDL 이름 정규화(공백, 오타 별칭), Master/Foundation `gray/10` 구분
- 맥락 판정 12가지(label이라는 이름의 글자는 배지가 아님, picture는 아이콘이 아님 등)
- 매핑표 항목 제안(위험등급 텍스트는 heavy, 보류는 대상 없음)
- 원시·hex 맥락 제안(Gray/95 면 → background/subtle, Gray/70 테두리 → border/normal, 10% 흰색은 불투명 흰색으로 잡지 않음)

플러그인 API를 쓰는 부분(검사·적용)은 Figma 안에서만 돈다. 이 부분은 실제 파일로 확인해야 한다.

## 한계

- 효과(그림자) 색, 그러데이션 스톱, 이미지 필은 바꾸지 않는다
- 맥락 판정은 레이어 이름에 기대는 부분이 있다. 팀 이름 규칙이 다르면 `BADGE_RE` · `ICON_RE`를 고친다
- 다른 라이브러리의 스타일(타이포 외 컬러 스타일)은 개수만 센다
