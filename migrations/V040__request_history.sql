-- V040: Action history log for PCR and SR
CREATE TABLE request_history (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type    TEXT         NOT NULL CHECK (ref_type IN ('pcr', 'sr')),
  ref_id      UUID         NOT NULL,
  action      TEXT         NOT NULL,   -- 'created' | 'updated' | 'status_changed'
  actor       TEXT         NOT NULL DEFAULT '',
  from_status TEXT,
  to_status   TEXT,
  comment     TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_history_ref ON request_history (ref_type, ref_id, created_at DESC);
