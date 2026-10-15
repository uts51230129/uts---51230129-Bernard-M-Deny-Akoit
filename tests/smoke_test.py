"""End-to-end smoke test for the Retail Intelligence app."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app as appmod

app = appmod.app
app.config["TESTING"] = True

DATASET = Path(__file__).resolve().parent.parent / "P8. UTS_Business Intelligence.xlsx"

failures = []

def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name} {detail}")
    if not cond:
        failures.append(name)

with app.test_client() as client:
    # 1. Upload
    with open(DATASET, "rb") as fh:
        res = client.post("/api/upload", data={"dataset": (fh, DATASET.name)},
                          content_type="multipart/form-data")
    data = res.get_json()
    check("upload", res.status_code == 200, f"rows={data.get('rows') if data else None}")
    check("upload rows = 18513", data and data.get("rows") == 18513)

    # 2. Analyze
    res = client.post("/api/analyze")
    data = res.get_json()
    check("analyze", res.status_code == 200, str(data.get("error") if data and "error" in data else ""))
    if res.status_code == 200:
        check("apriori_ready present", bool(data["results"].get("apriori_ready")))
        check("validation_audit present", len(data["results"].get("validation_audit", [])) > 0)
        check("charts present", bool(data["results"].get("profile")))

    # 3. Readiness endpoint
    res = client.get("/api/apriori/ready")
    data = res.get_json()
    check("apriori ready endpoint", res.status_code == 200 and data.get("ready"),
          f"numbers={data.get('numbers')}")

    # 4. Apriori with default suggested support
    res = client.post("/api/apriori", data={"min_support": "0.02", "min_confidence": "0.3"})
    data = res.get_json()
    check("apriori runs", res.status_code == 200, str(data if "error" in (data or {}) else ""))
    if res.status_code == 200:
        check("apriori itemsets > 0", data["itemsets"] > 0, f"itemsets={data['itemsets']} rules={data['rules']}")
        check("apriori rules > 0", data["rules"] > 0)

    # 5. K-Means
    res = client.post("/api/kmeans")
    data = res.get_json()
    check("kmeans runs", res.status_code == 200, str(data if "error" in (data or {}) else ""))
    if res.status_code == 200:
        check("kmeans clusters >= 2", data["clusters"] >= 2, f"clusters={data['clusters']} customers={data['customers']}")

    # 6. Render every page
    pages = ["dataset", "eda", "preprocessing", "validation", "apriori", "segmentation",
             "bi", "recommendations", "reports", "system", "pengembang"]
    for p in pages:
        res = client.get(f"/page/{p}")
        html = res.get_data(as_text=True)
        check(f"page/{p}", res.status_code == 200, f"len={len(html)}")
        if res.status_code != 200:
            print(html[:800])

    # 7. Home page
    res = client.get("/")
    check("home", res.status_code == 200)

    # 8. Exports
    res = client.get("/export/excel")
    check("export excel", res.status_code == 200, f"size={len(res.data)}")
    res = client.get("/export/pdf")
    check("export pdf", res.status_code == 200, f"size={len(res.data)}")

print()
if failures:
    print(f"FAILED: {failures}")
    sys.exit(1)
print("ALL CHECKS PASSED")
