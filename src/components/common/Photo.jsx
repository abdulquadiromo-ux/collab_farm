import { useState } from 'react';
import { Sprout, Wheat, Fish, Bird, Tractor, Users } from 'lucide-react';
import { cx } from '../../utils/format.js';

/**
 * Photo placeholder system.
 * The Figma photos could not be downloaded in the build environment (the image host was blocked), so every
 * photograph is rendered through this component. It first tries /images/<name> from the public folder.
 * If the file is missing it shows a generated gradient illustration instead, so nothing ever looks broken.
 * To use the real photos, drop files into public/images using the names listed in public/images/README.md.
 */
const THEMES = {
  field: { g: 'linear-gradient(160deg, #6eb489 0%, #305d41 60%, #1e3928 100%)', Icon: Wheat },
  seedling: { g: 'linear-gradient(160deg, #d0e7d9 0%, #6eb489 55%, #305d41 100%)', Icon: Sprout },
  harvest: { g: 'linear-gradient(160deg, #f8cd42 0%, #d4af36 45%, #305d41 100%)', Icon: Wheat },
  farmers: { g: 'linear-gradient(160deg, #498d63 0%, #1e3928 100%)', Icon: Users },
  fishery: { g: 'linear-gradient(160deg, #9ec5ff 0%, #2970ff 55%, #1e3928 100%)', Icon: Fish },
  poultry: { g: 'linear-gradient(160deg, #f9b99c 0%, #dc6803 55%, #5a3b0a 100%)', Icon: Bird },
  machinery: { g: 'linear-gradient(160deg, #e7f3ec 0%, #498d63 60%, #0a140e 100%)', Icon: Tractor },
};

export function Photo({ name, theme = 'field', alt = '', className, style, children, label, loading = 'lazy' }) {
  const [failed, setFailed] = useState(!name);
  const t = THEMES[theme] || THEMES.field;
  const Icon = t.Icon;
  return (
    <div className={cx('photo', className)} style={style}>
      {!failed && <img src={`/images/${name}`} alt={alt} loading={loading} onError={() => setFailed(true)} />}
      {failed && (
        <div className="photo__fallback" role={alt ? 'img' : undefined} aria-label={alt || undefined} style={{ background: t.g }}>
          <svg width="100%" height="100%" aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
            <defs>
              <pattern id={`p-${theme}`} width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
                <path d="M0 24 Q12 8 24 24 T48 24" stroke="#fff" strokeWidth="2" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#p-${theme})`} />
          </svg>
          <Icon size={56} color="rgba(255,255,255,.55)" style={{ position: 'relative' }} />
          {label && <span style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{label}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

// Absolute-fill variant for hero and card backgrounds.
export function PhotoFill({ name, theme, className, loading }) {
  return <Photo name={name} theme={theme} className={cx('photo-fill', className)} style={{ position: 'absolute', inset: 0 }} loading={loading} />;
}
