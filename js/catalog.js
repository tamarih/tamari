// ============================================================
// Catalog page - public product browsing
// ============================================================

let allProducts = [];

async function loadProducts() {
    const container = document.getElementById("products-container");
    try {
        const { data, error } = await supabaseClient
            .from("products")
            .select("*")
            .eq("is_active", true)
            .order("category", { ascending: true })
            .order("name", { ascending: true });

        if (error) throw error;

        allProducts = data || [];
        populateCategories(allProducts);
        render(allProducts);
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="empty-state">
                <h3>לא ניתן לטעון מוצרים</h3>
                <p>בדוק את חיבור ה-Supabase בקובץ <code>js/supabase-client.js</code></p>
                <p style="margin-top:.5rem;font-size:.85rem;color:#999">${err.message || err}</p>
            </div>`;
    }
}

function populateCategories(products) {
    const select = document.getElementById("category-filter");
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    cats.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

function render(products) {
    const container = document.getElementById("products-container");
    const count = document.getElementById("results-count");
    count.textContent = `${products.length} מוצרים`;

    if (!products.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>אין מוצרים להצגה</h3>
                <p>הוסף מוצרים דרך עמוד הניהול</p>
            </div>`;
        return;
    }

    container.innerHTML = products.map(p => {
        const prices = calcPrices(p.supplier_price, p.vat_rate, p.margin_rate, p.manual_sale_price);
        const img = p.image_url
            ? `<img class="product-image" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`
            : `<div class="product-image"></div>`;
        return `
            <article class="product-card">
                ${img}
                <div class="product-body">
                    ${p.category ? `<span class="product-category">${escapeHtml(p.category)}</span>` : ""}
                    <div class="product-sku">מק"ט: ${escapeHtml(p.sku)}</div>
                    <h3 class="product-name">${escapeHtml(p.name)}</h3>
                    ${p.description ? `<p class="product-desc">${escapeHtml(p.description)}</p>` : ""}
                    <div class="product-price">
                        ${formatPrice(prices.salePrice)}
                        <small>כולל מע"מ</small>
                    </div>
                </div>
            </article>`;
    }).join("");
}

function applyFilters() {
    const term = document.getElementById("search").value.trim().toLowerCase();
    const cat  = document.getElementById("category-filter").value;

    const filtered = allProducts.filter(p => {
        if (cat && p.category !== cat) return false;
        if (term) {
            const haystack = `${p.name} ${p.sku} ${p.description || ""}`.toLowerCase();
            if (!haystack.includes(term)) return false;
        }
        return true;
    });
    render(filtered);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

const searchInput = document.getElementById("search");
const clearBtn = document.getElementById("clear-search");

function updateClearVisibility() {
    if (clearBtn) clearBtn.classList.toggle("visible", searchInput.value.length > 0);
}
function clearSearch() {
    searchInput.value = "";
    document.getElementById("category-filter").value = "";
    updateClearVisibility();
    applyFilters();
    searchInput.focus();
}

searchInput.addEventListener("input", () => { updateClearVisibility(); applyFilters(); });
searchInput.addEventListener("keydown", (e) => { if (e.key === "Escape") clearSearch(); });
if (clearBtn) clearBtn.addEventListener("click", clearSearch);
document.getElementById("category-filter").addEventListener("change", applyFilters);

loadProducts();
