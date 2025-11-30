/* ===========================================================
   إعدادات عامة
=========================================================== */
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/16UpwnVL3xlT2B3oxpdA4ZiTiy3-WK9Iotg6XlnBGY3M/export?format=csv";

const CURRENCY = "EGP";
const WHATSAPP_NUMBER = "201224036925"; // بدون +

/* مفاتيح التخزين */
const CART_KEY = "bq_cart_v1_dynamic";
const NOTE_KEY = "bq_note_v1_dynamic";

/* ===========================================================
   دالة تحميل CSV من Google Sheet
=========================================================== */
async function loadSheetCSV() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  return text;
}

/* ===========================================================
   دالة تحويل CSV إلى Array of Objects
=========================================================== */
function csvToArray(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue; // تجاهل السطر الفاضي

    const cols = line.split(",").map((c) => c.trim());

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });

    rows.push(obj);
  }

  return rows;
}

/* ===========================================================
   دالة تجهيز البيانات: parsing + filtering
=========================================================== */
function prepareMenuData_old(rows) {
  const final = [];

  rows.forEach((row) => {
    // تجاهل أي صنف غير Active
    if (String(row.active).trim() !== "1") return;

    // تجاهل أي سطر ناقص البيانات الأساسية
    if (!row.category_ar || !row.item_ar) return;

    // Parse sizes: "S,M,L"
    const sizes = row.sizes
      ? row.sizes.split("|").map((s) => s.trim())
      : ["STD"];

    // Parse prices: "10,15,20"
    const priceValues = row.prices
      ? row.prices.split("|").map((p) => Number(p.trim()))
      : [0];

    // تحويل الأحجام والأسعار إلى object
    const priceObj = {};
    sizes.forEach((s, i) => {
      priceObj[s] = priceValues[i] || 0;
    });

    final.push({
      category_ar: row.category_ar,
      category_en: row.category_en || row.category_ar,
      item_ar: row.item_ar,
      item_en: row.item_en || row.item_ar,
      sizesParsed: sizes,
      priceObj,
    });
  });

  return final;
}
function prepareMenuData(rows) {
  const final = [];

  rows.forEach((row) => {
    // تجاهل أي صنف غير Active
    if (String(row.active).trim() !== "1") return;

    // تجاهل أي سطر ناقص البيانات الأساسية
    if (!row.category_ar || !row.item_ar) return;

    // Parse sizes: "S|M|L"
    const sizes = row.sizes
      ? row.sizes.split("|").map((s) => s.trim())
      : ["STD"];

    // Parse prices: "20|18|22|25"
    const priceValues = row.prices
      ? row.prices.split("|").map((p) => Number(p.trim()))
      : [0];

    // تحويل الأسعار لأوبجكت مضبوط حسب index
    const priceObj = {};
    sizes.forEach((s, i) => {
      // هنا لو السعر ناقص، نخلي 0 — مش ناخد قيمة غلط
      priceObj[s] = Number(priceValues[i]) || 0;
    });

    final.push({
      category_ar: row.category_ar,
      category_en: row.category_en || row.category_ar,
      item_ar: row.item_ar,
      item_en: row.item_en || row.item_ar,
      sizesParsed: sizes,
      priceObj,
    });
  });

  return final;
}

/* ===========================================================
   Grouping حسب الكاتيجوري
=========================================================== */
function groupByCategory(preparedRows) {
  const result_ar = {};
  const result_en = {};

  preparedRows.forEach((row) => {
    // AR
    if (!result_ar[row.category_ar]) {
      result_ar[row.category_ar] = [];
    }
    result_ar[row.category_ar].push(row);

    // EN
    if (!result_en[row.category_en]) {
      result_en[row.category_en] = [];
    }
    result_en[row.category_en].push(row);
  });

  return {
    ar: result_ar,
    en: result_en,
  };
}

