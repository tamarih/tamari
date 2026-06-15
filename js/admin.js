// ============================================================
// Admin page - product CRUD
// ============================================================

let products = [];
let editingId = null;

// ---------- Auth ----------
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        document.getElementById("auth-gate").style.display = "none";
        document.getElementById("admin-main").style.display = "";
        document.getElementById("logout-link").style.display = "";
        loadProducts();
    } else {
        document.getElementById("auth-gate").style.display = "";
        document.getElementById("admin-main").style.display = "none";
        document.getElementById("logout-link").style.display = "none";
    }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        showToast("התחברות נכשלה: " + error.message, "error");
    } else {
        showToast("התחברת בהצלחה");
        checkAuth();
    }
});

document.getElementById("logout-link").addEventListener("click", async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signOut();
    checkAuth();
});

// ---------- Load & render ----------
async function loadProducts() {
    const container = document.getElementById("table-container");
    container.innerHTML = `<div class="loader">טוען...</div>`;
    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
    if (error) {
        container.innerHTML = `<div class="empty-state"><h3>שגיאת טעינה</h3><p>${error.message}</p></div>`;
        return;
    }
    products = data || [];
    populateCategories();
    renderTable();
}

function populateCategories() {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    const filter = document.getElementById("category-filter");
    filter.innerHTML = '<option value="">כל הקטגוריות</option>' +
        cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    const dl = document.getElementById("cat-list");
    dl.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join("");
}

function renderTable() {
    const term = document.getElementById("search").value.trim().toLowerCase();
    const cat  = document.getElementById("category-filter").value;
    const filtered = products.filter(p => {
        if (cat && p.category !== cat) return false;
        if (term) {
            const haystack = `${p.name} ${p.sku}`.toLowerCase();
            if (!haystack.includes(term)) return false;
        }
        return true;
    });

    const container = document.getElementById("table-container");
    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state"><h3>אין מוצרים</h3><p>לחץ "+ הוסף מוצר חדש" כדי להתחיל</p></div>`;
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>תמונה</th>
                    <th>מק"ט</th>
                    <th>שם</th>
                    <th>קטגוריה</th>
                    <th>מחיר ספק</th>
                    <th>+ מע"מ</th>
                    <th>מחיר מכירה</th>
                    <th>רווח</th>
                    <th>אחוז רווח</th>
                    <th>מלאי</th>
                    <th>פעולות</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(rowHtml).join("")}
            </tbody>
        </table>`;
}

function rowHtml(p) {
    const prices = calcPrices(p.supplier_price, p.vat_rate, p.margin_rate, p.manual_sale_price);
    const img = p.image_url
        ? `<img class="thumb" src="${escapeHtml(p.image_url)}" alt="">`
        : `<div class="thumb"></div>`;
    const marker = prices.isManualPrice ? '<small style="color:#ed8936" title="מחיר ידני">✎</small>' : '';
    return `
        <tr>
            <td>${img}</td>
            <td>${escapeHtml(p.sku)}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.category || "")}</td>
            <td class="price-cell">${formatPrice(prices.supplier)}</td>
            <td class="price-cell">${formatPrice(prices.withVat)}</td>
            <td class="price-cell"><strong>${formatPrice(prices.salePrice)}</strong> ${marker}</td>
            <td class="price-cell profit-positive">${formatPrice(prices.profit)}</td>
            <td class="price-cell">${prices.effectiveMarginPct}%</td>
            <td>${p.stock_qty ?? "—"}</td>
            <td>
                <div class="admin-actions">
                    <button class="btn btn-ghost btn-sm" onclick="editProduct(${p.id})">ערוך</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">מחק</button>
                </div>
            </td>
        </tr>`;
}

// ---------- Modal ----------
function openModal(title = "הוסף מוצר") {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("product-modal").classList.add("active");
}
function closeModal() {
    document.getElementById("product-modal").classList.remove("active");
    document.getElementById("product-form").reset();
    document.getElementById("product-id").value = "";
    document.getElementById("current-image").textContent = "";
    editingId = null;
    updatePricePreview();
}

document.getElementById("add-btn").addEventListener("click", () => {
    closeModal();
    document.getElementById("product-modal").classList.add("active");
    document.getElementById("modal-title").textContent = "הוסף מוצר חדש";
});

function editProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    document.getElementById("product-id").value = id;
    document.getElementById("f-sku").value = p.sku || "";
    document.getElementById("f-name").value = p.name || "";
    document.getElementById("f-description").value = p.description || "";
    document.getElementById("f-category").value = p.category || "";
    document.getElementById("f-supplier-price").value = p.supplier_price || 0;
    document.getElementById("f-manual-sale-price").value = p.manual_sale_price ?? "";
    document.getElementById("f-stock").value = p.stock_qty ?? "";
    document.getElementById("f-print-area").value = p.print_area || "";
    document.getElementById("f-press-time").value = p.press_time || "";
    document.getElementById("f-press-temp").value = p.press_temp || "";
    document.getElementById("f-notes").value = p.notes || "";
    document.getElementById("current-image").textContent =
        p.image_url ? "תמונה קיימת - בחר תמונה חדשה כדי להחליף" : "";
    updatePricePreview();
    openModal("עריכת מוצר");
}

async function deleteProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`למחוק את "${p.name}"?`)) return;
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) {
        showToast("שגיאה במחיקה: " + error.message, "error");
    } else {
        showToast("המוצר נמחק");
        loadProducts();
    }
}

async function saveProduct() {
    const form = document.getElementById("product-form");
    if (!form.reportValidity()) return;

    const manualPriceRaw = document.getElementById("f-manual-sale-price").value.trim();
    const payload = {
        sku: document.getElementById("f-sku").value.trim(),
        name: document.getElementById("f-name").value.trim(),
        description: document.getElementById("f-description").value.trim() || null,
        category: document.getElementById("f-category").value.trim() || null,
        supplier_price: parseFloat(document.getElementById("f-supplier-price").value) || 0,
        manual_sale_price: manualPriceRaw === "" ? null : parseFloat(manualPriceRaw),
        vat_rate: VAT_RATE,
        margin_rate: MARGIN_RATE,
        stock_qty: parseInt(document.getElementById("f-stock").value) || null,
        print_area: document.getElementById("f-print-area").value.trim() || null,
        press_time: document.getElementById("f-press-time").value.trim() || null,
        press_temp: document.getElementById("f-press-temp").value.trim() || null,
        notes: document.getElementById("f-notes").value.trim() || null,
    };

    // Handle image upload
    const imgFile = document.getElementById("f-image").files[0];
    if (imgFile) {
        const ext = imgFile.name.split(".").pop();
        const path = `${payload.sku || Date.now()}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseClient.storage
            .from("product-images")
            .upload(path, imgFile, { upsert: true });
        if (upErr) {
            showToast("שגיאה בהעלאת תמונה: " + upErr.message, "error");
            return;
        }
        const { data: { publicUrl } } = supabaseClient.storage
            .from("product-images").getPublicUrl(path);
        payload.image_url = publicUrl;
    }

    let result;
    if (editingId) {
        result = await supabaseClient.from("products").update(payload).eq("id", editingId);
    } else {
        result = await supabaseClient.from("products").insert(payload);
    }

    if (result.error) {
        showToast("שגיאה בשמירה: " + result.error.message, "error");
    } else {
        showToast(editingId ? "המוצר עודכן" : "המוצר נוסף");
        closeModal();
        loadProducts();
    }
}

