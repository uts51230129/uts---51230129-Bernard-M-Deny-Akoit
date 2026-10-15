"""Apriori behaviour tests: suggested thresholds, auto-relaxation, fallback engine."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app as appmod
import pandas as pd

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

    ready = client.get("/api/apriori/ready").get_json()["numbers"]
    print("readiness:", ready)

    # 1. Run with suggested support -> should produce rules without relaxation
    res = client.post("/api/apriori", data={"min_support": str(ready["suggested_support"]),
                                            "min_confidence": "0.3"})
    data = res.get_json()
    check("suggested support runs", res.status_code == 200)
    check("suggested support yields rules", data["rules"] > 0, f"itemsets={data['itemsets']} rules={data['rules']}")
    check("no relaxation needed", not data["meta"]["notes"], str(data["meta"]["notes"]))
    check("engine reported", "engine" in data["meta"], data["meta"]["engine"])
    check("support_absolute present", isinstance(data["meta"].get("support_absolute"), int),
          str(data["meta"].get("support_absolute")))

    # 2. Very high support -> empty -> auto-relax kicks in
    res = client.post("/api/apriori", data={"min_support": "0.9", "min_confidence": "0.3"})
    data = res.get_json()
    check("high support still returns 200", res.status_code == 200)
    check("auto-relaxation recorded", bool(data["meta"]["notes"]), str(data["meta"]["notes"])[:160])
    check("relaxation yields results", data["itemsets"] > 0,
          f"itemsets={data['itemsets']} rules={data['rules']} used_support={data['meta']['min_support']}")

    # 3. Invalid parameters rejected clearly
    res = client.post("/api/apriori", data={"min_support": "5", "min_confidence": "0.3"})
    check("out-of-range support rejected", res.status_code == 400, str(res.get_json())[:100])
    res = client.post("/api/apriori", data={"min_support": "-1", "min_confidence": "0.3"})
    check("negative support rejected", res.status_code == 400)

    # 4. Fallback engine produces equivalent results to mlxtend
    w = appmod.WORKSPACES[next(iter(appmod.WORKSPACES))]
    m_fallback = appmod.run_apriori(w, min_support=0.02, min_confidence=0.3)
    fb_itemsets, fb_rules = m_fallback["itemsets"], m_fallback["rules"]
    check("fallback engine itemsets > 0", fb_itemsets > 0, f"itemsets={fb_itemsets} rules={fb_rules}")
    check("fallback engine reported", w["apriori_meta"]["engine"] in ("mlxtend", "fallback-pandas"),
          w["apriori_meta"]["engine"])

    # 5. K-Means meta carries cluster chart data + candidate scores
    client.post("/api/kmeans")
    w = appmod.WORKSPACES[next(iter(appmod.WORKSPACES))]
    meta = w["kmeans_meta"]
    check("kmeans clusters list", bool(meta.get("clusters")), str(meta.get("clusters"))[:120])
    check("kmeans candidate scores", len(meta.get("candidate_scores", [])) >= 1)
    check("kmeans total_customers", meta.get("total_customers", 0) > 0, str(meta.get("total_customers")))
    check("kmeans charts generated", all(k in w["charts"] for k in ("elbow_silhouette", "cluster_scatter", "cluster_boxplot")),
          str(list(w["charts"].keys())))

    # 6. Recommendations enriched
    recs = w["recommendations"]
    check("recommendations count >= 3", len(recs) >= 3, f"count={len(recs)}")
    check("recommendations have priorities", all("priority" in r for r in recs))

    # 7. Validation audit structure
    audit = w["validation_audit"]
    check("audit rows", len(audit) >= 6, f"rows={len(audit)}")
    check("audit has severity", all("severity" in a for a in audit))
    check("audit has counts", all("count_before" in a and "count_after" in a for a in audit))

print()
if failures:
    print(f"FAILED: {failures}")
    sys.exit(1)
print("ALL APRIORI/KMEANS CHECKS PASSED")
