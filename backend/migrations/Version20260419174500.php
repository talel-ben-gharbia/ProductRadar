<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260419174500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drops extra customer indexes not tracked by Doctrine metadata.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_customer_account_status');
        $this->addSql('DROP INDEX idx_customer_b2b_status');
        $this->addSql('DROP INDEX idx_customer_account_type');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE INDEX idx_customer_account_status ON customer (account_status)');
        $this->addSql('CREATE INDEX idx_customer_b2b_status ON customer (b2b_status)');
        $this->addSql('CREATE INDEX idx_customer_account_type ON customer (account_type)');
    }
}