/* ===========================================================
   Build Menu Section (Arabic/English)
=========================================================== */
function buildMenu(container, groupedData, lang) {
  container.innerHTML = "";

  Object.keys(groupedData).forEach((category) => {
    const items = groupedData[category];
    if (!items || items.length === 0) return;

    const section = document.createElement("section");
    section.className = "card";

    const h2 = document.createElement("h2");
    h2.textContent = category;
    section.appendChild(h2);

    const ul = document.createElement("ul");
    ul.className = "list";

    items.forEach((row) => {
      const li = document.createElement("li");

      const nameAr = row.item_ar;
      const nameEn = row.item_en;

      li.dataset.nameAr = nameAr;
      li.dataset.nameEn = nameEn;

      /** اسم الصنف */
      const nameSpan = document.createElement("span");
      nameSpan.className = "item-name";
      nameSpan.textContent = lang === "ar" ? nameAr : nameEn;
      li.appendChild(nameSpan);

      /** Inline Row */
      const rowDiv = document.createElement("div");
      rowDiv.className = "row-inline";

      /** الحجم */
      const sizeSel = document.createElement("select");
      sizeSel.className = "size";

      row.sizesParsed.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        sizeSel.appendChild(opt);
      });

      /** الكمية */
      const qtyWrap = document.createElement("div");
      qtyWrap.className = "qty-wrap";

      const minusBtn = document.createElement("button");
      minusBtn.className = "qty-btn";
      minusBtn.textContent = "-";

      const qtySpan = document.createElement("span");
      qtySpan.className = "qty";
      qtySpan.textContent = "1";

      const plusBtn = document.createElement("button");
      plusBtn.className = "qty-btn";
      plusBtn.textContent = "+";

      minusBtn.onclick = () => {
        let q = Number(qtySpan.textContent) || 1;
        q = Math.max(1, q - 1);
        qtySpan.textContent = q;
      };

      plusBtn.onclick = () => {
        let q = Number(qtySpan.textContent) || 1;
        qtySpan.textContent = q + 1;
      };

      qtyWrap.appendChild(minusBtn);
      qtyWrap.appendChild(qtySpan);
      qtyWrap.appendChild(plusBtn);

      /** Price Chip */
      const priceChip = document.createElement("span");
      priceChip.className = "price-chip";

      function updatePriceChip() {
        const size = sizeSel.value;
        const unit = row.priceObj[size] || 0;
        priceChip.textContent =
          unit > 0 ? `${unit} ${CURRENCY}` : lang === "ar" ? "بدون سعر" : "No price";
      }

      sizeSel.onchange = updatePriceChip;
      updatePriceChip();

      /** Add Button */
      const addBtn = document.createElement("button");
      addBtn.className = "add-btn";
      addBtn.textContent = lang === "ar" ? "إضافة • Add" : "Add • إضافة";

      addBtn.onclick = () => {
        const size = sizeSel.value;
        const qty = Number(qtySpan.textContent) || 1;
        const unit = row.priceObj[size] || 0;

        addToCart({
          nameAr,
          nameEn,
          size,
          qty,
          unitPrice: unit,
        });
      };

      rowDiv.appendChild(sizeSel);
      rowDiv.appendChild(qtyWrap);
      rowDiv.appendChild(priceChip);
      rowDiv.appendChild(addBtn);

      li.appendChild(rowDiv);
      ul.appendChild(li);
    });

    section.appendChild(ul);
    container.appendChild(section);
  });
}
/* ===========================================================
   CART — State
=========================================================== */
let currentLang = "ar";
const cart = new Map(); // key: nameEn + "__" + size

/* ===========================================================
   Helpers
=========================================================== */
function formatCurrency(amount) {
  return `${amount.toFixed(0)} ${CURRENCY}`;
}

function getCartTotals() {
  let totalQty = 0;
  let totalAmount = 0;

  cart.forEach((item) => {
    totalQty += item.qty;
    totalAmount += item.qty * item.unitPrice;
  });

  return { totalQty, totalAmount };
}

