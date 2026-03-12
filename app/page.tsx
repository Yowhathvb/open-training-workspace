import Link from "next/link";
import Navbar from "./components/Navbar";

const features = [
  {
    title: "Login otomatis berbasis role",
    desc: "Satu halaman login dengan deteksi peran yang langsung mengarahkan ke akses yang tepat.",
  },
  {
    title: "Manajemen user",
    desc: "Buat akun mahasiswa dan guru dalam hitungan menit dengan kontrol penuh admin/root.",
  },
  {
    title: "Manajemen kursus",
    desc: "Buat, edit, dan hapus kursus dengan izin administrator atau root sebelum tayang.",
  },
  {
    title: "Manajemen isi kursus",
    desc: "Unggah materi dan kuis, pantau progres peserta, serta cek hasil kuis dengan ringkas.",
  },
  {
    title: "Mengikuti kursus",
    desc: "Mahasiswa bergabung dan belajar langsung dari dashboard tanpa proses rumit.",
  },
  {
    title: "Komentar kolaboratif",
    desc: "Diskusi pada kursus, materi, dan kuis untuk mendorong interaksi aktif.",
  },
  {
    title: "Pencarian fleksibel",
    desc: "Cari kursus via kode, nama kursus, atau nama pengajar yang membuatnya.",
  },
  {
    title: "Akses aman dengan password",
    desc: "Masuk kursus memakai password dari pembuat kursus untuk kontrol yang rapi.",
  },
];

const roles = [
  {
    title: "Root",
    desc: "Akses penuh ke seluruh fitur dan konfigurasi sistem.",
  },
  {
    title: "Administrator",
    desc: "Kelola user dan kursus, kecuali menghapus atau melihat detail user root.",
  },
  {
    title: "Guru/Dosen",
    desc: "Kelola konten kursus, pantau progres, dan evaluasi hasil kuis.",
  },
  {
    title: "Siswa/Mahasiswa",
    desc: "Ikut kursus, belajar materi, dan berinteraksi lewat komentar.",
  },
];

const workflow = [
  {
    title: "Login",
    desc: "User masuk dengan email dan password dari satu halaman login.",
  },
  {
    title: "Dashboard otomatis",
    desc: "Tampilan dashboard menyesuaikan role dan hanya menampilkan fitur yang relevan.",
  },
  {
    title: "Akses fitur sesuai izin",
    desc: "Fitur khusus tampil hanya untuk role yang memiliki hak akses.",
  },
];

