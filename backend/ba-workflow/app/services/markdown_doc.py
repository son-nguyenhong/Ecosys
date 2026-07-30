"""
Markdown ⇄ mục tài liệu — BA Studio.

BA của VIB soạn BRS/FSD trong MỘT file Markdown. Module vẫn cần "mục" để diff
cấp mục khi review Change Request, nên mục là PHÉP CHIẾU của Markdown: tách theo
heading ATX (#, ##, ###…), ghép lại thành đúng file cũ.

    split_markdown  : Markdown  → [{heading, heading_level, body}]
    join_markdown   : [mục]     → Markdown
    align_sections  : gán section_key cho mục mới bằng cách khớp với mục cũ
                      (heading đổi tên vẫn giữ key → diff ra 'modify' chứ không
                       phải remove + add)
    derive_ops      : (mục cũ, mục mới) → section ops tái tạo ĐÚNG mục mới,
                      kể cả thứ tự (nhờ op 'move' thêm ở V051)

Thuật toán phải khớp TUYỆT ĐỐI với frontend/src/lib/ba-studio/markdown.ts:
frontend tính bản preview BA duyệt, backend tính bản phát hành thật.
Test parity: tests/backend/test_ba_studio.py ↔ .../__tests__/markdown.test.ts
dùng cùng bộ fixture.

Bất biến được test:
    1. join(split(x))            là dạng chuẩn hoá của x (chạy lại không đổi nữa)
    2. split(join(split(x)))  ==  split(x)
    3. apply_ops(cũ, derive_ops(cũ, mới))  ==  mới   (kể cả thứ tự)
"""
from __future__ import annotations

import re
from typing import Any, Optional

from app.services.section_ops import DEFAULT_HEADING_LEVEL, next_section_key, section_level

ParsedSection = dict[str, Any]   # {heading, heading_level, body}
Section = dict[str, Any]         # ParsedSection + section_key

# ── Nhận dạng cú pháp ────────────────────────────────────────────────────────

# ATX heading: thụt lề ≤ 3 space, 1–6 dấu #, phải có space sau (CommonMark)
_ATX = re.compile(r"^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$")
# Đóng/mở khối code: ``` hoặc ~~~ (≥3 ký tự)
_FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
# Gạch chân setext: === (h1) hoặc --- (h2)
_SETEXT = re.compile(r"^ {0,3}(=+|-+)[ \t]*$")
# Dòng KHÔNG được coi là đoạn văn để làm setext (list, quote, bảng, heading, thụt 4)
_NOT_PARAGRAPH = re.compile(r"^(?: {4,}|[ \t]*(?:[-*+>|]|\d+[.)])[ \t]|[ \t]*#{1,6}[ \t]|[ \t]*$)")
# Tách token cho phép đo tương đồng — giữ chữ/số mọi ngôn ngữ, bỏ dấu câu và _
_TOKEN_SPLIT = re.compile(r"[\W_]+", re.UNICODE)

#: Ngưỡng tương đồng để coi 2 mục là "cùng một mục đã được viết lại"
SIMILARITY_THRESHOLD = 0.5


def _strip_closing_hashes(text: str) -> str:
    """'## Tiêu đề ##' → 'Tiêu đề' (closing sequence của ATX heading)."""
    stripped = text.rstrip()
    if stripped.endswith("#"):
        without = stripped.rstrip("#")
        # chỉ là closing sequence khi trước nó là space (hoặc rỗng hoàn toàn)
        if without == "" or without.endswith((" ", "\t")):
            return without.rstrip()
    return stripped


def _atx(line: str) -> Optional[tuple[int, str]]:
    """(level, text) nếu là ATX heading CÓ nội dung, ngược lại None."""
    m = _ATX.match(line)
    if not m:
        return None
    text = _strip_closing_hashes(m.group(2) or "")
    if not text:
        # '###' trơ trọi: coi như văn bản thường (heading rỗng không lưu được)
        return None
    return len(m.group(1)), text


class _FenceTracker:
    """Theo dõi khối code để không tách heading nằm trong ``` ```."""

    def __init__(self) -> None:
        self.char: Optional[str] = None
        self.size = 0

    @property
    def open(self) -> bool:
        return self.char is not None

    def feed(self, line: str) -> None:
        m = _FENCE.match(line)
        if not m:
            return
        marker = m.group(1)
        info = m.group(2).strip()
        if not self.open:
            self.char = marker[0]
            self.size = len(marker)
        elif marker[0] == self.char and len(marker) >= self.size and not info:
            self.char = None
            self.size = 0


def _blank(line: str) -> bool:
    return line.strip() == ""


def _trim_blank_edges(lines: list[str]) -> list[str]:
    start = 0
    end = len(lines)
    while start < end and _blank(lines[start]):
        start += 1
    while end > start and _blank(lines[end - 1]):
        end -= 1
    return lines[start:end]


