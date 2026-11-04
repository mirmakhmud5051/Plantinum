# PLANTINUM 🌱

Brauzerda ishlaydigan interaktiv 3D voxel bog‘dorchilik o‘yini. Three.js, JavaScript va Vite asosida yozilgan. Barcha o‘simlik va dekoratsiya modellari kod orqali yaratiladi; pullik assetlar va backend talab qilinmaydi.

## Ishga tushirish

Node.js **20.19+ yoki 22.12+** kerak. Loyiha papkasida:

```sh
npm install
npm run dev
```

Brauzerda terminal ko‘rsatgan manzilni oching, odatda **http://localhost:5173**. Agar PowerShell `npm.ps1` bajarilishini cheklasa, `npm` o‘rniga `npm.cmd` yozing:

```powershell
npm.cmd install
npm.cmd run dev
```

Telefon yoki planshetni kompyuter bilan bir Wi-Fi tarmog‘iga ulang va terminaldagi **Network** manzilini telefon brauzerida oching. Kompyuterning mahalliy tarmoq uchun serverga kirishiga ruxsat bo‘lishi kerak. Joylashtirilgan saytga kiruvchi o‘yinchilarga Node.js yoki ilova o‘rnatish kerak emas.

## Qanday o‘ynaladi

Interfeys standart holatda **o‘zbekcha**. **Sozlamalar → Til** orqali **O‘zbekcha / English** tanlanadi. Til almashtirilganda bog‘ va kamera saqlanadi, sahifa tanlangan tilda qayta ochiladi. Katalogdan o‘zbekcha yoki inglizcha nomlar bilan qidirish mumkin: masalan, **lola / tulip**, **qarag‘ay / pine**.

1. **Play** tugmasini bosing, chap katalogdan o‘simlik tanlang.
2. Shaffof model bilan bo‘sh joyni belgilang va yerga bosing. Yashil ko‘rinish — ekish mumkin, qizil — boshqa joy tanlang. **R** modelni 90° aylantiradi.
3. **Water** asbobini tanlang, o‘simlikka bosing. Yuqori o‘ngdagi **1×** tugmasi o‘sish tezligini **1× → 2× → 5× → 10×** o‘zgartiradi.

**Trim** bilan bargga bosilganda aynan urilgan voxel olib tashlanadi. **Shape** bilan shar, kub, piramida, konus, spiral yoki silindr tanlab, butaga bosing. Qirqilgan voxel identifikatorlari va topiary shakli saqlanadi.

**Build** katalogidagi yo‘lak, panjara, chiroq, o‘rindiq, favvora, ko‘l, tosh, ko‘prik, guldon va haykalni ham ekish kabi joylashtiring. **Move** bilan obyektni olib, yangi joyga bosing. Tanlangan obyekt kartasidan sug‘orish, aylantirish, ko‘chirish va nusxa ekish mavjud.

| Boshqaruv                        | Amal                                                    |
| -------------------------------- | ------------------------------------------------------- |
| WASD                             | Yurish yoki erkin kamerani siljitish                    |
| Shift                            | Tezroq harakatlanish                                    |
| Chap tugma bilan sudrash         | Kamerani aylantirish                                    |
| O‘ng tugma bilan sudrash         | Erkin kamera markazini siljitish                        |
| Scroll / ikki barmoq bilan pinch | Yaqinlashtirish / uzoqlashtirish                        |
| C / Camera                       | Erkin va birinchi shaxs kamerasi                        |
| E yoki Space                     | Ekran markazidagi amal                                  |
| R                                | Joylashtirilayotgan yoki tanlangan obyektni aylantirish |
| 1–8                              | Plant, Trim, Water, Hose, Move, Clear, Prune, Shape     |
| Ctrl/Cmd + Z                     | Oxirgi o‘zgarishni bekor qilish                         |
| Esc                              | Ko‘chirishni bekor qilish / oynani yopish               |

Mobil qurilmada chap joystick bilan harakatlaning, sahnani sudrab kamerani boshqaring, o‘ngdagi katta tugma bilan ekran markazida asbobni ishlating yoki kerakli joyga bevosita teging. Katalogni chapdagi nihol tugmasi ochadi. Portret va landscape ko‘rinishlar qo‘llanadi.

