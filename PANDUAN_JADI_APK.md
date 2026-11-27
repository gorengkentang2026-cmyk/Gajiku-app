# Panduan Aplikasi Android Native (Kotlin) - GajiKu
> **Release by RDA** • *“Transparansi gaji & lembur harian dalam genggaman Anda”*

Aplikasi **GajiKu** kini telah memiliki proyek **Android Studio Native berbasis Kotlin** yang siap pakai di folder `android/`. Proyek ini dirancang agar tampilan dan fiturnya **100% persis seperti di web**, serta **bisa diakses dalam kondisi jaringan apa pun** (termasuk 100% offline tanpa kuota internet).

---

## 🌟 Keunggulan Aplikasi Android Kotlin GajiKu

1. **Bisa Diakses di Jaringan Apa Pun (Any Network Ready)**
   - **Mode Offline Penuh (Tanpa Internet / Mode Pesawat):** Seluruh aset aplikasi (HTML, CSS, JavaScript, font, ikon) tertanam langsung di dalam paket file APK (`assets/www/`). Aplikasi terbuka instan dalam hitungan 0.1 detik tanpa membutuhkan koneksi internet sama sekali.
   - **Jaringan Seluler & Wi-Fi (2G / 3G / 4G / 5G):** Berfungsi normal dan cepat tanpa memakan kuota data Anda.
2. **Tampilan & Fitur 100% Persis Seperti di Web**
   - Perhitungan lembur otomatis standar Depnaker (1.5x, 2.0x, 3.0x, 4.0x) & flat.
   - Pengaturan Buka Buku & Tutup Buku gajian (cut-off kustom).
   - Multi-karyawan / multi-user.
   - Input nominal gaji tanpa batas dengan format titik dan koma otomatis.
   - Input manual tunjangan & potongan (baik bulanan maupun harian).
   - Grafik riwayat gaji bulanan visual.
   - Panduan pemakaian interaktif (walkthrough).
   - Mode Gelap & Mode Terang (*Dark/Light Mode*).
3. **Integrasi Fitur Native Android (Kotlin Bridge):**
   - **Ekspor Excel Langsung:** File laporan lembur `.csv` langsung disimpan ke folder *Download* HP dan memunculkan menu berbagi (WhatsApp, Google Drive, Email).
   - **Cetak / Simpan Slip Gaji ke PDF:** Terhubung langsung ke *Android PrintManager* bawaan HP untuk langsung dicetak ke printer atau disimpan sebagai dokumen PDF A4.
   - **Tombol Kembali (Back Navigation):** Menekan tombol Back HP akan menutup modal popup terlebih dahulu tanpa keluar tiba-tiba dari aplikasi.
   - **Pemulihan Data Backup:** Mendukung pemilihan file `.json` langsung dari pengelola file HP Android.

---

## 🚀 Cara Menjadikan File `.APK` Menggunakan Android Studio

### Langkah 1: Buka Proyek di Android Studio
1. Buka aplikasi **Android Studio** di laptop/komputer Anda.
2. Pilih menu **File > Open...** (atau klik *Open* pada layar selamat datang).
3. Arahkan dan pilih folder:
   👉 `c:\Users\Roli Mukhlisin\Documents\PROJECT BARU\android`
4. Klik **OK**. Android Studio akan membuka proyek dan menjalankan sinkronisasi Gradle secara otomatis.

### Langkah 2: Build File APK
1. Tunggu hingga proses *Gradle Sync* selesai (indikator di pojok kanan bawah selesai memuat).
2. Di menu atas Android Studio, klik:
   👉 **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. Tunggu beberapa detik hingga muncul notifikasi:
   `Build APK(s): APK(s) generated successfully for 1 module ('app')`.
4. Klik tautan bertuliskan **"locate"** pada notifikasi tersebut.
5. Anda akan langsung diarahkan ke lokasi file APK:
   👉 `android\app\build\outputs\apk\debug\app-debug.apk`

### Langkah 3: Pasang (Install) di HP Android
1. Kirim file `app-debug.apk` tersebut ke HP Android Anda (bisa lewat WhatsApp, Telegram, kabel data USB, atau Google Drive).
2. Buka file APK tersebut di HP Android Anda, lalu tekan **Install**.
3. Ikon **GajiKu** resmi akan muncul di layar menu HP Anda dan langsung siap dipakai kapan pun dan di mana pun!

