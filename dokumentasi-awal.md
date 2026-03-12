untuk role user sendiri ada 4 yaitu root, administrator, guru/dosen, siswa/mahasiswa 
untuk root sendiri bisa menggunakan semua fitur role
untuk administrator juga semua user kecuali hapus user root, lihat detail user root.
fitur yang dipersembahkan
- login (otomatis deteksi 3 role juga)
- manajemen user. dari buat user untuk mahasiswa ataupun guru. (khusus adminirtrator dan root)
- manajemen kursus : buat kursus, hapus kursus, edit kursus. namun untuk semua itu perlu perizinan administrator/root dulu baru ditampilkan atau bisa diakses
- manajemen isi kursus : upload materi, upload quiz, cek hasil perkembangan dari setiap isi kursus misalnya 30 siswa terdaftar di kursus dan 5 dari siswa itu menyelesaikan kursus sebanyak 100%, 2 siswa sebesar 50% dll, cek hasil quiz (khusus guru, administrator dan root)
- mengikuti kursus (siswa/mahasiswa)
- komentar untuk kursus, materi, quiz (yang mengikuti kursus)
- untuk kursus sendiri bisa dicari via kode kursus, nama kursus, nama guru yang membuat kursus.
- untuk masuk kursus perlu password yang dibuat oleh pembuat kursus


alur :
user akses halaman login - input email + password - muncul ke halaman dashboard yang berisikan dari semua fitur itu (untuk fitur khusus yang bisa lihat dan akses cukup yang bersangkutan atau role tersebut saja)


saya ingin ini menjadi source open source ada halaman untuk installasi dll kaya moodle, dan untuk db bisa pilih antara firebase atau mysql(ini dipilih diawal installasi) untuk installasi bisa pakai gui