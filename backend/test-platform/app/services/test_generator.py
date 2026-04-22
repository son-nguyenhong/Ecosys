"""
BRS → Test Case Auto-Generator — FR-013
BRS format assumption (REQUEST-BA-QA-001):
  ## Module Name
  - Business rule 1
  - Business rule 2

Each bullet point = 1 test case + 1 Playwright script
"""
import re
from uuid import UUID


def parse_brs_content(content: str) -> list[dict]:
    """
    Parse BRS content into list of {module, rule} dicts.
    Assumption: ## headings = modules, - bullets = rules.
    """
    rules = []
    current_module = "General"
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("## "):
            current_module = line[3:].strip()
        elif line.startswith("- ") and len(line) > 2:
            rule_text = line[2:].strip()
            if rule_text:
                rules.append({"module": current_module, "rule": rule_text})
    return rules


def generate_playwright_script(module: str, rule: str) -> str:
    """Generate Playwright test script template from business rule."""
    safe_module = module.replace("'", "\\'")
    safe_rule = rule.replace("'", "\\'")
    return f"""import {{ test, expect }} from '@playwright/test';

test('{safe_module}: {safe_rule}', async ({{ page }}) => {{
  await page.goto(process.env.BASE_URL || 'http://localhost:5173');
  await page.waitForLoadState('networkidle');
  // TODO: Implement specific assertions for:
  // {safe_rule}
  await expect(page).toHaveTitle(/.+/);
}});
"""


def generate_test_cases_from_brs(content: dict | str, brs_id: str = "") -> list[dict]:
    """
    Main entry point — returns list of test case dicts ready for DB insert.
    content can be a dict (JSONB from brs_sync.payload) or raw string.
    """
    if isinstance(content, dict):
        raw = content.get("raw_text") or content.get("content") or str(content)
    else:
        raw = content or ""

    rules = parse_brs_content(raw)
    test_cases = []
    for item in rules:
        test_cases.append({
            "brs_id": brs_id,
            "title": f"[{item['module']}] {item['rule']}",
            "module": item["module"],
            "steps": [{"step": item["rule"]}],
            "expected_result": item["rule"],
            "playwright_script": generate_playwright_script(item["module"], item["rule"]),
        })
    return test_cases
