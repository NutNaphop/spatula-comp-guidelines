# spatula-comp

Pipeline ที่ดึงข้อมูล TFT comp จาก static files ของ goldenspatula.com แล้วผลิต
artifact JSON ก้อนเดียวให้แอปฝั่ง client ใช้

## สถาปัตยกรรม

```
goldenspatula.com  →  fetch  →  clean  →  normalize  →  web/public/data/comps.json
                                                              ↓
                                          web UI / Android overlay / iOS Live Activity
```

| โฟลเดอร์ | คืออะไร |
|---|---|
| `src/spatula/` | pipeline (Python) |
| `web/` | เว็บแอป (Next.js) — UI ตัวจริงของทุกแพลตฟอร์ม |
| `android/` | เปลือกปุ่มลอย (Kotlin) ที่ห่อ WebView |

`comps.json` คือ **single source of truth** — client ทุกตัวคุยกับมันผ่าน HTTP
อย่างเดียว ไม่ import โค้ดจาก pipeline เลย จึงแยก repo ได้โดยไม่ต้องแก้อะไร

## ใช้งาน

```bash
python -m spatula.fetch && python -m spatula.clean && python -m spatula.normalize
```

| คำสั่ง | หน้าที่ |
|---|---|
| `python -m spatula.discovery` | ดู patch ปัจจุบัน + URL ทุกไฟล์ |
| `python -m spatula.fetch` | โหลดไฟล์ดิบลง `data/raw/` |
| `python -m spatula.clean` | แกะ JS wrapper + แก้ mojibake → `data/clean/` |
| `python -m spatula.normalize` | join id + validate → `web/public/data/comps.json` |
| `python -m spatula.build_db` | โหลด artifact ลง SQLite ไว้ query วิเคราะห์ |
| `python -m pytest tests -q` | เทสต์ (54 ตัว) |

### web app

```bash
cd web && npm install && npm run dev     # พัฒนา
cd web && npm test                       # เทสต์ (29 ตัว)
cd web && npm run verify                 # lint + test + build ชุดเดียวกับ CI
cd web && npm run build                  # static export ออกที่ web/out/
```

Next.js (static export) + Tailwind + TypeScript — ไม่มี server ฝั่งหลังบ้าน
type ของ artifact อยู่ที่ `web/src/lib/types.ts` และต้องแก้คู่กับ
`config.SCHEMA_VERSION` เสมอ

ถ้า deploy ใต้ sub-path ของ GitHub Pages ให้ตั้ง `NEXT_PUBLIC_BASE_PATH=/ชื่อ-repo`

**รัน `npm run verify` ก่อน push เสมอ** — CI รัน lint ด้วย ซึ่งจับสิ่งที่ `build`
ไม่จับ (เช่น setState ใน effect) ถ้ารันแต่ build จะผ่านในเครื่องแล้วไปพังบน CI

### หลักการออกแบบ

อ่านบนจอแคบข้างจอเกม ในช่วงพักไม่กี่สิบวินาที ทุกอย่างตามมาจากข้อนี้:

- **UI แทบไม่มีสี** เพราะสีราคาตัวละคร (เทา/เขียว/ฟ้า/ม่วง/ทอง) มีความหมายในหัว
  ผู้เล่นอยู่แล้ว ปล่อยให้เป็นสีเดียวที่จัดจ้านบนจอ สายตาจะวิ่งไปที่ตัวแพงทันที
- **ทองไม่ใช่สีตกแต่ง** แต่คือสี 5 บาท ยืมความหมาย "หายากที่สุด" มาใช้กับคอมพ์ที่ปักหมุด
- **หกเหลี่ยมคือรูปทรงจริงของเกม** ใช้ทั้งกระดานและ chip ในลิสต์ ให้เป็นภาษาภาพชุดเดียว
- **ตัวเลขใช้ฟอนต์ mono** (ราคา/เลเวล/tier) อ่านเหมือนหน้าปัดเครื่องมือ ไม่ใช่ข้อความ
- tier เป็นสันซ้ายของการ์ด ไม่ใช่ป้าย เพราะมันสื่อ "อันดับ" จึงควรเป็นโครงสร้าง

## สัญญาของ artifact

```jsonc
{
  "meta":   { "schema_version": 1, "version": "18.17.7", "season": "S18", ... },
  "heroes": { "14376": { "name": "Rammus", "cost": 4, "traits": [...], "icon": "..." } },
  "items":  { "2016": { "name": "Rabadon's Deathcap", ... } },
  "hexes":  { "1002": { ... } },
  "gods":   { "6": { ... } },
  "tags":       { "16": "รีโรลตัว 1 บาท" },
  "tag_groups": [ { "id": "2", "name": "ประเภทคอมพ์", "tags": [...] } ],
  "comps":  [ { "id", "name", "tier", "tags", "levels", "hexes", "gods", "notes" } ]
}
```