const installSteps = [
  {
    title: "Pilih database",
    desc: "Gunakan Firebase atau MySQL saat instalasi awal.",
  },
  {
    title: "Instalasi GUI",
    desc: "Proses pemasangan lewat antarmuka visual, seperti gaya instalasi Moodle.",
  },
  {
    title: "Konfigurasi proyek",
    desc: "Atur nama institusi, akses admin pertama, dan preferensi sistem.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-[-120px] h-[420px] w-[420px] rounded-full bg-purple-500 opacity-20 blur-[120px]" />
        <div className="absolute right-[-120px] top-24 h-[360px] w-[360px] rounded-full bg-purple-600 opacity-15 blur-[120px]" />
        <div className="absolute bottom-[-200px] left-1/3 h-[520px] w-[520px] rounded-full bg-purple-700 opacity-10 blur-[160px]" />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-24 pt-32 md:px-10 md:pt-40">
        <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <span className="inline-flex w-fit items-center rounded-full border border-purple-500 bg-purple-900/40 px-4 py-1 text-xs uppercase tracking-[0.3em] text-purple-300 font-medium">
              Dokumentasi Awal Menjadi Produk
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl font-[var(--font-display)]">
              Platform e-learning yang rapi, cepat dioperasikan, dan siap menarik
              banyak pelanggan.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-purple-200">
              OTW Platform merangkum kebutuhan sekolah, kampus, dan lembaga
              pelatihan: manajemen kursus, user, konten, dan progres belajar
              dengan kontrol role yang jelas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#install"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.3)] transition hover:shadow-[0_15px_35px_rgba(124,58,237,0.4)]"
              >
                Mulai Instalasi
              </Link>
              <Link
                href="#fitur"
                className="inline-flex items-center justify-center rounded-full border-2 border-purple-400 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-800 hover:border-purple-300"
              >
                Lihat Fitur
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "4 role utama", value: "Root, Admin, Guru, Siswa" },
                { label: "2 opsi database", value: "Firebase atau MySQL" },
                { label: "Open source", value: "Siap dikembangkan" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-purple-600 bg-purple-900/30 px-4 py-3 text-sm text-purple-100 shadow-sm hover:shadow-md transition"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-purple-300 font-medium">
                    {item.label}
                  </div>
                  <div className="mt-1 font-semibold text-white">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-8 h-16 w-16 rounded-2xl border border-purple-600 bg-purple-900/50 shadow-md animate-[float-slow_8s_ease-in-out_infinite]" />
            <div className="rounded-[32px] border border-purple-600 bg-purple-900/30 p-6 shadow-lg animate-[fade-up_0.8s_ease-out]">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-purple-300 font-medium">
                  Dashboard Preview
                </span>
                <span className="rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1 text-xs font-semibold text-white">
                  Live
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  "Ringkasan progres belajar",
                  "Kursus aktif dan akses cepat",
                  "Pengelolaan user dan perizinan",
                  "Analitik hasil kuis dan materi",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-purple-600 bg-purple-900/40 px-4 py-3 text-sm text-purple-100"
                  >
                    <span className="flex h-2.5 w-2.5 rounded-full bg-purple-400" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-gradient-to-r from-purple-800 to-purple-900 px-5 py-4 text-sm text-white">
                Kontrol akses berbasis role menampilkan fitur khusus untuk setiap
                pengguna.
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-400 font-medium">
              Fitur Utama
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl font-[var(--font-display)]">
              Semua fitur penting dari dokumentasi awal sudah siap ditampilkan.
            </h2>
            <p className="max-w-2xl text-base text-purple-200">
              Fokus pada kebutuhan inti institusi: kelola user, kursus, konten,
              hingga monitoring progres dengan alur yang jelas.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-purple-600 bg-purple-900/30 p-6 shadow-sm hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-purple-200">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="role" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-400 font-medium">
              Role Management
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl font-[var(--font-display)]">
              Empat role dengan batasan yang jelas untuk kerja tim yang aman.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <div
                key={role.title}
                className="rounded-2xl border border-purple-600 bg-purple-900/40 p-5 hover:shadow-md transition"
              >
                <h3 className="text-base font-semibold text-white">
                  {role.title}
                </h3>
                <p className="mt-2 text-sm text-purple-200">{role.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="alur" className="mt-20">
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-400 font-medium">
              Alur Pengguna
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl font-[var(--font-display)]">
              Alur sederhana dari login hingga akses dashboard.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflow.map((step, index) => (
              <div
                key={step.title}
                className="rounded-3xl border border-purple-600 bg-purple-900/30 p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-700 text-base font-semibold text-purple-300">
                  {index + 1}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-purple-200">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="install" className="mt-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-purple-400 font-medium">
                Instalasi & Open Source
              </p>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl font-[var(--font-display)]">
                Siap dijadikan proyek open source dengan instalasi yang mudah.
              </h2>
              <p className="text-base text-purple-200">
                Kamu menginginkan halaman instalasi seperti Moodle? Platform ini
                sudah didesain agar onboarding pengguna dan tim IT berjalan
                mulus. Pilihan database fleksibel sejak awal.
              </p>
              <div className="rounded-3xl border border-purple-500 bg-gradient-to-br from-purple-600 to-purple-700 p-6 text-sm text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-purple-300 font-medium">
                  Open Source Ready
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Dokumentasi instalasi dan kontribusi siap dipublikasikan.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {installSteps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-purple-600 bg-purple-900/30 p-6 shadow-sm hover:shadow-md transition"
                >
                  <h3 className="text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-purple-200">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 rounded-[32px] border border-purple-600 bg-purple-900/30 p-10 text-center shadow-lg">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl font-[var(--font-display)]">
            Siap menarik lebih banyak pelanggan dengan platform yang terlihat
            profesional.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-purple-200">
            Semua fitur dari dokumentasi awal sudah diterjemahkan menjadi narasi
            bisnis yang jelas. Tinggal lanjut ke halaman demo dan dokumentasi.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="#install"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.3)] transition hover:shadow-[0_15px_35px_rgba(124,58,237,0.4)]"
            >
              Lihat Instalasi
            </Link>
            <Link
              href="#fitur"
              className="inline-flex items-center justify-center rounded-full border-2 border-purple-400 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-800 hover:border-purple-300"
            >
              Telusuri Fitur
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
