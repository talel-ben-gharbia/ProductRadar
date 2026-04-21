<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260419173000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Adds B2B and moderation fields to customer for admin module 1.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE customer ADD account_type VARCHAR(50) NOT NULL DEFAULT 'B2C'");
        $this->addSql("ALTER TABLE customer ADD company_name VARCHAR(255) DEFAULT NULL");
        $this->addSql("ALTER TABLE customer ADD company_market VARCHAR(255) DEFAULT NULL");
        $this->addSql("ALTER TABLE customer ADD company_country VARCHAR(2) DEFAULT NULL");
        $this->addSql("ALTER TABLE customer ADD company_website VARCHAR(255) DEFAULT NULL");
        $this->addSql("ALTER TABLE customer ADD b2b_status VARCHAR(50) DEFAULT NULL");
        $this->addSql("ALTER TABLE customer ADD last_login TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL");
        $this->addSql("ALTER TABLE customer ADD account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'");

        $this->addSql('CREATE INDEX IDX_CUSTOMER_ACCOUNT_TYPE ON customer (account_type)');
        $this->addSql('CREATE INDEX IDX_CUSTOMER_B2B_STATUS ON customer (b2b_status)');
        $this->addSql('CREATE INDEX IDX_CUSTOMER_ACCOUNT_STATUS ON customer (account_status)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IDX_CUSTOMER_ACCOUNT_TYPE');
        $this->addSql('DROP INDEX IDX_CUSTOMER_B2B_STATUS');
        $this->addSql('DROP INDEX IDX_CUSTOMER_ACCOUNT_STATUS');

        $this->addSql('ALTER TABLE customer DROP account_type');
        $this->addSql('ALTER TABLE customer DROP company_name');
        $this->addSql('ALTER TABLE customer DROP company_market');
        $this->addSql('ALTER TABLE customer DROP company_country');
        $this->addSql('ALTER TABLE customer DROP company_website');
        $this->addSql('ALTER TABLE customer DROP b2b_status');
        $this->addSql('ALTER TABLE customer DROP last_login');
        $this->addSql('ALTER TABLE customer DROP account_status');
    }
}
