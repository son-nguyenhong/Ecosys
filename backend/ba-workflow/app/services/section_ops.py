"""
Section ops engine — BA Studio.

Thuật toán phải khớp TUYỆT ĐỐI với bản frontend (frontend/src/lib/ba-studio/diff.ts):
bản preview mà BA thấy trước khi duyệt CR do frontend tính, còn kết quả merge thật do
backend tính. Hai bên lệch nhau = tài liệu phát hành khác với bản đã review.
Test parity: tests/backend/test_ba_studio.py + frontend .../__tests__/diff.test.ts
dùng cùng bộ fixture.

Ops:
    modify : thay heading / heading_level / body của mục có section_key
    remove : loại mục khỏi tài liệu
    add    : chèn mục mới NGAY SAU after_section_key
             (NULL hoặc không tìm thấy → đẩy xuống CUỐI tài liệu)
    move   : đổi vị trí mục — chèn ngay sau after_section_key
             (NULL → đưa lên ĐẦU tài liệu; V051)

Vì sao 'add' và 'move' hiểu after_section_key = NULL khác nhau: 'add' đã lưu hành
từ V049 với nghĩa "đẩy xuống cuối" (8 CR seed đang dùng), không đổi được. 'move'
sinh ra để đưa mục lên đầu nên NULL = đầu tài liệu. derive_ops tận dụng đúng cặp
này: mục mới ở đầu file = add (xuống cuối) + move (lên đầu).

Thứ tự op trong danh sách quan trọng — áp tuần tự.
"""
from __future__ import annotations

from typing import Any, Optional

# Section: {"section_key": str, "heading": str, "heading_level": int, "body": str}
Section = dict[str, Any]
Op = dict[str, Any]

OP_KINDS = ("add", "modify", "remove", "move")
DEFAULT_HEADING_LEVEL = 2


def section_level(section: dict) -> int:
    """
    heading_level của mục. Snapshot phát hành trước V051 không có trường này:
    heading rỗng → 0 (phần mở đầu), còn lại → 2 (đúng cách 7 tài liệu seed hiển thị).
    """
    level = section.get("heading_level")
    if level is None:
        return 0 if not (section.get("heading") or "") else DEFAULT_HEADING_LEVEL
    return int(level)


def _norm(section: dict) -> Section:
    return {
        "section_key": str(section["section_key"]),
        "heading": section.get("heading") or "",
        "heading_level": section_level(section),
        "body": section.get("body") or "",
    }


def apply_ops(sections: list[Section], ops: list[Op]) -> list[Section]:
    """Áp tuần tự danh sách ops lên bản copy của sections. Không mutate input."""
    out: list[Section] = [_norm(s) for s in sections]

    for op in ops:
        kind = op.get("op")
        key = op.get("section_key")

        if kind == "modify":
            for i, s in enumerate(out):
                if s["section_key"] == key:
                    out[i] = {
                        "section_key": key,
                        "heading": op["heading"] if op.get("heading") is not None else s["heading"],
                        "heading_level": (int(op["heading_level"])
                                          if op.get("heading_level") is not None
                                          else s["heading_level"]),
                        "body": op["body"] if op.get("body") is not None else s["body"],
                    }
                    break
            # không tìm thấy → bỏ qua (giữ nguyên hành vi của thiết kế)

        elif kind == "remove":
            out = [s for s in out if s["section_key"] != key]

        elif kind == "add":
            new_section: Section = {
                "section_key": key,
                "heading": op.get("heading") or "",
                "heading_level": (int(op["heading_level"])
                                  if op.get("heading_level") is not None
                                  else (0 if not (op.get("heading") or "") else DEFAULT_HEADING_LEVEL)),
                "body": op.get("body") or "",
            }
            after = op.get("after_section_key")
            idx: Optional[int] = None
            if after:
                idx = next((i for i, s in enumerate(out) if s["section_key"] == after), None)
            if idx is None:
                out.append(new_section)
            else:
                out.insert(idx + 1, new_section)

        elif kind == "move":
            idx = next((i for i, s in enumerate(out) if s["section_key"] == key), None)
            if idx is None:
                continue                                  # mục không còn → bỏ qua
            moved = out.pop(idx)
            after = op.get("after_section_key")
            if not after:
                out.insert(0, moved)                      # NULL = lên đầu tài liệu
            else:
                anchor = next((i for i, s in enumerate(out) if s["section_key"] == after), None)
                if anchor is None:
                    out.append(moved)
                else:
                    out.insert(anchor + 1, moved)

    return out


