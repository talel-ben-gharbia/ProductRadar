<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260613130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove image_status and image_last_checked_at from product table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_product_image_status');
        $this->addSql('ALTER TABLE product DROP COLUMN IF EXISTS image_status');
        $this->addSql('ALTER TABLE product DROP COLUMN IF EXISTS image_last_checked_at');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE product ADD image_status VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE product ADD image_last_checked_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_product_image_status ON product (image_status) WHERE image_status IS NOT NULL');
    }
}
