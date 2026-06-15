// ============================================================
// Admin page - product CRUD
// ============================================================

let products = [];
let editingId = null;
let sortBy = null;        // column key
let sortDir = "asc";      // "asc" | "desc"

// Map sort key -> function(product) returning sortable value
const SORT_KEYS = {
    sku:        p => p.sku || "",
    name:       p => p.name || "",
    category:   p => p.category || "",
    supplier:   p => Number(p.supplier_price) || 0,
    withVat:    p => calcPrices(p.supplier_price, p.vat_rate, p.margin_rate, p.manual_sale_price).withVat,
    salePrice:  p => calcPrices(p.supplier_price, p.vat_rate, p.margin_rate, p.manual_sale_price).salePrice,
    profit:     p => calcPrices(p.supplier_price, p.vat_rate, p.margin_rate, p.manual_sale_price).profit,
    marginPct:  p => calcPrices(p.supplier_price, p.vat_rate, p.margin_rate, p.manual_sale_price).effectiveMarginPct,
    stock:      p => p.stock_qty ?? -1,
};

function toggleSort(key) {
    if (sortBy === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
        sortBy = key;
        sortDir = "asc";
    }
    renderTable();
}
window.toggleSort = toggleSort;

function applySort(rows) {
    if (!sortBy || !SORT_KEYS[sortBy]) return rows;
    const fn = SORT_KEYS[sortBy];
    const mult = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
        const va = fn(a), vb = fn(b);
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * mult;
        return String(va).localeCompare(String(vb), "he") * mult;
    });
}

function sortIcon(key) {
    if (sortBy !== key) return '<span class="sort-icon">⇅</span>';
    return sortDir === "asc"
        ? '<span class="sort-icon active">▲</span>'
        : '<span class="sort-icon active">▼</span>';
}

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

    const sorted = applySort(filtered);

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>תמונה</th>
                    <th class="sortable" onclick="toggleSort('sku')">מק"ט ${sortIcon('sku')}</th>
                    <th class="sortable" onclick="toggleSort('name')">שם ${sortIcon('name')}</th>
                    <th class="sortable" onclick="toggleSort('category')">קטגוריה ${sortIcon('category')}</th>
                    <th class="sortable" onclick="toggleSort('supplier')">מחיר ספק ${sortIcon('supplier')}</th>
                    <th class="sortable" onclick="toggleSort('withVat')">+ מע"מ ${sortIcon('withVat')}</th>
                    <th class="sortable" onclick="toggleSort('salePrice')">מחיר מכירה ${sortIcon('salePrice')}</th>
                    <th class="sortable" onclick="toggleSort('profit')">רווח ${sortIcon('profit')}</th>
                    <th class="sortable" onclick="toggleSort('marginPct')">אחוז רווח ${sortIcon('marginPct')}</th>
                    <th class="sortable" onclick="toggleSort('stock')">מלאי ${sortIcon('stock')}</th>
                    <th>פעולות</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(rowHtml).join("")}
            </tbody>
        </table>`;
    attachRowDragHandlers();
}

// ---------- Drag & drop image upload onto rows ----------
function attachRowDragHandlers() {
    document.querySelectorAll('.admin-table tbody tr[data-sku]').forEach(tr => {
        tr.addEventListener('dragover', (e) => {
            // Only react if user is dragging a file
            if (e.dataTransfer && [...(e.dataTransfer.items || [])].some(it => it.kind === 'file')) {
                e.preventDefault();
                tr.classList.add('drag-over');
            }
        });
        tr.addEventListener('dragleave', () => tr.classList.remove('drag-over'));
        tr.addEventListener('drop', async (e) => {
            e.preventDefault();
            tr.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (!file || !file.type.startsWith('image/')) {
                showToast('אנא גררי קובץ תמונה', 'error');
                return;
            }
            const sku = tr.dataset.sku;
            const id  = parseInt(tr.dataset.id);
            tr.classList.add('uploading');
            try {
                await uploadImageForProduct(id, sku, file);
                showToast(`תמונה הועלתה למוצר ${sku}`);
                await loadProducts();
            } catch (err) {
                showToast('שגיאה: ' + err.message, 'error');
            } finally {
                tr.classList.remove('uploading');
            }
        });
    });
}

async function uploadImageForProduct(productId, sku, file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `products/${sku.replace(/[^\w-]/g, '_')}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseClient.storage
        .from('product-images')
        .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabaseClient.storage
        .from('product-images').getPublicUrl(path);
    const { error: dbErr } = await supabaseClient
        .from('products').update({ image_url: publicUrl }).eq('id', productId);
    if (dbErr) throw dbErr;
}

function rowHtml(p) {
    const prices = calcPrices(p.supplier_price, p.vat_rate, p.margin_rate, p.manual_sale_price);
    const img = p.image_url
        ? `<img class="thumb" src="${escapeHtml(p.image_url)}" alt="">`
        : `<div class="thumb"></div>`;
    const marker = prices.isManualPrice ? '<small style="color:#ed8936" title="מחיר ידני">✎</small>' : '';
    return `
        <tr data-sku="${escapeHtml(p.sku)}" data-id="${p.id}" title="גררי תמונה לכאן להעלאה מהירה">
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

// ---------- Drag & drop into the modal image dropzone ----------
(function setupModalDropzone() {
    const zone = document.getElementById("image-dropzone");
    if (!zone) return;
    zone.addEventListener("dragover", (e) => {
        if (e.dataTransfer && [...(e.dataTransfer.items || [])].some(it => it.kind === "file")) {
            e.preventDefault();
            zone.classList.add("drag-over");
        }
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("drag-over");
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        // Assign the dropped file to the file input via DataTransfer
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById("f-image").files = dt.files;
        document.getElementById("current-image").textContent = `נבחר: ${file.name}`;
    });
})();

// ---------- Search/filter ----------
const searchInput = document.getElementById("search");
const clearBtn = document.getElementById("clear-search");

function updateClearVisibility() {
    if (clearBtn) clearBtn.classList.toggle("visible", searchInput.value.length > 0);
}
function clearSearch() {
    searchInput.value = "";
    document.getElementById("category-filter").value = "";
    updateClearVisibility();
    renderTable();
    searchInput.focus();
}

searchInput.addEventListener("input", () => { updateClearVisibility(); renderTable(); });
searchInput.addEventListener("keydown", (e) => { if (e.key === "Escape") clearSearch(); });
if (clearBtn) clearBtn.addEventListener("click", clearSearch);
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
