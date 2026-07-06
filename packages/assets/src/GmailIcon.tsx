import iconUrl from "../GmailIcon.svg";

type GmailIconProps = React.ImgHTMLAttributes<HTMLImageElement>;

export function GmailIcon({
  alt = "",
  className,
  ...props
}: GmailIconProps): React.JSX.Element {
  return (
    <img
      alt={alt}
      aria-hidden="true"
      className={className}
      src={iconUrl}
      {...props}
    />
  );
}
