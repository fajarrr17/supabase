const SUPABASE_URL = "https://qabxqupenayqnmvysprn.supabase.co";
const SUPABASE_KEY = "sb_publishable_j-orMv9Wfz5t21Z7JRjbyA_sVuvUCrA";
const ADMIN_EMAIL = "busa5073@gmail.com";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const pesan = document.getElementById("pesan");
const daftarPesanan = document.getElementById("daftarPesanan");

let semuaPesanan = [];
let sedangMemuat = false;

const daftarStatus = [
  "Baru",
  "Diproses",
  "Dikirim",
  "Selesai"
];

function tampilkanDashboard(aktif) {
  loginBox.classList.toggle("hidden", aktif);
  dashboard.classList.toggle("hidden", !aktif);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function periksaAdmin() {
  const { data, error } = await db.auth.getSession();

  if (error || !data.session) {
    tampilkanDashboard(false);
    return false;
  }

  if (
    data.session.user.email?.toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {
    await db.auth.signOut();
    tampilkanDashboard(false);
    pesan.textContent = "Akun ini bukan akun admin.";
    return false;
  }

  tampilkanDashboard(true);
  return true;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  pesan.textContent = "Memeriksa akun...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    pesan.textContent = "Email bukan email admin.";
    return;
  }

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    pesan.textContent = "Login gagal. Periksa email dan password.";
    return;
  }

  if (await periksaAdmin()) {
    await muatPesanan();
  }
});

function tampilkanRingkasan() {
  document.getElementById("totalPesanan").textContent =
    semuaPesanan.length;

  document.getElementById("pesananBaru").textContent =
    semuaPesanan.filter(p => p.status === "Baru").length;

  document.getElementById("pesananSelesai").textContent =
    semuaPesanan.filter(p => p.status === "Selesai").length;
}

function tampilkanDaftar() {
  const kata = document
    .getElementById("cariPesanan")
    .value.trim().toLowerCase();

  const hasil = semuaPesanan.filter(p =>
    String(p.customer_name ?? "").toLowerCase().includes(kata) ||
    String(p.food_name ?? "").toLowerCase().includes(kata) ||
    String(p.phone ?? "").toLowerCase().includes(kata)
  );

  if (hasil.length === 0) {
    daftarPesanan.replaceChildren();

    pesan.textContent = kata
      ? "Tidak ada pesanan yang cocok dengan pencarian."
      : "Belum ada pesanan.";

    return;
  }

  daftarPesanan.innerHTML = hasil.map(order => {
    const pilihanStatus = daftarStatus.map(status => `
      <option value="${status}"
        ${order.status === status ? "selected" : ""}>
        ${status}
      </option>
    `).join("");

    return `
      <tr>
        <td>${escapeHTML(
          new Date(order.created_at).toLocaleString("id-ID")
        )}</td>

        <td>${escapeHTML(order.customer_name)}</td>

        <td>
          ${escapeHTML(order.phone)}<br>
          ${escapeHTML(order.address)}
        </td>

        <td>
          ${escapeHTML(order.food_name)}<br>
          ${escapeHTML(order.quantity)} pcs
        </td>

        <td>
          <select data-id="${escapeHTML(order.id)}"
                  aria-label="Status pesanan">
            ${pilihanStatus}
          </select>

          <button data-save="${escapeHTML(order.id)}">
            Simpan
          </button>
        </td>
      </tr>
    `;
  }).join("");

  pesan.textContent =
    `Menampilkan ${hasil.length} dari ${semuaPesanan.length} pesanan.`;
}

async function muatPesanan() {
  if (sedangMemuat) return;
  if (!(await periksaAdmin())) return;

  sedangMemuat = true;
  pesan.textContent = "Memuat pesanan...";

  try {
    const { data, error } = await db
      .from("orders")
      .select(
        "id, created_at, customer_name, phone, address, food_name, quantity, status"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    semuaPesanan = data ?? [];
    tampilkanRingkasan();
    tampilkanDaftar();
  } catch (error) {
    console.error("Gagal memuat pesanan:", error);
    pesan.textContent = "Gagal memuat pesanan. Periksa koneksi database.";
  } finally {
    sedangMemuat = false;
  }
}

daftarPesanan.addEventListener("click", async event => {
  const tombol = event.target.closest("button[data-save]");
  if (!tombol) return;

  if (!(await periksaAdmin())) return;

  const id = tombol.dataset.save;
  const select = [...daftarPesanan.querySelectorAll("select[data-id]")]
    .find(item => item.dataset.id === id);

  if (!select) return;

  const status = select.value;

  if (!daftarStatus.includes(status)) {
    pesan.textContent = "Status tidak valid.";
    return;
  }

  tombol.disabled = true;
  pesan.textContent = "Menyimpan status...";

  try {
    const { data, error } = await db
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("Tidak ada pesanan yang berhasil diperbarui.");
    }

    pesan.textContent = "Status pesanan berhasil diperbarui.";
    await muatPesanan();
  } catch (error) {
    console.error("Gagal memperbarui status:", error);
    pesan.textContent =
      "Status gagal diperbarui. Periksa izin UPDATE di Supabase.";
  } finally {
    tombol.disabled = false;
  }
});

document.getElementById("cariPesanan").addEventListener(
  "input", tampilkanDaftar
);

document.getElementById("refreshBtn").addEventListener(
  "click", muatPesanan
);

document.getElementById("logoutBtn").addEventListener(
  "click", async () => {
    await db.auth.signOut();
    semuaPesanan = [];
    daftarPesanan.replaceChildren();
    tampilkanRingkasan();
    tampilkanDashboard(false);
    pesan.textContent = "Kamu sudah logout.";
  }
);

periksaAdmin().then(aktif => {
  if (aktif) muatPesanan();
});