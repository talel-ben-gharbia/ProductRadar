<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop trust_score, trust_score_breakdown, trust_score_updated_at from product_listing (now derived from trust_score_history)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_product_listing_trust_score');
        $this->addSql('ALTER TABLE product_listing DROP trust_score');
        $this->addSql('ALTER TABLE product_listing DROP trust_score_breakdown');
        $this->addSql('ALTER TABLE product_listing DROP trust_score_updated_at');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product_listing ADD trust_score DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE product_listing ADD trust_score_breakdown JSON DEFAULT NULL');
        $this->addSql('ALTER TABLE product_listing ADD trust_score_updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN product_listing.trust_score_breakdown IS \'(DC2Type:json)\'');
        $this->addSql('COMMENT ON COLUMN product_listing.trust_score_updated_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE INDEX idx_product_listing_trust_score ON product_listing (trust_score)');
    }
}