# ── Chuẩn hoá ────────────────────────────────────────────────────────────────


def normalize_markdown(md: str) -> str:
    """
    Đưa Markdown về dạng chuẩn: xuống dòng \\n, setext → ATX, bỏ thụt lề và
    closing hashes của heading. Chạy lại lần 2 không đổi gì thêm (idempotent).
    """
    text = (md or "").replace("\r\n", "\n").replace("\r", "\n")
    out: list[str] = []
    fence = _FenceTracker()

    for line in text.split("\n"):
        if fence.open:
            out.append(line)
            fence.feed(line)
            continue
        fence.feed(line)
        if fence.open:               # dòng này vừa MỞ fence
            out.append(line)
            continue

        setext = _SETEXT.match(line)
        if setext and out and not _NOT_PARAGRAPH.match(out[-1]):
            level = 1 if setext.group(1)[0] == "=" else 2
            out[-1] = "#" * level + " " + out[-1].strip()
            continue

        hit = _atx(line)
        out.append("#" * hit[0] + " " + hit[1] if hit else line)

    return "\n".join(out)


# ── split / join ─────────────────────────────────────────────────────────────


def split_markdown(md: str) -> list[ParsedSection]:
    """
    Tách Markdown thành mục theo heading. Nội dung trước heading đầu tiên thành
    "phần mở đầu" (heading = '', heading_level = 0) nếu có chữ.
    """
    normalized = normalize_markdown(md)
    lines = normalized.split("\n")

    preamble: list[str] = []
    sections: list[dict[str, Any]] = []
    current: Optional[dict[str, Any]] = None
    fence = _FenceTracker()

    for line in lines:
        in_fence = fence.open
        fence.feed(line)
        if in_fence:
            (current["lines"] if current else preamble).append(line)
            continue

        hit = None if fence.open else _atx(line)
        if hit:
            current = {"heading": hit[1], "heading_level": hit[0], "lines": []}
            sections.append(current)
        else:
            (current["lines"] if current else preamble).append(line)

    out: list[ParsedSection] = []
    pre = _trim_blank_edges(preamble)
    if pre:
        out.append({"heading": "", "heading_level": 0, "body": "\n".join(pre)})
    for s in sections:
        out.append({
            "heading": s["heading"],
            "heading_level": s["heading_level"],
            "body": "\n".join(_trim_blank_edges(s["lines"])),
        })
    return out


def join_markdown(sections: list[dict]) -> str:
    """Ghép mục thành 1 file Markdown — nghịch đảo của split_markdown."""
    blocks: list[str] = []
    for s in sections:
        heading = (s.get("heading") or "").strip()
        body = s.get("body") or ""
        level = section_level(s)
        if level <= 0 or not heading:
            if body.strip():
                blocks.append(body)
            continue
        block = "#" * min(level, 6) + " " + heading
        if body.strip():
            block += "\n\n" + body
        blocks.append(block)
    return "\n\n".join(blocks)


# ── Đo tương đồng ────────────────────────────────────────────────────────────


def _tokens(text: str) -> set[str]:
    return {t for t in _TOKEN_SPLIT.split((text or "").lower()) if t}


