"""
Meeting Parser — Phase 3
Parse raw_notes: extract attendees, decisions, action_items, risks
"""
import re
from typing import Any


def parse_meeting_notes(raw_notes: str, members: list[dict]) -> dict[str, Any]:
    """
    Parse raw meeting notes.

    - @alias tokens → map to member full_name
    - decisions: lines containing "decided" / "quyết định"
    - action_items: lines with @alias + deadline pattern
    - risks: lines containing "risk" / "rủi ro"
    """
    alias_map = {m["alias"]: m for m in members if m.get("alias")}

    lines = raw_notes.splitlines()

    # Extract all @alias mentions
    all_aliases = re.findall(r"@(\w+)", raw_notes)
    attendee_set = {}
    for alias in all_aliases:
        if alias in alias_map:
            member = alias_map[alias]
            attendee_set[alias] = {
                "alias": alias,
                "full_name": member.get("full_name"),
                "role": member.get("role"),
            }
        else:
            attendee_set[alias] = {"alias": alias, "full_name": None, "role": None}

    attendees = list(attendee_set.values())

    # Decisions: lines with "decided" or "quyết định" (case-insensitive)
    decisions = []
    decision_pattern = re.compile(r"decided|quyết định", re.IGNORECASE)
    for line in lines:
        line = line.strip()
        if line and decision_pattern.search(line):
            decisions.append(line)

    # Action items: lines with @alias and a deadline pattern (by/before/deadline/due/trước)
    action_items = []
    action_pattern = re.compile(r"@\w+")
    deadline_pattern = re.compile(
        r"\b(by|before|deadline|due|trước|ngày|hạn)\b\s*[\w/\-]+", re.IGNORECASE
    )
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if action_pattern.search(line) and deadline_pattern.search(line):
            aliases_in_line = re.findall(r"@(\w+)", line)
            assignees = []
            for a in aliases_in_line:
                if a in alias_map:
                    assignees.append({
                        "alias": a,
                        "full_name": alias_map[a].get("full_name"),
                    })
                else:
                    assignees.append({"alias": a, "full_name": None})
            deadline_match = deadline_pattern.search(line)
            action_items.append({
                "text": line,
                "assignees": assignees,
                "deadline_hint": deadline_match.group(0) if deadline_match else None,
            })

    # Risks: lines with "risk" or "rủi ro" (case-insensitive)
    risks = []
    risk_pattern = re.compile(r"\brisk\b|rủi ro", re.IGNORECASE)
    for line in lines:
        line = line.strip()
        if line and risk_pattern.search(line):
            risks.append(line)

    return {
        "attendees": attendees,
        "decisions": decisions,
        "action_items": action_items,
        "risks": risks,
    }
