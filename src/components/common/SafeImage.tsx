import { useState } from 'react';

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=800&auto=format&fit=crop';

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

export default function SafeImage({ src, alt, fallbackSrc = DEFAULT_FALLBACK, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      {...props}
      src={failed || !src ? fallbackSrc : src}
      alt={alt || 'Image'}
      loading={props.loading || 'lazy'}
      onError={() => setFailed(true)}
    />
  );
}
