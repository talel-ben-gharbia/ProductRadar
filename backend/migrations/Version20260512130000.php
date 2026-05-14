<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add composite indexes for query performance';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE INDEX idx_product_listing_product_active_price ON product_listing (product_id, is_active, price)');
        $this->addSql('CREATE INDEX idx_price_history_listing_recorded ON price_history (product_listing_id, recorded_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_product_listing_product_active_price');
        $this->addSql('DROP INDEX IF EXISTS idx_price_history_listing_recorded');
    }
}
