# Panduan Lengkap: Membuat APK Android Murni GajiKu Lewat GitHub
> **Release by RDA** • *“Transparansi gaji & lembur harian dalam genggaman Anda”*

Dengan metode ini, Anda **tidak perlu menginstal Android Studio** di laptop/komputer. Server cloud GitHub (GitHub Actions) yang sudah kami konfigurasi akan secara otomatis meng-compile seluruh kode program Kotlin di folder `android/` menjadi file fisik **`GajiKu-Release-by-RDA.apk`** secara gratis.

---

## 📱 Mengapa Ini "Aplikasi Android Murni Tanpa Web"?
* **File Berformat Fisik `.apk`:** Bukan link web atau bookmark browser.
* **Terpasang Resmi di HP Android:** Memiliki nama **GajiKu**, ikon resmi, dan splash screen sendiri di menu aplikasi HP.
* **100% Offline (Tanpa Internet):** Seluruh kode program, kalkulasi lembur Depnaker, buka & tutup buku gajian, dan tema tersimpan di dalam memori HP. Anda bisa membukanya kapan saja bahkan di Mode Pesawat atau daerah tanpa sinyal.
* **Fitur Native Penuh:** Ekspor Excel langsung tersimpan ke folder Download HP dan memunculkan menu Share (WhatsApp/Drive), cetak PDF langsung via printer HP, dan tombol Back native Android.

---

## 🚀 Langkah-Langkah Mengubah Jadi APK Lewat GitHub

### Langkah 1: Buat Repositori Baru di GitHub
1. Buka browser dan login ke akun Anda di [https://github.com](https://github.com).
2. Di pojok kanan atas, klik tanda tambah (**+**) lalu pilih **New repository**.
3. Isi data:
   * **Repository name:** `gajiku-app` (atau nama lain sesuai keinginan Anda).
   * **Visibility:** Pilih **Public** (agar fitur kompilasi GitHub Actions dapat berjalan gratis tanpa batasan kuota).
4. Klik tombol hijau **Create repository** di bagian bawah.

---

### Langkah 2: Unggah Folder Project ke GitHub

#### Opsi A: Lewat Web Browser (Paling Mudah, Tanpa Install Git)
1. Pada halaman repositori yang baru saja dibuat, klik tulisan tautan:
   👉 **"uploading an existing file"**
2. Buka folder komputer Anda:
   `c:\Users\Roli Mukhlisin\Documents\PROJECT BARU`
3. Pilih dan seret (*drag and drop*) seluruh isi folder tersebut ke area upload di halaman browser GitHub.
   *(Pastikan folder `android` dan folder `.github` ikut terunggah).*
4. Di bagian bawah halaman, klik tombol hijau **Commit changes**.
5. Tunggu hingga proses upload berkas selesai.

#### Opsi B: Lewat Perintah Git (Jika Ada Git di Komputer)
Jika Anda menggunakan terminal atau Git Bash di komputer Anda:
```bash
git init
git add .
git commit -m "Rilis Aplikasi Android GajiKu by RDA"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/gajiku-app.git
git push -u origin main
```

---

### Langkah 3: GitHub Meng-compile APK Secara Otomatis di Cloud
Begitu file terunggah, GitHub akan langsung mendeteksi konfigurasi otomatis di `.github/workflows/build-apk.yml`:
1. Klik tab **Actions** di menu atas repositori GitHub Anda.
2. Anda akan melihat alur kerja bernama **"Build Android APK (Kotlin)"** sedang berjalan (ditandai dengan lingkaran kuning berputar).
3. Server cloud GitHub sedang menyiapkan Java JDK 17, Android SDK, dan meng-compile program Kotlin menjadi file APK.
4. Tunggu sekitar **1 hingga 2 menit** sampai ikon berubah menjadi **centang hijau (Success)**.

---

### Langkah 4: Unduh File APK ke HP Android
1. Klik pada judul alur kerja yang sudah bercentang hijau tersebut.
2. Gulir layar ke bagian paling bawah ke kolom **Artifacts**.
3. Anda akan melihat file bernama:
   📦 **`GajiKu-Release-by-RDA`**
4. Klik nama file tersebut untuk mengunduhnya ke laptop atau langsung dari browser HP Android Anda.
5. Ekstrak file zip hasil unduhan tersebut (di dalamnya terdapat file **`GajiKu-Release-by-RDA.apk`**).
6. Buka file APK tersebut di HP Android Anda, lalu tekan tombol **Install / Pasang**.
7. **Selesai!** Aplikasi **GajiKu** telah terpasang permanen di HP Android Anda sebagai aplikasi mandiri murni tanpa web.

---

## 🔄 Pembaruan di Masa Depan
Jika Anda melakukan perubahan nominal atau catatan di masa depan:
Cukup unggah file yang diubah ke repositori GitHub Anda. GitHub Actions akan secara otomatis meng-compile ulang APK versi terbaru untuk Anda!
