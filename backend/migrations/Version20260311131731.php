<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260311131731 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE product_listing ADD seller_id INT NOT NULL');
        $this->addSql('ALTER TABLE product_listing ADD CONSTRAINT FK_1AD953648DE820D9 FOREIGN KEY (seller_id) REFERENCES seller (id) NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_1AD953648DE820D9 ON product_listing (seller_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE UNIQUE INDEX unique_category_parent ON category (name, parent_id)');
        $this->addSql('ALTER TABLE product_listing DROP CONSTRAINT FK_1AD953648DE820D9');
        $this->addSql('DROP INDEX IDX_1AD953648DE820D9');
        $this->addSql('ALTER TABLE product_listing DROP seller_id');
    }
}
