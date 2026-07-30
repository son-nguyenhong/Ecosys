/**
 * AI Adoption for BA Team — nội dung khung chuẩn hoá của đội BA.
 *
 * Đây là TÀI LIỆU FRAMEWORK (chính sách nội bộ), không phải dữ liệu vận hành:
 * version hoá bằng Git, không cần bảng DB/API. Khối `governance` là quy định đã
 * được chốt (PII, PDPL, quy định SBV) — KHÔNG diễn giải lại câu chữ khi sửa UI.
 */

export type AiIconName =
  | 'sparkle' | 'flow' | 'database' | 'git' | 'shield' | 'eye'
  | 'target' | 'grid' | 'command' | 'route'

export interface AiPrinciple {
  icon: AiIconName
  title: string
  body: string
}

export interface UseCaseItem {
  name: string; phase: string; desc: string
  input: string; output: string; tool: string; how: string
}
export interface ToolItem {
  name: string; role: string; usedFor: string; priority: string; note: string
  primary?: boolean
}
export interface SkillItem {
  task: string; skills: string; cmd: string; output: string; note: string
}
export interface GovernanceItem { principle: string; rule: string; note: string }
export interface KbItem {
  component: string; managedIn: string[]; scope: string; purpose: string; note: string
  link?: 'docs'
}
export interface RoadmapItem {
  phase: string; objective: string; work: string; deliverable: string
}

export type PillarId = 'usecases' | 'tools' | 'skills' | 'governance' | 'kb' | 'roadmap'

export interface AiPillar {
  id: PillarId
  code: string
  name: string
  icon: AiIconName
  summary: string
  items: UseCaseItem[] | ToolItem[] | SkillItem[] | GovernanceItem[] | KbItem[] | RoadmapItem[]
}

export interface AiAdoption {
  title: string
  lead: string
  principles: AiPrinciple[]
  pillars: AiPillar[]
}

