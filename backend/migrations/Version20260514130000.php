<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260514130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop unused columns from b2b_ads_request';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_fd167e8d12469de2');
        $this->addSql('DROP INDEX IF EXISTS idx_fd167e8d4584665a');
        $this->addSql('ALTER TABLE b2b_ads_request DROP CONSTRAINT IF EXISTS fk_b2b_ads_request_category_id');
        $this->addSql('ALTER TABLE b2b_ads_request DROP COLUMN IF EXISTS target_type');
        $this->addSql('ALTER TABLE b2b_ads_request DROP COLUMN IF EXISTS target_url');
        $this->addSql('ALTER TABLE b2b_ads_request DROP COLUMN IF EXISTS product_id');
        $this->addSql('ALTER TABLE b2b_ads_request DROP COLUMN IF EXISTS category_id');
        $this->addSql('ALTER TABLE b2b_ads_request DROP COLUMN IF EXISTS brand_filter');
        $this->addSql('ALTER TABLE b2b_ads_request DROP COLUMN IF EXISTS duration_days');
        $this->addSql('ALTER TABLE b2b_ads_request DROP COLUMN IF EXISTS budget_proposal');
        $this->addSql('ALTER TABLE b2b_ads_request DROP COLUMN IF EXISTS notes');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_request ADD target_type VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD target_url TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD product_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD category_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD brand_filter VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD duration_days INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD budget_proposal DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD notes TEXT DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_fd167e8d12469de2 ON b2b_ads_request (category_id)');
        $this->addSql('CREATE INDEX idx_fd167e8d4584665a ON b2b_ads_request (product_id)');
    }
}
