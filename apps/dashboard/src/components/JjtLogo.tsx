interface Props {
  size?: number;
  className?: string;
}

export default function JjtLogo({ size = 64, className = '' }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/jjt-logo.png"
      alt="JJT PisoTab Logo"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', borderRadius: '50%' }}
    />
  );
}
