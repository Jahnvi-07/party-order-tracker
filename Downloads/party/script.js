if (!window.supabase || typeof window.supabase.createClient !== "function") {
  document.body.innerHTML = '<main style="max-width:650px;margin:40px auto;padding:20px;font-family:system-ui"><h2>Supabase library did not load</h2><p>Refresh the page. If it still happens, check your internet connection or browser extensions blocking jsDelivr.</p></main>';
  throw new Error("Supabase library missing");
}

const supabaseClient = window.supabase;
const PUBLIC_KEY = typeof SUPABASE_PUBLISHABLE_KEY !== "undefined"
  ? SUPABASE_PUBLISHABLE_KEY
  : (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "");

if (typeof SUPABASE_URL === "undefined" || !SUPABASE_URL || SUPABASE_URL.includes("YOUR-PROJECT") || !PUBLIC_KEY || PUBLIC_KEY.includes("YOUR_")) {
  document.body.innerHTML = '<main style="max-width:650px;margin:40px auto;padding:20px;font-family:system-ui"><h2>Supabase setup required</h2><p>Open <b>config.js</b> and paste your Project URL and Publishable key, then reload.</p></main>';
  throw new Error("Supabase config missing");
}

const db = supabaseClient.createClient(SUPABASE_URL, PUBLIC_KEY);

const DEFAULT_DISHES = [
  { name: "Baby Corn Dry", category: "Starters", foodType: "veg" },
  { name: "Paneer Kabab", category: "Starters", foodType: "veg" },
  { name: "Mushroom 65", category: "Starters", foodType: "veg" },
  { name: "Chicken 65", category: "Starters", foodType: "nonveg" },
  { name: "Chicken 555", category: "Starters", foodType: "nonveg" },
  { name: "Paneer Ghee roast", category: "Starters", foodType: "veg" },
  { name: "Chicken ghee roast", category: "Starters", foodType: "nonveg" },
  { name: "Chicken Manchurian", category: "Starters", foodType: "nonveg" },
  { name: "Paneer Pepper Dry", category: "Starters", foodType: "veg" },
  { name: "Paneer Chilli", category: "Starters", foodType: "veg" },
  { name: "Chicken Lollipop", category: "Starters", foodType: "nonveg" },
  { name: "Chicken Schezwan", category: "Starters", foodType: "nonveg" },
  { name: "Chicken roast", category: "Starters", foodType: "nonveg" },
  { name: "Paneer Butter Masala", category: "Main Course", foodType: "veg" },
  { name: "Paneer Tikka Masala", category: "Main Course", foodType: "veg" },
  { name: "Paneer Hyderabadi", category: "Main Course", foodType: "veg" },
  { name: "Paneer Kolhapuri", category: "Main Course", foodType: "veg" },
  { name: "Chicken Kolhapuri", category: "Main Course", foodType: "nonveg" },

  { name: "Butter Chicken", category: "Main Course", foodType: "nonveg" },
  { name: "Chicken Hyderabadi", category: "Main Course", foodType: "nonveg" },
  { name: "Butter Naan", category: "Breads", foodType: "veg" },
  { name: "Naan", category: "Breads", foodType: "veg" },
  { name: "Tandoori Roti", category: "Breads", foodType: "veg" },
  { name: "Ghee Rice", category: "Rice", foodType: "veg" },
  { name: "Jeera Rice", category: "Rice", foodType: "veg" },
  { name: "Veg Fried Rice", category: "Rice", foodType: "veg" },
  { name: "Chicken Biryani", category: "Rice", foodType: "nonveg" },
  { name: "Chicken Fried Rice", category: "Rice", foodType: "nonveg" },
  { name: "Water", category: "Drinks", foodType: "veg" },
  { name: "Cold Drinks", category: "Drinks", foodType: "veg" },
  { name: "Beer Tower", category: "Drinks", foodType: "veg" },

];

const params = new URLSearchParams(window.location.search);
let partyId = params.get("party");
if (!partyId) {
  partyId = crypto.randomUUID();
  history.replaceState({}, "", `${location.pathname}?party=${partyId}`);
}

