import React, { useEffect, useId, useState } from 'react';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

type ImageWithFallbackProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackClassName?: string;
};

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fallbackId = useId();

  const handleError = () => {
    setDidError(true);
    setIsLoaded(true);
  };

  const { src, alt, style, className, fallbackClassName, onLoad, onError, ...rest } = props;

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(event);
  };

  useEffect(() => {
    setDidError(false);
    setIsLoaded(false);
  }, [src]);

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${fallbackClassName ?? className ?? ''}`}
      style={style}
      role="img"
      aria-label={alt || 'Image unavailable'}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="" {...rest} data-original-url={src} />
      </div>
    </div>
  ) : (
    <span className={`relative inline-block overflow-hidden ${className ?? ''}`} style={style}>
      {!isLoaded && (
        <span
          className="absolute inset-0 animate-pulse bg-slate-100"
          aria-hidden="true"
          data-image-placeholder={fallbackId}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className ?? 'h-full w-full object-cover'} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        {...rest}
        onError={(event) => {
          onError?.(event);
          handleError();
        }}
        onLoad={handleLoad}
      />
    </span>
  );
}

