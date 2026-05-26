<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260526172646 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create b2b parent table for JOINED inheritance, migrate shared columns from b2b_company and b2b_market';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE b2b (
            id INT NOT NULL,
            owner_user_id INT DEFAULT NULL,
            seller_id INT DEFAULT NULL,
            full_name VARCHAR(255) DEFAULT NULL,
            company_name VARCHAR(255) NOT NULL,
            company_market VARCHAR(255) DEFAULT NULL,
            company_country VARCHAR(2) DEFAULT NULL,
            company_website VARCHAR(255) DEFAULT NULL,
            b2b_status VARCHAR(50) DEFAULT \'PENDING\' NOT NULL,
            joined_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            is_verified BOOLEAN NOT NULL,
            usage_json JSON DEFAULT NULL,
            PRIMARY KEY(id)
        )');

        $this->addSql('CREATE INDEX idx_b2b_status ON b2b (b2b_status)');

        $this->addSql('COMMENT ON COLUMN b2b.joined_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN b2b.updated_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('ALTER TABLE b2b ADD CONSTRAINT FK_B2B_USER FOREIGN KEY (id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE b2b ADD CONSTRAINT FK_B2B_OWNER_USER FOREIGN KEY (owner_user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE b2b ADD CONSTRAINT FK_B2B_SELLER FOREIGN KEY (seller_id) REFERENCES seller (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');

        // Migrate existing data from b2b_company to b2b
        $this->addSql('INSERT INTO b2b (id, owner_user_id, seller_id, full_name, company_name, company_market, company_country, company_website, b2b_status, joined_at, updated_at, is_verified, usage_json)
            SELECT id, owner_user_id, seller_id, full_name, company_name, company_market, company_country, company_website, b2b_status, joined_at, updated_at, is_verified, usage_json
            FROM b2b_company');

        // Migrate existing data from b2b_market to b2b
        $this->addSql('INSERT INTO b2b (id, owner_user_id, seller_id, full_name, company_name, company_market, company_country, company_website, b2b_status, joined_at, updated_at, is_verified, usage_json)
            SELECT id, owner_user_id, seller_id, full_name, company_name, company_market, company_country, company_website, b2b_status, joined_at, updated_at, is_verified, usage_json
            FROM b2b_market');

        // Drop FK constraints referencing shared columns on child tables
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS fk_b2b_company_owner_user_id');
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS fk_b2b_company_seller_id');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS fk_b2b_market_owner_user_id');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS fk_b2b_market_seller');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS fk_b2bmarket_seller');

        // Drop the JOINED inheritance FK pointing directly to user (will be recreated pointing to b2b)
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS fk_b2bcompany_id');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS fk_b2bmarket_id');

        // Drop NOT NULL constraints that will be removed with columns
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS b2b_company_b2b_status_not_null');
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS b2b_company_company_name_not_null');
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS b2b_company_is_verified_not_null');
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS b2b_company_joined_at_not_null');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS b2b_market_b2b_status_not_null');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS b2b_market_company_name_not_null');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS b2b_market_is_verified_not_null');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS b2b_market_joined_at_not_null');

        // Drop old indexes referencing columns to be removed
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_company_status');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_market_status');

        // Drop shared columns from b2b_company
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS owner_user_id');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS seller_id');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS full_name');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS company_name');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS company_market');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS company_country');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS company_website');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS b2b_status');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS joined_at');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS updated_at');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS is_verified');
        $this->addSql('ALTER TABLE b2b_company DROP COLUMN IF EXISTS usage_json');

        // Drop shared columns from b2b_market
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS owner_user_id');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS seller_id');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS full_name');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS company_name');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS company_market');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS company_country');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS company_website');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS b2b_status');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS joined_at');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS updated_at');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS is_verified');
        $this->addSql('ALTER TABLE b2b_market DROP COLUMN IF EXISTS usage_json');

        // Re-add JOINED inheritance FK from child tables to b2b parent
        $this->addSql('ALTER TABLE b2b_company ADD CONSTRAINT FK_B2B_COMPANY_B2B FOREIGN KEY (id) REFERENCES b2b (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE b2b_market ADD CONSTRAINT FK_B2B_MARKET_B2B FOREIGN KEY (id) REFERENCES b2b (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        // Reverse: move columns back from b2b to child tables, then drop b2b
        $this->addSql('ALTER TABLE b2b_company DROP CONSTRAINT IF EXISTS FK_B2B_COMPANY_B2B');
        $this->addSql('ALTER TABLE b2b_market DROP CONSTRAINT IF EXISTS FK_B2B_MARKET_B2B');

        // Add back columns to b2b_company
        $this->addSql('ALTER TABLE b2b_company ADD owner_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD seller_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD full_name VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD company_name VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD company_market VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD company_country VARCHAR(2) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD company_website VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD b2b_status VARCHAR(50) DEFAULT \'PENDING\' NOT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD joined_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD is_verified BOOLEAN NOT NULL');
        $this->addSql('ALTER TABLE b2b_company ADD usage_json JSON DEFAULT NULL');

        // Add back columns to b2b_market
        $this->addSql('ALTER TABLE b2b_market ADD owner_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD seller_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD full_name VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD company_name VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD company_market VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD company_country VARCHAR(2) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD company_website VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD b2b_status VARCHAR(50) DEFAULT \'PENDING\' NOT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD joined_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD is_verified BOOLEAN NOT NULL');
        $this->addSql('ALTER TABLE b2b_market ADD usage_json JSON DEFAULT NULL');

        // Restore old FK constraints
        $this->addSql('ALTER TABLE b2b_company ADD CONSTRAINT fk_b2b_company_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE b2b_company ADD CONSTRAINT fk_b2b_company_seller_id FOREIGN KEY (seller_id) REFERENCES seller (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE b2b_market ADD CONSTRAINT fk_b2b_market_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE b2b_market ADD CONSTRAINT fk_b2bmarket_seller FOREIGN KEY (seller_id) REFERENCES seller (id) ON DELETE SET NULL');

        // Restore JOINED inheritance FKs pointing directly to user
        $this->addSql('ALTER TABLE b2b_company ADD CONSTRAINT fk_b2bcompany_id FOREIGN KEY (id) REFERENCES "user" (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE b2b_market ADD CONSTRAINT fk_b2bmarket_id FOREIGN KEY (id) REFERENCES "user" (id) ON DELETE CASCADE');

        // Restore indexes
        $this->addSql('CREATE INDEX idx_b2b_company_status ON b2b_company (b2b_status)');
        $this->addSql('CREATE INDEX idx_b2b_market_status ON b2b_market (b2b_status)');

        // Update data: migrate b2b data back to child tables
        $this->addSql('UPDATE b2b_company SET owner_user_id = b2b.owner_user_id, seller_id = b2b.seller_id, full_name = b2b.full_name, company_name = b2b.company_name, company_market = b2b.company_market, company_country = b2b.company_country, company_website = b2b.company_website, b2b_status = b2b.b2b_status, joined_at = b2b.joined_at, updated_at = b2b.updated_at, is_verified = b2b.is_verified, usage_json = b2b.usage_json FROM b2b WHERE b2b.id = b2b_company.id');
        $this->addSql('UPDATE b2b_market SET owner_user_id = b2b.owner_user_id, seller_id = b2b.seller_id, full_name = b2b.full_name, company_name = b2b.company_name, company_market = b2b.company_market, company_country = b2b.company_country, company_website = b2b.company_website, b2b_status = b2b.b2b_status, joined_at = b2b.joined_at, updated_at = b2b.updated_at, is_verified = b2b.is_verified, usage_json = b2b.usage_json FROM b2b WHERE b2b.id = b2b_market.id');

        // Drop b2b table
        $this->addSql('DROP TABLE b2b');
    }
}
