<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260508110000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add trust_score_updated_at to product_listing for efficient incremental recalculation';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product_listing ADD trust_score_updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN product_listing.trust_score_updated_at IS \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product_listing DROP trust_score_updated_at');
    }
}
