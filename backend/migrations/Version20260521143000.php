<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260521143000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Move review relation from product_listing to product';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE review ADD COLUMN IF NOT EXISTS product_id INT DEFAULT NULL');

        $this->addSql("UPDATE review r
            SET product_id = pl.product_id
            FROM product_listing pl
            WHERE r.product_listing_id = pl.id
              AND r.product_id IS NULL");

        $this->addSql('CREATE INDEX IF NOT EXISTS idx_review_product_id ON review (product_id)');

        $this->addSql("DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_review_product'
                  AND conrelid = 'review'::regclass
            ) THEN
                ALTER TABLE review
                    ADD CONSTRAINT fk_review_product
                    FOREIGN KEY (product_id) REFERENCES product (id)
                    ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
            END IF;
        END $$;");

        $this->addSql('ALTER TABLE review DROP CONSTRAINT IF EXISTS FK_794381C64706C231');
        $this->addSql('ALTER TABLE review DROP CONSTRAINT IF EXISTS FK_794381C71B8D8CD8');
        $this->addSql('DROP INDEX IF EXISTS IDX_794381C64706C231');
        $this->addSql('ALTER TABLE review DROP COLUMN IF EXISTS product_listing_id');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE review ADD COLUMN IF NOT EXISTS product_listing_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_794381C64706C231 ON review (product_listing_id)');

        $this->addSql("DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'FK_794381C64706C231'
                  AND conrelid = 'review'::regclass
            ) THEN
                ALTER TABLE review
                    ADD CONSTRAINT FK_794381C64706C231
                    FOREIGN KEY (product_listing_id) REFERENCES product_listing (id)
                    ON DELETE SET NULL NOT DEFERRABLE;
            END IF;
        END $$;");

        $this->addSql('ALTER TABLE review DROP CONSTRAINT IF EXISTS fk_review_product');
        $this->addSql('DROP INDEX IF EXISTS idx_review_product_id');
        $this->addSql('ALTER TABLE review DROP COLUMN IF EXISTS product_id');
    }
}