def similarity(a: str, b: str) -> float:
    """Jaccard trên tập token. Hai chuỗi rỗng → 1.0; một rỗng → 0.0."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta and not tb:
        return 1.0
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return inter / union


def _match_score(old: dict, new: dict) -> float:
    return (similarity(old.get("heading") or "", new.get("heading") or "")
            + similarity(old.get("body") or "", new.get("body") or "")) / 2


# ── align: gán section_key ───────────────────────────────────────────────────


def align_sections(old: list[Section], parsed: list[ParsedSection]) -> list[Section]:
    """
    Gán section_key cho danh sách mục vừa tách từ Markdown, ưu tiên giữ key của
    mục cũ tương ứng để CR diff ra 'modify' thay vì 'remove + add'.

    3 lượt khớp (dừng ở lượt đầu tiên tìm được):
        1. cùng heading_level + heading
        2. cùng body (khác rỗng)
        3. điểm tương đồng heading/body ≥ SIMILARITY_THRESHOLD, lấy cao nhất
    Mục còn lại nhận key mới, KHÔNG dùng lại key của mục đã bị xoá (giữ vết audit).
    """
    keys: list[Optional[str]] = [None] * len(parsed)
    used: set[int] = set()

    def _try(predicate) -> None:
        for i, new in enumerate(parsed):
            if keys[i] is not None:
                continue
            for j, o in enumerate(old):
                if j in used:
                    continue
                if predicate(o, new):
                    keys[i] = str(o["section_key"])
                    used.add(j)
                    break

    # 1. heading + level giống nhau
    _try(lambda o, n: section_level(o) == section_level(n)
         and (o.get("heading") or "") == (n.get("heading") or ""))
    # 2. body giống nhau (khác rỗng)
    _try(lambda o, n: bool((n.get("body") or "").strip())
         and (o.get("body") or "") == (n.get("body") or ""))

    # 3. tương đồng cao nhất
    for i, new in enumerate(parsed):
        if keys[i] is not None:
            continue
        best_j: Optional[int] = None
        best_score = 0.0
        for j, o in enumerate(old):
            if j in used:
                continue
            score = _match_score(o, new)
            if score > best_score:
                best_score = score
                best_j = j
        if best_j is not None and best_score >= SIMILARITY_THRESHOLD:
            keys[i] = str(old[best_j]["section_key"])
            used.add(best_j)

    # còn lại: key mới, tránh trùng cả key của mục đã bị xoá
    pool: list[dict] = [{"section_key": str(s["section_key"])} for s in old]
    pool += [{"section_key": k} for k in keys if k]
    for i, new in enumerate(parsed):
        if keys[i] is None:
            key = next_section_key(pool)
            keys[i] = key
            pool.append({"section_key": key})

    return [
        {
            "section_key": keys[i],
            "heading": parsed[i].get("heading") or "",
            "heading_level": section_level(parsed[i]),
            "body": parsed[i].get("body") or "",
        }
        for i in range(len(parsed))
    ]


def sections_from_markdown(md: str, old: Optional[list[Section]] = None) -> list[Section]:
    """split + align trong một bước — dùng ở router."""
    return align_sections(old or [], split_markdown(md))


# ── derive_ops ───────────────────────────────────────────────────────────────


def derive_ops(old: list[Section], new: list[Section]) -> list[dict]:
    """
    Sinh section ops biến `old` thành `new` (KHỚP CẢ THỨ TỰ).

    Thứ tự phát sinh: remove → modify → add → move. Bước move sửa lại vị trí
    vì op 'add' chỉ chèn được sau một mục neo (after_section_key = NULL nghĩa là
    đẩy xuống cuối), nên mục mới ở đầu tài liệu = add + move.
    """
    old_by = {str(s["section_key"]): s for s in old}
    new_by = {str(s["section_key"]): s for s in new}
    ops: list[dict] = []

    # 1. remove — theo thứ tự tài liệu cũ
    for s in old:
        key = str(s["section_key"])
        if key not in new_by:
            ops.append({"op": "remove", "section_key": key})

    work = [str(s["section_key"]) for s in old if str(s["section_key"]) in new_by]

    # 2. modify — theo thứ tự tài liệu mới để CR đọc từ trên xuống
    for s in new:
        key = str(s["section_key"])
        o = old_by.get(key)
        if not o:
            continue
        if ((o.get("heading") or "") != (s.get("heading") or "")
                or (o.get("body") or "") != (s.get("body") or "")
                or section_level(o) != section_level(s)):
            ops.append({
                "op": "modify",
                "section_key": key,
                "heading": s.get("heading") or "",
                "heading_level": section_level(s),
                "body": s.get("body") or "",
            })

    # 3. add — neo vào mục đứng trước trong tài liệu mới
    for i, s in enumerate(new):
        key = str(s["section_key"])
        if key in old_by:
            continue
        anchor = str(new[i - 1]["section_key"]) if i > 0 else None
        ops.append({
            "op": "add",
            "section_key": key,
            "after_section_key": anchor,
            "heading": s.get("heading") or "",
            "heading_level": section_level(s),
            "body": s.get("body") or "",
        })
        # mô phỏng đúng apply_ops: không thấy neo → đẩy xuống cuối
        if anchor and anchor in work:
            work.insert(work.index(anchor) + 1, key)
        else:
            work.append(key)

    # 4. move — chỉnh thứ tự cho khớp tài liệu mới
    target = [str(s["section_key"]) for s in new]
    for i, key in enumerate(target):
        if i < len(work) and work[i] == key:
            continue
        anchor = target[i - 1] if i > 0 else None
        ops.append({"op": "move", "section_key": key, "after_section_key": anchor})
        work.remove(key)
        if anchor is None:
            work.insert(0, key)
        elif anchor in work:
            work.insert(work.index(anchor) + 1, key)
        else:
            work.append(key)

    return ops


def ops_from_markdown(current: list[Section], md: str) -> tuple[list[dict], list[Section]]:
    """
    Markdown mới → (ops, mục mới đã gán key). Dùng cho CR: BA sửa cả file,
    hệ thống tự suy ra thay đổi cấp mục để review và merge.
    """
    target = sections_from_markdown(md, current)
    return derive_ops(current, target), target
