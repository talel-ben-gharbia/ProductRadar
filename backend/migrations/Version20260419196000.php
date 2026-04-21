<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260419196000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Removes non-metadata indexes to keep Doctrine schema validation in sync.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_company_status');
        $this->addSql('DROP INDEX IF EXISTS idx_b2b_market_status');
        $this->addSql('DROP INDEX IF EXISTS idx_user_account_status');
        $this->addSql('DROP INDEX IF EXISTS idx_partner_request_created');
        $this->addSql('DROP INDEX IF EXISTS uniq_partner_request_email_type');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE INDEX idx_b2b_company_status ON b2b_company (b2b_status)');
        $this->addSql('CREATE INDEX idx_b2b_market_status ON b2b_market (b2b_status)');
        $this->addSql('CREATE INDEX idx_user_account_status ON "user" (account_status)');
        $this->addSql('CREATE INDEX idx_partner_request_created ON partner_request (created_at)');
        $this->addSql('CREATE UNIQUE INDEX uniq_partner_request_email_type ON partner_request (email, account_type)');
    }
}
