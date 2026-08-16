# spatula-comp

Pipeline ที่ดึงข้อมูล TFT comp จาก static files ของ goldenspatula.com แล้วผลิต
artifact JSON ก้อนเดียวให้แอปฝั่ง client ใช้

## สถาปัตยกรรม

```
goldenspatula.com  →  fetch  →  clean  →  normalize  →  web/public/data/comps.json
                                                              ↓
                                          web UI / Android overlay / iOS Live Activity
```

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
| `python -m pytest tests -q` | เทสต์ |

### web app

```bash
cd web && npm install && npm run dev     # พัฒนา
cd web && npm run build                  # static export ออกที่ web/out/
```

Next.js (static export) + Tailwind + TypeScript — ไม่มี server ฝั่งหลังบ้าน
type ของ artifact อยู่ที่ `web/src/lib/types.ts` และต้องแก้คู่กับ
`config.SCHEMA_VERSION` เสมอ

ถ้า deploy ใต้ sub-path ของ GitHub Pages ให้ตั้ง `NEXT_PUBLIC_BASE_PATH=/ชื่อ-repo`

## สัญญาของ artifact

```jsonc
{
  "meta":   { "schema_version": 1, "version": "18.17.7", "season": "S18", ... },
  "heroes": { "14376": { "name": "Rammus", "cost": 4, "traits": [...], "icon": "..." } },
  "items":  { "2016": { "name": "Rabadon's Deathcap", ... } },
  "hexes":  { "1002": { ... } },
  "gods":   { "6": { ... } },
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
- **แก้อีเมลใน `config.USER_AGENT` เป็นของคุณก่อนใช้จริง**

## Validation

`normalize.py` จะ **ไม่ publish** ถ้าข้อมูลผิดรูป — กันเคสที่ต้นทางเปลี่ยนชื่อ field
แล้ว id ทุกตัวหลุด ทำให้ได้ artifact ว่างเปล่าโดยไม่มีใครรู้:

- comp < 20 หรือ hero < 30 → fail
- ref ที่แมปไม่ได้เกิน 5% → fail (ต่ำกว่านั้นแค่เตือน)
- comp ที่ไม่มียูนิตเลย / `meta.version` ว่าง → fail

## ยังไม่ได้ทำ

- web UI (`web/`)
- Android overlay / iOS Live Activity (แยก repo)
- SQLite สำหรับ query วิเคราะห์เอง
- ตั้ง schedule ดึงอัตโนมัติ
