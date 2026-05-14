<?php

namespace App\Service;

final class FirebaseAuthService
{
    private ?\Kreait\Firebase\Auth $auth = null;

    public function __construct()
    {
        $credentialsPath = $_ENV['FIREBASE_SERVICE_ACCOUNT_PATH']
            ?? $_SERVER['FIREBASE_SERVICE_ACCOUNT_PATH']
            ?? '';
        if ($credentialsPath === '' || !is_file($credentialsPath)) {
            return;
        }

        try {
            $factory = (new \Kreait\Firebase\Factory)->withServiceAccount($credentialsPath);
            $this->auth = $factory->createAuth();
        } catch (\Throwable) {
        }
    }

    public function isAvailable(): bool
    {
        return $this->auth !== null;
    }

    public function verifyIdToken(string $idToken): ?array
    {
        if ($this->auth === null) {
            return null;
        }

        try {
            $verifiedToken = $this->auth->verifyIdToken($idToken);
            return ['uid' => $verifiedToken->claims()->get('sub')];
        } catch (\Throwable) {
            return null;
        }
    }
}
