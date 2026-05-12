<?php

declare(strict_types=1);

namespace App\Controller;

use App\Form\Flow\ApplicationFlowType;
use App\Model\Application;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class ApplicationFlowController extends AbstractController
{
    #[Route('/apply', name: 'app_application_flow', methods: ['GET', 'POST'])]
    public function __invoke(Request $request): Response
    {
        $flow = $this->createForm(ApplicationFlowType::class, new Application());
        $flow->handleRequest($request);

        if ($flow->isSubmitted() && $flow->isValid() && $flow->isFinished()) {
            /** @var Application $application */
            $application = $flow->getData();

            // In a real app you'd persist or queue the submission here.
            $request->getSession()->set('app.last_submission', $application);

            return $this->redirectToRoute('app_application_success');
        }

        return $this->render('application/flow.html.twig', [
            'form' => $flow->getStepForm(),
        ]);
    }

    #[Route('/apply/success', name: 'app_application_success', methods: ['GET'])]
    public function success(Request $request): Response
    {
        $application = $request->getSession()->get('app.last_submission');

        if (!$application instanceof Application) {
            return $this->redirectToRoute('app_application_flow');
        }

        return $this->render('application/success.html.twig', [
            'application' => $application,
        ]);
    }
}
