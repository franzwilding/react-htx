<?php

declare(strict_types=1);

namespace App\Form\Step;

use App\Form\SkillType;
use App\Model\Documents;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\UlidType;
use Symfony\Component\Form\Extension\Core\Type\UuidType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Step 5 — Documents, skills and identifiers.
 *
 * Covers: FileType (single + multiple), CollectionType (with prototype),
 * UuidType, UlidType.
 */
class DocumentsStepType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('resume', FileType::class, [
                'label' => 'Resume (PDF)',
                'help' => 'Up to 5 MB. PDF only.',
                'mapped' => true,
                'required' => false,
            ])
            ->add('portfolio', FileType::class, [
                'label' => 'Portfolio (optional)',
                'help' => 'You can upload multiple images or PDFs.',
                'multiple' => true,
                'mapped' => true,
                'required' => false,
            ]);

        // FormFlow persists step data to the session between steps. Symfony's
        // `UploadedFile` blocks serialization, so we move any freshly uploaded
        // file to a temp path and replace the field's value with the plain
        // `File` returned by `->move()`. We also keep the previously-uploaded
        // file in place when the user re-submits this step without picking a
        // new file (e.g. clicking "Continue" after navigating back).
        $persistOrKeep = static function (FormEvent $event): void {
            $data = $event->getData();
            $previous = $event->getForm()->getData();

            if ($data instanceof UploadedFile) {
                $event->setData(self::moveToTemp($data));

                return;
            }
            if (null === $data && $previous instanceof \Symfony\Component\HttpFoundation\File\File) {
                // No new upload — keep the previously stored file.
                $event->setData($previous);

                return;
            }
            if (is_array($data)) {
                // For multi-file fields we merge any freshly uploaded files
                // with whatever was already on the model.
                $kept = is_array($previous) ? $previous : [];
                foreach ($data as $file) {
                    if ($file instanceof UploadedFile) {
                        $kept[] = self::moveToTemp($file);
                    } elseif ($file instanceof \Symfony\Component\HttpFoundation\File\File) {
                        $kept[] = $file;
                    }
                }
                $event->setData(array_values($kept));
            }
        };

        $builder->get('resume')->addEventListener(FormEvents::SUBMIT, $persistOrKeep);
        $builder->get('portfolio')->addEventListener(FormEvents::SUBMIT, $persistOrKeep);

        $builder
            ->add('skills', CollectionType::class, [
                'label' => 'Your top skills',
                'entry_type' => SkillType::class,
                'entry_options' => [
                    // Suppress the auto-generated per-row label ("0", "1", …
                    // and "__name__" in the prototype).
                    'label' => false,
                ],
                'allow_add' => true,
                'allow_delete' => true,
                'by_reference' => false,
                'prototype' => true,
                'help' => 'Add as many skills as you want. We will rank you by them.',
            ])
            ->add('accountId', UuidType::class, [
                'label' => 'Account ID',
                'disabled' => true,
                'help' => 'Auto-generated UUID for your new account.',
            ])
            ->add('transactionId', UlidType::class, [
                'label' => 'Transaction ID',
                'disabled' => true,
                'help' => 'ULID used to deduplicate this submission.',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Documents::class,
            'inherit_data' => false,
        ]);
    }

    /**
     * Moves an `UploadedFile` into a unique sub-directory of the system temp
     * dir and returns the resulting plain `File`. Each file gets its own
     * directory so we can preserve the client's original filename without
     * collisions — that way the basename shown when the user navigates back
     * to this step is the name they actually uploaded.
     */
    private static function moveToTemp(UploadedFile $file): \Symfony\Component\HttpFoundation\File\File
    {
        $dir = sys_get_temp_dir().'/symfony-flow-uploads/'.bin2hex(random_bytes(8));
        if (!is_dir($dir)) {
            @mkdir($dir, 0o700, true);
        }

        return $file->move($dir, $file->getClientOriginalName());
    }
}
