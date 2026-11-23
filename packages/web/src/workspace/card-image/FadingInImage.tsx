import { useState, type ComponentProps } from 'react';

/**
 * A card image that fades in once it has arrived, instead of appearing in strips as it loads.
 * Until then its slot stays empty, at the size the image reserves. One that fails to arrive shows
 * at once, so its alternative text can stand in for it.
 */
export function FadingInImage({
  className = '',
  onLoad,
  onError,
  ...imageProps
}: ComponentProps<'img'>) {
  // The address that arrived, not a flag: an image given another address waits for that one too.
  const [arrivedSrc, setArrivedSrc] = useState<string>();
  const hasArrived = arrivedSrc !== undefined && arrivedSrc === imageProps.src;
  return (
    <img
      {...imageProps}
      className={`${className} ${hasArrived ? 'animate-fade-in' : 'invisible'}`}
      onLoad={(event) => {
        setArrivedSrc(imageProps.src);
        onLoad?.(event);
      }}
      onError={(event) => {
        setArrivedSrc(imageProps.src);
        onError?.(event);
      }}
    />
  );
}
