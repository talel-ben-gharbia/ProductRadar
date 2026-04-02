<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260402131133 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {

        $this->addSql('ALTER TABLE alert ADD alerter_id INT NOT NULL');
        $this->addSql('ALTER TABLE alert ADD CONSTRAINT FK_17FD46C11D53D98A FOREIGN KEY (alerter_id) REFERENCES "user" (id) NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_17FD46C11D53D98A ON alert (alerter_id)');
  
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE "user"');
        $this->addSql('ALTER TABLE alert DROP CONSTRAINT FK_17FD46C11D53D98A');
        $this->addSql('DROP INDEX IDX_17FD46C11D53D98A');
        $this->addSql('ALTER TABLE alert DROP alerter_id');
        $this->addSql('CREATE UNIQUE INDEX unique_category_parent ON category (name, parent_id)');
    }
}
