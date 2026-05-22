<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260515150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create market_shelf_snapshots table for weekly share-of-shelf tracking';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE IF NOT EXISTS market_shelf_snapshot (
            id SERIAL PRIMARY KEY,
            market_id INT NOT NULL,
            category_id INT NOT NULL,
            seller_name VARCHAR(255) NOT NULL,
            share_percent NUMERIC(6,2) NOT NULL,
            listing_count INT NOT NULL DEFAULT 0,
            total_products INT NOT NULL DEFAULT 0,
            snapshot_week DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_shelf_market_week ON market_shelf_snapshot(market_id, snapshot_week)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS market_shelf_snapshot');
    }
}