document.getElementById("partyTitle").textContent = "Party Order";
document.getElementById("partyLink").textContent = location.href;

let orders = new Map();
let realtimeChannel;
let activeFoodFilter = "all";
let searchTerm = "";

function key(name, category) { return `${category}::${name.toLowerCase().trim()}`; }
function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function ensureDefaultDishes() {
  for (const d of DEFAULT_DISHES) {
    const k = key(d.name, d.category);
    if (!orders.has(k)) orders.set(k, { ...d, quantity: 0, billQuantity: 0, custom: false });
  }
}

function render() {
  const container = document.getElementById("dishContainer");
  const grouped = {};
  const q = searchTerm.trim().toLowerCase();
  const filtered = [...orders.values()].filter(d => {
    const typeMatch = activeFoodFilter === "all" || d.foodType === activeFoodFilter;
    const searchMatch = !q || d.name.toLowerCase().includes(q);
    return typeMatch && searchMatch;
  });

  for (const dish of filtered) (grouped[dish.category] ||= []).push(dish);
  const categoryOrder = ["Starters", "Main Course", "Breads", "Rice", "Drinks", "Other"];
  const categories = Object.keys(grouped).sort((a,b) => {
    const ai = categoryOrder.indexOf(a), bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  if (!categories.length) {
    container.innerHTML = `<div class="no-results"><div class="no-results-icon">⌕</div><strong>No dishes found</strong><span>Try a different name or food type.</span></div>`;
  } else {
    container.innerHTML = categories.map(category => `
      <section>
        <div class="category">${escapeHtml(category)}<span>${grouped[category].length}</span></div>
        <div class="dish-list">
          ${grouped[category].sort((a,b) => a.name.localeCompare(b.name)).map(d => `
            <div class="dish ${d.quantity > 0 ? 'has-quantity' : ''}">
              <div class="dish-top">
                <div class="dish-name">${escapeHtml(d.name)}</div>
                <span class="food-marker ${d.foodType === 'nonveg' ? 'nonveg-marker' : 'veg-marker'}" title="${d.foodType === 'nonveg' ? 'Non-Veg' : 'Veg'}"></span>
              </div>
              ${d.custom ? '<span class="custom-badge">NEW</span>' : ''}
              <div class="counter">
                <button aria-label="Decrease ${escapeHtml(d.name)}" onclick="changeQuantity('${encodeURIComponent(d.name)}','${encodeURIComponent(d.category)}',-1)">−</button>
                <input class="quantity-input" type="number" min="0" step="1" inputmode="numeric" value="${d.quantity}"
                  aria-label="Quantity for ${escapeHtml(d.name)}"
                  data-name="${encodeURIComponent(d.name)}" data-category="${encodeURIComponent(d.category)}"
                  onchange="setQuantity(this)" onkeydown="if(event.key==='Enter'){this.blur()}" />
                <button aria-label="Increase ${escapeHtml(d.name)}" onclick="changeQuantity('${encodeURIComponent(d.name)}','${encodeURIComponent(d.category)}',1)">+</button>
              </div>
            </div>`).join("")}
        </div>
      </section>`).join("");
  }

  const currentSelected = [...orders.values()].filter(d => d.quantity > 0).sort((a,b) => a.name.localeCompare(b.name));
  const currentTotal = currentSelected.reduce((sum, d) => sum + d.quantity, 0);
  const billSelected = [...orders.values()].filter(d => (d.billQuantity || 0) > 0).sort((a,b) => a.name.localeCompare(b.name));
  const billTotal = billSelected.reduce((sum, d) => sum + (d.billQuantity || 0), 0);
  document.getElementById("totalItems").textContent = `${currentTotal} item${currentTotal === 1 ? "" : "s"}`;
  document.getElementById("stickyTotal").textContent = `${currentTotal} current · ${billTotal} billed`;
  document.getElementById("summaryList").innerHTML = billSelected.length
    ? billSelected.map(d => `<div class="summary-row"><span><i class="summary-dot ${d.foodType === 'nonveg' ? 'nonveg-marker' : 'veg-marker'}"></i>${escapeHtml(d.name)}</span><strong>× ${d.billQuantity || 0}</strong></div>`).join("")
    : '<p class="empty">No items billed yet.</p>';
  const billTotalEl = document.getElementById("billTotal");
  if (billTotalEl) billTotalEl.textContent = `${billTotal} item${billTotal === 1 ? "" : "s"}`;
}

async function loadOrders() {
  const { data, error } = await db.from("orders").select("*").eq("party_id", partyId);
  if (error) { console.error(error); showToast("Could not load order"); return; }
  orders = new Map();
  ensureDefaultDishes();
  for (const row of data) {
    orders.set(key(row.dish_name, row.category), {
      name: row.dish_name, category: row.category, quantity: row.quantity, billQuantity: row.bill_quantity || 0, custom: row.is_custom, foodType: row.food_type || "veg"
    });
  }
  render();
}

async function changeQuantity(encodedName, encodedCategory, delta) {
  const name = decodeURIComponent(encodedName);
  const category = decodeURIComponent(encodedCategory);
  const k = key(name, category);
  const current = orders.get(k) || { name, category, quantity: 0, billQuantity: 0, custom: true, foodType: "veg" };
  const oldQuantity = current.quantity || 0;
  const quantity = Math.max(0, oldQuantity + delta);
  const billQuantity = Math.max(0, (current.billQuantity || 0) + (quantity - oldQuantity));
  current.quantity = quantity;
  current.billQuantity = billQuantity;
  orders.set(k, current);
  render();

  const { error } = await db.from("orders").upsert({
    party_id: partyId,
    dish_name: name,
    category,
    quantity,
    bill_quantity: billQuantity,
    is_custom: !!current.custom,
    food_type: current.foodType || "veg"
  }, { onConflict: "party_id,dish_name,category" });
  if (error) { console.error(error); showToast("Update failed"); await loadOrders(); }
}
window.changeQuantity = changeQuantity;

async function setQuantity(input) {
  const name = decodeURIComponent(input.dataset.name);
  const category = decodeURIComponent(input.dataset.category);
  let quantity = Number.parseInt(input.value, 10);
  if (!Number.isFinite(quantity) || quantity < 0) quantity = 0;
  quantity = Math.floor(quantity);
  input.value = quantity;

  const k = key(name, category);
  const current = orders.get(k) || { name, category, quantity: 0, billQuantity: 0, custom: true, foodType: "veg" };
  const oldQuantity = current.quantity || 0;
  const billQuantity = Math.max(0, (current.billQuantity || 0) + (quantity - oldQuantity));
  current.quantity = quantity;
  current.billQuantity = billQuantity;
  orders.set(k, current);
  render();

  const { error } = await db.from("orders").upsert({
    party_id: partyId,
    dish_name: name,
    category,
    quantity,
    bill_quantity: billQuantity,
    is_custom: !!current.custom,
    food_type: current.foodType || "veg"
  }, { onConflict: "party_id,dish_name,category" });
  if (error) { console.error(error); showToast("Update failed"); await loadOrders(); }
}
window.setQuantity = setQuantity;


document.getElementById("addNewBtn").onclick = () => {
  document.getElementById("modal").classList.remove("hidden");
  document.getElementById("dishName").focus();
};
document.getElementById("closeModalBtn").onclick = () => document.getElementById("modal").classList.add("hidden");
document.getElementById("modal").onclick = e => { if (e.target.id === "modal") e.currentTarget.classList.add("hidden"); };

document.getElementById("saveDishBtn").onclick = async () => {
  const name = document.getElementById("dishName").value.trim();
  const category = document.getElementById("dishCategory").value;
  const foodType = document.getElementById("dishType").value;
  let newQuantity = Number.parseInt(document.getElementById("newDishQuantity").value, 10);
  if (!Number.isFinite(newQuantity) || newQuantity < 1) newQuantity = 1;
  if (!name) return showToast("Enter a dish name");
  const k = key(name, category);
  if (orders.has(k)) {
    document.getElementById("modal").classList.add("hidden");
    return changeQuantity(encodeURIComponent(name), encodeURIComponent(category), newQuantity);
  }
  orders.set(k, { name, category, quantity: newQuantity, billQuantity: newQuantity, custom: true, foodType });
  render();
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("dishName").value = "";
  document.getElementById("newDishQuantity").value = "1";
  const { error } = await db.from("orders").upsert({ party_id: partyId, dish_name: name, category, quantity: newQuantity, bill_quantity: newQuantity, is_custom: true, food_type: foodType }, { onConflict: "party_id,dish_name,category" });
  if (error) { console.error(error); showToast("Could not add dish"); await loadOrders(); }
};

document.getElementById("copyLinkBtn").onclick = async () => {
  await navigator.clipboard.writeText(location.href);
  showToast("Party link copied");
};

document.getElementById("copySummaryBtn").onclick = async () => {
  const selected = [...orders.values()].filter(d => (d.billQuantity || 0) > 0).sort((a,b) => a.name.localeCompare(b.name));
  if (!selected.length) return showToast("Nothing billed yet");
  const total = selected.reduce((s,d) => s + (d.billQuantity || 0), 0);
  const lines = ["ORDER SUMMARY", "", ...selected.map(d => `${d.name} × ${d.billQuantity || 0}`), "", `Total items: ${total}`];
  await navigator.clipboard.writeText(lines.join("\n"));
  showToast("Bill summary copied");
};

document.getElementById("resetBtn").onclick = async () => {
  if (!confirm("Reset the entire order for everyone?")) return;
  const { error } = await db.from("orders").delete().eq("party_id", partyId);
  if (error) { console.error(error); return showToast("Reset failed"); }
  await loadOrders();
  showToast("Order reset");
};

function subscribe() {
  realtimeChannel = db.channel(`party-${partyId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `party_id=eq.${partyId}` }, payload => {
      const row = payload.new || payload.old;
      if (!row) return;
      const k = key(row.dish_name, row.category);
      if (payload.eventType === "DELETE") {
        const defaultDish = DEFAULT_DISHES.find(d => key(d.name, d.category) === k);
        if (defaultDish) orders.set(k, { ...defaultDish, quantity: 0, billQuantity: 0, custom: false });
        else orders.delete(k);
      } else {
        orders.set(k, { name: row.dish_name, category: row.category, quantity: row.quantity, billQuantity: row.bill_quantity || 0, custom: row.is_custom, foodType: row.food_type || "veg" });
      }
      render();
    })
    .subscribe();
}

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value;
  clearSearchBtn.classList.toggle("hidden", !searchTerm);
  render();
});
clearSearchBtn.onclick = () => {
  searchInput.value = "";
  searchTerm = "";
  clearSearchBtn.classList.add("hidden");
  searchInput.focus();
  render();
};
document.querySelectorAll(".food-filter").forEach(btn => {
  btn.onclick = () => {
    activeFoodFilter = btn.dataset.filter;
    document.querySelectorAll(".food-filter").forEach(b => b.classList.toggle("active", b === btn));
    render();
  };
});

async function resetCurrentQuantitiesOnRefresh() {
  const { data, error } = await db.from("orders").select("id, quantity").eq("party_id", partyId);
  if (error) { console.error(error); return; }
  const pending = (data || []).filter(row => (row.quantity || 0) > 0);
  for (const row of pending) {
    const { error: updateError } = await db.from("orders").update({ quantity: 0 }).eq("id", row.id).eq("quantity", row.quantity);
    if (updateError) console.error(updateError);
  }
}

(async function init() {
  ensureDefaultDishes();
  render();
  await resetCurrentQuantitiesOnRefresh();
  await loadOrders();
  subscribe();
})();


document.querySelector("#stickySummary button").onclick = () => document.getElementById("summaryCard").scrollIntoView({ behavior: "smooth", block: "start" });
document.getElementById("copyLinkBtn").onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); showToast("Party link copied"); }
  catch { showToast("Copy failed — copy the link from the address bar"); }
};
