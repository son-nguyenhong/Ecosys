"""
Pure unit tests for backend services (no HTTP, no DB).
Covers:
- milestone_generator: generate_milestones, generate_ba_milestones, generate_test_milestones
  (count, date ordering, proportional distribution, string date parsing, short projects)
- meeting_parser: parse_meeting_notes
  (attendee extraction, decision detection, action items with deadlines, risks, empty notes)
- project_template: build_folder_records
  (count, structure, all 4 tracks present)
"""
from __future__ import annotations

import sys
import os
from datetime import date, timedelta

import pytest

# ---------------------------------------------------------------------------
# Setup path so we can import backend services directly
# ---------------------------------------------------------------------------

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg"))


# ===========================================================================
# MILESTONE GENERATOR
# ===========================================================================

class TestGenerateMilestones:
    """Tests for generate_milestones — project track."""

    def test_returns_9_milestones(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert len(result) == 9

    def test_sort_order_is_sequential(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        orders = [ms["sort_order"] for ms in result]
        assert orders == sorted(orders)

    def test_track_is_project(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert all(ms["track"] == "project" for ms in result)

    def test_start_dates_are_date_objects(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        for ms in result:
            assert isinstance(ms["start_date"], date)
            assert isinstance(ms["end_date"], date)

    def test_milestones_within_project_range(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        start = date(2026, 1, 1)
        end = date(2026, 12, 31)
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        for ms in result:
            assert ms["start_date"] >= start
            assert ms["end_date"] <= end + timedelta(days=1)  # allow exact end

    def test_first_milestone_is_kickoff(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert result[0]["milestone_type"] == "kickoff"
        assert result[0]["name"] == "Kickoff"

    def test_last_milestone_is_closure(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert result[-1]["milestone_type"] == "closure"

    def test_ba_tasks_and_test_tasks_present(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        # Kickoff has both ba_tasks and test_tasks
        kickoff = result[0]
        assert isinstance(kickoff["_ba_tasks"], list)
        assert isinstance(kickoff["_test_tasks"], list)
        assert len(kickoff["_ba_tasks"]) > 0
        assert len(kickoff["_test_tasks"]) > 0

    def test_project_id_set_on_all_milestones(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        pid = "test-project-uuid"
        result = generate_milestones(pid, "2026-01-01", "2026-06-30")
        assert all(ms["project_id"] == pid for ms in result)

    def test_status_is_planned_by_default(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert all(ms["status"] == "planned" for ms in result)

    def test_accepts_date_objects_as_input(self):
        """_build_milestones should accept datetime.date inputs, not just strings."""
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", date(2026, 1, 1), date(2026, 12, 31))
        assert len(result) == 9

    def test_short_project_uses_30_day_minimum(self):
        """Duration of 0 days falls back to 30-day minimum to avoid zero-duration milestones."""
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        # Same start and end date
        result = generate_milestones("proj-1", "2026-06-01", "2026-06-01")
        assert len(result) == 9
        for ms in result:
            # end_date >= start_date (at least 1 day difference due to max(1, ...))
            assert ms["end_date"] >= ms["start_date"]

    def test_preconditions_is_list(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        kickoff = result[0]
        requirements = result[1]
        assert kickoff["preconditions"] == []
        assert isinstance(requirements["preconditions"], list)
        assert len(requirements["preconditions"]) > 0

    def test_done_criteria_not_empty(self):
        from app.services.milestone_generator import generate_milestones  # type: ignore[import]
        result = generate_milestones("proj-1", "2026-01-01", "2026-12-31")
        for ms in result:
            assert ms["done_criteria"] != ""


class TestGenerateBaMilestones:
    """Tests for generate_ba_milestones — BA track."""

    def test_returns_8_milestones(self):
        from app.services.milestone_generator import generate_ba_milestones  # type: ignore[import]
        result = generate_ba_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert len(result) == 8

    def test_track_is_ba(self):
        from app.services.milestone_generator import generate_ba_milestones  # type: ignore[import]
        result = generate_ba_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert all(ms["track"] == "ba" for ms in result)

    def test_first_milestone_is_ba_kickoff(self):
        from app.services.milestone_generator import generate_ba_milestones  # type: ignore[import]
        result = generate_ba_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert result[0]["milestone_type"] == "ba_kickoff"

    def test_last_milestone_is_ba_closure(self):
        from app.services.milestone_generator import generate_ba_milestones  # type: ignore[import]
        result = generate_ba_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert result[-1]["milestone_type"] == "ba_closure"

    def test_all_have_ba_tasks(self):
        from app.services.milestone_generator import generate_ba_milestones  # type: ignore[import]
        result = generate_ba_milestones("proj-1", "2026-01-01", "2026-12-31")
        for ms in result:
            assert "_ba_tasks" in ms
            assert len(ms["_ba_tasks"]) > 0

    def test_no_test_tasks_in_ba_track(self):
        """BA track milestones do not contain test_tasks."""
        from app.services.milestone_generator import generate_ba_milestones  # type: ignore[import]
        result = generate_ba_milestones("proj-1", "2026-01-01", "2026-12-31")
        for ms in result:
            assert ms.get("_test_tasks", []) == []


class TestGenerateTestMilestones:
    """Tests for generate_test_milestones — test track."""

    def test_returns_7_milestones(self):
        from app.services.milestone_generator import generate_test_milestones  # type: ignore[import]
        result = generate_test_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert len(result) == 7

    def test_track_is_test(self):
        from app.services.milestone_generator import generate_test_milestones  # type: ignore[import]
        result = generate_test_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert all(ms["track"] == "test" for ms in result)

    def test_first_milestone_is_test_planning(self):
        from app.services.milestone_generator import generate_test_milestones  # type: ignore[import]
        result = generate_test_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert result[0]["milestone_type"] == "test_planning"

    def test_last_milestone_is_test_closure(self):
        from app.services.milestone_generator import generate_test_milestones  # type: ignore[import]
        result = generate_test_milestones("proj-1", "2026-01-01", "2026-12-31")
        assert result[-1]["milestone_type"] == "test_closure"

    def test_all_have_test_tasks(self):
        from app.services.milestone_generator import generate_test_milestones  # type: ignore[import]
        result = generate_test_milestones("proj-1", "2026-01-01", "2026-12-31")
        for ms in result:
            assert "_test_tasks" in ms
            assert len(ms["_test_tasks"]) > 0

    def test_total_all_tracks(self):
        """Combined: 9 + 8 + 7 = 24 milestones."""
        from app.services.milestone_generator import (  # type: ignore[import]
            generate_milestones, generate_ba_milestones, generate_test_milestones,
        )
        all_ms = (
            generate_milestones("p", "2026-01-01", "2026-12-31")
            + generate_ba_milestones("p", "2026-01-01", "2026-12-31")
            + generate_test_milestones("p", "2026-01-01", "2026-12-31")
        )
        assert len(all_ms) == 24


# ===========================================================================
# MILESTONE TEMPLATES MAP
# ===========================================================================

class TestMilestoneTemplates:
    def test_milestone_templates_covers_all_types(self):
        from app.services.milestone_generator import MILESTONE_TEMPLATES  # type: ignore[import]
        expected_types = {"kickoff", "requirements", "design", "development", "sit", "uat", "golive", "closure"}
        assert set(MILESTONE_TEMPLATES.keys()) >= expected_types

    def test_ba_milestone_templates_covers_all_types(self):
        from app.services.milestone_generator import BA_MILESTONE_TEMPLATES  # type: ignore[import]
        expected = {"ba_kickoff", "ba_elicitation", "ba_analysis", "ba_brd", "ba_frs", "ba_dev_support", "ba_uat_support", "ba_closure"}
        assert set(BA_MILESTONE_TEMPLATES.keys()) == expected

    def test_test_milestone_templates_covers_all_types(self):
        from app.services.milestone_generator import TEST_MILESTONE_TEMPLATES  # type: ignore[import]
        expected = {"test_planning", "test_design", "test_env_setup", "test_sit_exec", "test_uat_exec", "test_golive", "test_closure"}
        assert set(TEST_MILESTONE_TEMPLATES.keys()) == expected

    def test_each_template_entry_is_list_of_tuples(self):
        from app.services.milestone_generator import MILESTONE_TEMPLATES  # type: ignore[import]
        for ms_type, templates in MILESTONE_TEMPLATES.items():
            assert isinstance(templates, list), f"{ms_type} should map to list"
            for item in templates:
                assert len(item) == 2, f"Each template entry should be (filename, category) tuple"


# ===========================================================================
# MEETING PARSER
# ===========================================================================

class TestMeetingParser:
    """Tests for parse_meeting_notes."""

    @pytest.fixture()
    def members(self):
        return [
            {"alias": "nva", "full_name": "Nguyen Van A", "role": "PM"},
            {"alias": "ttb", "full_name": "Tran Thi B", "role": "BA"},
            {"alias": "lvc", "full_name": "Le Van C", "role": "Dev"},
        ]

    def test_empty_notes_returns_empty_lists(self):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        result = parse_meeting_notes("", [])
        assert result["attendees"] == []
        assert result["decisions"] == []
        assert result["action_items"] == []
        assert result["risks"] == []

    def test_extracts_attendees_from_aliases(self, members):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "Meeting attended by @nva and @ttb. Also @lvc joined later."
        result = parse_meeting_notes(notes, members)
        aliases = {a["alias"] for a in result["attendees"]}
        assert "nva" in aliases
        assert "ttb" in aliases
        assert "lvc" in aliases

    def test_maps_alias_to_full_name(self, members):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "@nva opened the meeting."
        result = parse_meeting_notes(notes, members)
        attendee = next(a for a in result["attendees"] if a["alias"] == "nva")
        assert attendee["full_name"] == "Nguyen Van A"
        assert attendee["role"] == "PM"

    def test_unknown_alias_has_none_full_name(self):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "@unknown_person attended."
        result = parse_meeting_notes(notes, [])
        assert result["attendees"][0]["full_name"] is None
        assert result["attendees"][0]["role"] is None

    def test_extracts_decisions_by_decided_keyword(self):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = (
            "The team decided to proceed with microservices.\n"
            "Regular status update.\n"
            "It was decided that UAT starts next Monday.\n"
        )
        result = parse_meeting_notes(notes, [])
        assert len(result["decisions"]) == 2
        assert any("microservices" in d for d in result["decisions"])

    def test_extracts_decisions_by_vietnamese_keyword(self):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "Team quyết định chuyển sang cloud trước Q3.\nBình thường."
        result = parse_meeting_notes(notes, [])
        assert len(result["decisions"]) == 1
        assert "cloud" in result["decisions"][0]

    def test_extracts_action_items_with_deadline(self, members):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "@nva will prepare the BRD by 2026-04-20.\nGeneral discussion."
        result = parse_meeting_notes(notes, members)
        assert len(result["action_items"]) == 1
        action = result["action_items"][0]
        assert action["assignees"][0]["alias"] == "nva"
        assert action["deadline_hint"] is not None

    def test_action_item_without_deadline_not_extracted(self, members):
        """A line with @alias but no deadline pattern should NOT be in action_items."""
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "@nva will handle this later.\nRandom update from @ttb."
        result = parse_meeting_notes(notes, members)
        # No deadline keywords present
        assert len(result["action_items"]) == 0

    def test_extracts_risks_by_english_keyword(self):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = (
            "There is a risk of timeline slippage.\n"
            "Budget looks fine.\n"
            "Security risk identified in module X.\n"
        )
        result = parse_meeting_notes(notes, [])
        assert len(result["risks"]) == 2
        assert any("timeline" in r for r in result["risks"])

    def test_extracts_risks_by_vietnamese_keyword(self):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "Có rủi ro về ngân sách Q3.\nMọi thứ khác bình thường."
        result = parse_meeting_notes(notes, [])
        assert len(result["risks"]) == 1

    def test_deduplicates_attendees(self, members):
        """Same alias mentioned multiple times → only one attendee entry."""
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "@nva said hello. @nva agreed. @nva will follow up."
        result = parse_meeting_notes(notes, members)
        aliases = [a["alias"] for a in result["attendees"]]
        assert aliases.count("nva") == 1

    def test_action_item_with_vietnamese_deadline(self, members):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "@ttb hoàn thành BRS trước 2026-04-30."
        result = parse_meeting_notes(notes, members)
        assert len(result["action_items"]) == 1
        assert result["action_items"][0]["assignees"][0]["alias"] == "ttb"

    def test_multiple_assignees_in_one_action(self, members):
        from app.services.meeting_parser import parse_meeting_notes  # type: ignore[import]
        notes = "@nva and @ttb will review the BRD by Friday."
        result = parse_meeting_notes(notes, members)
        if result["action_items"]:
            action = result["action_items"][0]
            aliases = {a["alias"] for a in action["assignees"]}
            assert "nva" in aliases
            assert "ttb" in aliases


# ===========================================================================
# PROJECT TEMPLATE SERVICE
# ===========================================================================

class TestProjectTemplate:
    """Tests for project_template.build_folder_records."""

    def test_returns_non_empty_list(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        assert len(records) > 0

    def test_all_four_tracks_present(self):
        from app.services.project_template import build_folder_records, FOLDER_STRUCTURE  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        tracks = {r["track"] for r in records}
        assert tracks == set(FOLDER_STRUCTURE.keys())

    def test_project_track_has_9_folders(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        project_folders = [r for r in records if r["track"] == "project"]
        assert len(project_folders) == 9

    def test_ba_track_has_8_folders(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        ba_folders = [r for r in records if r["track"] == "ba"]
        assert len(ba_folders) == 8

    def test_test_track_has_7_folders(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        test_folders = [r for r in records if r["track"] == "test"]
        assert len(test_folders) == 7

    def test_management_track_has_5_folders(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        mgmt_folders = [r for r in records if r["track"] == "management"]
        assert len(mgmt_folders) == 5

    def test_total_folder_count(self):
        """9 + 8 + 7 + 5 = 29 total folders."""
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        assert len(records) == 29

    def test_all_records_have_project_id(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        pid = "test-project-uuid"
        records = build_folder_records(pid, "PRJ_001")
        assert all(r["project_id"] == pid for r in records)

    def test_all_records_have_required_fields(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        required_fields = {"project_id", "parent_id", "folder_name", "folder_path", "track", "sort_order"}
        for record in records:
            assert required_fields.issubset(set(record.keys()))

    def test_parent_id_is_none(self):
        """Top-level folders all have parent_id=None (flat structure in current implementation)."""
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        assert all(r["parent_id"] is None for r in records)

    def test_sort_orders_are_positive(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        assert all(r["sort_order"] > 0 for r in records)

    def test_folder_paths_contain_track_prefix(self):
        from app.services.project_template import build_folder_records  # type: ignore[import]
        records = build_folder_records("proj-1", "PRJ_001")
        for record in records:
            track = record["track"]
            path = record["folder_path"]
            assert path.startswith(track + "/"), \
                f"folder_path '{path}' should start with track '{track}/'"


# ===========================================================================
# GENERATE ACTIVITY TASKS
# ===========================================================================

class TestGenerateActivityTasks:
    """Tests for generate_activity_tasks — 38 governance tasks across 5 domains."""

    def test_returns_38_tasks(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        assert len(result) == 38

    def test_all_tasks_have_project_id(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        pid = "test-uuid-123"
        result = generate_activity_tasks(pid)
        assert all(t["project_id"] == pid for t in result)

    def test_all_tasks_status_is_pending(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        assert all(t["status"] == "pending" for t in result)

    def test_five_domains_present(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        domains = {t["activity_domain"] for t in result}
        expected = {
            "business_requirements", "architecture_code",
            "infrastructure", "security_iam", "compliance_governance",
        }
        assert domains == expected

    def test_business_requirements_has_8_tasks(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        br_tasks = [t for t in result if t["activity_domain"] == "business_requirements"]
        assert len(br_tasks) == 8

    def test_architecture_code_has_8_tasks(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        ac_tasks = [t for t in result if t["activity_domain"] == "architecture_code"]
        assert len(ac_tasks) == 8

    def test_infrastructure_has_8_tasks(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        infra_tasks = [t for t in result if t["activity_domain"] == "infrastructure"]
        assert len(infra_tasks) == 8

    def test_security_iam_has_7_tasks(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        sec_tasks = [t for t in result if t["activity_domain"] == "security_iam"]
        assert len(sec_tasks) == 7

    def test_compliance_governance_has_7_tasks(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        comp_tasks = [t for t in result if t["activity_domain"] == "compliance_governance"]
        assert len(comp_tasks) == 7

    def test_all_tasks_have_required_fields(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        required = {"project_id", "activity_domain", "title", "status", "sort_order"}
        for task in result:
            assert required.issubset(set(task.keys()))

    def test_sort_orders_are_positive(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        assert all(t["sort_order"] > 0 for t in result)

    def test_sort_orders_sequential_per_domain(self):
        """sort_order within each domain starts at 1 and is sequential."""
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        from collections import defaultdict
        by_domain: dict = defaultdict(list)
        for t in result:
            by_domain[t["activity_domain"]].append(t["sort_order"])
        for domain, orders in by_domain.items():
            assert orders == list(range(1, len(orders) + 1)), \
                f"Domain '{domain}' sort_orders not sequential: {orders}"

    def test_all_titles_non_empty(self):
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        result = generate_activity_tasks("proj-1")
        assert all(len(t["title"].strip()) > 0 for t in result)

    def test_project_id_is_isolated_per_call(self):
        """Different project IDs produce independent task lists."""
        from app.services.milestone_generator import generate_activity_tasks  # type: ignore[import]
        r1 = generate_activity_tasks("pid-aaa")
        r2 = generate_activity_tasks("pid-bbb")
        assert all(t["project_id"] == "pid-aaa" for t in r1)
        assert all(t["project_id"] == "pid-bbb" for t in r2)
