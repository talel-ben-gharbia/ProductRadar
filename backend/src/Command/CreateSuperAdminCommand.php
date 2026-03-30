<?php

namespace App\Command;

use App\Entity\Admin;
use App\Repository\AdminRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-super-admin',
    description: 'Creates the Super Admin account for the platform',
)]
class CreateSuperAdminCommand extends Command
{
    public function __construct(
        private readonly AdminRepository $adminRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Create Super Admin');

        $email = $io->ask('Enter the Super Admin email address');
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $io->error('A valid email address is required.');

            return Command::FAILURE;
        }

        $existing = $this->adminRepository->findOneBy(['email' => $email]);
        if ($existing) {
            $io->error('An administrator with this email already exists.');

            return Command::FAILURE;
        }

        $password = $io->askHidden('Enter the Super Admin password');
        if (!$password || strlen($password) < 8) {
            $io->error('Password must be at least 8 characters long.');

            return Command::FAILURE;
        }

        $confirmPassword = $io->askHidden('Confirm the password');
        if ($password !== $confirmPassword) {
            $io->error('Passwords do not match.');

            return Command::FAILURE;
        }

        $admin = new Admin();
        $admin->setEmail($email);
        $admin->setRole('ROLE_SUPER_ADMIN');

        $hashedPassword = $this->passwordHasher->hashPassword($admin, $password);
        $admin->setPassword($hashedPassword);

        $this->entityManager->persist($admin);
        $this->entityManager->flush();

        $io->success(sprintf('Super Admin created successfully with email: %s', $email));

        return Command::SUCCESS;
    }
}
