<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260515140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add recommended_price column to product table for PVC compliance';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product ADD COLUMN IF NOT EXISTS recommended_price DECIMAL(10,3) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product DROP COLUMN IF EXISTS recommended_price');
    }
}
