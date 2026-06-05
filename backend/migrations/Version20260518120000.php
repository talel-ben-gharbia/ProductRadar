<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Recreate b2b_scraping_request table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS b2b_scraping_request (
    id SERIAL NOT NULL,
    owner_type VARCHAR(20) NOT NULL,
    company_id INT DEFAULT NULL,
    market_id INT DEFAULT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    notes TEXT DEFAULT NULL,
    is_duplicate BOOLEAN DEFAULT NULL,
    duplicate_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_scraping_request_company_id ON b2b_scraping_request (company_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_scraping_request_market_id ON b2b_scraping_request (market_id)');
        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_scraping_request_company_id'
    ) THEN
        ALTER TABLE b2b_scraping_request
            ADD CONSTRAINT fk_b2b_scraping_request_company_id FOREIGN KEY (company_id) REFERENCES b2b_company (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_scraping_request_market_id'
    ) THEN
        ALTER TABLE b2b_scraping_request
            ADD CONSTRAINT fk_b2b_scraping_request_market_id FOREIGN KEY (market_id) REFERENCES b2b_market (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE b2b_scraping_request DROP CONSTRAINT IF EXISTS fk_b2b_scraping_request_company_id");
        $this->addSql("ALTER TABLE b2b_scraping_request DROP CONSTRAINT IF EXISTS fk_b2b_scraping_request_market_id");
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_scraping_request_company_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_scraping_request_market_id');
        $this->addSql('DROP TABLE IF EXISTS b2b_scraping_request');
    }
}
