-- Add provider column to user_account
ALTER TABLE user_account ADD COLUMN provider VARCHAR(50) NOT NULL DEFAULT 'SELF_REGISTER';
