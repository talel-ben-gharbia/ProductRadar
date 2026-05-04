<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260503090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add seller_id to price_history table for price tracking by seller';
    }

    public function up(Schema $schema): void
    {
        // Add seller_id column if it doesn't exist
        $this->addSql('ALTER TABLE price_history ADD COLUMN IF NOT EXISTS seller_id INTEGER DEFAULT NULL');

        // Create foreign key constraint to seller table
        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_price_history_seller_id'
        AND table_name = 'price_history'
    ) THEN
        ALTER TABLE price_history
        ADD CONSTRAINT fk_price_history_seller_id
        FOREIGN KEY (seller_id) REFERENCES seller(id);
    END IF;
END $$;
SQL);

        // Populate seller_id from product_listing relationship
        $this->addSql(<<<'SQL'
UPDATE price_history ph
SET seller_id = pl.seller_id
FROM product_listing pl
WHERE ph.product_listing_id = pl.id
AND ph.seller_id IS NULL
AND pl.seller_id IS NOT NULL;
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE price_history DROP CONSTRAINT IF EXISTS fk_price_history_seller_id');
        $this->addSql('ALTER TABLE price_history DROP COLUMN IF EXISTS seller_id');
    }
}
