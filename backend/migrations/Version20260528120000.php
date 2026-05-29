<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260528120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename company_name to name and company_market to sector in b2b table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b RENAME COLUMN company_name TO name');
        $this->addSql('ALTER TABLE b2b RENAME COLUMN company_market TO sector');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b RENAME COLUMN name TO company_name');
        $this->addSql('ALTER TABLE b2b RENAME COLUMN sector TO company_market');
    }
}
