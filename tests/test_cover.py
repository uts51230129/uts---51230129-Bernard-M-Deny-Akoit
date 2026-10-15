"""Cover page + entry flow tests."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app as appmod

app = appmod.app
app.config["TESTING"] = True

failures = []

def check(name, cond, detail=""):
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {detail}")
    if not cond:
        failures.append(name)

with app.test_client() as client:
    # 1. Root now serves the cover
    res = client.get("/")
    html = res.get_data(as_text=True)
    check("GET / is cover", res.status_code == 200)
    check("cover title tag", "<title>Cover · Retail Intelligence</title>" in html)
    check("cover tagline UTS", "UJIAN TENGAH SEMESTER" in html)
    check("cover mata kuliah", "Mata Kuliah: Business Intelligence" in html)
    check("cover semester 7", "Semester 7" in html)
    check("cover developer name", "Bernard M. Deny Akoit" in html)
    check("cover developer NPM", "51230129" in html)
    check("cover developer prodi", "Program Studi Teknologi Informasi" in html)
    check("cover developer photo", "img/deko.jpg" in html)
    check("cover tujuan sistem", "Tujuan Sistem" in html)
    check("cover kpi section", "Modul analisis" in html and "18.513" in html)
    check("cover alur pengerjaan", "Alur Pengerjaan" in html and html.count("flow-step") == 6)
    check("cover start input", 'name="analyst"' in html)
    check("cover start posts to /start", 'action="/start"' in html)
    # Cover must not show the dashboard sidebar
    check("cover has no sidebar nav", 'class="nav-list"' not in html)

    # 2. POST /start stores analyst and redirects to dashboard
    res = client.post("/start", data={"analyst": "Bernard M. Deny Akoit"}, follow_redirects=False)
    check("POST /start redirects", res.status_code in (302, 303), f"status={res.status_code} loc={res.headers.get('Location')}")
    check("POST /start -> dashboard", (res.headers.get("Location") or "").endswith("/dashboard"))

    res = client.get("/dashboard")
    html = res.get_data(as_text=True)
    check("GET /dashboard works", res.status_code == 200)
    check("dashboard has sidebar", 'class="nav-list"' in html)
    check("dashboard hero present", "Retail intelligence" in html)
    check("dashboard shows analyst name", "Bernard M. Deny Akoit" in html)

    # 3. Empty name falls back safely
    client.post("/api/reset")
    res = client.post("/start", data={"analyst": ""}, follow_redirects=True)
    check("empty name still enters", res.status_code == 200)

    # 4. Dashboard still reachable without going through cover
    res = client.get("/dashboard")
    check("dashboard direct access ok", res.status_code == 200)

    # 5. Nav overview link points at dashboard, not cover
    html = res.get_data(as_text=True)
    check("nav overview -> /dashboard", 'href="/dashboard"' in html)

    # 6. Modules still work after the route rename
    for p in ["dataset", "apriori", "segmentation", "pengembang"]:
        res = client.get(f"/page/{p}")
        check(f"page/{p}", res.status_code == 200)

print()
if failures:
    print(f"FAILED: {failures}")
    sys.exit(1)
print("ALL COVER CHECKS PASSED")
