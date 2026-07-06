import iconUrl from "../PostHandlingIcon.svg";

type PostHandlingIconProps = React.ImgHTMLAttributes<HTMLImageElement>;

export function PostHandlingIcon({
  alt = "",
  className,
  ...props
}: PostHandlingIconProps): React.JSX.Element {
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
