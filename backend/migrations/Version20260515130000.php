<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260515130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add brand_keywords JSON column to b2b_market for auto-derived brand scope';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_market ADD COLUMN IF NOT EXISTS brand_keywords JSONB DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS brand_keywords');
    }
}
