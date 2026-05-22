<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add brand_name to b2b_market and pg_trgm index on product.name for brand discovery';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_market ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255) DEFAULT NULL');
        $this->addSql('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_product_name_trgm ON product USING GIN (LOWER(name) gin_trgm_ops)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS brand_name');
        $this->addSql('DROP INDEX IF EXISTS idx_product_name_trgm');
    }
}
