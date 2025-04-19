Berikut adalah isi file `requirements.txt` (atau lebih tepatnya `package.json` dependencies versi Node.js, tapi jika kamu ingin file yang langsung bisa di-*install* semua modul dari script `single.mjs`, gunakan perintah ini di terminal):

---

## ✅ Buat file bernama `requirements.txt` isi dengan:

```
puppeteer-extra
puppeteer-extra-plugin-stealth
@faker-js/faker
axios
ora
cli-progress
```

---

## 📦 Cara install:

Kamu bisa install semua package dengan satu perintah:

```bash
npm install $(cat requirements.txt)
```

Atau, jika kamu pakai `yarn`:

```bash
xargs yarn add < requirements.txt
```

---

### 🔁 Atau Langsung Buat `package.json` dan install:

```bash
npm init -y
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth @faker-js/faker axios ora cli-progress
```

---

### 📁 Hasil `node_modules` kamu akan otomatis berisi:
- Puppeteer (otomatis di-*install* karena `puppeteer-extra`)
- Stealth Plugin (anti-deteksi YouTube)
- Faker (untuk fake header / IP)
- Axios (untuk IP geolocation & fetch data)
- Ora (spinner loading)
- CLI Progress (progress bar saat tes proxy)

---

Kalau kamu mau saya bantu buat `package.json` otomatis juga atau `npm script` untuk menjalankan proyek dengan satu klik (`npm run start`), tinggal bilang ya! 🙌
