<?php

namespace App\Controller;

use App\Entity\B2BRequest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/banner/image')]
final class BannerImageController extends AbstractController
{
    #[Route('/{id}', name: 'banner_image_serve', methods: ['GET'])]
    public function serve(int $id, EntityManagerInterface $entityManager): Response
    {
        $request = $entityManager->find(B2BRequest::class, $id);
        if (!$request instanceof B2BRequest) {
            return $this->redirect('/');
        }

        $imageData = $request->getImageData();
        if ($imageData === null) {
            $url = $request->getImageUrl();
            if ($url && str_starts_with($url, '/uploads/')) {
                $filePath = $this->getParameter('kernel.project_dir') . '/public' . $url;
                if (file_exists($filePath)) {
                    return new Response(
                        file_get_contents($filePath),
                        200,
                        ['Content-Type' => mime_content_type($filePath)]
                    );
                }
            }
            return $this->redirect('/');
        }

        if (is_resource($imageData)) {
            $imageData = stream_get_contents($imageData);
        }

        return new Response(
            $imageData,
            200,
            [
                'Content-Type' => $request->getImageMimeType() ?? 'image/jpeg',
                'Cache-Control' => 'public, max-age=86400',
            ]
        );
    }
}