## Imkoniyatlar

- 288 m² boshlang‘ich bog‘ va 96 × 96 m ochiq hudud; **Explore the world → Expand** bilan 432 × 432 m gacha kengayadi.
- Tahrirlash mumkin bo‘lgan daraxtzor, gullar xiyoboni, butalar labirinti, dam olish burchagi, ko‘l atrofi, ombor, o‘tloq va o‘rmon.
- **28 o‘simlik turi**, **11 dekoratsiya**, 8 bog‘dorchilik asbobi.
- Beshta o‘sish bosqichi, namlik, o‘sishni tezlashtiradigan sug‘orish va atrofdagi o‘simliklarga birgalikda suv beradigan shlang.
- Birma-bir voxel qirqish va 6 tayyor topiary shakli; tahrirlar uchun 35 qadamli undo.
- Quyonlar, olmaxon, qo‘nib-uchadigan qushlar, kapalaklar va asalarilar.
- Kun-tun almashinuvi, kechki chiroqlar, mayin shamol va suv zarralari.
- Web Audio orqali dasturiy yaratilgan qush, shamol, suv, asbob tovushlari va sokin kuylar. Ovoz dastlab o‘chiq; **Garden sounds** bilan yoqing.
- Lokal avtomatik saqlash, JSON eksport/import, oddiy uch bosqichli qo‘llanma.

## Saqlash

O‘zgarishlardan 800 ms keyin, har 15 soniyada va sahifadan chiqishda **LocalStorage** ga yoziladi. Kalit: `plantinum-garden-v1`.

O‘simliklar, koordinatalar, aylanish, o‘sish, namlik, qirqilgan voxellar, shakllar, dekoratsiyalar, yurish pozitsiyasi va kamera, dunyo chegaralari, vaqt va sozlamalar saqlanadi. Sahifa yangilanganda shu ma’lumot tiklanadi. O‘sish o‘yin ochiq va pauzada bo‘lmagan vaqtda hisoblanadi.

Saqlash shu brauzer, qurilma va sayt manziliga tegishli. Qurilmalar orasida avtomatik sinxronlash yo‘q. **Settings → Export garden** faylini boshqa qurilmada **Import garden** orqali oching. Desktop va mobile aynan bir `version: 1` JSON formatidan foydalanadi. Noto‘g‘ri yoki 10 MB dan katta fayllar rad etiladi. Import joriy bog‘ni almashtiradi.

## Grafik va ishlash tezligi

**Sozlamalar → Grafika sifati** ichida beshta rejim bor:

| Rejim | Tasvir aniqligi chegarasi | Soyalar |
| --- | --- | --- |
| Avtomatik | Telefonda muvozanatli, kompyuterda yuqori; zarur bo‘lsa pasayadi | Qurilmaga qarab |
| Yengil va ravon | 1.25× | Yengil kontakt soyalari |
| Muvozanatli | 1.75× | 1024 px mayin soyalar |
| Yuqori sifat | 2.25× | 2048 px soyalar |
| Ultra sifat | 3× | 2048 px soyalar va kengroq atrof |

Aniqlik qurilmaning pixel ratio qiymatidan oshmaydi. Qirralarni silliqlash barcha rejimlarda yoqilgan. Kuchli telefonda **Yuqori sifat** yoki **Ultra sifat** tanlanadi; avtomatik rejim ravonlik uchun bosqichma-bosqich pasayadi va sozlamadagi **Avtomatik** tanlovini saqlaydi. Dasturiy GPU aniqlanganda avtomatik rejim 0.65× aniqlikdagi yengil grafikadan boshlaydi. Telefonda ochish uchun bir Wi-Fi tarmog‘ida terminaldagi **Network** manzilidan foydalaning.