export const BA_AI_ADOPTION: AiAdoption = {
  title: 'AI Adoption for BA Team',
  lead:
    'Khung chuẩn hoá cách đội BA dùng AI để sản xuất tài liệu: lấy Claude làm công cụ chủ lực, ' +
    'dùng bộ skill/prompt tạo sẵn đầu ra chuẩn VIB, và kết nối trực tiếp với thư viện Master Doc ' +
    '& Change Request trong BA Studio.',

  principles: [
    { icon: 'sparkle', title: 'Claude là công cụ chủ lực', body: 'Toàn bộ use case BA dùng Claude làm công cụ chính.' },
    { icon: 'flow', title: 'BPMN / Flow = Claude + Mermaid', body: 'Claude sinh mã Mermaid → render thành sơ đồ → tinh chỉnh.' },
    { icon: 'database', title: 'KB = Claude Project + Git', body: 'Tri thức nạp vào Claude Project (RAG), versioning bằng Git.' },
    { icon: 'git', title: 'Git quản lý Master Doc + per-CR', body: 'Master Doc và tài liệu từng CR đều được version hoá trong Git.' },
    { icon: 'shield', title: 'Không đưa PII / dữ liệu thật lên AI', body: 'Ẩn danh hoặc dùng dữ liệu mẫu trước khi đưa vào AI public.' },
    { icon: 'eye', title: 'AI output luôn được người review', body: 'Tuân thủ PDPL & quy định SBV — AI hỗ trợ, không thay quyết định.' },
  ],

  pillars: [
    {
      id: 'usecases', code: '1.1', name: 'Priority Use Cases', icon: 'target',
      summary: '6 use case ưu tiên theo từng phase BA — từ soạn yêu cầu tới test case & SQL.',
      items: [
        {
          name: 'Requirement Drafting', phase: 'Requirement', desc: 'Soạn & chuẩn hoá yêu cầu.',
          input: 'Note họp, mô tả thô từ BU', output: 'Draft BRD/BRS có cấu trúc',
          tool: 'Claude', how: 'Dán note → prompt template BRS → rà chỉnh.',
        },
        {
          name: 'Meeting Minutes', phase: 'All phases', desc: 'Tổng hợp biên bản họp.',
          input: 'Transcript (Teams / ghi chú)', output: 'MoM + action + owner',
          tool: 'Claude', how: 'Dán transcript → prompt trích quyết định / action.',
        },
        {
          name: 'BRD/BRS Review', phase: 'Requirement', desc: 'Rà soát chất lượng tài liệu.',
          input: 'BRD/BRS bản nháp', output: 'Checklist lỗi, gap, câu hỏi',
          tool: 'Claude', how: 'Prompt review + Skill BRD/BRS Gap Analyst / Generator.',
        },
        {
          name: 'BPMN/Flow Generation', phase: 'Discovery', desc: 'Vẽ quy trình / flow nghiệp vụ.',
          input: 'Mô tả luồng nghiệp vụ', output: 'Sơ đồ BPMN/flow (mã Mermaid)',
          tool: 'Claude + Mermaid', how: 'Prompt sinh mã Mermaid → render → chỉnh.',
        },
        {
          name: 'Test Case Generation', phase: 'Testing', desc: 'Sinh test case từ yêu cầu.',
          input: 'BRS/FRS, acceptance criteria', output: 'Test case + RTM',
          tool: 'Claude', how: 'Dán BRS → prompt sinh case theo template → export.',
        },
        {
          name: 'SQL Generation', phase: 'Build Support', desc: 'Viết & giải thích SQL.',
          input: 'Schema, nhu cầu lấy data', output: 'SQL script + giải thích',
          tool: 'Claude', how: 'Mô tả bảng + nhu cầu → prompt → test trên DB test.',
        },
      ] as UseCaseItem[],
    },
    {
      id: 'tools', code: '2.1', name: 'AI Tool Landscape', icon: 'grid',
      summary: '5 công cụ AI, xoay quanh Claude làm chủ lực.',
      items: [
        { name: 'Claude', role: 'Chủ lực', usedFor: 'Toàn bộ use case BA', priority: 'Chính', note: 'Văn bản dài, reasoning, bám template.', primary: true },
        { name: 'Mermaid', role: 'Bổ trợ', usedFor: 'Render BPMN/flow từ mã', priority: 'Kèm Claude', note: 'Claude sinh mã → Mermaid vẽ sơ đồ.' },
        { name: 'Gemini', role: 'Thay thế', usedFor: 'Brainstorm, tra cứu nhanh', priority: 'Phụ', note: 'Khi cần đối chiếu ý.' },
        { name: 'Copilot (M365)', role: 'Bổ trợ', usedFor: 'Transcript meeting', priority: 'Phụ', note: 'Tận dụng transcript Teams.' },
        { name: 'NotebookLM', role: 'Bổ trợ', usedFor: 'Hỏi đáp trên tài liệu', priority: 'Phụ', note: 'Grounding theo nguồn.' },
      ] as ToolItem[],
    },
    {
      id: 'skills', code: '3.1', name: 'Skill / Prompt Set', icon: 'command',
      summary: '9 skill & prompt tạo sẵn đầu ra chuẩn VIB cho từng tác vụ BA.',
      items: [
        { task: 'BRS / Requirement', skills: 'brs-generator + export-excel-tpu', cmd: '/brs-generator', output: 'BRS boxed-matrix .xlsx', note: 'Từ CR / đặc tả; format VIB sẵn.' },
        { task: 'BRS from API design', skills: 'brs-am-api-design', cmd: '/BRS_AM_API_DESIGN', output: 'BRS AM Integrate .xlsx', note: 'Từ AM API-design (URI/Method/Input/Output).' },
        { task: 'BPMN / Flow', skills: 'Claude + Mermaid', cmd: 'prompt sinh mã mermaid', output: 'Sơ đồ (mã mermaid)', note: 'Render → chỉnh.' },
        { task: 'Test Case', skills: 'testcase-generator', cmd: '/testcase-generator', output: 'Test case đa sheet (giữ CF)', note: 'Từ BRS/CR/FRS; Overview / TestCase / UAT.' },
        { task: 'BRD/BRS Review', skills: 'prompt-01 + Claude', cmd: 'prompt review + dán tài liệu', output: 'Checklist lỗi / gap', note: 'Theo tiêu chí DoR; consistency check.' },
        { task: 'SQL', skills: 'Claude + update-knowledge-OMS', cmd: 'prompt + schema', output: 'SQL script + giải thích', note: 'Schema từ Master Doc / OMS KB.' },
        { task: 'Meeting Minutes', skills: 'prompt-01 + Claude', cmd: 'dán transcript + prompt MoM', output: 'MoM + action + owner', note: 'Transcript từ Teams.' },
        { task: 'Prompt Writing', skills: 'prompt-01', cmd: '/prompt-01', output: 'Prompt hoàn chỉnh (22 template)', note: '' },
        { task: 'Format / Export', skills: 'export-excel-tpu + vib-report-format', cmd: '/export-excel-tpu', output: 'Excel chuẩn VIB (title EN, boxed)', note: 'Áp sau khi sinh BRS / test case.' },
      ] as SkillItem[],
    },
    {
      id: 'governance', code: '4.1', name: 'AI Governance', icon: 'shield',
      summary: '5 nguyên tắc bắt buộc khi dùng AI với dữ liệu ngân hàng.',
      items: [
        { principle: 'PII / Sensitive Data', rule: 'KHÔNG đưa lên AI public.', note: 'Ẩn danh / mask trước khi dán.' },
        { principle: 'Customer Data', rule: 'Không upload dữ liệu thật.', note: 'Dùng data mẫu / giả lập.' },
        { principle: 'Output Validation', rule: 'Người review trước khi dùng.', note: 'AI hỗ trợ, không thay quyết định.' },
        { principle: 'Approved Tools', rule: 'Chỉ dùng tool đã phê duyệt.', note: 'Theo danh sách IT / Compliance.' },
        { principle: 'Legal Compliance', rule: 'PDPL + quy định SBV / nội bộ.', note: 'Ghi nguồn khi trích dẫn.' },
      ] as GovernanceItem[],
    },
    {
      id: 'kb', code: '5.1', name: 'Knowledge Base', icon: 'database',
      summary: '6 thành phần tri thức trên Git + Claude Project — nền tảng của khu Tài liệu.',
      items: [
        { component: 'Master Doc', managedIn: ['Git', 'Claude Project'], scope: 'Toàn dự án', purpose: 'Nguồn chuẩn (single source of truth).', note: 'Version qua Git tag / branch.', link: 'docs' },
        { component: 'CR Documents', managedIn: ['Git', 'Claude Project'], scope: 'Từng CR', purpose: 'BRS / test case / CR spec theo từng CR.', note: 'Nhánh / thư mục riêng mỗi CR.', link: 'docs' },
        { component: 'Version Control', managedIn: ['Git'], scope: 'Mọi tài liệu', purpose: 'Lịch sử, rollback, so sánh phiên bản.', note: 'Commit + tag theo release.' },
        { component: 'Q&A', managedIn: ['Claude Project'], scope: 'Tài liệu đã nạp', purpose: 'Hỏi đáp theo ngữ cảnh dự án.', note: 'Project knowledge = Master Doc + CR.' },
        { component: 'Templates & Skills', managedIn: ['Git'], scope: 'Dùng chung', purpose: 'Mẫu BRS / test case + bộ skill.', note: 'Tái sử dụng, cập nhật định kỳ.' },
        { component: 'Lessons Learned', managedIn: ['Git', 'Claude Project'], scope: 'Sau CR / dự án', purpose: 'Cải tiến liên tục.', note: 'Đưa kết luận vào Master Doc.' },
      ] as KbItem[],
    },
    {
      id: 'roadmap', code: '6.1', name: 'Adoption Roadmap', icon: 'route',
      summary: '5 giai đoạn triển khai AI cho đội BA — từ WoW tới đo KPI.',
      items: [
        { phase: 'Phase 1 — WoW', objective: 'Thống nhất quy trình BA.', work: 'BA WoW + Deliverable Matrix.', deliverable: 'BA WoW v1' },
        { phase: 'Phase 2 — Use Case + Prompt', objective: 'Áp 6 use case ưu tiên.', work: 'Skill / Prompt set + template.', deliverable: 'AI Use Case Catalog' },
        { phase: 'Phase 3 — Knowledge Base', objective: 'Dựng Claude Project + Git.', work: 'Master Doc + per-CR repo.', deliverable: 'KB Structure' },
        { phase: 'Phase 4 — Governance', objective: 'Ban hành nguyên tắc AI.', work: 'Quy định + danh sách tool.', deliverable: 'AI Governance v1' },
        { phase: 'Phase 5 — KPI', objective: 'Đo năng suất & chất lượng.', work: 'KPI + review định kỳ.', deliverable: 'AI Adoption Roadmap' },
      ] as RoadmapItem[],
    },
  ],
}
