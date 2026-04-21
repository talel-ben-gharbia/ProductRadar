<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260419190000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Splits B2B into dedicated inheritance tables and moves shared status fields to user.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_customer_account_type');
        $this->addSql('DROP INDEX IF EXISTS idx_customer_b2b_status');
        $this->addSql('DROP INDEX IF EXISTS idx_customer_account_status');

        $this->addSql('ALTER TABLE "user" ADD last_login TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql("ALTER TABLE \"user\" ADD account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'");
        $this->addSql('CREATE INDEX idx_user_account_status ON "user" (account_status)');
        $this->addSql('UPDATE "user" u SET last_login = c.last_login, account_status = c.account_status FROM customer c WHERE c.id = u.id');

        $this->addSql('ALTER TABLE customer DROP last_login');
        $this->addSql('ALTER TABLE customer DROP account_status');

        $this->addSql('CREATE TABLE b2b_company (id INT NOT NULL, company_name VARCHAR(255) NOT NULL, company_market VARCHAR(255) DEFAULT NULL, company_country VARCHAR(2) DEFAULT NULL, company_website VARCHAR(255) DEFAULT NULL, b2b_status VARCHAR(50) NOT NULL DEFAULT \'PENDING\', joined_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, is_verified BOOLEAN NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE TABLE b2b_market (id INT NOT NULL, company_name VARCHAR(255) NOT NULL, company_market VARCHAR(255) DEFAULT NULL, company_country VARCHAR(2) DEFAULT NULL, company_website VARCHAR(255) DEFAULT NULL, b2b_status VARCHAR(50) NOT NULL DEFAULT \'PENDING\', joined_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, is_verified BOOLEAN NOT NULL, PRIMARY KEY(id))');
        $this->addSql('ALTER TABLE b2b_company ADD CONSTRAINT FK_B2BCOMPANY_ID FOREIGN KEY (id) REFERENCES "user" (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE b2b_market ADD CONSTRAINT FK_B2BMARKET_ID FOREIGN KEY (id) REFERENCES "user" (id) ON DELETE CASCADE');
        $this->addSql('CREATE INDEX idx_b2b_company_status ON b2b_company (b2b_status)');
        $this->addSql('CREATE INDEX idx_b2b_market_status ON b2b_market (b2b_status)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_company_status');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_market_status');
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT FK_B2BCOMPANY_ID');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT FK_B2BMARKET_ID');
        $this->addSql('DROP TABLE b2b_company');
        $this->addSql('DROP TABLE b2b_market');
        $this->addSql('DROP INDEX IF EXISTS idx_user_account_status');

        $this->addSql('ALTER TABLE "user" DROP last_login');
        $this->addSql('ALTER TABLE "user" DROP account_status');

        $this->addSql("ALTER TABLE customer ADD account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'");
        $this->addSql('ALTER TABLE customer ADD last_login TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_customer_account_status ON customer (account_status)');
    }
}
