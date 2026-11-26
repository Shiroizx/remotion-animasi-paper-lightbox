# Panduan Naskah & Voice ElevenLabs v4 (Paper-cut Lightbox)

## Expressive Audio Tags Resmi Eleven v4
Sisipkan tag berikut di dalam kurung siku `[...]` tepat sebelum kalimat/frasa yang membutuhkan perubahan emosi:
- `[curious]` — nada bertanya penuh rasa ingin tahu (cocok untuk Hook pembuka).
- `[warm]` / `[gentle]` — nada bertutur hangat dan intim seperti pencerita di balik lampu meja.
- `[serious]` / `[dramatic]` — nada bercerita berwibawa dan puitis saat adegan berpindah skala.
- `[tense]` / `[ominous]` — suasana tegang, misterius, atau ketika cahaya mulai meredup.
- `[sighs]` / `[somber]` — helaan napas tenang, sendu, rindu, atau kehilangan.
- `[whispers]` — bisikan halus untuk rahasia di balik jendela atau tepat sebelum jeda sunyi lampu mati.
- `[confident]` — nada mantap dan tenang untuk kalimat penutup / *cliffhanger*.

## Aturan Penulisan Naskah
1. **Panjang Ideal:** 95–125 kata (menghasilkan durasi VO ~45–55 detik pada tempo bertutur tenang, sehingga menyisakan ruang untuk intro cahaya lampu menyala, 2 *Hard Silence Beats*, dan *Title Card* penutup 4 detik agar total durasi video berada di kisaran 50–65 detik).
2. **Jeda Dramatis & Paragraf (Wajib Dilongkap 1 Baris):** Pada bagian *Naskah Siap Salin*, wajib pisahkan setiap segmen adegan dengan **1 baris kosong (`Enter` 2x)** agar ElevenLabs v4 memberi jeda napas alami antar-adegan dan memudahkan pemetaan *timeline* Remotion via FFmpeg `silencedetect`.
3. **Pelafalan Bahasa Asing / Istilah Khusus:** Pecah suku kata nama atau istilah non-Indonesia dengan tanda hubung (misalnya `La-ter-na`, `Val-ha-lla`, `Hi-ka-ri`, `A-ra-shi`) agar `Language: Auto` di Eleven v4 tidak salah membaca vokal.
4. **Anti AI-Slop Copywriting (Wajib):**
   - Tulis dengan gaya tutur *storyteller* di ruang tenang—konkret, puitis tapi tidak lebay, dan langsung membimbing mata penonton ke cahaya atau lapisan kertas berikutnya.
   - **DILARANG** memakai frasa klise AI seperti *"menebar teror tanpa henti"*, *"tak ingin alam semesta binasa"*, *"bayangkan jika..."*, pertanyaan retoris murahan (*"bagaimana nasibnya?"* / *"kira-kira apa yang terjadi..."*), maupun kata sifat berlebih (*"sangat luar biasa"*, *"begitu menakjubkan"*).

## Rekomendasi Karakter Suara (Voice) Eleven v4
Untuk *Paper-cut Lightbox*, utamakan suara yang terasa **akrab, hangat, dan bercerita di meja kerja** (*storyteller at a table*), bukan penyiar berita kaku:
1. **Narator Pria Hangat & Puitis (Rekomendasi Utama):** `Brian`, `George`, atau `Daniel` (artikulasi jelas, lembut di frekuensi bawah, sangat cocok untuk fabel, sejarah tenang, dan kisah perjalanan).
2. **Narator Pria Epik & Dalam:** `Callum` atau `Raunak M` (cocok untuk mitologi atau legenda dengan transisi `[whispers]` ke `[dramatic]`).
3. **Narator Wanita Intim & Ekspresif:** `Aria` atau `Charlotte` (cocok untuk dongeng, kenangan keluarga, atau sudut pandang tokoh utama wanita).
4. **Custom Voice Design v4:** Jika pengguna ingin suara khas baru, berikan *prompt* deskripsi karakter suara dalam bahasa Inggris untuk fitur **Try Voice Design for v4** (misalnya: *"Warm, unhurried late-night storyteller at a wooden desk, gentle rasp, intimate studio mic, calm pacing"*).
