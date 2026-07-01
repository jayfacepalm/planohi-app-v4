-- 1. Add role column to user_account
ALTER TABLE user_account ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'NORMAL';

-- 2. Create voucher table
CREATE TABLE voucher (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_by_user_id UUID NOT NULL,
    activated_by_user_id UUID,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    CONSTRAINT fk_voucher_created_by FOREIGN KEY (created_by_user_id) REFERENCES user_account(id) ON DELETE CASCADE,
    CONSTRAINT fk_voucher_activated_by FOREIGN KEY (activated_by_user_id) REFERENCES user_account(id) ON DELETE SET NULL
);

CREATE INDEX idx_voucher_code ON voucher(code);
