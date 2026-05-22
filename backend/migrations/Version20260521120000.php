<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260521120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add brand_id FK to b2b_market as principal brand identifier';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_market ADD brand_id INT DEFAULT NULL');
        $this->addSql(<<<'SQL'
            UPDATE b2b_market m
            SET brand_id = b.id
            FROM brand b
            WHERE TRIM(LOWER(m.brand_name)) = TRIM(LOWER(b.name))
        SQL);
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_market_brand_id ON b2b_market (brand_id)');
        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_market_brand_id'
    ) THEN
        ALTER TABLE b2b_market
            ADD CONSTRAINT fk_b2b_market_brand_id FOREIGN KEY (brand_id) REFERENCES brand (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS fk_b2b_market_brand_id');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_market_brand_id');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN brand_id');
    }
}
