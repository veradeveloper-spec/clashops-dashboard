# ClashOps — CoC Clan Dashboard

Dashboard web statis bertema dark gaming untuk memantau info clan, anggota, current war, dan timer upgrade manual. Hosting menggunakan GitHub Pages; data CoC diperbarui otomatis oleh GitHub Actions.

## Fitur

- Info clan: nama, tag, level, clan points, jumlah anggota.
- Daftar anggota dan Town Hall.
- Ringkasan current war (bintang dan persentase kehancuran).
- Timer upgrade manual yang disimpan di `localStorage` browser.
- Kalkulator estimasi menuju MAX untuk Hero, bangunan, pasukan, spell, dan pet berdasarkan level serta durasi rata-rata yang diinput.
- Pengaturan slot Builder, Laboratory, dan Pet House untuk estimasi kalender sederhana.
- PWA: bisa dipasang ke layar utama Android seperti aplikasi.
- Push notification OneSignal untuk perubahan status war, termasuk saat browser ditutup setelah perangkat subscribe.
- Sinkronisasi API otomatis setiap 15 menit melalui GitHub Actions.

## 1. Buat API key Clash of Clans

1. Buka https://developer.clashofclans.com/ dan login.
2. Buat akun/developer key.
3. Saat membuat key, masukkan IP publik runner GitHub Actions yang berubah-ubah tidak cocok untuk allowlist tetap. Karena itu, **jangan menganggap key API biasa bisa dipakai langsung dari GitHub-hosted runner** jika portal mewajibkan IP allowlist.
4. Untuk penggunaan GitHub-hosted runner, solusi yang disarankan adalah menjalankan fetcher di server dengan IP publik tetap yang diizinkan oleh portal API, atau gunakan self-hosted GitHub Actions runner pada jaringan/IP yang diizinkan.
5. Jangan pernah memasukkan token API ke `app.js`, HTML, atau file publik.

> Catatan penting: Clash of Clans API memakai pembatasan IP untuk developer key. Workflow di repo ini memerlukan runner yang IP-nya sudah diizinkan oleh key. GitHub-hosted runner umumnya memakai IP yang berubah, sehingga workflow dapat gagal sampai Anda menggunakan self-hosted runner atau mekanisme runner dengan egress IP tetap.

## 2. Upload ke GitHub

1. Buat repository baru di GitHub, misalnya `clashops-dashboard`.
2. Upload semua isi folder project ini ke root repository (termasuk folder `.github`).
3. Pastikan branch utama bernama `main`.

## 3. Tambahkan konfigurasi rahasia

Di repository GitHub, buka **Settings → Secrets and variables → Actions**.

- Pada tab **Secrets**, pilih **New repository secret**:
  - Name: `COC_API_TOKEN`
  - Value: token API dari Clash of Clans Developer Portal.
- Pada tab **Variables**, pilih **New repository variable**:
  - Name: `CLAN_TAG`
  - Value: tag clan tanpa `#`, contoh `ABC123XYZ`.

Jangan kirim token API ke orang lain dan jangan commit token ke repository.

## 4. Aktifkan GitHub Pages

1. Buka **Settings → Pages**.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Buka tab **Actions**, jalankan workflow `Update CoC Dashboard Data` dengan tombol **Run workflow**.
4. Setelah workflow Pages selesai, buka URL yang ditampilkan di job deploy. Biasanya berbentuk `https://USERNAME.github.io/NAMA-REPO/`.

## 5. Menjalankan update otomatis

Workflow `Update CoC Dashboard Data` dijadwalkan setiap 15 menit. GitHub Actions scheduled workflows dapat terlambat saat beban tinggi dan pada repository publik dapat dinonaktifkan bila tidak ada aktivitas dalam waktu lama. Anda juga bisa menjalankannya manual melalui **Actions → Update CoC Dashboard Data → Run workflow**.

### Menggunakan runner dengan IP tetap

Jika API key mengharuskan IP allowlist, jalankan job update pada self-hosted runner yang keluar ke internet melalui IP publik tetap dan sudah diizinkan pada Developer Portal. Di `.github/workflows/update-dashboard.yml`, ubah:

```yaml
runs-on: ubuntu-latest
```

menjadi:

```yaml
runs-on: self-hosted
```

Pastikan runner tersebut aman, aktif, dan hanya menerima job dari repository yang Anda percaya.

## Notifikasi dan batasan

