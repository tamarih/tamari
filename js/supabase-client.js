// ============================================================
// Supabase Configuration
// ============================================================
// IMPORTANT: Replace these two values with your project's values.
// Get them from: Supabase Dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL  = "https://sviudpjkhvfoxmggdlyx.supabase.co";
const SUPABASE_ANON = "sb_publishable_a94W_Hvm4bDao27bpnAhXQ_u2WF7h7X";

// VAT % and margin % — change here if rates change in the future
const VAT_RATE    = 18;
const MARGIN_RATE = 30;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// Price calculations (single source of truth)
// ============================================================
// If manualSalePrice is set (truthy positive number), it overrides the
// auto +marginRate% calculation, and effectiveMarginPct is the real %.
// ============================================================
function calcPrices(supplierPrice, vatRate = VAT_RATE, marginRate = MARGIN_RATE, manualSalePrice = null) {
    const supplier = Number(supplierPrice) || 0;
    const withVat  = supplier * (1 + vatRate / 100);

    const manual = Number(manualSalePrice);
    const hasManual = manual && manual > 0;

    const salePrice = hasManual ? manual : withVat * (1 + marginRate / 100);
    const profit    = salePrice - withVat;
    const effectiveMarginPct = withVat > 0 ? (profit / withVat) * 100 : 0;

    return {
        supplier:           round2(supplier),
        withVat:            round2(withVat),
        salePrice:          round2(salePrice),
        profit:             round2(profit),
        effectiveMarginPct: round2(effectiveMarginPct),
        isManualPrice:      hasManual,
    };
}

function round2(n) { return Math.round(n * 100) / 100; }

function formatPrice(n) {
    return new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        minimumFractionDigits: 2,
    }).format(n);
}

// Toast helper
function showToast(message, type = "success") {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 3000);
}
