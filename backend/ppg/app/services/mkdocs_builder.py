"""
MkDocs Builder Service
Generates a static stakeholder documentation portal per project.

Dependencies (must be installed in the venv):
    pip install mkdocs mkdocs-material

Site output: {SITES_DIR}/{project_code}/
Served by FastAPI StaticFiles at /sites/{project_code}/
"""
import asyncio
import os
import tempfile
from pathlib import Path
from typing import Optional

# Override via SITES_DIR env var in docker-compose / production
SITES_DIR = Path(os.getenv("SITES_DIR", "./public/sites"))

# Categories included in the stakeholder portal
PUBLISH_CATEGORIES: dict[str, str] = {
    "BRD":       "📋 Business Requirements (BRD)",
    "FRD":       "📐 Functional Spec (BRS / FRD)",
    "TestPlan":  "🧪 Test Plan",
    "TestCase":  "✅ Test Cases",
    "UserGuide": "📘 Hướng dẫn sử dụng (HDSD)",
    "Signoff":   "✍️ Sign-off",
}


# ── Markdown generators ────────────────────────────────────────────────────

def _fmt(d: Optional[str]) -> str:
    return d[:10] if d else "—"


def _slug(text: str) -> str:
    return text.lower().replace(" ", "-").replace("/", "-").replace("_", "-")


def _mkdocs_yml(project_code: str, project_name: str, nav_sections: list[str]) -> str:
    nav_str = "\n".join(f"  - {s}" for s in nav_sections)
    return f"""site_name: "{project_name}"
site_description: "Stakeholder documentation portal — {project_code}"
docs_dir: docs
site_dir: site

theme:
  name: material
  palette:
    - scheme: default
      primary: blue
      accent: light-blue
  features:
    - navigation.tabs
    - navigation.top
    - search.highlight
    - content.tooltips

nav:
  - Tổng quan: index.md
{nav_str}
"""


def _index_md(project: dict, members: list[dict], milestones: list[dict]) -> str:
    lines = [
        f"# {project['code']} — {project['name']}",
        "",
        f"| Trường | Giá trị |",
        f"|--------|---------|",
        f"| **Status** | `{project['status']}` |",
        f"| **Owner** | {project.get('owner') or '—'} |",
        f"| **Thời gian** | {_fmt(project.get('start_date'))} → {_fmt(project.get('end_date'))} |",
        "",
    ]
    if project.get("description"):
        lines += [f"> {project['description']}", ""]

    if milestones:
        lines += [
            "## Timeline",
            "",
            "| Milestone | Loại | Bắt đầu | Kết thúc | Trạng thái |",
            "|-----------|------|---------|----------|------------|",
        ]
        for ms in milestones:
            lines.append(
                f"| {ms['name']} | {ms.get('milestone_type') or ''} | "
                f"{_fmt(ms.get('start_date'))} | {_fmt(ms.get('end_date'))} | "
                f"`{ms['status']}` |"
            )
        lines += [""]

    if members:
        lines += [
            "## Team",
            "",
            "| Họ tên | Vai trò | Email |",
            "|--------|---------|-------|",
        ]
        for m in members:
            lines.append(
                f"| {m['full_name']} | {m.get('role') or ''} | {m.get('email') or ''} |"
            )
        lines += [""]

    return "\n".join(lines)


def _category_md(cat_label: str, files: list[dict]) -> str:
    lines = [f"# {cat_label}", ""]
    for f in files:
        lines += [f"## {f['name']}", ""]
        lines += [
            f"| Trường | Giá trị |",
            f"|--------|---------|",
            f"| **Version** | `{f['current_version']}` |",
            f"| **Status** | `{f['status']}` |",
            f"| **Category** | {f.get('doc_category') or ''} |",
        ]
        if f.get("external_url"):
            url = f["external_url"]
            lines.append(f"| **Link** | [{url}]({url}) |")
        if f.get("storage_path"):
            lines.append(f"| **File** | `{Path(f['storage_path']).name}` |")
        lines += [""]

        # Inline markdown content if it's a local .md file
        sp = f.get("storage_path")
        if sp and sp.endswith(".md") and Path(sp).exists():
            lines += ["---", "", Path(sp).read_text(encoding="utf-8"), ""]

    return "\n".join(lines)


# ── Main build function ────────────────────────────────────────────────────

async def build_mkdocs_site(
    project: dict,
    files: list[dict],
    members: list[dict],
    milestones: list[dict],
) -> str:
    """
    Build MkDocs static site.
    Returns the relative URL path to the generated site, e.g. '/sites/p-2024-001/'.
    Raises RuntimeError on build failure.
    """
    project_slug = _slug(project["code"])
    site_output = SITES_DIR / project_slug
    site_output.parent.mkdir(parents=True, exist_ok=True)

    # Group final documents by publish category
    cat_files: dict[str, list] = {}
    for f in files:
        cat = f.get("doc_category") or "Other"
        if cat in PUBLISH_CATEGORIES:
            cat_files.setdefault(cat, []).append(f)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        docs_dir = tmp / "docs"
        docs_dir.mkdir()

        # index.md
        (docs_dir / "index.md").write_text(
            _index_md(project, members, milestones), encoding="utf-8"
        )

        # Per-category pages
        nav_sections: list[str] = []
        for cat, label in PUBLISH_CATEGORIES.items():
            if cat not in cat_files:
                continue
            page = f"{cat.lower()}.md"
            (docs_dir / page).write_text(
                _category_md(label, cat_files[cat]), encoding="utf-8"
            )
            nav_sections.append(f'"{label}": {page}')

        # mkdocs.yml
        (tmp / "mkdocs.yml").write_text(
            _mkdocs_yml(project["code"], project["name"], nav_sections),
            encoding="utf-8",
        )

        # Run mkdocs build
        proc = await asyncio.create_subprocess_exec(
            "mkdocs", "build",
            "--config-file", str(tmp / "mkdocs.yml"),
            "--site-dir", str(site_output),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(tmp),
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        except asyncio.TimeoutError:
            proc.kill()
            raise RuntimeError("mkdocs build timed out after 120s")

        if proc.returncode != 0:
            raise RuntimeError(f"mkdocs build failed:\n{stderr.decode()[:800]}")

    doc_count = sum(len(v) for v in cat_files.values())
    return f"/sites/{project_slug}/", doc_count
