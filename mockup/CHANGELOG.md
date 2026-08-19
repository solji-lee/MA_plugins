# 변경 이력

각 항목은 배포 모달의 release notes에 **그대로 붙여넣는** 원문이다.
새 버전은 위에 쌓는다.

---

## 2026-08-20 — 평면 목업 지원

```
• 정면 목업에도 화면을 넣을 수 있습니다. 이전에는 기울어진 목업만 인식했습니다.
• 평면 목업은 워핑을 건너뛰어 더 선명하게 들어갑니다.
• '프레임 그대로' 모드가 생겼습니다. 평면 목업에서는 이미지로 굽지 않고 프레임을
  그대로 얹어, 텍스트와 벡터가 편집 가능한 상태로 남습니다.
• 화면 레이어를 못 찾았을 때 무엇을 선택해야 하는지 알려줍니다.
```

English:

```
• Flat, front-facing mockups now work — previously only tilted ones were detected.
• Flat mockups skip the warp entirely, so they come out sharper.
• New "live frame" mode: on flat mockups the source is placed as a real frame
  instead of a baked image, so text and vectors stay editable.
• Clearer message when no screen layer is found.
```

---

## 최초 배포 — Mockup

```
목업 안에 화면을 원근에 맞춰 넣습니다.

• 목업과 넣을 화면 두 개를 선택하고 실행하면 끝입니다.
• 목업 라이브러리를 끼워팔지 않습니다. 쓰던 목업 그대로 동작합니다.
• 목업에 필요한 해상도만큼만 내보내므로 흐려지지도, 낭비되지도 않습니다.
• 되돌리기 한 번으로 직전 이미지로 복구됩니다.
```
