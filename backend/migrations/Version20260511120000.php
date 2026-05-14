<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260511120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add UNIQUE(company_id, product_id) constraint to b2b_watchlist';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE UNIQUE INDEX UNIQ_B2B_WATCHLIST_COMPANY_PRODUCT ON b2b_watchlist (company_id, product_id) WHERE company_id IS NOT NULL AND product_id IS NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS UNIQ_B2B_WATCHLIST_COMPANY_PRODUCT');
    }
}