def ops_delta(ops: list[Op]) -> dict[str, int]:
    """Đếm số op theo loại — dùng cho cột 'Δ Mục' ở sổ CR và timeline phiên bản."""
    return {
        "add": sum(1 for o in ops if o.get("op") == "add"),
        "modify": sum(1 for o in ops if o.get("op") == "modify"),
        "remove": sum(1 for o in ops if o.get("op") == "remove"),
        "move": sum(1 for o in ops if o.get("op") == "move"),
    }


def next_section_key(sections: list[Section]) -> str:
    """Sinh section_key kế tiếp: s1, s2… bỏ qua key không theo pattern."""
    max_n = 0
    for s in sections:
        key = str(s.get("section_key") or "")
        if key.startswith("s") and key[1:].isdigit():
            max_n = max(max_n, int(key[1:]))
    return f"s{max_n + 1}"


def next_version_label(seq: int) -> str:
    """Bản gốc seq=1 → v1.0; merge thứ k → v{k+1}.0 (README §8.2)."""
    return f"v{seq}.0"


def validate_ops(ops: list[Op], sections: list[Section]) -> list[str]:
    """
    Kiểm tra ops có áp được lên sections hiện tại không.
    Trả về danh sách lỗi (rỗng = hợp lệ). Mô phỏng tuần tự để bắt cả xung đột giữa các op.
    """
    errors: list[str] = []
    keys = [str(s["section_key"]) for s in sections]

    for i, op in enumerate(ops, start=1):
        kind = op.get("op")
        key = (op.get("section_key") or "").strip()
        label = f"Op #{i}"

        if kind not in OP_KINDS:
            errors.append(f"{label}: op không hợp lệ '{kind}' (chỉ {'/'.join(OP_KINDS)})")
            continue
        if not key:
            errors.append(f"{label}: thiếu section_key")
            continue

        level = op.get("heading_level")
        if level is not None and not (0 <= int(level) <= 6):
            errors.append(f"{label}: heading_level phải trong 0..6 (nhận {level})")
            continue
        # heading rỗng chỉ hợp lệ cho phần mở đầu (level 0) — khớp CHECK của V051
        needs_heading = kind in ("add", "modify") and (level is None or int(level) > 0)

        if kind == "add":
            if key in keys:
                errors.append(f"{label}: section_key '{key}' đã tồn tại, không thể thêm mới")
                continue
            after = op.get("after_section_key")
            if after and after not in keys:
                errors.append(f"{label}: after_section_key '{after}' không tồn tại trong tài liệu")
                continue
            if needs_heading and not (op.get("heading") or "").strip():
                errors.append(f"{label}: mục thêm mới phải có tiêu đề")
            idx = keys.index(after) + 1 if after and after in keys else len(keys)
            keys.insert(idx, key)

        elif kind == "modify":
            if key not in keys:
                errors.append(f"{label}: section_key '{key}' không tồn tại để sửa")
                continue
            if needs_heading and not (op.get("heading") or "").strip():
                errors.append(f"{label}: mục sửa phải có tiêu đề")

        elif kind == "remove":
            if key not in keys:
                errors.append(f"{label}: section_key '{key}' không tồn tại để xoá")
                continue
            keys.remove(key)

        elif kind == "move":
            if key not in keys:
                errors.append(f"{label}: section_key '{key}' không tồn tại để đổi vị trí")
                continue
            after = op.get("after_section_key")
            if after == key:
                errors.append(f"{label}: không thể chèn mục '{key}' sau chính nó")
                continue
            if after and after not in keys:
                errors.append(f"{label}: after_section_key '{after}' không tồn tại trong tài liệu")
                continue
            keys.remove(key)
            keys.insert(keys.index(after) + 1 if after else 0, key)

    return errors
