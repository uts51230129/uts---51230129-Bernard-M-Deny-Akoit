(() => {
  const $ = s => document.querySelector(s);
  const toast = (m,e=false) => window.showToast ? window.showToast(m,e) : alert(m);
  const fmt = n => new Intl.NumberFormat("id-ID").format(n);
  const uploadForm=$("#uploadForm"), fileInput=$("#datasetFile");
  $("#chooseFile")?.addEventListener("click",()=>fileInput?.click());
  fileInput?.addEventListener("change",()=>{
    const f=fileInput.files[0]; $("#selectedFile").textContent=f ? `${f.name} · ${(f.size/1024/1024).toFixed(2)} MB` : "Belum ada file dipilih";
    $("#uploadSubmit").disabled=!f;
  });
  const zone=$(".upload-zone");
  ["dragenter","dragover"].forEach(ev=>zone?.addEventListener(ev,e=>{e.preventDefault();zone.classList.add("dragover")}));
  ["dragleave","drop"].forEach(ev=>zone?.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove("dragover")}));
  zone?.addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);fileInput.files=dt.files;fileInput.dispatchEvent(new Event("change"))}});
  uploadForm?.addEventListener("submit",async e=>{
    e.preventDefault();const f=fileInput.files[0];if(!f)return;
    const btn=$("#uploadSubmit");btn.disabled=true;btn.textContent="Membaca dataset...";
    try{
      const fd=new FormData();fd.append("dataset",f);
      const res=await fetch("/api/upload",{method:"POST",body:fd});const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Upload gagal");
      toast(`${data.message} ${data.rows.toLocaleString("id-ID")} baris, ${data.columns} kolom.`);
      $("#topDataset") && ($("#topDataset").textContent=data.source_name);
      const box=$("#uploadResult");box.hidden=false;
      box.innerHTML=`<div class="panel-heading"><div><h3>Dataset berhasil dibaca</h3><p>${data.source_name}</p></div><span class="status-badge status-success">Upload berhasil</span></div><div class="meta-grid"><div><span>Baris</span><b>${data.rows.toLocaleString("id-ID")}</b></div><div><span>Kolom</span><b>${data.columns}</b></div><div><span>Sheet terpilih</span><b>${data.active_sheet||"CSV"}</b></div></div><div class="table-wrap" id="uploadedPreview"></div>`;
      window.renderTable($("#uploadedPreview"),data.preview,10);
      $("#runAnalysis").disabled=false;
      const meta=$("#datasetMeta");if(meta)meta.innerHTML=`<div><span>Baris</span><b>${data.rows.toLocaleString("id-ID")}</b></div><div><span>Kolom</span><b>${data.columns}</b></div><div><span>Sheet terpilih</span><b>${data.active_sheet||"CSV"}</b></div>`;
    }catch(err){toast(err.message,true)}finally{btn.disabled=false;btn.innerHTML='Upload & periksa struktur <i data-lucide="arrow-right"></i>';if(window.lucide)window.lucide.createIcons()}
  });
  $("#runAnalysis")?.addEventListener("click",async()=>{
    const btn=$("#runAnalysis");btn.disabled=true;btn.textContent="Memproses...";
    try{const res=await fetch("/api/analyze",{method:"POST"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Analisis gagal");
      toast(data.message);$("#datasetMeta").innerHTML=`<div><span>Baris mentah</span><b>${fmt(data.results.raw_rows)}</b></div><div><span>Baris bersih</span><b>${fmt(data.results.clean_rows)}</b></div><div><span>Penjualan sementara</span><b>${window.formatMoney(data.results.net_sales)}</b></div>`;
      window.renderTable($("#previewTable"),data.preview,10);
      setTimeout(()=>location.reload(),500);
    }catch(err){toast(err.message,true)}finally{btn.disabled=false;btn.innerHTML='<i data-lucide="play"></i> Proses EDA & Cleaning';if(window.lucide)window.lucide.createIcons()}
  });
  $("#aprioriForm")?.addEventListener("submit",async e=>{
    e.preventDefault();const btn=e.submitter;btn.disabled=true;btn.textContent="Menghitung...";
    try{const res=await fetch("/api/apriori",{method:"POST",body:new FormData(e.target)});const data=await res.json();if(!res.ok)throw new Error(data.error||"Apriori gagal");
      const notes=(data.meta.notes||[]).map(n=>`<p>${n}</p>`).join("");
      $("#aprioriResult").innerHTML=`<div class="meta-grid"><div><span>Frequent itemsets</span><b>${fmt(data.itemsets)}</b></div><div><span>Association rules</span><b>${fmt(data.rules)}</b></div><div><span>Transaksi basket</span><b>${fmt(data.meta.transactions)}</b></div><div><span>Produk unik</span><b>${fmt(data.meta.products)}</b></div><div><span>Support dipakai</span><b>${data.meta.min_support}</b></div><div><span>Confidence dipakai</span><b>${Math.round(data.meta.min_confidence*100)}%</b></div></div><p class="kpi-foot">Mesin: ${data.meta.engine}. Halaman akan diperbarui untuk menampilkan hasil.</p>${notes?`<div class="notice notice-warning" style="margin-top:10px"><div><b>Penyesuaian ambang</b>${notes}</div></div>`:""}`;
      toast("Apriori berhasil dihitung.");setTimeout(()=>location.reload(),900)}catch(err){toast(err.message,true)}finally{btn.disabled=false;btn.innerHTML='<i data-lucide="play"></i> Jalankan Apriori';if(window.lucide)window.lucide.createIcons()}
  });
  $("#runKmeans")?.addEventListener("click",async()=>{
    const btn=$("#runKmeans");btn.disabled=true;btn.textContent="Menghitung RFM & cluster...";
    try{const res=await fetch("/api/kmeans",{method:"POST"});const data=await res.json();if(!res.ok)throw new Error(data.error||"K-Means gagal");$("#kmeansResult").innerHTML=`<div class="notice notice-info"><i data-lucide="check-circle"></i><div><b>Segmentasi selesai</b><p>${fmt(data.customers)} pelanggan diproses menjadi ${data.clusters} cluster. Tanggal acuan: ${data.meta.reference_date}. k dipilih menggunakan silhouette score kandidat valid. Halaman akan diperbarui untuk menampilkan visualisasi cluster.</p></div></div>`;toast("K-Means berhasil dihitung.");setTimeout(()=>location.reload(),900)}catch(err){toast(err.message,true)}finally{btn.disabled=false;btn.innerHTML='<i data-lucide="play"></i> Hitung RFM & K-Means';if(window.lucide)window.lucide.createIcons()}
  });
  $("#clearBiFilters")?.addEventListener("click",()=>{if($("#productSearch"))$("#productSearch").value="";if($("#productSort"))$("#productSort").value="sales";toast("Filter tampilan dikembalikan ke kondisi awal.")});
})();