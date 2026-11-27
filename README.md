# GajiKu - Release by RDA
> **“Transparansi gaji & lembur harian dalam genggaman Anda”**

Aplikasi pencatatan gaji bulanan, jam kerja reguler, lembur (overtime), multi-karyawan, siklus buka & tutup buku gajian (cut-off), grafik bulanan visual, cetak slip gaji (PDF), dan ekspor laporan ke Excel (PWA & Android Ready).

---

## 🏷️ Identitas & Branding
- **Nama Aplikasi:** GajiKu
- **Karya / Rilis:** Release by RDA
- **Slogan / Tagline:** *"Transparansi gaji & lembur harian dalam genggaman Anda"*
- **Target Pengguna:** Pekerja mandiri, karyawan lembur, operator lapangan, supervisor, maupun manajemen tim.

---

## ✨ Fitur-Fitur Terbaru

1. **📱 Proyek Android Studio Native (Kotlin) - Siap Jadi APK**
   - Folder `android/` telah dilengkapi proyek Android Studio lengkap berbasis **100% Kotlin** (`MainActivity.kt`, `WebAppInterface.kt`).
   - **Bisa Diakses di Jaringan Apa Pun:** 100% offline (tanpa kuota/mode pesawat), maupun jaringan seluler (2G/3G/4G/5G) dan Wi-Fi.
   - **Tampilan & Fitur 100% Persis Seperti di Web:** Seluruh perhitungan lembur, cut-off gajian, grafik, dan tema berjalan identik.
   - **Integrasi Fitur Native:** Ekspor Excel otomatis tersimpan di folder Download HP & memunculkan menu berbagi (WhatsApp/Drive), cetak slip gaji langsung ke printer/PDF via Android PrintManager, dan tombol Back bawaan HP.

2. **👁️ Perbaikan Tampilan & Font Nominal Tunjangan & Potongan**
   - Perbaikan tata letak input dinamis (*flexbox ratio*) pada nama dan nominal tunjangan/potongan agar tidak terpotong pada layar HP.
   - Font nominal kini memiliki kontras tinggi, tebal (*bold*), dan terbaca sangat jelas di mode terang maupun mode gelap (*dark mode*).
   - Indikator total (*dynamic total pill*) menampilkan rincian total tunjangan dan potongan tetap secara jelas dan rapi.

3. **💵 Input Manual Nominal Tunjangan & Potongan (Bulanan & Harian)**
   - **Tunjangan & Potongan Tetap (Menu Pengaturan/Profil):**
     - Bebas memasukkan nama dan nominal manual berapapun (misal: Tunjangan Kehadiran, Tunjangan Operasional, BPJS, dll).
     - Tombol **+ Tambah Tunjangan** dan **+ Tambah Potongan** memungkinkan fleksibilitas penuh tanpa angka template bawaan.
     - Dilengkapi badge kalkulasi total otomatis (*live pill preview*) yang langsung menghitung total tunjangan & potongan saat nominal diketik.
   - **Tunjangan & Potongan Harian (Menu Catat Lembur/Presensi):**
     - Bagian opsional yang bisa dibuka di formulir pencatatan harian (*collapsible card*).
     - Digunakan untuk memasukkan uang makan harian, uang transport harian, kasbon hari itu, atau denda keterlambatan per tanggal tertentu.
     - Otomatis ditambahkan ke kartu riwayat, dashboard, slip gaji resmi, dan laporan ekspor Excel.

2. **✨ Bebas Input Bulan Sendiri (Tanpa Default Bulan Lampau)**
   - Menghapus semua sampel default bulan lampau (September, Oktober, November).
   - Pengguna baru memulai dengan lembar kerja bersih (*clean slate*), hanya menampilkan bulan aktif yang dipilih atau bulan yang benar-benar pernah dicatat.
   - Pengguna leluasa mencatat lembur dan memilih bulan kerja apa saja sesuai tanggal aktual masing-masing.

3. **📅 Pengaturan Siklus Buka Buku & Tutup Buku (Cut-Off Penggajian)**
   - Tersedia di menu **Pengaturan / Profil**.
   - **Mode Standar Kalender:** Perhitungan 1 bulan penuh (tanggal 1 s/d tanggal 30/31).
   - **Mode Custom Cut-Off:** Tentukan sendiri tanggal Tutup Buku gajian (misal: tanggal 20 atau 25).
   - Sistem secara otomatis menghitung:
     - **Tanggal Buka Buku:** Tanggal berikutnya dari bulan sebelumnya (contoh: 26 Oktober).
     - **Tanggal Tutup Buku:** Tanggal cut-off bulan berjalan (contoh: 25 November).
   - Setiap pencatatan absensi & lembur otomatis dikelompokkan ke periode gajian yang tepat.
   - Tercantum rapi pada kartu ringkasan Dashboard, Slip Gaji resmi, laporan Excel, dan rekap PDF.

