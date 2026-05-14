<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename column adress → address in user table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" RENAME COLUMN adress TO address');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" RENAME COLUMN address TO adress');
    }
}
