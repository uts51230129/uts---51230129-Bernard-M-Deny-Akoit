(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const toast = (message, isError=false) => {
    const el = $("#toast"); if (!el) return;
    el.textContent = message; el.style.borderColor = isError ? "#9f3434" : "#365475";
    el.classList.add("show"); clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => el.classList.remove("show"), 3800);
  };
  window.showToast = toast;
  if (window.lucide) window.lucide.createIcons();
  $("#sidebarToggle")?.addEventListener("click", e => { e.preventDefault(); $("#sidebar")?.classList.toggle("collapsed"); });
  $("#mobileMenu")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("mobile-open"));
  document.addEventListener("click", e => {
    const side = $("#sidebar");
    if (side?.classList.contains("mobile-open") && !side.contains(e.target) && !$("#mobileMenu")?.contains(e.target)) side.classList.remove("mobile-open");
  });
  const modal = $("#confirmModal");
  $("#resetButton")?.addEventListener("click", () => { if (modal) modal.hidden = false; });
  $("#cancelReset")?.addEventListener("click", () => { modal.hidden = true; });
  modal?.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; });
  $("#confirmReset")?.addEventListener("click", async () => {
    const button = $("#confirmReset"); button.disabled = true;
    try {
      const res = await fetch("/api/reset", {method:"POST"});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset gagal.");
      toast(data.message || "Workspace direset."); setTimeout(() => location.href="/dashboard", 650);
    } catch (err) { toast(err.message, true); }
    finally { button.disabled = false; modal.hidden = true; }
  });
  window.formatMoney = value => {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    return "Rp " + new Intl.NumberFormat("id-ID", {maximumFractionDigits:0}).format(Number(value));
  };
  window.renderTable = (container, records, limit=10) => {
    if (!container) return;
    if (!records || !records.length) { container.innerHTML = '<div class="empty-state">Tidak ada baris untuk ditampilkan.</div>'; return; }
    const cols = Object.keys(records[0]);
    const esc = v => String(v ?? "—").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    container.innerHTML = `<table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${records.slice(0,limit).map(row=>`<tr>${cols.map(c=>`<td>${esc(row[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  };
})();