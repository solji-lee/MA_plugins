"""North_star 저장소의 mapping.json 을 code.js 안에 붙여 넣는다.

    python3 update-mapping.py [mapping.json 경로]

기본 경로는 ~/Desktop/North_star/migration/color/mapping.json.
매핑표(CSV)를 고치고 build.py 로 mapping.json 을 다시 만든 뒤 이 스크립트를 돌린다.
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).parent
src = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "Desktop/North_star/migration/color/mapping.json")
data = json.loads(src.read_text())
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
code = (HERE / "code.js").read_text()
new, n = re.subn(r"/\* mapping:begin \*/.*?/\* mapping:end \*/", lambda m: "/* mapping:begin */" + blob + "/* mapping:end */", code, flags=re.S)
if n != 1:
    sys.exit("code.js 에서 mapping 블록을 찾지 못했습니다")
(HERE / "code.js").write_text(new)
print(f"mapping {data['version']} · {len(blob)//1024}KB → code.js")