/* ===========================================================
   Save / Load Cart & Notes
=========================================================== */
function saveCart() {
  const arr = Array.from(cart.values());
  localStorage.setItem(CART_KEY, JSON.stringify(arr));
}

function loadCart() {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return;

  try {
    const arr = JSON.parse(raw);
    arr.forEach((it) => {
      const key = it.nameEn + "__" + it.size;
      cart.set(key, {
        nameAr: it.nameAr,
        nameEn: it.nameEn,
        size: it.size,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
      });
    });
  } catch (e) {
    console.error("Cart load error", e);
  }
}

function saveNote() {
  localStorage.setItem(NOTE_KEY, note.value || "");
}

function loadNote() {
  const v = localStorage.getItem(NOTE_KEY);
  if (v) note.value = v;
}

/* ===========================================================
   Add / Remove / Clear
=========================================================== */
function addToCart(item) {
  const key = item.nameEn + "__" + item.size;

  if (cart.has(key)) {
    const ex = cart.get(key);
    ex.qty += item.qty;
    cart.set(key, ex);
  } else {
    cart.set(key, item);
  }

  saveCart();
  renderCart();
  pulseCart();
}

function clearCart() {
  cart.clear();
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(NOTE_KEY);
  note.value = "";
  renderCart();
}

/* ===========================================================
   Pulse Animation
=========================================================== */
function pulseCart() {
  const cartInner = document.getElementById("cart-inner");
  if (!cartInner) return;

  cartInner.classList.remove("pulse");
  void cartInner.offsetWidth; // reflow trick
  cartInner.classList.add("pulse");
}

/* ===========================================================
   Render Cart
=========================================================== */
function renderCart() {
  const cartCountEl = document.getElementById("cart-count");
  const cartTotalEl = document.getElementById("cart-total");
  const cartTotal2El = document.getElementById("cart-total-2");
  const cartSummaryEl = document.getElementById("cart-summary");
  const cartListEl = document.getElementById("cart-list");
  const cartTotalLine = document.getElementById("cart-total-line");


  const { totalQty, totalAmount } = getCartTotals();

  // update pills
  cartCountEl.textContent = String(totalQty);
  cartTotalEl.textContent = formatCurrency(totalAmount);
  cartTotal2El.textContent = formatCurrency(totalAmount);

  // summary text
  if (totalQty === 0) {
    cartSummaryEl.textContent =
      currentLang === "ar" ? "لا توجد عناصر مضافة بعد" : "No items yet";
  } else {
    const itemsCount = cart.size;
    if (currentLang === "ar") {
      cartSummaryEl.textContent = `${itemsCount} صنف / ${totalQty} مشروب`;
    } else {
      cartSummaryEl.textContent = `${itemsCount} item(s) / ${totalQty} drink(s)`;
    }
  }

  // Drawer list
  cartListEl.innerHTML = "";
  cart.forEach((item) => {
    const li = document.createElement("li");
    li.className = "cart-item";

    const name = currentLang === "ar" ? item.nameAr : item.nameEn;
    const sizeLabel = item.size !== "STD" ? ` (${item.size})` : "";
    const lineTotal = item.qty * item.unitPrice;

    const nameSpan = document.createElement("div");
    nameSpan.className = "name";
    nameSpan.textContent = name + sizeLabel;

    const qtySpan = document.createElement("div");
    // qtySpan.textContent = "x " + item.qty;

    const priceSpan = document.createElement("div");

if (item.unitPrice > 0) {
  priceSpan.textContent =
    `${item.qty} × ${item.unitPrice} = ${item.qty * item.unitPrice} ${CURRENCY}`;
} else {
  priceSpan.textContent =
    currentLang === "ar" ? "بدون سعر" : "No price";
}



    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = currentLang === "ar" ? "حذف" : "Remove";

    removeBtn.onclick = () => {
      const key = item.nameEn + "__" + item.size;
      cart.delete(key);
      saveCart();
      renderCart();
    };

    li.appendChild(nameSpan);
    li.appendChild(qtySpan);
    li.appendChild(priceSpan);
    li.appendChild(removeBtn);

    cartListEl.appendChild(li);
  });

  // Total line
  cartTotalLine.innerHTML =
    currentLang === "ar"
      ? `الإجمالي: <b id="cart-total-2">${formatCurrency(totalAmount)}</b>`
      : `Total: <b id="cart-total-2">${formatCurrency(totalAmount)}</b>`;
}

