<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260419195000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drops legacy B2B columns from customer after split into dedicated B2B tables.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE customer DROP account_type');
        $this->addSql('ALTER TABLE customer DROP company_name');
        $this->addSql('ALTER TABLE customer DROP company_market');
        $this->addSql('ALTER TABLE customer DROP company_country');
        $this->addSql('ALTER TABLE customer DROP company_website');
        $this->addSql('ALTER TABLE customer DROP b2b_status');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE customer ADD account_type VARCHAR(50) NOT NULL DEFAULT 'B2C'");
        $this->addSql('ALTER TABLE customer ADD company_name VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE customer ADD company_market VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE customer ADD company_country VARCHAR(2) DEFAULT NULL');
        $this->addSql('ALTER TABLE customer ADD company_website VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE customer ADD b2b_status VARCHAR(50) DEFAULT NULL');
    }
}