2. **🗑️ Fitur Hapus Riwayat Gaji Bulanan**
   - Pada tab **Bulanan**, setiap kartu periode bulan dilengkapi tombol **Hapus**.
   - Dilengkapi dialog konfirmasi keamanan lengkap dengan nama karyawan, nama bulan, rentang tanggal siklus, dan jumlah catatan yang akan dibersihkan.
   - Membersihkan seluruh catatan presensi & jam lembur bulan tersebut secara instan tanpa mengganggu riwayat bulan lainnya.

3. **📖 Panduan Interaktif Pemakaian (Saat Baru Diinstall)**
   - Saat aplikasi pertama kali dibuka, muncul jendela panduan interaktif (*walkthrough tutorial*) langkah demi langkah cara memakai aplikasi.
   - Bisa dibuka ulang kapan saja lewat tombol **tanya (?)** di header atas atau menu **Profil & Pengaturan**.

2. **🌓 Mode Gelap & Terang (Dark / Light Mode)**
   - Tersedia tombol cepat matahari/bulan (☀️ / 🌙) di pojok kanan atas aplikasi.
   - Pilihan tema otomatis tersimpan di HP/browser Anda.
   - Tampilan mode gelap dirancang nyaman di mata dengan kontras tinggi (*deep slate theme*).

3. **📊 Grafik Pembacaan Gaji Per Bulan**
   - Grafik riwayat gaji difokuskan pada **pembacaan gaji bersih per bulan**.
   - Diagram batang bertumpuk (*stacked bar*) yang memisahkan antara **Gaji Pokok & Tunjangan** dan **Uang Lembur**, dengan label nominal langsung di atas setiap batang bulan.

4. **👥 Fitur Multi-User (Banyak Karyawan)**
   - Dapat menambah, mengedit, dan beralih antar karyawan dengan cepat via dropdown di header atas atau menu Profil.
   - Setiap karyawan memiliki pengaturan Gaji Pokok, Tunjangan, Potongan, dan catatan lembur masing-masing.

5. **💰 Input Gaji Fleksibel dengan Format Titik & Koma Otomatis**
   - Mendukung **semua nominal tanpa batasan** (dari ratusan rupiah hingga ratusan juta/miliar).
   - Format otomatis saat mengetik: **titik (`.`)** untuk pemisah ribuan dan **koma (`,`)** untuk desimal (contoh: `5.000.000` atau `7.250.500,50`).

6. **⏰ Pilihan Mode Jam Kerja & Lembur Fleksibel**
   - **Opsi 1 (Hanya Jam Lembur Saja):** Mencatat jam lembur langsung.
   - **Opsi 2 (Jam Kerja Reguler + Lembur):** Mencatat jam kerja normal (misal 08:00 - 17:00, 8 jam) sekaligus jam lemburnya.
   - **Opsi 3 (Hadir Kerja Normal Saja):** Mendata kehadiran kerja harian biasa tanpa lembur.

7. **📅 Riwayat Gaji Perbulan & Akumulasi**
   - Tab **Bulanan** yang merangkum gaji bulan per bulan beserta akumulasi pendapatan.
   - Tombol instan: **Unduh Excel** dan **Cetak Slip Gaji (PDF)**.

4. **📊 Ekspor Data Lengkap (Excel & PDF)**
   - **Ekspor Excel (.CSV / Spreadsheet):** Format tabel rapi dengan UTF-8 BOM yang langsung terbaca rapi di Microsoft Excel (PC maupun HP Android).
   - **Cetak / Simpan Slip Gaji (PDF):** Format slip gaji resmi dengan kop perusahaan, rincian penerimaan, potongan, dan tanda tangan (otomatis pas di kertas A4 saat cetak/simpan PDF).
   - **Ekspor Semua Bulan:** Mengunduh seluruh riwayat bulanan ke dalam satu file Excel.

5. **Perhitungan Otomatis Depnaker / Manual**
   - Standar Depnaker (Gaji ÷ 173):
     - Hari kerja: 1 jam pertama (1.5x), jam berikutnya (2.0x).
     - Hari libur: 8 jam pertama (2.0x), jam ke-9 (3.0x), jam ke-10+ (4.0x).
   - Tarif Manual Flat: bisa disesuaikan per karyawan.

6. **Offline & Keamanan Data**
   - Data tersimpan lokal di perangkat dan dapat diekspor/dipulihkan via file cadangan JSON.

---

## 🚀 Cara Menjalankan

### Cara 1: Langsung di Komputer
Cukup klik ganda (double-click) pada file:
👉 `JALANKAN_APLIKASI.bat`
Aplikasi akan otomatis terbuka di browser Anda.

### Cara 2: Pasang di HP Android
Baca panduan lengkap di:
👉 [PANDUAN_JADI_APK.md](./PANDUAN_JADI_APK.md)
