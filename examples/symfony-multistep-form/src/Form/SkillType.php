<?php

declare(strict_types=1);

namespace App\Form;

use App\Model\Skill;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Sub-form used inside a CollectionType row.
 */
class SkillType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Skill',
                'attr' => ['placeholder' => 'TypeScript'],
            ])
            ->add('level', IntegerType::class, [
                'label' => 'Level',
                'attr' => ['min' => 1, 'max' => 10],
                'help' => '1 = beginner, 10 = expert.',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Skill::class,
        ]);
    }
}
