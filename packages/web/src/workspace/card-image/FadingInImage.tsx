import { useState, type ComponentProps } from 'react';

/**
 * A card image that fades in once it has arrived, instead of appearing in strips as it loads.
 * Until then its slot looks empty, at the size the image reserves, while a screen reader still
 * finds the image by its name. One that fails to arrive is shown all the same, so its alternative
 * text stands in for it.
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
      // An attribute, not a plain class: it outranks an opacity the image is given, such as a dimmed token's.
      data-arriving={hasArrived ? undefined : ''}
      className={`${className} ${hasArrived ? 'animate-fade-in' : 'data-arriving:opacity-0'}`}
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
