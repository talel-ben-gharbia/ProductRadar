<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Change B2BSponsoredArticle from product-level to listing-level';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_sponsored_article DROP COLUMN product_id');
        $this->addSql('ALTER TABLE b2b_sponsored_article ADD product_listing_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_sponsored_article_listing ON b2b_sponsored_article (product_listing_id)');
        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_sponsored_article_listing'
    ) THEN
        ALTER TABLE b2b_sponsored_article
            ADD CONSTRAINT fk_b2b_sponsored_article_listing FOREIGN KEY (product_listing_id) REFERENCES product_listing (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_sponsored_article DROP CONSTRAINT IF EXISTS fk_b2b_sponsored_article_listing');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_sponsored_article_listing');
        $this->addSql('ALTER TABLE b2b_sponsored_article DROP COLUMN product_listing_id');
        $this->addSql('ALTER TABLE b2b_sponsored_article ADD product_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_b2b_sponsored_article_product ON b2b_sponsored_article (product_id)');
        $this->addSql(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_b2b_sponsored_article_product'
    ) THEN
        ALTER TABLE b2b_sponsored_article
            ADD CONSTRAINT fk_b2b_sponsored_article_product FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;
SQL);
    }
}
