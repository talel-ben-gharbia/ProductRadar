<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260314143418 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE admin ALTER role DROP DEFAULT');
        $this->addSql('COMMENT ON COLUMN admin.created_at IS \'\'');
        $this->addSql('COMMENT ON COLUMN admin.updated_at IS \'\'');
       
        $this->addSql('ALTER TABLE product_listing ADD ref VARCHAR(255) NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE admin ALTER role SET DEFAULT \'ROLE_SUB_ADMIN\'');
        $this->addSql('COMMENT ON COLUMN admin.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN admin.updated_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE UNIQUE INDEX unique_category_parent ON category (name, parent_id)');
        $this->addSql('ALTER TABLE product_listing DROP ref');
    }
}
