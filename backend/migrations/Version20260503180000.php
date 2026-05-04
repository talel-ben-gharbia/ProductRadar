<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260503180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ensure b2b_subscription table is fully created with all required columns and indexes';
    }

    public function up(Schema $schema): void
    {
        // Idempotent: create b2b_subscription table if it doesn't exist yet
        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_subscription (
    id SERIAL NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    plan_type VARCHAR(20) NOT NULL,
    duration_months INT NOT NULL,
    start_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    end_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    company_id INT DEFAULT NULL,
    market_id INT DEFAULT NULL,
    activated_by_admin_id INT DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    activated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
);
SQL);

        // Add FKs idempotently
        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_b2b_sub_company'
        AND table_name = 'b2b_subscription'
    ) THEN
        ALTER TABLE b2b_subscription
        ADD CONSTRAINT fk_b2b_sub_company
        FOREIGN KEY (company_id) REFERENCES b2b_company(id) ON DELETE CASCADE;
    END IF;
END $$;
SQL);

        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_b2b_sub_market'
        AND table_name = 'b2b_subscription'
    ) THEN
        ALTER TABLE b2b_subscription
        ADD CONSTRAINT fk_b2b_sub_market
        FOREIGN KEY (market_id) REFERENCES b2b_market(id) ON DELETE CASCADE;
    END IF;
END $$;
SQL);

        // Add indexes idempotently
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_subscription_owner_type ON b2b_subscription (owner_type)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_subscription_active ON b2b_subscription (active)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_subscription_company ON b2b_subscription (company_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_subscription_market ON b2b_subscription (market_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_subscription_end_date ON b2b_subscription (end_date)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS b2b_subscription CASCADE');
    }
}
