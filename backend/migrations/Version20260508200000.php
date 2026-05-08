<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260508200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add trust_score index, trust_score_history table, trust_score_weight table for configurable weights and history tracking';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE INDEX idx_trust_score ON product_listing (trust_score)');

        $this->addSql('
            CREATE TABLE trust_score_history (
                id SERIAL PRIMARY KEY,
                listing_id INT NOT NULL REFERENCES product_listing(id) ON DELETE CASCADE,
                score DOUBLE PRECISION NOT NULL,
                breakdown JSONB DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
            )
        ');
        $this->addSql('CREATE INDEX idx_tsh_listing ON trust_score_history (listing_id)');
        $this->addSql('CREATE INDEX idx_tsh_created ON trust_score_history (created_at)');
        $this->addSql('COMMENT ON COLUMN trust_score_history.created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('
            CREATE TABLE trust_score_weight (
                id SERIAL PRIMARY KEY,
                weight_key VARCHAR(50) NOT NULL UNIQUE,
                weight_label VARCHAR(100) NOT NULL,
                weight_value NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
                weight_group VARCHAR(20) NOT NULL DEFAULT \'history\',
                sort_order INT NOT NULL DEFAULT 0
            )
        ');

        $this->addSql("
            INSERT INTO trust_score_weight (weight_key, weight_label, weight_value, weight_group, sort_order) VALUES
            ('history_stock_reliability',   'Stock Reliability',      0.5000, 'history', 1),
            ('history_anomaly_reliability', 'Anomaly Reliability',    0.3000, 'history', 2),
            ('history_price_stability',     'Price Stability',        0.2000, 'history', 3),
            ('listing_freshness',           'Freshness',              0.3000, 'listing', 4),
            ('listing_availability',        'Availability',           0.2000, 'listing', 5),
            ('listing_discount_honesty',    'Discount Honesty',       0.2000, 'listing', 6),
            ('listing_competitive_price',   'Competitive Pricing',    0.2000, 'listing', 7),
            ('listing_seller_score',        'Seller Score',           0.1000, 'listing', 8),
            ('blend_history_base_weight',   'History Base Weight',    0.1500, 'blend',   9),
            ('blend_history_data_quality',  'History Data Quality',   0.5500, 'blend',  10),
            ('blend_sigmoid_stretch',       'Sigmoid Stretch',        8.0000, 'blend',  11)
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS trust_score_weight');
        $this->addSql('DROP TABLE IF EXISTS trust_score_history');
        $this->addSql('DROP INDEX IF EXISTS idx_trust_score');
    }
}
