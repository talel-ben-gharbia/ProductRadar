<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260514120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add image_url, link_url to b2b_ads_request and width, height to b2b_ads_campaign';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_request ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_request ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_campaign ADD COLUMN IF NOT EXISTS width INT DEFAULT NULL');
        $this->addSql('ALTER TABLE b2b_ads_campaign ADD COLUMN IF NOT EXISTS height INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE b2b_ads_request DROP image_url');
        $this->addSql('ALTER TABLE b2b_ads_request DROP link_url');
        $this->addSql('ALTER TABLE b2b_ads_campaign DROP width');
        $this->addSql('ALTER TABLE b2b_ads_campaign DROP height');
    }
}
