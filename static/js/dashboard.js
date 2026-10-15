(() => {
  const result = window.initialResults;
  const chartColors = ["#3b82f6","#06b6d4","#14b8a6","#7c3aed","#f59e0b","#60a5fa","#2dd4bf","#a78bfa","#fb7185","#94a3b8"];
  Chart.defaults.color = "#8fa1b9";
  Chart.defaults.borderColor = "rgba(100,125,158,.17)";
  Chart.defaults.font.family = "Inter, sans-serif";
  Chart.defaults.font.size = 10;
  const make = (id, config) => { const el=document.getElementById(id); if(el && result) { const c=new Chart(el,config); return c; } return null; };
  if (result) {
    if (result.monthly_sales?.length) {
      document.getElementById("monthlyEmpty")?.setAttribute("hidden","");
      make("monthlyChart",{type:"line",data:{labels:result.monthly_sales.map(x=>x.month),datasets:[{label:"Penjualan",data:result.monthly_sales.map(x=>x.sales),borderColor:"#38bdf8",backgroundColor:"rgba(56,189,248,.10)",fill:true,tension:.32,pointRadius:3,pointBackgroundColor:"#38bdf8"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>window.formatMoney(c.raw)}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{callback:v=>new Intl.NumberFormat("id-ID",{notation:"compact"}).format(v)}}}}});
    }
    if (result.top_products?.length) {
      document.getElementById("productsEmpty")?.setAttribute("hidden","");
      make("productsChart",{type:"bar",data:{labels:result.top_products.map(x=>x.product),datasets:[{label:"Penjualan",data:result.top_products.map(x=>x.sales),backgroundColor:result.top_products.map((_,i)=>chartColors[i%chartColors.length]),borderRadius:5,barThickness:13}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>window.formatMoney(c.raw)}}},scales:{x:{beginAtZero:true,ticks:{callback:v=>new Intl.NumberFormat("id-ID",{notation:"compact"}).format(v)}},y:{grid:{display:false}}}}});
    }
  }
  const profile = window.profileData;
  if(profile?.column_profile) {
    const miss = profile.column_profile.filter(x=>x.missing>0);
    const el=document.getElementById("missingChart");
    if(el) new Chart(el,{type:"bar",data:{labels:miss.map(x=>x.column),datasets:[{label:"Missing",data:miss.map(x=>x.missing),backgroundColor:"#f59e0b",borderRadius:4}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true},y:{grid:{display:false}}}}});
    const counts={}; profile.column_profile.forEach(x=>counts[x.dtype]=(counts[x.dtype]||0)+1);
    const d=document.getElementById("dtypeChart");
    if(d) new Chart(d,{type:"doughnut",data:{labels:Object.keys(counts),datasets:[{data:Object.values(counts),backgroundColor:chartColors,borderColor:"#131f33",borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom",labels:{usePointStyle:true,boxWidth:7,padding:14}}}}});
  }

  // ===== Module-specific charts (segmentation, recommendations) =====
  const mod = window.moduleData;
  const fmtId = n => new Intl.NumberFormat("id-ID").format(n);
  if (mod) {
    // --- Segmentation: cluster size + monetary mean (bar, dual axis) ---
    if (mod.page === "segmentation" && mod.kmeans?.clusters?.length) {
      const cl = mod.kmeans.chosen_k;
      document.getElementById("clusterEmpty")?.setAttribute("hidden","");
      const el = document.getElementById("clusterChart");
      if (el) new Chart(el, {
        type: "bar",
        data: {
          labels: mod.kmeans.clusters.map(c => `C${c.cluster}`),
          datasets: [
            {label: "Jumlah pelanggan", data: mod.kmeans.clusters.map(c => c.count), backgroundColor: "#3b82f6", borderRadius: 5, yAxisID: "y"},
            {label: "Monetary mean (Rp)", data: mod.kmeans.clusters.map(c => c.monetary), type: "line", borderColor: "#f59e0b", backgroundColor: "#f59e0b", tension: .3, pointRadius: 4, yAxisID: "y1"}
          ]
        },
        options: {responsive: true, maintainAspectRatio: false,
          plugins: {legend: {labels: {usePointStyle: true, boxWidth: 8, padding: 14, color: "#c2cfdf"}}, tooltip: {callbacks: {label: c => `${c.dataset.label}: ${fmtId(c.raw)}`}}},
          scales: {
            x: {grid: {display: false}, ticks: {color: "#8fa1b9"}},
            y: {position: "left", title: {display: true, text: "Pelanggan", color: "#8fa1b9"}, ticks: {color: "#8fa1b9", callback: v => fmtId(v)}, grid: {color: "rgba(100,125,158,.15)"}},
            y1: {position: "right", title: {display: true, text: "Rp", color: "#8fa1b9"}, ticks: {color: "#8fa1b9", callback: v => new Intl.NumberFormat("id-ID", {notation: "compact"}).format(v)}, grid: {drawOnChartArea: false}}
          }}
      });
    }
    // --- Segmentation: interactive scatter F vs M colored by cluster ---
    if (mod.page === "segmentation" && mod.scatter?.length) {
      document.getElementById("rfmScatterEmpty")?.setAttribute("hidden","");
      const el = document.getElementById("rfmScatterChart");
      if (el) {
        const byCluster = {};
        mod.scatter.forEach(p => { (byCluster[p.cluster] = byCluster[p.cluster] || []).push(p); });
        const datasets = Object.keys(byCluster).map(k => ({
          label: `Cluster ${k}`,
          data: byCluster[k].map(p => ({x: p.x, y: p.y})),
          backgroundColor: chartColors[Number(k) % chartColors.length] + "cc",
          borderColor: chartColors[Number(k) % chartColors.length],
          pointRadius: 3, pointHoverRadius: 5
        }));
        new Chart(el, {type: "scatter", data: {datasets},
          options: {responsive: true, maintainAspectRatio: false,
            plugins: {legend: {labels: {usePointStyle: true, boxWidth: 8, padding: 14, color: "#c2cfdf"}}, tooltip: {callbacks: {label: c => `F: ${fmtId(c.raw.x)} · M: ${window.formatMoney ? window.formatMoney(c.raw.y) : fmtId(c.raw.y)}`}}},
            scales: {
              x: {title: {display: true, text: "Frequency", color: "#8fa1b9"}, ticks: {color: "#8fa1b9"}, grid: {color: "rgba(100,125,158,.15)"}},
              y: {title: {display: true, text: "Monetary (Rp)", color: "#8fa1b9"}, ticks: {color: "#8fa1b9", callback: v => new Intl.NumberFormat("id-ID", {notation: "compact"}).format(v)}, grid: {color: "rgba(100,125,158,.15)"}}
            }}});
      }
    }
    // --- Recommendations: priority doughnut ---
    if (mod.page === "recommendations") {
      const recs = mod.recommendations || [];
      if (recs.length) {
        document.getElementById("recPriorityEmpty")?.setAttribute("hidden","");
        const counts = {};
        recs.forEach(r => counts[r.priority] = (counts[r.priority] || 0) + 1);
        const el = document.getElementById("recPriorityChart");
        if (el) new Chart(el, {type: "doughnut",
          data: {labels: Object.keys(counts), datasets: [{data: Object.values(counts), backgroundColor: chartColors, borderColor: "#131f33", borderWidth: 3}]},
          options: {responsive: true, maintainAspectRatio: false, cutout: "62%",
            plugins: {legend: {position: "bottom", labels: {usePointStyle: true, boxWidth: 7, padding: 14, color: "#c2cfdf"}}}}});
      }
      // Top products bar
      const tp = mod.results?.top_products || [];
      if (tp.length) {
        document.getElementById("recProductsEmpty")?.setAttribute("hidden","");
        const el = document.getElementById("recProductsChart");
        if (el) new Chart(el, {type: "bar",
          data: {labels: tp.map(x => x.product), datasets: [{label: "Penjualan", data: tp.map(x => x.sales), backgroundColor: tp.map((_, i) => chartColors[i % chartColors.length]), borderRadius: 5}]},
          options: {indexAxis: "y", responsive: true, maintainAspectRatio: false,
            plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => window.formatMoney ? window.formatMoney(c.raw) : fmtId(c.raw)}}},
            scales: {x: {beginAtZero: true, ticks: {color: "#8fa1b9", callback: v => new Intl.NumberFormat("id-ID", {notation: "compact"}).format(v)}}, y: {grid: {display: false}, ticks: {color: "#8fa1b9"}}}}});
      }
      // Rules by lift (bar)
      const rl = mod.rules || [];
      if (rl.length) {
        document.getElementById("recRulesEmpty")?.setAttribute("hidden","");
        const top = rl.slice(0, 8);
        const el = document.getElementById("recRulesChart");
        if (el) new Chart(el, {type: "bar",
          data: {labels: top.map(r => `${r.antecedents || r.antecedents_text || "?"} → ${r.consequents || r.consequents_text || "?"}`),
            datasets: [{label: "Lift", data: top.map(r => r.lift), backgroundColor: "#14b8a6", borderRadius: 5}]},
          options: {indexAxis: "y", responsive: true, maintainAspectRatio: false,
            plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => `Lift ${Number(c.raw).toFixed(2)}`}}},
            scales: {x: {beginAtZero: true, ticks: {color: "#8fa1b9"}}, y: {grid: {display: false}, ticks: {color: "#8fa1b9", font: {size: 9}}}}}});
      }
      // Clusters monetary (bar)
      const cl2 = mod.clusters || [];
      if (cl2.length) {
        document.getElementById("recClustersEmpty")?.setAttribute("hidden","");
        const el = document.getElementById("recClustersChart");
        if (el) new Chart(el, {type: "bar",
          data: {labels: cl2.map(c => `C${c.cluster} (${c.count} pelanggan)`),
            datasets: [{label: "Monetary mean (Rp)", data: cl2.map(c => c.monetary), backgroundColor: cl2.map((_, i) => chartColors[i % chartColors.length]), borderRadius: 5}]},
          options: {responsive: true, maintainAspectRatio: false,
            plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => window.formatMoney ? window.formatMoney(c.raw) : fmtId(c.raw)}}},
            scales: {x: {grid: {display: false}, ticks: {color: "#8fa1b9"}}, y: {beginAtZero: true, ticks: {color: "#8fa1b9", callback: v => new Intl.NumberFormat("id-ID", {notation: "compact"}).format(v)}, grid: {color: "rgba(100,125,158,.15)"}}}}});
      }
    }
  }
})();