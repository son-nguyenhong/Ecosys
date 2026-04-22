-- V042: File attachments for PCR and SR
CREATE TABLE request_attachments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type    TEXT         NOT NULL CHECK (ref_type IN ('pcr', 'sr')),
  ref_id      UUID         NOT NULL,
  filename    TEXT         NOT NULL,
  file_size   BIGINT,
  mime_type   TEXT,
  stored_path TEXT         NOT NULL,
  uploaded_by TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_att_ref ON request_attachments (ref_type, ref_id, created_at);
