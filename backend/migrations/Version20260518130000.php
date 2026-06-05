<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop recommended_price column from product table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product DROP COLUMN IF EXISTS recommended_price');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product ADD COLUMN recommended_price DECIMAL(10,3) DEFAULT NULL');
    }
}