- Tombol **Aktifkan notifikasi** meminta izin notifikasi browser.
- Notifikasi perubahan war hanya bisa muncul ketika halaman dashboard terbuka pada browser/perangkat tersebut. Website statis tanpa server push tidak dapat menjamin notifikasi saat browser ditutup.
- Timer upgrade adalah catatan manual per browser; API resmi tidak menyediakan timer upgrade bangunan akun.
- API current war bisa mengembalikan 403 jika data war tidak tersedia/tersembunyi atau akses API tidak memenuhi syarat. Periksa pengaturan war log clan dan status key.
- Dashboard ini tidak mengontrol game, tidak membaca data privat akun, dan tidak melakukan serangan otomatis.

## Struktur

```text
.
├── .github/workflows/
│   ├── update-dashboard.yml
│   └── pages.yml
├── data/dashboard.json
├── scripts/fetch_coc.py
├── app.js
├── index.html
├── style.css
└── README.md
```

## Lisensi

MIT — proyek komunitas tidak resmi, tidak berafiliasi dengan Supercell.


## Kalkulator estimasi menuju MAX

Bagian **Estimasi upgrade sampai MAX** dapat dipakai untuk mencatat item satu per satu:
- Pilih kategori Builder (Hero/bangunan), Laboratory (pasukan/spell), atau Pet House.
- Isi level saat ini dan level target maksimum yang ingin dicapai.
- Isi rata-rata durasi satu level berdasarkan timer game.
- Atur jumlah slot yang tersedia untuk tiap kategori.

Data kalkulator disimpan di `localStorage` browser, bukan ke GitHub. Hasilnya adalah perkiraan berbasis input manual, bukan database resmi level/durasi CoC. Gunakan level maksimum sesuai Town Hall akun dan perubahan balancing terbaru.


## PWA Android + push notification

Project ini memakai **PWA + OneSignal Web Push**. GitHub Pages meng-host website; OneSignal mengirim push ke perangkat yang sudah berlangganan.

### A. Buat aplikasi OneSignal
1. Buat akun di https://onesignal.com/ dan buat aplikasi baru.
2. Tambahkan platform **Web** dan pilih setup website/self-hosted.
3. Masukkan domain GitHub Pages dan URL situs lengkap sesuai panduan OneSignal. Contoh URL situs: `https://USERNAME.github.io/NAMA-REPO/`.
4. Selesaikan konfigurasi Web Push dan salin **OneSignal App ID**.
5. Ganti `YOUR_ONESIGNAL_APP_ID` di `config.js` dengan App ID tersebut.
6. Salin REST API Key OneSignal. Jangan pernah menaruh REST API Key di file website.

### B. GitHub Secrets dan Variables
Buka **Settings → Secrets and variables → Actions**.

Repository Variables:
- `CLAN_TAG` — tag clan tanpa `#`.
- `ONESIGNAL_APP_ID` — App ID OneSignal.
- `PAGES_URL` — URL lengkap GitHub Pages, misalnya `https://USERNAME.github.io/NAMA-REPO/`.

Repository Secrets:
- `COC_API_TOKEN` — token API resmi CoC.
- `ONESIGNAL_REST_API_KEY` — REST API Key OneSignal.

### C. Instal di Android
1. Buka URL GitHub Pages lewat Chrome Android.
2. Pilih tombol **Pasang aplikasi** jika muncul, atau menu Chrome ⋮ → **Install app / Tambahkan ke layar utama**.
3. Buka ClashOps dari ikon layar utama.
4. Tekan **Aktifkan notifikasi**, lalu izinkan notifikasi.
5. Pastikan notifikasi Chrome/ClashOps tidak diblokir di pengaturan Android.

Workflow mengirim push ketika mendeteksi perubahan status war ke preparation, inWar, warEnded, atau notInWar. Pengecekan dijalankan berkala, jadi notifikasi bukan real-time detik itu juga.

### Batasan
- Push saat browser ditutup memerlukan OneSignal, izin notifikasi, internet, dan dukungan browser/Android. Penghemat baterai dapat menunda notifikasi.
- Notifikasi hanya masuk setelah perangkat subscribe.
- Versi ini memberi notifikasi perubahan status war, belum notifikasi pribadi anggota yang belum attack.
- OneSignal App ID boleh ada di website; REST API Key dan token CoC wajib disimpan sebagai GitHub Secrets.
- Jika GitHub Pages memakai project path, ikuti konfigurasi origin/site URL yang diminta OneSignal.
