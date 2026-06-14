<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260613140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add status and suspension/ban fields to admin table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE admin ADD status VARCHAR(20) NOT NULL DEFAULT 'active'");
        $this->addSql('ALTER TABLE admin ADD suspended_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE admin ADD suspended_by INT DEFAULT NULL');
        $this->addSql('ALTER TABLE admin ADD banned_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE admin ADD banned_by INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE admin DROP COLUMN status');
        $this->addSql('ALTER TABLE admin DROP COLUMN suspended_at');
        $this->addSql('ALTER TABLE admin DROP COLUMN suspended_by');
        $this->addSql('ALTER TABLE admin DROP COLUMN banned_at');
        $this->addSql('ALTER TABLE admin DROP COLUMN banned_by');
    }
}
