<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260413102708 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs

        $this->addSql('ALTER TABLE favorite ADD client_id INT NOT NULL');
        $this->addSql('ALTER TABLE favorite ADD CONSTRAINT FK_68C58ED919EB6921 FOREIGN KEY (client_id) REFERENCES "user" (id) NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_68C58ED919EB6921 ON favorite (client_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE UNIQUE INDEX unique_category_parent ON category (name, parent_id)');
        $this->addSql('ALTER TABLE favorite DROP CONSTRAINT FK_68C58ED919EB6921');
        $this->addSql('DROP INDEX IDX_68C58ED919EB6921');
        $this->addSql('ALTER TABLE favorite DROP client_id');
    }
}
