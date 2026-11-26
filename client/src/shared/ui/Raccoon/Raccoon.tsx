import type { ComponentPropsWithRef } from 'react';
import sad from '../../assets/raccoon/raccoon-sad.png';
import working from '../../assets/raccoon/raccoon-working.png';
import playing from '../../assets/raccoon/raccoon-playing.png';
import forbidden from '../../assets/raccoon/raccoon-forbidden.png';
import repairing from '../../assets/raccoon/raccoon-repairing.png';
import waving from '../../assets/raccoon/raccoon-waving.png';
import confused from '../../assets/raccoon/raccoon-confused.png';
import happy from '../../assets/raccoon/raccoon-happy.png';
import neon from '../../assets/raccoon/raccoon-neon.png';
import './Raccoon.css';

const images = {
    sad,
    working,
    playing,
    forbidden,
    repairing,
    waving,
    confused,
    happy,
    neon,
} as const;

export type RaccoonVariant = keyof typeof images;

interface RaccoonProps extends Omit<ComponentPropsWithRef<'img'>, 'src' | 'srcSet'> {
    variant: RaccoonVariant;
}

export function Raccoon({ variant, alt = '', className, ...props }: RaccoonProps) {
    return (
        <img
            width={1254}
            height={1254}
            decoding="async"
            {...props}
            className={className ? `raccoon ${className}` : 'raccoon'}
            src={images[variant]}
            alt={alt}
        />
    );
}
