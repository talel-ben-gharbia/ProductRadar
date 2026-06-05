<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove tier and tier_locked columns from product table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product DROP tier');
        $this->addSql('ALTER TABLE product DROP tier_locked');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product ADD tier VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE product ADD tier_locked BOOLEAN DEFAULT false');
    }
}
