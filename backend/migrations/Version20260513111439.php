<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260513111439 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add market_id to b2b_ads_request for market-type owner support';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_request ADD market_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD CONSTRAINT FK_FD167E8D622F3F37 FOREIGN KEY (market_id) REFERENCES b2b_market (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_FD167E8D622F3F37 ON b2b_ads_request (market_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_request DROP CONSTRAINT FK_FD167E8D622F3F37');
        $this->addSql('DROP INDEX IDX_FD167E8D622F3F37');
        $this->addSql('ALTER TABLE b2b_ads_request DROP market_id');
    }
}
