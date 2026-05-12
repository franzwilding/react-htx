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
                'required' => true,
            ])
            ->add('portfolio', FileType::class, [
                'label' => 'Portfolio (optional)',
                'help' => 'You can upload multiple images or PDFs.',
                'multiple' => true,
                'mapped' => true,
                'required' => false,
            ])
            ->add('skills', CollectionType::class, [
                'label' => 'Your top skills',
                'entry_type' => SkillType::class,
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
}