---

## 🔄 Sinkronisasi Jika Ada Perubahan Tampilan Web
Jika di kemudian hari Anda mengubah kode di file web utama (`index.html`, `style.css`, `app.js`), Anda tidak perlu menyalin manual satu per satu. Cukup klik ganda file:
👉 `sync-android-assets.bat`
Maka seluruh file web terbaru akan langsung disinkronkan otomatis ke dalam folder proyek Android Kotlin (`android/app/src/main/assets/www`).

---

## ⚡ Alternatif Lain Mengubah Jadi APK (Tanpa Install Android Studio)

Jika Anda **tidak memiliki Android Studio** atau ingin cara yang lebih cepat, ringan, dan tanpa ribet install program berat di komputer, Anda memiliki 4 pilihan alternatif:

---

### Pilihan 1: Menggunakan Tool Online Instan (WebIntoApp) — Paling Mudah & Cepat (2 Menit)
Kami telah membuatkan file otomatis `BUAT_ZIP_UNTUK_APK.bat` di dalam folder ini:

1. **Jalankan Script 1-Klik:**
   - Cukup klik ganda (double-click) file:
     👉 `BUAT_ZIP_UNTUK_APK.bat`
   - File berekstensi zip bernama `GajiKu_Siap_APK.zip` akan langsung dibuat otomatis di folder ini.
2. **Buka Situs Pembuat APK Online:**
   - Kunjungi situs gratis: [WebIntoApp.com](https://www.webintoapp.com)
3. **Unggah File ZIP:**
   - Pilih opsi **"HTML / All Files"**, lalu unggah file `GajiKu_Siap_APK.zip` tadi.
   - Masukkan nama aplikasi: **GajiKu**
   - Masukkan nama pembuat: **Release by RDA**
   - Ikon aplikasi: Unggah file `icon-512.png` yang ada di folder ini.
4. **Unduh APK:**
   - Klik tombol **"Generate APK"**. Dalam 1-2 menit, file `.apk` langsung jadi dan bisa Anda unduh ke HP Android Anda!

---

### Pilihan 2: Cloud Build Otomatis via GitHub Actions (100% Gratis & Otomatis)
Kami telah menyertakan konfigurasi build otomatis di folder `.github/workflows/build-apk.yml`:

1. Buat repositori baru di akun [GitHub](https://github.com) Anda.
2. Unggah seluruh isi folder `PROJECT BARU` ini ke repositori GitHub Anda.
3. Server GitHub akan **secara otomatis meng-compile proyek Kotlin di folder `android/`** di cloud tanpa Anda perlu install Android Studio di komputer.
4. Buka tab **Actions** di repositori GitHub Anda, klik build yang selesai, lalu unduh file `GajiKu-Debug-APK` (berisi file `app-debug.apk` siap pakai).

---

### Pilihan 3: Menggunakan PWABuilder (Resmi dari Microsoft)
1. Unggah folder web ini ke hosting gratis seperti **GitHub Pages**, **Vercel**, atau **Netlify**.
2. Buka situs [PWABuilder.com](https://www.pwabuilder.com).
3. Masukkan link website Anda, lalu klik **"Start"**.
4. PWABuilder akan mendeteksi `manifest.json` dan `sw.js` otomatis.
5. Klik **"Package for Android"** -> Unduh file APK siap pasang ke HP atau siap untuk Google Play Store.

---

### Pilihan 4: Pasang Instan Tanpa APK (PWA Langsung di HP Android)
Jika tujuan Anda adalah agar aplikasi bisa dibuka di HP Android seperti aplikasi biasa:
1. Jalankan `JALANKAN_APLIKASI.bat`.
2. Buka alamat IP lokal yang tampil (misal `http://192.168.1.10:8080`) di Google Chrome HP Android Anda.
3. Tekan menu titik tiga (**⋮**) di pojok kanan atas Chrome -> Pilih **"Tambahkan ke Layar Utama" / "Install Aplikasi"**.
4. Ikon resmi **GajiKu** akan langsung terpasang di menu HP Android Anda, terbuka full-screen tanpa address bar browser, dan **100% berfungsi offline** tanpa perlu internet!
