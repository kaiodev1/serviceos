import Image from 'next/image';

/** Transparent PNGs retain the supplied artwork; compact mode frames its symbol with CSS. */
export function Brand({ full = false }: { full?: boolean }) {
  if (full) {
    return (
      <div className="brand-artwork">
        <Image
          src="/brand/serviceos-logo-transparent.png"
          className="brand-image-light"
          alt="ServiceOS — Sua operação. Em um só lugar."
          width={1254}
          height={1254}
          sizes="320px"
          preload
        />
        <Image
          src="/brand/serviceos-logo-dark-transparent.png"
          className="brand-image-dark"
          alt="ServiceOS — Sua operação. Em um só lugar."
          width={1254}
          height={1254}
          sizes="320px"
          preload
        />
      </div>
    );
  }
  return (
    <span className="brand-lockup" aria-label="ServiceOS">
      <span className="brand-symbol" aria-hidden="true">
        <Image
          src="/brand/serviceos-logo-transparent.png"
          className="brand-image-light"
          alt=""
          width={1254}
          height={1254}
          sizes="140px"
          preload
        />
        <Image
          src="/brand/serviceos-logo-dark-transparent.png"
          className="brand-image-dark"
          alt=""
          width={1254}
          height={1254}
          sizes="140px"
          preload
        />
      </span>
      <span className="brand-name" aria-hidden="true">
        Service<span className="brand-o">O</span>
        <span className="brand-s">S</span>
      </span>
    </span>
  );
}