- Bir xil kub geometriyasi va rangli `InstancedMesh` lar ishlatiladi.
- Atrof 24 × 24 m chunklar bo‘yicha bosqichma-bosqich yuklanadi; uzoqlashgan chunklar GPU xotirasidan chiqariladi.
- Telefonda muvozanatli va yuqori rejimlar yaqin atrofni batafsil chizadi; ultra kengroq hududni yuklaydi. Yengil rejimda atrof daraxtlari soddalashtiriladi.
- Frustum culling va masofaga ko‘ra obyekt ko‘rinishini cheklash mavjud.
- Suv va qirqish zarralari obyekt poolidan qayta foydalanadi.
- **Avtomatik** sozlamasi sekin kadrlar ketma-ketligini kuzatib grafikani pasaytiradi. **Sozlamalar → Grafika sifati** orqali qo‘lda tanlash mumkin.

30–60 FPS maqsad qilingan, lekin haqiqiy tezlik GPU, brauzer, ekran aniqligi va bog‘dagi obyektlar soniga bog‘liq. Fizik Android/iPhone qurilmalarida alohida tekshirish tavsiya etiladi. Lokal avtomatik testlar real telefonning ishlash tezligini kafolatlamaydi.

## Production va tekshiruv

```sh
npm test
npm run build
npm run preview -- --port 5199 --strictPort
```

Production fayllari `dist/` ichida. Shu papkani istalgan statik HTTPS hostingga joylashtirish mumkin. O‘yinni `file://` bilan ochmang; HTTP server kerak.

Brauzer sinovlari uchun boshqa terminalda:

```powershell
$env:TEST_URL='http://127.0.0.1:5199'
npm.cmd run test:e2e
npm.cmd run test:lifecycle
npm.cmd run test:preferences
```

Windowsda test mavjud Google Chrome’dan foydalanadi. Boshqa tizimda `npx playwright install chromium` bajariladi yoki `PLAYWRIGHT_CHROMIUM_EXECUTABLE` orqali Chromium manzili beriladi. `TEST_URL` belgilanmaganida test `http://localhost:5173` dan foydalanadi. Natijaviy skrinshotlar `test-results/` ga yoziladi.

Unit testlar katalog modellarini, saqlash formatini, noto‘g‘ri fayllarni, o‘sishni, joylashuv qoidalarini, haqiqiy voxel qirqishni va barcha topiary shakllarini tekshiradi. Brauzer testi sahnadagi obyektlarga haqiqiy bosishlar orqali asosiy o‘yin jarayonini hamda sensorli interfeysni tekshiradi.

## Loyiha tuzilishi

```text
src/
  main.js         Interfeys, katalog, tutorial, menyu, sozlamalar va saqlash
  game.js         Three.js sahnasi, kamera, raycasting va asboblar
  world.js        Chunk streaming, boshlang‘ich landshaft va hayvonlar
  voxels.js       Deterministik voxel modellari va topiary geometriyasi
  catalog.js      O‘simlik, dekoratsiya va asbob ma’lumotlari
  state.js        Bog‘ formati, validatsiya, o‘sish va joylashuv qoidalari
  i18n.js         O‘zbekcha / English tarjimalar va lokalizatsiya
  graphics.js     Mobil va desktop grafik sifat profillari
  audio.js        Web Audio atmosfera va asbob tovushlari
  thumbnails.js   Katalog uchun haqiqiy 3D modellarni tasvirga olish
  icons.js        SVG interfeys ikonkalari
  ground-shadows.js  Mobil uchun yengil kontakt soyalari
  style.css       Moslashuvchan desktop / mobile interfeys
tests/
  input.test.js   Sudrash, bosish, fokus va sensorli boshqaruv regressiyalari
  preferences.test.js  Tarjimalar, qidiruv va grafik sifat unit testlari
  preferences.mjs  Til almashinuvi, bog‘ saqlanishi va grafik sifat brauzer sinovi
  state.test.js   Node.js unit testlari
  browser.mjs     Playwright interaktiv brauzer sinovlari
  lifecycle.mjs   Eksport/import, kamera, qolgan asboblar va pinch sinovlari
```

Tashqi kutubxonalar o‘z litsenziyalariga ega. Google Fonts mavjud bo‘lmasa, interfeys tizim shriftiga o‘tadi; o‘yinning modellari, ovozi va mexanikasi tashqi asset xizmatiga bog‘liq emas.
