<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260511130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add missing columns: b2b_ads_request.target_type/target_url, FK b2b_market.seller_id';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_market ADD CONSTRAINT FK_B2B_MARKET_SELLER FOREIGN KEY (seller_id) REFERENCES seller (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_market_seller_id ON b2b_market (seller_id)');

        $this->addSql('ALTER TABLE b2b_ads_request ADD target_type VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD target_url TEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS FK_B2B_MARKET_SELLER');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_market_seller_id');

        $this->addSql('ALTER TABLE b2b_ads_request DROP target_type');
        $this->addSql('ALTER TABLE b2b_ads_request DROP target_url');
    }
}
