<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260523120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add composite indexes for trust_score_history and price_history performance';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_tsh_listing_created ON trust_score_history (listing_id, created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_tsh_listing_created');
    }
}
