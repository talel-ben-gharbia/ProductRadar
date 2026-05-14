<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop dead table product_404_review';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS product_404_review');
    }

    public function down(Schema $schema): void
    {
        // Re-create the table for rollback
        $this->addSql('CREATE TABLE product_404_review (
            listing_id INT NOT NULL,
            product_url TEXT DEFAULT NULL,
            status_code INT DEFAULT NULL,
            reported_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NOW()
        )');
    }
}