- entity เก็บเป็น lookup table แล้ว comp อ้างด้วย id — แชมป์ตัวเดียวโผล่หลาย comp
- **`schema_version` ต้องบวกทุกครั้งที่เปลี่ยนรูป** client เช็คค่านี้ก่อน render
- **logic ต้องคำนวณให้เสร็จตรงนี้** อย่าปล่อยให้ client คิดเอง ไม่งั้นต้องเขียนซ้ำ
  ใน JS + Kotlin + Swift แล้วเพี้ยนกันเอง

ขนาดปัจจุบัน: ~396 KB, gzip เหลือ ~54 KB

## Version discovery

`discovery.py` อ่าน `versiondataconfig.js` ของเว็บเอง แล้วประกอบ URL ทุกไฟล์
จึงไม่ต้องแก้โค้ดเวลามี patch ใหม่ — **มีกับดัก 2 อัน** ที่ต้องระวัง:

- `is_newest_version == 1` มี **4 entries** เพราะแปลว่า "ใหม่สุดในโหมดนั้น"
- เรียงตามวันที่ก็ผิด — mode 16 ออกหลัง mode 17 ที่เราติดตาม

จึง pin โหมดไว้ที่ `config.MODE` และให้ **เตือน** เมื่อโหมดอื่นออกใหม่กว่า
แทนที่จะสลับ dataset เงียบๆ

## นโยบายการดึงข้อมูล

- เช็ค `robots.txt` ก่อนทุก URL (ตอนนี้เว็บไม่มีไฟล์นี้ = ไม่ห้ามอะไร)
- Conditional GET (ETag) → รันซ้ำได้ 304 ไม่โหลดตัวไฟล์
- หน่วง 2 วิ/request, cooldown 6 ชม./ไฟล์ (ข้ามด้วย `--force`)
- `User-Agent` ระบุตัวตนว่าเป็นบอทอะไร แต่ไม่ใส่อีเมลไว้ในโค้ดที่เปิด public

## Validation

`normalize.py` จะ **ไม่ publish** ถ้าข้อมูลผิดรูป — กันเคสที่ต้นทางเปลี่ยนชื่อ field
แล้ว id ทุกตัวหลุด ทำให้ได้ artifact ว่างเปล่าโดยไม่มีใครรู้:

- comp < 20 หรือ hero < 30 → fail
- ref ที่แมปไม่ได้เกิน 5% → fail (ต่ำกว่านั้นแค่เตือน)
- comp ที่ไม่มียูนิตเลย / `meta.version` ว่าง → fail

## อัตโนมัติ (GitHub Actions)

| workflow | ทำอะไร |
|---|---|
| `refresh.yml` | วันละครั้ง ดึงข้อมูล → validate → commit `comps.json` ถ้าเปลี่ยนจริง |
| `deploy.yml` | push ที่แตะ `web/` → เทสต์ + lint + build → deploy ขึ้น Pages |

ต้องตั้งค่าครั้งเดียวที่ repo settings: **Pages → Source: GitHub Actions**

`refresh.yml` รันเทสต์ก่อนแตะข้อมูล และ `normalize` จะ exit non-zero ถ้า artifact
ผิดรูป — ข้อมูลเสียจึงไม่มีทางถูก commit เงียบๆ ส่วน commit จะเกิดเฉพาะตอนไฟล์
เปลี่ยนจริง (ปีละไม่กี่ครั้งตาม patch) ประวัติ git จึงกลายเป็น archive ข้าม patch

## วิเคราะห์ด้วย SQLite

```bash
python -m spatula.build_db
sqlite3 data/tft.sqlite3 "SELECT * FROM hero_usage LIMIT 10"
```

สร้างใหม่ทุกครั้งจาก `comps.json` (ไม่ใช่ของที่แอปใช้ — แอปอ่าน JSON) มี view
สำเร็จรูป 2 อัน: `hero_usage` (แชมป์ไหนถูกใช้บ่อย/เป็น carry บ่อย) และ
`carry_items` (ไอเทมที่ลงตัว carry จริง)

## ยังไม่ได้ทำ

- Android overlay (แยก repo — WebView ชี้มาที่ URL ที่ deploy ไว้)
- iOS Live Activity (แยก repo — ต้องเขียน SwiftUI, ใช้ Flutter/เว็บไม่ได้)
- **ยังไม่เคยยืนยันว่า service worker / offline ทำงานจริง** — เบราว์เซอร์ที่ใช้
  ทดสอบบล็อกการ register ต้องลองบนเครื่องจริง