// ---------- Live price preview ----------
function updatePricePreview() {
    const supplier = parseFloat(document.getElementById("f-supplier-price").value) || 0;
    const manualRaw = document.getElementById("f-manual-sale-price").value.trim();
    const manual = manualRaw === "" ? null : parseFloat(manualRaw);
    const prices = calcPrices(supplier, VAT_RATE, MARGIN_RATE, manual);

    document.getElementById("pv-with-vat").textContent = formatPrice(prices.withVat);
    const saleEl = document.getElementById("pv-sale");
    saleEl.textContent = formatPrice(prices.salePrice);
    saleEl.style.color = prices.isManualPrice ? "#ed8936" : "";
    document.getElementById("pv-profit").textContent = formatPrice(prices.profit);
    const pctEl = document.getElementById("pv-margin-pct");
    pctEl.textContent = prices.effectiveMarginPct + "%";
    pctEl.style.color = prices.profit < 0 ? "#e53e3e" : "";
}
document.getElementById("f-supplier-price").addEventListener("input", updatePricePreview);
document.getElementById("f-manual-sale-price").addEventListener("input", updatePricePreview);

// ---------- Search/filter ----------
document.getElementById("search").addEventListener("input", renderTable);
document.getElementById("category-filter").addEventListener("change", renderTable);

// ---------- Helpers ----------
function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// Expose for inline onclick
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeModal = closeModal;
window.saveProduct = saveProduct;

checkAuth();