/* ===========================================================
   Compose WhatsApp Message
=========================================================== */
function composeMessage() {
  const { totalQty, totalAmount } = getCartTotals();
  const lines = [];

  lines.push(
    currentLang === "ar"
      ? "طلب جديد من منيو بن القدس:"
      : "New order from Bin Al-Quds menu:"
  );
  lines.push("");

  cart.forEach((item) => {
    const name = currentLang === "ar" ? item.nameAr : item.nameEn;
    const sizeLabel = item.size !== "STD" ? ` (${item.size})` : "";
    const lineTotal = item.qty * item.unitPrice;

    let pricePart =
      item.unitPrice > 0
        ? ` — ${item.qty} x ${item.unitPrice} = ${lineTotal} ${CURRENCY}`
        : ` — ${item.qty}`;

    lines.push(`• ${name}${sizeLabel}${pricePart}`);
  });

  lines.push("");
  lines.push(
    (currentLang === "ar" ? "الإجمالي: " : "Total: ") +
      `${totalAmount} ${CURRENCY}`
  );
  lines.push(
    (currentLang === "ar" ? "إجمالي الكمية: " : "Total quantity: ") + totalQty
  );

  const noteText = (note.value || "").trim();
  if (noteText) {
    lines.push("");
    lines.push(currentLang === "ar" ? "ملاحظات:" : "Notes:");
    lines.push(noteText);
  }

  lines.push("");
  lines.push(
    currentLang === "ar"
      ? "من فضلك تأكيد الطلب والوقت المتوقع للاستلام."
      : "Please confirm the order and pickup time."
  );

  return lines.join("\n");
}

