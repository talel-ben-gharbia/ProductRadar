<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260427170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename partner_request provisioning_password_encrypted to b2b_password';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE partner_request RENAME COLUMN provisioning_password_encrypted TO b2b_password");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE partner_request RENAME COLUMN b2b_password TO provisioning_password_encrypted");
    }
}
