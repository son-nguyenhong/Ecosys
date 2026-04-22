"""
Project template service — creates directory structure and template files
for new projects.

Folder tree (3 layers):
  Layer 1: {upload_base}/{domain_code}/
  Layer 2: {upload_base}/{domain_code}/{project_code}/
  Layer 3: {upload_base}/{domain_code}/{project_code}/BA/
           {upload_base}/{domain_code}/{project_code}/Tester/
  (sub-folders within BA and Tester follow milestone tracks)
"""
import os
from typing import List, Tuple, Dict, Optional

from app.services.milestone_generator import (
    MILESTONE_TEMPLATES,
    BA_MILESTONE_TEMPLATES,
    TEST_MILESTONE_TEMPLATES,
)

# ── Folder structure hierarchy ──────────────────────────────────
# track → list of (folder_name, folder_path_relative_to_project_root, sort_order)
FOLDER_STRUCTURE: Dict[str, List[Tuple[str, str, int]]] = {
    "project": [
        ("Kickoff",           "project/kickoff",        1),
        ("Requirements",      "project/requirements",   2),
        ("Solution Design",   "project/design",         3),
        ("Development",       "project/development",    4),
        ("SIT",               "project/sit",            5),
        ("UAT",               "project/uat",            6),
        ("Go-Live",           "project/golive",         7),
        ("Hypercare",         "project/hypercare",      8),
        ("Project Closure",   "project/closure",        9),
    ],
    "ba": [
        ("BA Kickoff & Scope",          "BA/ba_kickoff",      1),
        ("Requirements Elicitation",    "BA/ba_elicitation",  2),
        ("As-Is / To-Be Analysis",      "BA/ba_analysis",     3),
        ("BRD Drafting & Sign-off",     "BA/ba_brd",          4),
        ("FRS & Solution Spec",         "BA/ba_frs",          5),
        ("Dev Support & Clarification", "BA/ba_dev_support",  6),
        ("UAT Support & Sign-off",      "BA/ba_uat_support",  7),
        ("BA Closure",                  "BA/ba_closure",      8),
    ],
    "test": [
        ("Test Strategy & Planning",      "Tester/test_planning",  1),
        ("Test Case Design",              "Tester/test_design",    2),
        ("Test Environment Preparation",  "Tester/test_env_setup", 3),
        ("SIT Execution",                 "Tester/test_sit_exec",  4),
        ("UAT Execution & Support",       "Tester/test_uat_exec",  5),
        ("Go-Live Testing",               "Tester/test_golive",    6),
        ("Test Closure",                  "Tester/test_closure",   7),
    ],
    "management": [
        ("Contracts & Legal",  "management/contracts",    1),
        ("Licenses",           "management/licenses",     2),
        ("Governance",         "management/governance",   3),
        ("Status Reports",     "management/reports",      4),
        ("General Documents",  "management/general",      5),
    ],
}


def _project_base(upload_base: str, project_code: str, domain_code: Optional[str]) -> str:
    """Return the project root directory, domain-scoped when domain_code is provided.

    Layer 1 — Domain:  {upload_base}/{domain_code}/
    Layer 2 — Project: {upload_base}/{domain_code}/{project_code}/
    Fallback (no domain): {upload_base}/{project_code}/
    """
    if domain_code:
        return os.path.join(upload_base, domain_code.upper(), project_code)
    return os.path.join(upload_base, project_code)


def create_project_dirs(
    project_id: str,
    project_code: str,
    upload_base: str,
    domain_code: Optional[str] = None,
) -> str:
    """Create full organized directory structure for a new project.

    Layer 3 folders:
      {base}/BA/{milestone_track}/
      {base}/Tester/{milestone_track}/

    Returns project dir path.
    """
    project_dir = _project_base(upload_base, project_code, domain_code)
    os.makedirs(project_dir, exist_ok=True)

    for track, folders in FOLDER_STRUCTURE.items():
        for _, rel_path, _ in folders:
            os.makedirs(
                os.path.join(project_dir, rel_path.replace("/", os.sep)),
                exist_ok=True,
            )

    return project_dir


def write_template_file(
    project_id: str,
    project_code: str,
    project_name: str,
    milestone_type: str,
    file_name: str,
    upload_base: str,
    track: str = "project",
    domain_code: Optional[str] = None,
) -> str:
    """Write a template markdown file and return its storage path.

    Files are organized by track under the domain-scoped project root:
      project track: {base}/project/{milestone_type}/
      ba track:      {base}/BA/{milestone_type}/
      test track:    {base}/Tester/{milestone_type}/
    """
    project_dir = _project_base(upload_base, project_code, domain_code)

    track_dir_map = {"project": "project", "ba": "BA", "test": "Tester"}
    track_dir = track_dir_map.get(track, track)

    dir_path = os.path.join(project_dir, track_dir, milestone_type)
    os.makedirs(dir_path, exist_ok=True)

    file_path = os.path.join(dir_path, file_name)
    if not os.path.exists(file_path):
        title = file_name.replace("_", " ").replace(".md", "")
        track_label = {"project": "Project", "ba": "BA", "test": "Tester"}.get(track, track.upper())
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n\n")
            f.write(f"**Project:** {project_name}  \n")
            f.write(f"**Track:** {track_label}  \n")
            f.write(f"**Milestone:** {milestone_type}  \n\n")
            f.write("## Overview\n\n_Document content goes here._\n\n")
            f.write("---\n\n")
            f.write(
                "| Field | Value |\n|---|---|\n"
                "| Status | Draft |\n| Version | v0.1 |\n| Author |  |\n| Date |  |\n"
            )
    return file_path


def build_folder_records(
    project_id: str,
    project_code: str,
    domain_code: Optional[str] = None,
) -> List[dict]:
    """Return list of folder metadata dicts for DB insertion.

    folder_path is stored as relative to the project root, e.g. 'BA/ba_brd'.
    The domain prefix is handled at the filesystem level only.
    """
    records = []
    for track, folders in FOLDER_STRUCTURE.items():
        for folder_name, rel_path, sort_order in folders:
            records.append({
                "project_id":  project_id,
                "parent_id":   None,
                "folder_name": folder_name,
                "folder_path": rel_path,
                "track":       track,
                "sort_order":  sort_order,
            })
    return records
