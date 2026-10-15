"""Verify rendered output: thousand separators, chart images, developer photo."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app as appmod

app = appmod.app
app.config["TESTING"] = True
DATASET = Path(__file__).resolve().parent.parent / "P8. UTS_Business Intelligence.xlsx"

failures = []

def check(name, cond, detail=""):
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {detail}")
    if not cond:
        failures.append(name)

with app.test_client() as client:
    with open(DATASET, "rb") as fh:
        client.post("/api/upload", data={"dataset": (fh, DATASET.name)},
                    content_type="multipart/form-data")
    client.post("/api/analyze")
    client.post("/api/apriori", data={"min_support": "0.02", "min_confidence": "0.3"})
    client.post("/api/kmeans")

    # EDA page: "Baris sumber" must render 18.513
    html = client.get("/page/eda").get_data(as_text=True)
    check("EDA baris sumber 18.513", "18.513" in html)
    check("EDA profile table dots", re.search(r"<td>1[0-9]\.\d{3}</td>", html) is not None)

    # Preprocessing page: dots + boxplot image
    html = client.get("/page/preprocessing").get_data(as_text=True)
    check("Preprocessing baris sebelum 18.513", "18.513" in html)
    check("Preprocessing rows_flow img", "data:image/png;base64," in html)
    check("Preprocessing boxplot img", html.count("data:image/png;base64,") >= 2)
    check("Preprocessing numeric summary table", "Statistik deskriptif kolom numerik" in html)
    check("Preprocessing log table dots", "Preprocessing log" in html)

    # Validation page
    html = client.get("/page/validation").get_data(as_text=True)
    check("Validation audit table", "Detail pemeriksaan aturan bisnis" in html)
    check("Validation severity badges", "status-error" in html or "status-warning" in html)
    check("Validation charts", html.count("data:image/png;base64,") >= 3)

    # Apriori page: readiness numbers + charts
    html = client.get("/page/apriori").get_data(as_text=True)
    check("Apriori readiness panel", "Kesiapan data untuk Apriori" in html)
    check("Apriori transactions 6.000", "6.000" in html)
    check("Apriori products 30", "Produk unik" in html)
    check("Apriori meta panel", "Hasil proses Apriori terakhir" in html)
    check("Apriori itemsets table", "Frequent itemsets" in html)
    check("Apriori rules table", "Association rules" in html)
    check("Apriori charts", html.count("data:image/png;base64,") >= 1)

    # Segmentation page: cluster visuals
    html = client.get("/page/segmentation").get_data(as_text=True)
    check("Segmentation elbow img", "Elbow &amp; silhouette" in html and "data:image/png;base64," in html)
    check("Segmentation scatter 2D", "Visualisasi cluster (proyeksi 2D)" in html)
    check("Segmentation boxplot RFM", "Boxplot RFM per cluster" in html)
    check("Segmentation interactive canvas", 'id="clusterChart"' in html and 'id="rfmScatterChart"' in html)
    check("Segmentation total pelanggan", "Total pelanggan" in html)

    # Recommendations page: charts
    html = client.get("/page/recommendations").get_data(as_text=True)
    check("Rec priority doughnut", 'id="recPriorityChart"' in html)
    check("Rec products chart", 'id="recProductsChart"' in html)
    check("Rec rules chart", 'id="recRulesChart"' in html)
    check("Rec clusters chart", 'id="recClustersChart"' in html)
    check("Rec cards", html.count("recommendation-card") >= 3)

    # Developer page
    html = client.get("/page/pengembang").get_data(as_text=True)
    check("Pengembang name", "Bernard M. Deny Akoit" in html)
    check("Pengembang NPM", "51230129" in html)
    check("Pengembang prodi", "Teknologi Informasi" in html)
    check("Pengembang photo url", "img/deko.jpg" in html)
    res = client.get("/static/img/deko.jpg")
    check("Pengembang photo serves", res.status_code == 200 and len(res.data) > 5000,
          f"size={len(res.data)}")

    # Nav has Pengembang
    html = client.get("/").get_data(as_text=True)
    check("Nav has Pengembang", "Pengembang" in html)
    check("Home KPI dots", "6.000" in html or "Transaksi unik" in html)

print()
if failures:
    print(f"FAILED: {failures}")
    sys.exit(1)
print("ALL VERIFICATION CHECKS PASSED")
