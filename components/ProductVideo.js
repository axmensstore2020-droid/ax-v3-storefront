'use client';
import {useEffect, useRef, useState} from 'react';
import {imageUrl} from './ProductImage';

export default function ProductVideo({media, title}) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || entries[0].intersectionRatio < 0.5) video.pause();
    }, {threshold:[0, 0.5]});
    observer?.observe(video);
    const onVisibility = () => { if (document.hidden) video.pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      video.pause();
    };
  }, []);
  return <div className="pdp-video-wrap">
    <video ref={ref} className="pdp-video" controls playsInline preload="none"
      poster={media.poster ? imageUrl(media.poster, 800) : undefined}
      aria-label={media.altText || title + ' — product video'}
      onError={() => setFailed(true)}
      onPlay={event => {
        event.currentTarget.closest('.pdp-gallery')?.querySelectorAll('video').forEach(video => {
          if (video !== event.currentTarget) video.pause();
        });
      }}>
      {media.sources.map(source => <source key={source.url} src={source.url} type={source.mimeType}/>)}
      Your browser does not support video playback.
    </video>
    {failed && <p className="pdp-video-error" role="status">Video unavailable. Please browse the product photos.</p>}
  </div>;
}
