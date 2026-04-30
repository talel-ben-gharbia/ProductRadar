<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260427162000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add encrypted provisioning password for B2B partner requests';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE partner_request ADD COLUMN IF NOT EXISTS provisioning_password_encrypted TEXT NOT NULL DEFAULT ''");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE partner_request DROP COLUMN IF EXISTS provisioning_password_encrypted');
    }
}
