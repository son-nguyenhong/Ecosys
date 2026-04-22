-- ============================================================
-- V031 — catalog_products: domain text → domain_code FK
-- Chuyển domain (free text VARCHAR(100)) thành FK → project_domains
-- ============================================================

-- 1. Thêm cột domain_code mới (nullable trước để migrate data)
ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS domain_code VARCHAR(50)
    REFERENCES project_domains(code) ON UPDATE CASCADE ON DELETE SET NULL;

-- 2. Map giá trị cũ → domain_code
UPDATE catalog_products SET domain_code = 'DIGITAL'    WHERE domain ILIKE '%digital%';
UPDATE catalog_products SET domain_code = 'HR'         WHERE domain ILIKE '%human resource%' OR domain = 'HR';
UPDATE catalog_products SET domain_code = 'FS'         WHERE domain ILIKE '%finance%' OR domain ILIKE '%financial%';
UPDATE catalog_products SET domain_code = 'DATA'       WHERE domain ILIKE '%data%' OR domain ILIKE '%analytic%';
UPDATE catalog_products SET domain_code = 'ESD'        WHERE domain = 'ESD';
UPDATE catalog_products SET domain_code = 'IT'         WHERE domain ILIKE '%infrastructure%' OR domain ILIKE '%it platform%' OR domain ILIKE '%information tech%';
UPDATE catalog_products SET domain_code = 'RISK'       WHERE domain ILIKE '%risk%' OR domain ILIKE '%compliance%';
UPDATE catalog_products SET domain_code = 'BOS'        WHERE domain ILIKE '%rb operation%' OR domain ILIKE '%banking operation%';
UPDATE catalog_products SET domain_code = 'RETAIL'     WHERE domain ILIKE '%core banking%' OR domain ILIKE '%retail%';
UPDATE catalog_products SET domain_code = 'CARDS'      WHERE domain ILIKE '%card%' OR domain ILIKE '%payment%';
UPDATE catalog_products SET domain_code = 'DIGITAL'    WHERE domain ILIKE '%ekyc%' OR domain ILIKE '%kyc%';
UPDATE catalog_products SET domain_code = 'SME'        WHERE domain ILIKE '%sme%';
UPDATE catalog_products SET domain_code = 'TREASURY'   WHERE domain ILIKE '%treasury%';

-- 3. Xoá cột cũ
ALTER TABLE catalog_products DROP COLUMN IF EXISTS domain;

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_catalog_products_domain_code
  ON catalog_products(domain_code) WHERE domain_code IS NOT NULL;

COMMENT ON COLUMN catalog_products.domain_code IS
  'FK → project_domains.code — domain nghiệp vụ của sản phẩm';
