const SUPABASE_URL = "https://qabxqupenayqnmvysprn.supabase.co";
const SUPABASE_KEY = "sb_publishable_j-orMv9Wfz5t21Z7JRjbyA_sVuvUCrA";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const form = document.getElementById("orderForm");
const pesan = document.getElementById("pesan");

const hargaMakanan = {
  "Nasi Ayam": 15000,
  "Rice Bowl": 18000
};

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  const tombol = form.querySelector('button[type="submit"]');
  tombol.disabled = true;
  pesan.textContent = "Menyimpan pesanan...";

  const dataPesanan = {
    customer_name: document.getElementById("nama").value.trim(),
    phone: document.getElementById("telepon").value.trim(),
    address: document.getElementById("alamat").value.trim(),
    food_name: document.getElementById("makanan").value,
    quantity: Number(document.getElementById("jumlah").value)
  };

  try {
    if (
      !dataPesanan.customer_name ||
      !dataPesanan.phone ||
      !dataPesanan.address ||
      !Number.isInteger(dataPesanan.quantity) ||
      dataPesanan.quantity < 1
    ) {
      throw new Error("Mohon periksa kembali formulir pesanan.");
    }

    const { error } = await db
      .from("orders")
      .insert([dataPesanan]);

    if (error) throw error;

    const total =
      hargaMakanan[dataPesanan.food_name] *
      dataPesanan.quantity;

    pesan.textContent =
      "Pesanan berhasil disimpan! Total sementara: Rp" +
      total.toLocaleString("id-ID");

    form.reset();
  } catch (error) {
    console.error("Gagal menyimpan pesanan:", error);
    pesan.textContent =
      "Pesanan belum berhasil disimpan. Silakan coba lagi.";
  } finally {
    tombol.disabled = false;
  }
});