<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260514133041 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop agreed_price from b2b_ads_campaign, add image_data and image_mime_type to b2b_ads_request';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_campaign DROP agreed_price');
        $this->addSql('ALTER TABLE b2b_ads_request ADD image_data BYTEA DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD image_mime_type VARCHAR(50) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_campaign ADD agreed_price DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request DROP image_data');
        $this->addSql('ALTER TABLE b2b_ads_request DROP image_mime_type');
    }
}
