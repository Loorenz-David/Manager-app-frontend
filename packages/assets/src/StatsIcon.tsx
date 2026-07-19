import iconUrl from "../StatsIcon.svg";

type StatsIconProps = React.ImgHTMLAttributes<HTMLImageElement>;

export function StatsIcon({
  alt = "",
  className,
  ...props
}: StatsIconProps): React.JSX.Element {
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
