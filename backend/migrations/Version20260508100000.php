<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260508100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add brand_filter field to b2b_ads_request for BRAND_GROUP targeting';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_request ADD brand_filter VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_request DROP brand_filter');
    }
}