/* ===========================================================
   Send WhatsApp
=========================================================== */
function sendOnWhatsApp() {
  if (cart.size === 0) {
    pulseCart();
    return;
  }

  saveNote();
  const msg = encodeURIComponent(composeMessage());

  const urlWeb = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  const urlApi = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${msg}`;

  let opened = null;
  try {
    opened = window.open(urlWeb, "_blank");
  } catch (e) {
    opened = null;
  }

  if (!opened) {
    window.location.href = urlApi;
  }

  clearCart();
}

/* ===========================================================
   Drawer Control
=========================================================== */
function initDrawer() {
  const drawer = document.getElementById("drawer");
  const btnOpen = document.getElementById("btn-open-cart");
  const btnClose = document.getElementById("btn-close");

  btnOpen.onclick = () => drawer.classList.add("open");
  btnClose.onclick = () => drawer.classList.remove("open");
}

/* ===========================================================
   Language Switch
=========================================================== */
function setLang(lang) {
  currentLang = lang;

  const btnAr = document.getElementById("btn-ar");
  const btnEn = document.getElementById("btn-en");

  const menuAr = document.getElementById("menu-ar");
  const menuEn = document.getElementById("menu-en");

  const isAr = lang === "ar";

  document.documentElement.lang = isAr ? "ar" : "en";
  document.documentElement.dir = isAr ? "rtl" : "ltr";

  btnAr.classList.toggle("active", isAr);
  btnEn.classList.toggle("active", !isAr);

  menuAr.hidden = !isAr;
  menuEn.hidden = isAr;

  applyLangTexts();
  renderCart();
}

/* ===========================================================
   Update UI Text
=========================================================== */
function applyLangTexts() {
  const drawerTitle = document.getElementById("drawer-title");
  const noteLabel = document.getElementById("note-label");
  const cartHintEl = document.getElementById("cart-hint");

  if (currentLang === "ar") {
    drawerTitle.textContent = "الكارت • Cart";
    noteLabel.textContent = "ملاحظات الطلب (اختياري) • Notes (optional)";
    cartHintEl.textContent =
      'اختر الحجم والكمية ثم "إضافة" • Pick size & qty then "Add"';
  } else {
    drawerTitle.textContent = "Cart • الكارت";
    noteLabel.textContent = "Notes (optional) • ملاحظات الطلب (اختياري)";
    cartHintEl.textContent =
      'Pick size & qty then "Add" • اختر الحجم والكمية ثم "إضافة"';
  }
}

/* ===========================================================
   Bind Language Buttons
=========================================================== */
function initLangButtons() {
  const btnAr = document.getElementById("btn-ar");
  const btnEn = document.getElementById("btn-en");

  btnAr.onclick = () => setLang("ar");
  btnEn.onclick = () => setLang("en");
}

/* ===========================================================
   BUILD MENUS (AR + EN)
=========================================================== */
async function buildMenus() {
  try {
    const csv = await loadSheetCSV();        // تحميل الشيت
    const rows = csvToArray(csv);            // تحويل CSV
    const prepared = prepareMenuData(rows);  // تجهيز البيانات
    const grouped = groupByCategory(prepared); // تجميع حسب الكاتيجوري

    const menuArDiv = document.getElementById("menu-ar");
    const menuEnDiv = document.getElementById("menu-en");

    // بناء المنيو العربي والإنجليزي
    buildMenu(menuArDiv, grouped.ar, "ar");
    buildMenu(menuEnDiv, grouped.en, "en");

  } catch (err) {
    console.error("Sheet Load Error:", err);
  }
}

/* ===========================================================
   INIT FUNCTION (تشغيل النظام بالكامل)
=========================================================== */
async function initApp() {

  // 1) بناء المنيو ديناميكي
  await buildMenus();

  // 2) تفعيل أزرار اللغة
  initLangButtons();
  setLang("ar");


  // 3) تحميل الكارت من التخزين
  loadCart();

  // 4) تحميل الملاحظات
  loadNote();

  // 5) ريندر الكارت
  renderCart();

  // 6) تفعيل الـ Drawer
  initDrawer();

  // 7) تفعيل زر إرسال واتساب
  document.getElementById("btn-send").onclick = () => {
    document.getElementById("drawer").classList.add("open");
    sendOnWhatsApp();
  };
  document.getElementById("btn-send-2").onclick = sendOnWhatsApp;

  // 8) Clear Cart
  document.getElementById("btn-clear").onclick = clearCart;

  // 9) Save notes عند الكتابة
  document.getElementById("note").oninput = saveNote;

  // 10) Default Language AR
  setLang("ar");

  const infoBtn = document.getElementById("btn-info");
  const cartStatus = document.querySelector(".cart-status");

  infoBtn.addEventListener("click", () => {
  if (cartStatus.style.display === "flex") {
    cartStatus.style.display = "none";
  } else {
    cartStatus.style.display = "flex";
  }
});
}

function setLang(lang) {
  currentLang = lang;

  const isAr = lang === "ar";

  document.documentElement.lang = isAr ? "ar" : "en";
  document.documentElement.dir = isAr ? "rtl" : "ltr";

  document.getElementById("menu-ar").style.display = isAr ? "block" : "none";
  document.getElementById("menu-en").style.display = isAr ? "none" : "block";

  document.getElementById("btn-ar").classList.toggle("active", isAr);
  document.getElementById("btn-en").classList.toggle("active", !isAr);

  renderCart();
}


/* ===========================================================
   START APP
=========================================================== */
document.addEventListener("DOMContentLoaded", initApp);

